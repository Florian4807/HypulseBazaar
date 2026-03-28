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
/// Implements poll-until-advance logic similar to Coflnet's BazaarUpdater.
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
    private int _pollWaitMs;
    private int _maxPollRetries;

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
        _pollWaitMs = _configuration.GetValue<int>("Bazaar:PollWaitMs", 500);
        _maxPollRetries = _configuration.GetValue<int>("Bazaar:MaxPollRetries", 100);
    }

    /// <inheritdoc/>
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "BazaarFetcherService starting. Fetch interval: {Interval}s, Retention: {Days} days, Poll wait: {PollWait}ms, Max retries: {MaxRetries}",
            _fetchIntervalSeconds, _retentionDays, _pollWaitMs, _maxPollRetries);

        // Run initial fetch on startup
        _ = ExecuteFetchAsync(cancellationToken);

        // Start the timer for periodic fetching
        // Timer acts as "wake up and check" trigger - actual save only happens when data changes
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
    /// Executes the bazaar data fetch and storage with poll-until-advance logic.
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
            _logger.LogInformation("Starting bazaar data fetch with poll-until-advance");

            // Get the last stored timestamp from database
            var lastStored = await GetLastStoredTimestampAsync(cancellationToken);
            _logger.LogDebug("Last stored timestamp: {LastStored}", lastStored);

            // Poll until LastUpdated advances or max retries hit
            var result = await PullAndSaveAsync(lastStored, cancellationToken);
            
            if (result == null)
            {
                _logger.LogWarning("Failed to fetch updated bazaar data after {MaxRetries} retries", _maxPollRetries);
                return;
            }

            // Check if data actually changed
            if (result.LastUpdated <= lastStored)
            {
                _logger.LogDebug("Bazaar data not updated (LastUpdated: {LastUpdated} <= lastStored: {LastStored})", 
                    result.LastUpdated, lastStored);
                return;
            }

            var snapshots = result.Snapshots;
            _logger.LogInformation("Bazaar data updated. LastUpdated: {LastUpdated}, Items: {Count}", 
                result.LastUpdated, snapshots.Count);

            // Use DbContextFactory to get a context for this operation
            await using var dbContext = await _dbContextFactory.CreateDbContextAsync(cancellationToken);

            // Store snapshots in database
            var timestamp = result.LastUpdated;
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

                // Create price snapshot with serialized order data
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
                    SellOrdersCount = snapshot.SellOrdersCount,
                    SerializedBuyOrders = snapshot.SerializedBuyOrders,
                    SerializedSellOrders = snapshot.SerializedSellOrders
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
    /// Polls the API until LastUpdated advances or max retries hit.
    /// Mirrors Coflnet's BazaarUpdater.PullAndSave logic.
    /// </summary>
    private async Task<BazaarApiResult?> PullAndSaveAsync(DateTime lastUpdate, CancellationToken cancellationToken)
    {
        var tryCount = 0;
        
        while (tryCount < _maxPollRetries)
        {
            var result = await _apiService.GetBazaarAsync();
            
            // Check if timestamp changed - KEY BEHAVIOR
            if (result.LastUpdated <= lastUpdate)
            {
                tryCount++;
                if (tryCount % 10 == 1)
                    _logger.LogInformation("Bazaar not updated after {TryCount} attempts...", tryCount);
                
                await Task.Delay(_pollWaitMs, cancellationToken);
                continue;
            }
            
            // Data has updated - return result for processing
            return result;
        }
        
        // Max retries hit - return null to indicate failure
        return null;
    }

    /// <summary>
    /// Gets the last stored timestamp from the database.
    /// </summary>
    private async Task<DateTime> GetLastStoredTimestampAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var dbContext = await _dbContextFactory.CreateDbContextAsync(cancellationToken);
            
            var latestSnapshot = await dbContext.Snapshots
                .OrderByDescending(s => s.Timestamp)
                .FirstOrDefaultAsync(cancellationToken);
            
            return latestSnapshot?.Timestamp ?? DateTime.MinValue;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get last stored timestamp, using default");
            return DateTime.MinValue;
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
