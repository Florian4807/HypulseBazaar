using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SkyBazaar.Data;

#nullable disable

namespace SkyBazaar.Migrations
{
    [DbContext(typeof(SkyBazaarDbContext))]
    [Migration("20260328001000_EnforceSnapshotUniqueness")]
    public partial class EnforceSnapshotUniqueness : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Preserve exactly one row per (BazaarItemId, Timestamp), preferring imported rows when duplicates exist.
            migrationBuilder.Sql(
                """
                DELETE FROM "Snapshots" AS s
                WHERE EXISTS (
                    SELECT 1
                    FROM "Snapshots" AS keep
                    WHERE keep."BazaarItemId" = s."BazaarItemId"
                      AND keep."Timestamp" = s."Timestamp"
                      AND (
                          keep."IsExternalImport" > s."IsExternalImport"
                          OR (keep."IsExternalImport" = s."IsExternalImport" AND keep."Id" > s."Id")
                      )
                );
                """);

            migrationBuilder.DropIndex(
                name: "IX_Snapshots_BazaarItemId_Timestamp",
                table: "Snapshots");

            migrationBuilder.CreateIndex(
                name: "IX_Snapshots_BazaarItemId_Timestamp",
                table: "Snapshots",
                columns: new[] { "BazaarItemId", "Timestamp" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Snapshots_BazaarItemId_Timestamp",
                table: "Snapshots");

            migrationBuilder.CreateIndex(
                name: "IX_Snapshots_BazaarItemId_Timestamp",
                table: "Snapshots",
                columns: new[] { "BazaarItemId", "Timestamp" });
        }
    }
}

