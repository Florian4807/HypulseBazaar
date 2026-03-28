using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SkyBazaar.Data;

/// <summary>
/// Design-time DbContext factory for EF Core tooling (migrations/update).
/// </summary>
public class DesignTimeSkyBazaarDbContextFactory : IDesignTimeDbContextFactory<SkyBazaarDbContext>
{
    public SkyBazaarDbContext CreateDbContext(string[] args)
    {
        var provider = Environment.GetEnvironmentVariable("Database__Provider")?.Trim().ToLowerInvariant() ?? "sqlite";
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Data Source=skybazaar.db";

        var builder = new DbContextOptionsBuilder<SkyBazaarDbContext>();
        if (provider == "postgres" || provider == "postgresql")
        {
            builder.UseNpgsql(connectionString);
        }
        else
        {
            builder.UseSqlite(connectionString);
        }

        return new SkyBazaarDbContext(builder.Options);
    }
}

