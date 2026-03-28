using System.ComponentModel.DataAnnotations;

namespace SkyBazaar.Models;

/// <summary>
/// DTO for flip recommendations - items with profitable buy/sell spreads.
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
    /// Current buy price (instant buy orders).
    /// </summary>
    public decimal BuyPrice { get; set; }

    /// <summary>
    /// Current sell price (instant sell orders).
    /// </summary>
    public decimal SellPrice { get; set; }

    /// <summary>
    /// Profit margin (SellPrice - BuyPrice).
    /// </summary>
    public decimal ProfitMargin { get; set; }

    /// <summary>
    /// Profit percentage: ((SellPrice - BuyPrice) / BuyPrice) * 100.
    /// </summary>
    public decimal ProfitPercentage { get; set; }

    /// <summary>
    /// Combined buy and sell volume for liquidity scoring.
    /// </summary>
    public long VolumeScore { get; set; }

    /// <summary>
    /// Weighted recommendation score combining profit and volume.
    /// Formula: ProfitMargin * Math.Log10(BuyVolume + SellVolume + 1)
    /// </summary>
    public decimal RecommendationScore { get; set; }

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
