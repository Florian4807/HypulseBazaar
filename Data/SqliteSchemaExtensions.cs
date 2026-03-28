using Microsoft.EntityFrameworkCore;
using SkyBazaar.Models;

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

        try
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                ALTER TABLE "Snapshots" ADD COLUMN "IsExternalImport" INTEGER NOT NULL DEFAULT 0
                """,
                cancellationToken);
        }
        catch (Exception ex) when (ex.Message.Contains("duplicate column", StringComparison.OrdinalIgnoreCase))
        {
            // Column already present
        }
    }
}
