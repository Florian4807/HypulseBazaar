using System.Text.Json.Serialization;

namespace SkyBazaar.Models;

/// <summary>
/// Response model for the Hypixel SkyBlock Bazaar API.
/// </summary>
public class HypixelBazaarResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("products")]
    public Dictionary<string, ProductInfo>? Products { get; set; }

    /// <summary>
    /// Unix timestamp of when the bazaar data was last updated.
    /// </summary>
    [JsonPropertyName("lastUpdated")]
    public long LastUpdated { get; set; }
}

/// <summary>
/// Information about a specific bazaar product.
/// </summary>
public class ProductInfo
{
    [JsonPropertyName("productId")]
    public string ProductId { get; set; } = string.Empty;

    [JsonPropertyName("buy_summary")]
    public List<OrderSummary>? BuySummary { get; set; }

    [JsonPropertyName("sell_summary")]
    public List<OrderSummary>? SellSummary { get; set; }

    [JsonPropertyName("quick_status")]
    public QuickStatus? QuickStatus { get; set; }
}

/// <summary>
/// Summary of orders at a specific price point.
/// </summary>
public class OrderSummary
{
    [JsonPropertyName("pricePerUnit")]
    public double PricePerUnit { get; set; }

    [JsonPropertyName("orders")]
    public int Orders { get; set; }

    [JsonPropertyName("amount")]
    public long Amount { get; set; }
}

/// <summary>
/// Quick status with instant order information.
/// </summary>
public class QuickStatus
{
    [JsonPropertyName("productId")]
    public string ProductId { get; set; } = string.Empty;

    [JsonPropertyName("sellPrice")]
    public double SellPrice { get; set; }

    [JsonPropertyName("sellVolume")]
    public long SellVolume { get; set; }

    [JsonPropertyName("sellMovingWeek")]
    public long SellMovingWeek { get; set; }

    [JsonPropertyName("sellOrders")]
    public int SellOrders { get; set; }

    [JsonPropertyName("buyPrice")]
    public double BuyPrice { get; set; }

    [JsonPropertyName("buyVolume")]
    public long BuyVolume { get; set; }

    [JsonPropertyName("buyMovingWeek")]
    public long BuyMovingWeek { get; set; }

    [JsonPropertyName("buyOrders")]
    public int BuyOrders { get; set; }
}
