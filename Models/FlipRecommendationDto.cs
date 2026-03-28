using System.ComponentModel.DataAnnotations;

namespace SkyBazaar.Models;

/// <summary>
/// DTO for spread-ranked bazaar items. Property names follow the API; see <see cref="BuyPrice"/> for Hypixel semantics.
/// </summary>
public class FlipRecommendationDto
{
    /// <summary>
    /// The product identifier (e.g., "ENCHANTED_COAL").
    /// </summary>
    public string ProductId { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable name of the product.
    /// </summary>
    public string? ProductName { get; set; }

    /// <summary>
    /// Hypixel quick_status.buyPrice: coins to instant buy one unit (in-game sell offers / ask).
    /// </summary>
    public decimal BuyPrice { get; set; }

    /// <summary>
    /// Hypixel quick_status.sellPrice: coins from instant sell of one unit (in-game buy orders / bid).
    /// </summary>
    public decimal SellPrice { get; set; }

    /// <summary>
    /// Bid–ask spread in coins: <see cref="BuyPrice"/> − <see cref="SellPrice"/> (instant buy minus instant sell).
    /// </summary>
    public decimal ProfitMargin { get; set; }

    /// <summary>
    /// Spread as a percentage of <see cref="SellPrice"/>: (spread / SellPrice) × 100.
    /// </summary>
    public decimal ProfitPercentage { get; set; }

    /// <summary>
    /// Combined buy and sell volume for liquidity scoring.
    /// </summary>
    public long VolumeScore { get; set; }

    /// <summary>
    /// Weighted score favoring profitable and liquid flips (used for ranking).
    /// </summary>
    public decimal RecommendationScore { get; set; }

    /// <summary>
    /// Estimated one-hour instant buys (derived from weekly buy volume / 168).
    /// </summary>
    public decimal OneHourInstabuys { get; set; }

    /// <summary>
    /// Estimated one-hour instant sells (derived from weekly sell volume / 168).
    /// </summary>
    public decimal OneHourInstasells { get; set; }

    /// <summary>
    /// Conservative fill-rate estimate per hour (min of buy/sell instant rates).
    /// </summary>
    public decimal TradablePerHour { get; set; }

    /// <summary>
    /// Conservative profit throughput estimate: margin × tradable-per-hour.
    /// </summary>
    public decimal CoinsPerHour { get; set; }

    /// <summary>
    /// Buy volume in the last 24 hours.
    /// </summary>
    public long BuyVolume { get; set; }

    /// <summary>
    /// Sell volume in the last 24 hours.
    /// </summary>
    public long SellVolume { get; set; }

    /// <summary>
    /// Timestamp of the latest snapshot used for calculation.
    /// </summary>
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// Response DTO for the flips endpoint.
/// </summary>
public class FlipsResponseDto
{
    /// <summary>
    /// List of flip recommendations.
    /// </summary>
    public List<FlipRecommendationDto> Flips { get; set; } = new();

    /// <summary>
    /// Timestamp when the response was generated.
    /// </summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Total number of items analyzed.
    /// </summary>
    public int TotalItemsAnalyzed { get; set; }
}
