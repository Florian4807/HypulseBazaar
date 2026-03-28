namespace SkyBazaar.Models;

/// <summary>
/// DTO for current bazaar item prices.
/// </summary>
public class BazaarItemDto
{
    /// <summary>
    /// The product identifier (e.g., "ENDER_PEARL").
    /// </summary>
    public string ProductId { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the item.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Current buy price (instant buy orders).
    /// </summary>
    public decimal CurrentBuyPrice { get; set; }

    /// <summary>
    /// Current sell price (instant sell orders).
    /// </summary>
    public decimal CurrentSellPrice { get; set; }

    /// <summary>
    /// Volume of buy orders in the last 24 hours.
    /// </summary>
    public long BuyVolume { get; set; }

    /// <summary>
    /// Volume of sell orders in the last 24 hours.
    /// </summary>
    public long SellVolume { get; set; }

    /// <summary>
    /// Timestamp of the last price update.
    /// </summary>
    public DateTime LastUpdated { get; set; }
}
