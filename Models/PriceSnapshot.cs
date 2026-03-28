using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using MessagePack;

namespace SkyBazaar.Models;

// Alias to disambiguate Key attribute
using MessagePackKey = MessagePack.KeyAttribute;
using EFKey = System.ComponentModel.DataAnnotations.KeyAttribute;

/// <summary>
/// Represents a price snapshot at a specific point in time.
/// </summary>
public class PriceSnapshot
{
    [EFKey]
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
    /// Serialized buy orders (top N) using MessagePack.
    /// </summary>
    [Column(TypeName = "blob")]
    [JsonIgnore]
    public byte[]? SerializedBuyOrders { get; set; }

    /// <summary>
    /// Serialized sell orders (top N) using MessagePack.
    /// </summary>
    [Column(TypeName = "blob")]
    [JsonIgnore]
    public byte[]? SerializedSellOrders { get; set; }

    /// <summary>
    /// Deserialized buy orders (top N entries).
    /// </summary>
    [NotMapped]
    [JsonIgnore]
    public IEnumerable<Order>? BuyOrders => SerializedBuyOrders == null
        ? null
        : MessagePackSerializer.Deserialize<IEnumerable<Order>>(SerializedBuyOrders);

    /// <summary>
    /// Deserialized sell orders (top N entries).
    /// </summary>
    [NotMapped]
    [JsonIgnore]
    public IEnumerable<Order>? SellOrders => SerializedSellOrders == null
        ? null
        : MessagePackSerializer.Deserialize<IEnumerable<Order>>(SerializedSellOrders);

    /// <summary>
    /// Navigation property to the bazaar item.
    /// </summary>
    [ForeignKey(nameof(BazaarItemId))]
    public BazaarItem? BazaarItem { get; set; }
}

/// <summary>
/// Represents a single order in the bazaar (buy or sell).
/// </summary>
[MessagePackObject]
public class Order
{
    /// <summary>
    /// Total amount of items in this order.
    /// </summary>
    [MessagePackKey(0)]
    public long Amount { get; set; }

    /// <summary>
    /// Price per unit.
    /// </summary>
    [MessagePackKey(1)]
    public double PricePerUnit { get; set; }

    /// <summary>
    /// Number of orders at this price point.
    /// </summary>
    [MessagePackKey(2)]
    public short Orders { get; set; }
}
