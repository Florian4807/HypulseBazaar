using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SkyBazaar.Data;
using SkyBazaar.Models;

namespace SkyBazaar.Services;

/// <summary>
/// Background service that periodically fetches bazaar data from Hypixel API and stores it in the database.
/// </summary>
public class BazaarFetcherService : IHostedService, IAsyncDisposable
{
    private readonly IHypixelApiService _apiService;
    private readonly IDbContextFactory<SkyBazaarDbContext> _dbContextFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<BazaarFetcherService> _logger;
    
    private Timer? _timer;
    private bool _isFetching;
    
    private int _fetchIntervalSeconds;
    private int _retentionDays;

    public BazaarFetcherService(
        IHypixelApiService apiService,
        IDbContextFactory<SkyBazaarDbContext> dbContextFactory,
        IConfiguration configuration,
        ILogger<BazaarFetcherService> logger)
    {
        _apiService = apiService;
        _dbContextFactory = dbContextFactory;
        _configuration = configuration;
        _logger = logger;
        
        // Load configuration
        _fetchIntervalSeconds = _configuration.GetValue<int>("Bazaar:FetchIntervalSeconds", 300);
        _retentionDays = _configuration.GetValue<int>("Bazaar:RetentionDays", 30);
    }

    /// <inheritdoc/>
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "BazaarFetcherService starting. Fetch interval: {Interval}s, Retention: {Days} days",
            _fetchIntervalSeconds, _retentionDays);

        // Run initial fetch on startup
        _ = ExecuteFetchAsync(cancellationToken);

        // Start the timer for periodic fetching
        _timer = new Timer(
            async _ => await ExecuteFetchAsync(cancellationToken),
            null,
            TimeSpan.FromSeconds(_fetchIntervalSeconds),
            TimeSpan.FromSeconds(_fetchIntervalSeconds));

        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("BazaarFetcherService stopping");

        _timer?.Change(Timeout.Infinite, 0);

        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public async ValueTask DisposeAsync()
    {
        if (_timer != null)
        {
            await _timer.DisposeAsync();
        }
    }

    /// <summary>
    /// Executes the bazaar data fetch and storage.
    /// </summary>
    private async Task ExecuteFetchAsync(CancellationToken cancellationToken)
    {
        // Prevent concurrent fetches
        if (_isFetching)
        {
            _logger.LogDebug("Skipping fetch - already in progress");
            return;
        }

        _isFetching = true;

        try
        {
            _logger.LogInformation("Starting bazaar data fetch");

            // Fetch data from API
            var snapshots = await _apiService.GetBazaarAsync();

            if (snapshots.Count == 0)
            {
                _logger.LogWarning("No bazaar data fetched - possible API issue");
                return;
            }

            // Use DbContextFactory to get a context for this operation
            await using var dbContext = await _dbContextFactory.CreateDbContextAsync(cancellationToken);

            // Store snapshots in database
            var timestamp = DateTime.UtcNow;
            var itemsCreated = 0;

            foreach (var snapshot in snapshots)
            {
                // Get or create the bazaar item
                var bazaarItem = await dbContext.Items
                    .FirstOrDefaultAsync(i => i.ProductId == snapshot.ProductId, cancellationToken);

                if (bazaarItem == null)
                {
                    bazaarItem = new BazaarItem
                    {
                        ProductId = snapshot.ProductId,
                        Name = FormatProductName(snapshot.ProductId),
                        CreatedAt = timestamp,
                        UpdatedAt = timestamp
                    };
                    dbContext.Items.Add(bazaarItem);
                    await dbContext.SaveChangesAsync(cancellationToken);
                    itemsCreated++;
                }

                // Create price snapshot
                var priceSnapshot = new PriceSnapshot
                {
                    BazaarItemId = bazaarItem.Id,
                    Timestamp = timestamp,
                    BuyPrice = snapshot.BuyPrice,
                    SellPrice = snapshot.SellPrice,
                    BuyVolume = snapshot.BuyVolume,
                    SellVolume = snapshot.SellVolume,
                    BuyMovingWeek = snapshot.BuyMovingWeek,
                    SellMovingWeek = snapshot.SellMovingWeek,
                    BuyOrdersCount = snapshot.BuyOrdersCount,
                    SellOrdersCount = snapshot.SellOrdersCount
                };

                dbContext.Snapshots.Add(priceSnapshot);
            }

            // Save all changes
            await dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Bazaar data fetch completed. Items: {Total}, New items: {New}",
                snapshots.Count, itemsCreated);

            // Clean up old data
            await CleanupOldDataAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during bazaar data fetch");
        }
        finally
        {
            _isFetching = false;
        }
    }

    /// <summary>
    /// Removes price snapshots older than the retention period.
    /// </summary>
    private async Task CleanupOldDataAsync(CancellationToken cancellationToken)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var cutoffDate = DateTime.UtcNow.AddDays(-_retentionDays);
        
        var oldSnapshots = await dbContext.Snapshots
            .Where(s => s.Timestamp < cutoffDate)
            .ToListAsync(cancellationToken);

        if (oldSnapshots.Count > 0)
        {
            dbContext.Snapshots.RemoveRange(oldSnapshots);
            await dbContext.SaveChangesAsync(cancellationToken);
            
            _logger.LogInformation("Cleaned up {Count} old price snapshots (older than {Days} days)",
                oldSnapshots.Count, _retentionDays);
        }
    }

    /// <summary>
    /// Formats a product ID into a readable name.
    /// </summary>
    private static string FormatProductName(string productId)
    {
        // Convert ENCHANTED_COBBLESTONE -> Enchanted Cobblestone
        return productId
            .Replace("ENCHANTED_", "Enchanted ")
            .Replace("SUPER_", "Super ")
            .Replace("VERY_", "Very ")
            .Replace("ENDER_", "Ender ")
            .Replace("_", " ")
            .ToTitleCase();
    }
}

// Helper extension method
public static class StringExtensions
{
    public static string ToTitleCase(this string str)
    {
        if (string.IsNullOrEmpty(str)) return str;
        
        var words = str.Split(' ');
        for (int i = 0; i < words.Length; i++)
        {
            if (words[i].Length > 0)
            {
                words[i] = char.ToUpper(words[i][0]) + words[i][1..].ToLower();
            }
        }
        return string.Join(' ', words);
    }
}
