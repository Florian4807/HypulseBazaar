using Microsoft.EntityFrameworkCore;
using SkyBazaar.Data;
using SkyBazaar.Models;

namespace SkyBazaar.Services;

/// <summary>
/// Interface for flip detection operations.
/// </summary>
public interface IFlipDetectionService
{
    /// <summary>
    /// Calculates profit margin between buy and sell price.
    /// </summary>
    decimal CalculateMargin(decimal buyPrice, decimal sellPrice);

    /// <summary>
    /// Gets top flip opportunities sorted by recommendation score.
    /// </summary>
    Task<List<FlipRecommendationDto>> GetTopFlipsAsync(int count = 50, decimal minProfitPercent = 1.0m);

    /// <summary>
    /// Gets flip recommendation for a specific item.
    /// </summary>
    Task<FlipRecommendationDto?> GetFlipForItemAsync(string productId);
}

/// <summary>
/// Service for detecting profitable flip opportunities in the bazaar.
/// </summary>
public class FlipDetectionService : IFlipDetectionService
{
    private readonly SkyBazaarDbContext _context;

    public FlipDetectionService(SkyBazaarDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc/>
    public decimal CalculateMargin(decimal buyPrice, decimal sellPrice)
    {
        return sellPrice - buyPrice;
    }

    /// <inheritdoc/>
    public async Task<List<FlipRecommendationDto>> GetTopFlipsAsync(int count = 50, decimal minProfitPercent = 1.0m)
    {
        // Get the latest snapshot for each item with required data
        var latestSnapshots = await _context.Snapshots
            .Include(s => s.BazaarItem)
            .Where(s => s.BuyVolume > 0 || s.SellVolume > 0) // Exclude items with zero volume
            .GroupBy(s => s.BazaarItemId)
            .Select(g => g.OrderByDescending(s => s.Timestamp).First())
            .ToListAsync();

        var totalItems = latestSnapshots.Count;

        // Calculate flips for each snapshot
        var flips = latestSnapshots
            .Where(s => s.BuyPrice > 0 && s.SellPrice > 0) // Must have valid prices
            .Where(s => s.SellPrice > s.BuyPrice) // Only profitable items (arbitrage opportunity)
            .Select(s =>
            {
                var profitMargin = CalculateMargin(s.BuyPrice, s.SellPrice);
                var profitPercent = s.BuyPrice > 0 
                    ? (profitMargin / s.BuyPrice) * 100m 
                    : 0m;
                var volumeScore = s.BuyVolume + s.SellVolume;
                // Recommendation score: profit margin weighted by log of volume
                var recommendationScore = profitMargin * (decimal)Math.Log10(Math.Max(1, volumeScore) + 1);

                return new FlipRecommendationDto
                {
                    ProductId = s.BazaarItem?.ProductId ?? string.Empty,
                    ProductName = s.BazaarItem?.Name,
                    BuyPrice = s.BuyPrice,
                    SellPrice = s.SellPrice,
                    ProfitMargin = profitMargin,
                    ProfitPercentage = profitPercent,
                    VolumeScore = volumeScore,
                    RecommendationScore = recommendationScore,
                    BuyVolume = s.BuyVolume,
                    SellVolume = s.SellVolume,
                    LastUpdated = s.Timestamp
                };
            })
            .Where(f => f.ProfitPercentage >= minProfitPercent) // Filter by minimum profit threshold
            .OrderByDescending(f => f.RecommendationScore) // Sort by best recommendation score
            .Take(count)
            .ToList();

        return flips;
    }

    /// <inheritdoc/>
    public async Task<FlipRecommendationDto?> GetFlipForItemAsync(string productId)
    {
        // Get the item
        var item = await _context.Items
            .FirstOrDefaultAsync(i => i.ProductId == productId);

        if (item == null)
        {
            return null;
        }

        // Get the latest snapshot
        var snapshot = await _context.Snapshots
            .Where(s => s.BazaarItemId == item.Id)
            .OrderByDescending(s => s.Timestamp)
            .FirstOrDefaultAsync();

        if (snapshot == null || snapshot.BuyPrice <= 0 || snapshot.SellPrice <= 0)
        {
            return null;
        }

        var profitMargin = CalculateMargin(snapshot.BuyPrice, snapshot.SellPrice);
        var profitPercent = snapshot.BuyPrice > 0 
            ? (profitMargin / snapshot.BuyPrice) * 100m 
            : 0m;
        var volumeScore = snapshot.BuyVolume + snapshot.SellVolume;
        var recommendationScore = profitMargin * (decimal)Math.Log10(Math.Max(1, volumeScore) + 1);

        return new FlipRecommendationDto
        {
            ProductId = item.ProductId,
            ProductName = item.Name,
            BuyPrice = snapshot.BuyPrice,
            SellPrice = snapshot.SellPrice,
            ProfitMargin = profitMargin,
            ProfitPercentage = profitPercent,
            VolumeScore = volumeScore,
            RecommendationScore = recommendationScore,
            BuyVolume = snapshot.BuyVolume,
            SellVolume = snapshot.SellVolume,
            LastUpdated = snapshot.Timestamp
        };
    }
}
