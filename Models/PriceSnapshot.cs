using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyBazaar.Models;

/// <summary>
/// Represents a price snapshot at a specific point in time.
/// </summary>
public class PriceSnapshot
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int BazaarItemId { get; set; }

    /// <summary>
    /// Timestamp of this price snapshot.
    /// </summary>
    [Required]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Current buy price (instant buy orders).
    /// </summary>
    [Column(TypeName = "decimal(18,4)")]
    public decimal BuyPrice { get; set; }

    /// <summary>
    /// Current sell price (instant sell orders).
    /// </summary>
    [Column(TypeName = "decimal(18,4)")]
    public decimal SellPrice { get; set; }

    /// <summary>
    /// Volume of buy orders in the last 24 hours.
    /// </summary>
    public long BuyVolume { get; set; }

    /// <summary>
    /// Volume of sell orders in the last 24 hours.
    /// </summary>
    public long SellVolume { get; set; }

    /// <summary>
    /// 7-day moving average for buy price.
    /// </summary>
    public long BuyMovingWeek { get; set; }

    /// <summary>
    /// 7-day moving average for sell price.
    /// </summary>
    public long SellMovingWeek { get; set; }

    /// <summary>
    /// Number of buy orders.
    /// </summary>
    public int BuyOrdersCount { get; set; }

    /// <summary>
    /// Number of sell orders.
    /// </summary>
    public int SellOrdersCount { get; set; }

    /// <summary>
    /// Navigation property to the bazaar item.
    /// </summary>
    [ForeignKey(nameof(BazaarItemId))]
    public BazaarItem? BazaarItem { get; set; }
}
