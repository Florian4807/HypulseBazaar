using System.Text.Json.Serialization;

namespace SkyBazaar.Models;

/// <summary>
/// One row from Coflnet GET /api/bazaar/{itemTag}/history (graph data).
/// </summary>
public class CoflnetHistoryPoint
{
    [JsonPropertyName("maxBuy")]
    public double MaxBuy { get; set; }

    [JsonPropertyName("maxSell")]
    public double MaxSell { get; set; }

    [JsonPropertyName("minBuy")]
    public double MinBuy { get; set; }

    [JsonPropertyName("minSell")]
    public double MinSell { get; set; }

    /// <summary>Instant buy (aligns with Hypixel <c>buyPrice</c>).</summary>
    [JsonPropertyName("buy")]
    public double Buy { get; set; }

    /// <summary>Instant sell (aligns with Hypixel <c>sellPrice</c>).</summary>
    [JsonPropertyName("sell")]
    public double Sell { get; set; }

    [JsonPropertyName("sellVolume")]
    public long SellVolume { get; set; }

    [JsonPropertyName("buyVolume")]
    public long BuyVolume { get; set; }

    [JsonPropertyName("timestamp")]
    public string Timestamp { get; set; } = string.Empty;

    [JsonPropertyName("buyMovingWeek")]
    public long BuyMovingWeek { get; set; }

    [JsonPropertyName("sellMovingWeek")]
    public long SellMovingWeek { get; set; }
}
