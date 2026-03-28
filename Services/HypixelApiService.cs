using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Polly;
using Polly.Retry;
using SkyBazaar.Models;
using MessagePack;

namespace SkyBazaar.Services;

/// <summary>
/// Interface for the bazaar API service.
/// </summary>
public interface IHypixelApiService
{
    /// <summary>
    /// Fetches the current bazaar data from Hypixel API.
    /// </summary>
    Task<BazaarApiResult> GetBazaarAsync();
}

/// <summary>
/// Result from the Bazaar API containing snapshots and LastUpdated timestamp.
/// </summary>
public class BazaarApiResult
{
    public List<BazaarItemSnapshot> Snapshots { get; set; } = new();
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// Single-product bazaar data aligned with Hypixel <c>quick_status</c> (instant buy / instant sell).
/// </summary>
public class BazaarItemSnapshot
{
    public string ProductId { get; set; } = string.Empty;
    /// <summary>Hypixel instant buy (matches in-game sell offers).</summary>
    public decimal BuyPrice { get; set; }
    /// <summary>Hypixel instant sell (matches in-game buy orders).</summary>
    public decimal SellPrice { get; set; }
    public long BuyVolume { get; set; }
    public long SellVolume { get; set; }
    public long BuyMovingWeek { get; set; }
    public long SellMovingWeek { get; set; }
    public int BuyOrdersCount { get; set; }
    public int SellOrdersCount { get; set; }
    public byte[]? SerializedBuyOrders { get; set; }
    public byte[]? SerializedSellOrders { get; set; }
}

/// <summary>
/// Service for fetching bazaar data from the Hypixel API.
/// </summary>
public class HypixelApiService : IHypixelApiService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<HypixelApiService> _logger;
    private readonly IConfiguration _configuration;
    private readonly AsyncRetryPolicy _retryPolicy;
    private const string ApiBaseUrl = "https://api.hypixel.net/v2/skyblock/bazaar";
    private readonly int _ordersToStore;

    public HypixelApiService(HttpClient httpClient, ILogger<HypixelApiService> logger, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        _configuration = configuration;

        // Configure retry policy
        var maxRetries = _configuration.GetValue<int>("Bazaar:MaxRetries", 3);
        var retryDelaySeconds = _configuration.GetValue<int>("Bazaar:RetryDelaySeconds", 10);
        _ordersToStore = _configuration.GetValue<int>("Bazaar:OrdersToStore", 3);

        _retryPolicy = Policy
            .Handle<HttpRequestException>()
            .Or<TaskCanceledException>()
            .WaitAndRetryAsync(
                maxRetries,
                retryAttempt => TimeSpan.FromSeconds(retryDelaySeconds * retryAttempt),
                onRetry: (exception, timeSpan, retryCount, context) =>
                {
                    _logger.LogWarning(exception,
                        "Retry {RetryCount} after {Delay}s due to: {Message}",
                        retryCount, timeSpan.TotalSeconds, exception.Message);
                });
    }

    /// <inheritdoc/>
    public async Task<BazaarApiResult> GetBazaarAsync()
    {
        _logger.LogInformation("Fetching bazaar data from Hypixel API");

        var response = await _retryPolicy.ExecuteAsync(async () =>
        {
            var request = new HttpRequestMessage(HttpMethod.Get, ApiBaseUrl);
            
            // Add API key header if configured
            var apiKey = _configuration["Hypixel:ApiKey"];
            if (!string.IsNullOrEmpty(apiKey))
            {
                request.Headers.Add("API-Key", apiKey);
            }
            
            var response = await _httpClient.SendAsync(request);
            
            // Handle rate limiting (429)
            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                var retryAfter = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(30);
                _logger.LogWarning("Rate limited by Hypixel API. Waiting {Delay}s", retryAfter.TotalSeconds);
                await Task.Delay(retryAfter);
                throw new HttpRequestException("Rate limited");
            }
            
            response.EnsureSuccessStatusCode();
            return response;
        });

        var bazaarResponse = await response.Content.ReadFromJsonAsync<HypixelBazaarResponse>();

        if (bazaarResponse?.Success != true || bazaarResponse.Products == null)
        {
            _logger.LogError("Failed to fetch bazaar data: API returned unsuccessful response");
            return new BazaarApiResult();
        }

        // Convert Unix timestamp to DateTime
        var lastUpdated = DateTimeOffset.FromUnixTimeMilliseconds(bazaarResponse.LastUpdated).UtcDateTime;

        var snapshots = new List<BazaarItemSnapshot>();

        foreach (var product in bazaarResponse.Products)
        {
            var quickStatus = product.Value.QuickStatus;
            if (quickStatus == null) continue;

            // Parse top N order entries from buy/sell summaries
            var buyOrders = ParseTopOrders(product.Value.BuySummary, _ordersToStore);
            var sellOrders = ParseTopOrders(product.Value.SellSummary, _ordersToStore);

            // Top-of-book: prefer summary first entry over quick_status when they differ
            // Mirrors Coflnet's BazaarUpdater behavior
            var sellPrice = (decimal)quickStatus.SellPrice;
            var buyPrice = (decimal)quickStatus.BuyPrice;
            
            if (product.Value.SellSummary != null && product.Value.SellSummary.Count > 0)
            {
                var topSell = product.Value.SellSummary[0].PricePerUnit;
                if (Math.Abs((double)topSell - (double)quickStatus.SellPrice) > 0.01)
                {
                    sellPrice = (decimal)topSell;
                }
            }
            
            if (product.Value.BuySummary != null && product.Value.BuySummary.Count > 0)
            {
                var topBuy = product.Value.BuySummary[0].PricePerUnit;
                if (Math.Abs((double)topBuy - (double)quickStatus.BuyPrice) > 0.01)
                {
                    buyPrice = (decimal)topBuy;
                }
            }

            snapshots.Add(new BazaarItemSnapshot
            {
                ProductId = quickStatus.ProductId,
                BuyPrice = buyPrice,
                SellPrice = sellPrice,
                BuyVolume = quickStatus.BuyVolume,
                SellVolume = quickStatus.SellVolume,
                BuyMovingWeek = quickStatus.BuyMovingWeek,
                SellMovingWeek = quickStatus.SellMovingWeek,
                BuyOrdersCount = quickStatus.BuyOrders,
                SellOrdersCount = quickStatus.SellOrders,
                SerializedBuyOrders = buyOrders,
                SerializedSellOrders = sellOrders
            });
        }

        _logger.LogInformation("Successfully fetched {Count} bazaar items, LastUpdated: {LastUpdated}", 
            snapshots.Count, lastUpdated);
        
        return new BazaarApiResult
        {
            Snapshots = snapshots,
            LastUpdated = lastUpdated
        };
    }

    /// <summary>
    /// Parses top N orders from order summary and serializes them using MessagePack.
    /// </summary>
    private byte[]? ParseTopOrders(List<OrderSummary>? summaries, int topN)
    {
        if (summaries == null || summaries.Count == 0)
            return null;

        var topOrders = summaries
            .Take(topN)
            .Select(s => new Order
            {
                Amount = s.Amount,
                PricePerUnit = s.PricePerUnit,
                Orders = (short)s.Orders
            })
            .ToList();

        return MessagePackSerializer.Serialize(topOrders);
    }
}
