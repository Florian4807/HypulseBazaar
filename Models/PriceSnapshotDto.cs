namespace SkyBazaar.Models;

/// <summary>
/// DTO for a single price snapshot.
/// </summary>
public class PriceSnapshotDto
{
    /// <summary>
    /// Timestamp of this price snapshot.
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// Instant buy (Hypixel <c>buyPrice</c>).
    /// </summary>
    public decimal BuyPrice { get; set; }

    /// <summary>
    /// Instant sell (Hypixel <c>sellPrice</c>).
    /// </summary>
    public decimal SellPrice { get; set; }

    /// <summary>
    /// Volume of buy orders.
    /// </summary>
    public long BuyVolume { get; set; }

    /// <summary>
    /// Volume of sell orders.
    /// </summary>
    public long SellVolume { get; set; }
}

/// <summary>
/// DTO for price history response.
/// </summary>
public class PriceHistoryDto
{
    /// <summary>
    /// The product identifier.
    /// </summary>
    public string ProductId { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the item.
    /// </summary>
    public string? ProductName { get; set; }

    /// <summary>
    /// List of price snapshots.
    /// </summary>
    public List<PriceSnapshotDto> Snapshots { get; set; } = new();
}
