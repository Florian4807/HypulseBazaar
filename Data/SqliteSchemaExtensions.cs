using Microsoft.EntityFrameworkCore;
using SkyBazaar.Models;
using System.Data;

namespace SkyBazaar.Data;

/// <summary>
/// Applies additive SQLite schema updates for databases created before new columns existed (EnsureCreated does not alter existing tables).
/// </summary>
public static class SqliteSchemaExtensions
{
    /// <summary>
    /// Adds <see cref="PriceSnapshot.IsExternalImport"/> when missing (existing skybazaar.db files).
    /// </summary>
    public static async Task EnsurePriceSnapshotExternalImportColumnAsync(
        this SkyBazaarDbContext db,
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
            await using var tableCmd = connection.CreateCommand();
            tableCmd.CommandText = "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'Snapshots' LIMIT 1;";
            var snapshotsTableExists = await tableCmd.ExecuteScalarAsync(cancellationToken) != null;
            if (!snapshotsTableExists)
            {
                return;
            }

            await using var columnCmd = connection.CreateCommand();
            columnCmd.CommandText = "SELECT 1 FROM pragma_table_info('Snapshots') WHERE name = 'IsExternalImport' LIMIT 1;";
            var columnExists = await columnCmd.ExecuteScalarAsync(cancellationToken) != null;
            if (columnExists)
            {
                return;
            }

            await db.Database.ExecuteSqlRawAsync(
                """
                ALTER TABLE "Snapshots" ADD COLUMN "IsExternalImport" INTEGER NOT NULL DEFAULT 0
                """,
                cancellationToken);
        }
        finally
        {
            if (openedHere && connection.State == ConnectionState.Open)
            {
                await connection.CloseAsync();
            }
        }
    }
}
