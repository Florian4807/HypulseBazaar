using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SkyBazaar.Data;

#nullable disable

namespace SkyBazaar.Migrations
{
    [DbContext(typeof(SkyBazaarDbContext))]
    [Migration("20260328000000_InitialCreate")]
    public partial class InitialCreate : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ProductId = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Items", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Snapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    BazaarItemId = table.Column<int>(type: "INTEGER", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    BuyPrice = table.Column<decimal>(type: "decimal(20,4)", nullable: false),
                    SellPrice = table.Column<decimal>(type: "decimal(20,4)", nullable: false),
                    BuyVolume = table.Column<long>(type: "INTEGER", nullable: false),
                    SellVolume = table.Column<long>(type: "INTEGER", nullable: false),
                    BuyMovingWeek = table.Column<long>(type: "INTEGER", nullable: false),
                    SellMovingWeek = table.Column<long>(type: "INTEGER", nullable: false),
                    BuyOrdersCount = table.Column<int>(type: "INTEGER", nullable: false),
                    SellOrdersCount = table.Column<int>(type: "INTEGER", nullable: false),
                    SerializedBuyOrders = table.Column<byte[]>(type: "blob", nullable: true),
                    SerializedSellOrders = table.Column<byte[]>(type: "blob", nullable: true),
                    IsExternalImport = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Snapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Snapshots_Items_BazaarItemId",
                        column: x => x.BazaarItemId,
                        principalTable: "Items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Items_ProductId",
                table: "Items",
                column: "ProductId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Snapshots_BazaarItemId_Timestamp",
                table: "Snapshots",
                columns: new[] { "BazaarItemId", "Timestamp" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Snapshots");

            migrationBuilder.DropTable(
                name: "Items");
        }
    }
}

