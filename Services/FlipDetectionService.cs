using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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
    private readonly IConfiguration _configuration;
    private const decimal HoursPerMovingWeek = 168m;

    public FlipDetectionService(SkyBazaarDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    /// <inheritdoc/>
    public decimal CalculateBidAskSpread(decimal instantBuyPrice, decimal instantSellPrice)
    {
        return instantBuyPrice - instantSellPrice;
    }

    /// <inheritdoc/>
    public async Task<List<FlipRecommendationDto>> GetTopFlipsAsync(int count = 50, decimal minProfitPercent = 1.0m)
    {
        var minTradablePerHour = _configuration.GetValue("Flip:MinTradablePerHour", 0.5m);
        var minSellPrice = _configuration.GetValue("Flip:MinSellPrice", 0.1m);
        var sellTaxRate = Math.Clamp(_configuration.GetValue("Flip:SellTaxRate", 0.0125m), 0m, 0.95m);

        var latestSnapshots = await _context.Snapshots
            .Include(s => s.BazaarItem)
            .Where(s => s.BuyVolume > 0 || s.SellVolume > 0)
            .GroupBy(s => s.BazaarItemId)
            .Select(g => g.OrderByDescending(s => s.Timestamp).First())
            .ToListAsync();

        var flips = latestSnapshots
            .Where(s => s.BuyPrice > 0 && s.SellPrice >= minSellPrice)
            .Select(s =>
            {
                var netSellOfferAfterTax = s.BuyPrice * (1m - sellTaxRate);
                var spread = CalculateBidAskSpread(netSellOfferAfterTax, s.SellPrice);
                var spreadPercentVsSell = s.SellPrice > 0
                    ? spread / s.SellPrice * 100m
                    : 0m;
                var buyPerHour = EstimateHourlyInstaRate(s.BuyMovingWeek, s.BuyVolume);
                var sellPerHour = EstimateHourlyInstaRate(s.SellMovingWeek, s.SellVolume);
                var tradablePerHour = Math.Min(buyPerHour, sellPerHour);
                var maxSidePerHour = Math.Max(buyPerHour, sellPerHour);
                var balanceRatio = maxSidePerHour > 0 ? tradablePerHour / maxSidePerHour : 0m;
                var coinsPerHour = spread * tradablePerHour;
                var volumeScore = s.BuyVolume + s.SellVolume;
                var recommendationScore = coinsPerHour * (decimal)Math.Sqrt((double)balanceRatio);

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
                    OneHourInstabuys = buyPerHour,
                    OneHourInstasells = sellPerHour,
                    TradablePerHour = tradablePerHour,
                    CoinsPerHour = coinsPerHour,
                    BuyVolume = s.BuyVolume,
                    SellVolume = s.SellVolume,
                    LastUpdated = s.Timestamp
                };
            })
            .Where(f => f.ProfitMargin > 0)
            .Where(f => f.TradablePerHour >= minTradablePerHour)
            .Where(f => f.ProfitPercentage >= minProfitPercent)
            .OrderByDescending(f => f.RecommendationScore)
            .ThenByDescending(f => f.CoinsPerHour)
            .Take(count)
            .ToList();

        return flips;
    }

    /// <inheritdoc/>
    public async Task<FlipRecommendationDto?> GetFlipForItemAsync(string productId)
    {
        var minTradablePerHour = _configuration.GetValue("Flip:MinTradablePerHour", 0.5m);
        var minSellPrice = _configuration.GetValue("Flip:MinSellPrice", 0.1m);
        var sellTaxRate = Math.Clamp(_configuration.GetValue("Flip:SellTaxRate", 0.0125m), 0m, 0.95m);

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

        if (snapshot == null || snapshot.BuyPrice <= 0 || snapshot.SellPrice < minSellPrice)
        {
            return null;
        }

        var netSellOfferAfterTax = snapshot.BuyPrice * (1m - sellTaxRate);
        if (netSellOfferAfterTax <= snapshot.SellPrice)
        {
            return null;
        }

        var spread = CalculateBidAskSpread(netSellOfferAfterTax, snapshot.SellPrice);
        var spreadPercentVsSell = snapshot.SellPrice > 0
            ? spread / snapshot.SellPrice * 100m
            : 0m;
        var buyPerHour = EstimateHourlyInstaRate(snapshot.BuyMovingWeek, snapshot.BuyVolume);
        var sellPerHour = EstimateHourlyInstaRate(snapshot.SellMovingWeek, snapshot.SellVolume);
        var tradablePerHour = Math.Min(buyPerHour, sellPerHour);
        if (tradablePerHour < minTradablePerHour)
        {
            return null;
        }

        var maxSidePerHour = Math.Max(buyPerHour, sellPerHour);
        var balanceRatio = maxSidePerHour > 0 ? tradablePerHour / maxSidePerHour : 0m;
        var coinsPerHour = spread * tradablePerHour;
        var volumeScore = snapshot.BuyVolume + snapshot.SellVolume;
        var recommendationScore = coinsPerHour * (decimal)Math.Sqrt((double)balanceRatio);

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
            OneHourInstabuys = buyPerHour,
            OneHourInstasells = sellPerHour,
            TradablePerHour = tradablePerHour,
            CoinsPerHour = coinsPerHour,
            BuyVolume = snapshot.BuyVolume,
            SellVolume = snapshot.SellVolume,
            LastUpdated = snapshot.Timestamp
        };
    }

    private static decimal EstimateHourlyInstaRate(long movingWeek, long fallbackVolume)
    {
        if (movingWeek > 0)
        {
            return movingWeek / HoursPerMovingWeek;
        }

        return fallbackVolume / 24m;
    }
}
