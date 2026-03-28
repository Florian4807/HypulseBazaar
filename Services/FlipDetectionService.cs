using Microsoft.EntityFrameworkCore;
using SkyBazaar.Data;
using SkyBazaar.Models;

namespace SkyBazaar.Services;

/// <summary>
/// Flip / spread ranking using Hypixel bazaar semantics.
/// </summary>
public interface IFlipDetectionService
{
    /// <summary>
    /// Bid–ask spread: Hypixel <c>buyPrice</c> (instant buy) minus <c>sellPrice</c> (instant sell).
    /// </summary>
    decimal CalculateBidAskSpread(decimal instantBuyPrice, decimal instantSellPrice);

    /// <summary>
    /// Top items by spread score. <paramref name="minProfitPercent"/> is minimum spread % vs instant sell.
    /// </summary>
    Task<List<FlipRecommendationDto>> GetTopFlipsAsync(int count = 50, decimal minProfitPercent = 1.0m);

    /// <summary>
    /// Latest spread metrics for one product.
    /// </summary>
    Task<FlipRecommendationDto?> GetFlipForItemAsync(string productId);
}

/// <summary>
/// Ranks bazaar items by bid–ask spread (instant buy − instant sell). Not same-tick arbitrage profit.
/// </summary>
public class FlipDetectionService : IFlipDetectionService
{
    private readonly SkyBazaarDbContext _context;

    public FlipDetectionService(SkyBazaarDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc/>
    public decimal CalculateBidAskSpread(decimal instantBuyPrice, decimal instantSellPrice)
    {
        return instantBuyPrice - instantSellPrice;
    }

    /// <inheritdoc/>
    public async Task<List<FlipRecommendationDto>> GetTopFlipsAsync(int count = 50, decimal minProfitPercent = 1.0m)
    {
        var latestSnapshots = await _context.Snapshots
            .Include(s => s.BazaarItem)
            .Where(s => s.BuyVolume > 0 || s.SellVolume > 0)
            .GroupBy(s => s.BazaarItemId)
            .Select(g => g.OrderByDescending(s => s.Timestamp).First())
            .ToListAsync();

        var flips = latestSnapshots
            .Where(s => s.BuyPrice > 0 && s.SellPrice > 0)
            .Where(s => s.BuyPrice > s.SellPrice)
            .Select(s =>
            {
                var spread = CalculateBidAskSpread(s.BuyPrice, s.SellPrice);
                var spreadPercentVsSell = s.SellPrice > 0
                    ? spread / s.SellPrice * 100m
                    : 0m;
                var volumeScore = s.BuyVolume + s.SellVolume;
                var recommendationScore = spread * (decimal)Math.Log10(Math.Max(1, volumeScore) + 1);

                return new FlipRecommendationDto
                {
                    ProductId = s.BazaarItem?.ProductId ?? string.Empty,
                    ProductName = s.BazaarItem?.Name,
                    BuyPrice = s.BuyPrice,
                    SellPrice = s.SellPrice,
                    ProfitMargin = spread,
                    ProfitPercentage = spreadPercentVsSell,
                    VolumeScore = volumeScore,
                    RecommendationScore = recommendationScore,
                    BuyVolume = s.BuyVolume,
                    SellVolume = s.SellVolume,
                    LastUpdated = s.Timestamp
                };
            })
            .Where(f => f.ProfitPercentage >= minProfitPercent)
            .OrderByDescending(f => f.RecommendationScore)
            .Take(count)
            .ToList();

        return flips;
    }

    /// <inheritdoc/>
    public async Task<FlipRecommendationDto?> GetFlipForItemAsync(string productId)
    {
        var item = await _context.Items
            .FirstOrDefaultAsync(i => i.ProductId == productId);

        if (item == null)
        {
            return null;
        }

        var snapshot = await _context.Snapshots
            .Where(s => s.BazaarItemId == item.Id)
            .OrderByDescending(s => s.Timestamp)
            .FirstOrDefaultAsync();

        if (snapshot == null || snapshot.BuyPrice <= 0 || snapshot.SellPrice <= 0)
        {
            return null;
        }

        if (snapshot.BuyPrice <= snapshot.SellPrice)
        {
            return null;
        }

        var spread = CalculateBidAskSpread(snapshot.BuyPrice, snapshot.SellPrice);
        var spreadPercentVsSell = snapshot.SellPrice > 0
            ? spread / snapshot.SellPrice * 100m
            : 0m;
        var volumeScore = snapshot.BuyVolume + snapshot.SellVolume;
        var recommendationScore = spread * (decimal)Math.Log10(Math.Max(1, volumeScore) + 1);

        return new FlipRecommendationDto
        {
            ProductId = item.ProductId,
            ProductName = item.Name,
            BuyPrice = snapshot.BuyPrice,
            SellPrice = snapshot.SellPrice,
            ProfitMargin = spread,
            ProfitPercentage = spreadPercentVsSell,
            VolumeScore = volumeScore,
            RecommendationScore = recommendationScore,
            BuyVolume = snapshot.BuyVolume,
            SellVolume = snapshot.SellVolume,
            LastUpdated = snapshot.Timestamp
        };
    }
}
