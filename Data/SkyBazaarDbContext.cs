using Microsoft.EntityFrameworkCore;
using SkyBazaar.Models;

namespace SkyBazaar.Data;

/// <summary>
/// Database context for SkyBazaar application.
/// </summary>
public class SkyBazaarDbContext : DbContext
{
    public SkyBazaarDbContext(DbContextOptions<SkyBazaarDbContext> options) : base(options)
    {
    }

    /// <summary>
    /// DbSet for bazaar items.
    /// </summary>
    public DbSet<BazaarItem> Items { get; set; } = null!;

    /// <summary>
    /// DbSet for price snapshots.
    /// </summary>
    public DbSet<PriceSnapshot> Snapshots { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure BazaarItem
        modelBuilder.Entity<BazaarItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProductId).IsUnique();
            entity.Property(e => e.ProductId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Name).HasMaxLength(200);
        });

        // Configure PriceSnapshot
        modelBuilder.Entity<PriceSnapshot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.BazaarItemId, e.Timestamp });
            entity.HasOne(e => e.BazaarItem)
                .WithMany(b => b.Snapshots)
                .HasForeignKey(e => e.BazaarItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
