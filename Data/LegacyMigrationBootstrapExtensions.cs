using System.Data;
using Microsoft.EntityFrameworkCore;

namespace SkyBazaar.Data;

/// <summary>
/// Handles migration-history bootstrap for legacy SQLite databases created with EnsureCreated.
/// This preserves existing data by marking the baseline migration as applied before running Migrate.
/// </summary>
public static class LegacyMigrationBootstrapExtensions
{
    public static async Task BootstrapLegacySqliteMigrationHistoryAsync(
        this SkyBazaarDbContext db,
        string baselineMigrationId,
        string productVersion,
        CancellationToken cancellationToken = default)
    {
        var provider = db.Database.ProviderName ?? string.Empty;
        if (!provider.Contains("Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var connection = db.Database.GetDbConnection();
        var openedHere = false;
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
            openedHere = true;
        }

        try
        {
            var historyExists = await TableExistsAsync(connection, "__EFMigrationsHistory", cancellationToken);
            var hasItems = await TableExistsAsync(connection, "Items", cancellationToken);
            var hasSnapshots = await TableExistsAsync(connection, "Snapshots", cancellationToken);

            // Only baseline if this is a legacy DB with app tables but no migrations history table.
            if (historyExists || !hasItems || !hasSnapshots)
            {
                return;
            }

            await ExecuteNonQueryAsync(
                connection,
                """
                CREATE TABLE "__EFMigrationsHistory" (
                    "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
                    "ProductVersion" TEXT NOT NULL
                );
                """,
                cancellationToken);

            await ExecuteNonQueryAsync(
                connection,
                """
                INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                VALUES ($migrationId, $productVersion);
                """,
                cancellationToken,
                ("$migrationId", baselineMigrationId),
                ("$productVersion", productVersion));
        }
        finally
        {
            if (openedHere)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task<bool> TableExistsAsync(
        System.Data.Common.DbConnection connection,
        string tableName,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = $name LIMIT 1;";
        var p = command.CreateParameter();
        p.ParameterName = "$name";
        p.Value = tableName;
        command.Parameters.Add(p);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result != null && result != DBNull.Value;
    }

    private static async Task ExecuteNonQueryAsync(
        System.Data.Common.DbConnection connection,
        string sql,
        CancellationToken cancellationToken,
        params (string Name, object Value)[] parameters)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        foreach (var (name, value) in parameters)
        {
            var p = command.CreateParameter();
            p.ParameterName = name;
            p.Value = value;
            command.Parameters.Add(p);
        }

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
