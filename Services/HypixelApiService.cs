using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Polly;
using Polly.Retry;
using SkyBazaar.Models;

namespace SkyBazaar.Services;

/// <summary>
/// Interface for the bazaar API service.
/// </summary>
public interface IHypixelApiService
{
    /// <summary>
    /// Fetches the current bazaar data from Hypixel API.
    /// </summary>
    Task<List<BazaarItemSnapshot>> GetBazaarAsync();
}

/// <summary>
/// Represents a single product's bazaar data.
/// </summary>
public class BazaarItemSnapshot
{
    public string ProductId { get; set; } = string.Empty;
    public decimal BuyPrice { get; set; }
    public decimal SellPrice { get; set; }
    public long BuyVolume { get; set; }
    public long SellVolume { get; set; }
    public long BuyMovingWeek { get; set; }
    public long SellMovingWeek { get; set; }
    public int BuyOrdersCount { get; set; }
    public int SellOrdersCount { get; set; }
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

    public HypixelApiService(HttpClient httpClient, ILogger<HypixelApiService> logger, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        _configuration = configuration;

        // Configure retry policy
        var maxRetries = _configuration.GetValue<int>("Bazaar:MaxRetries", 3);
        var retryDelaySeconds = _configuration.GetValue<int>("Bazaar:RetryDelaySeconds", 10);

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
    public async Task<List<BazaarItemSnapshot>> GetBazaarAsync()
    {
        _logger.LogInformation("Fetching bazaar data from Hypixel API");

        var response = await _retryPolicy.ExecuteAsync(async () =>
        {
            var response = await _httpClient.GetAsync(ApiBaseUrl);
            
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
            return new List<BazaarItemSnapshot>();
        }

        var snapshots = new List<BazaarItemSnapshot>();

        foreach (var product in bazaarResponse.Products)
        {
            var quickStatus = product.Value.QuickStatus;
            if (quickStatus == null) continue;

            snapshots.Add(new BazaarItemSnapshot
            {
                ProductId = quickStatus.ProductId,
                BuyPrice = (decimal)quickStatus.BuyPrice,
                SellPrice = (decimal)quickStatus.SellPrice,
                BuyVolume = quickStatus.BuyVolume,
                SellVolume = quickStatus.SellVolume,
                BuyMovingWeek = quickStatus.BuyMovingWeek,
                SellMovingWeek = quickStatus.SellMovingWeek,
                BuyOrdersCount = quickStatus.BuyOrders,
                SellOrdersCount = quickStatus.SellOrders
            });
        }

        _logger.LogInformation("Successfully fetched {Count} bazaar items", snapshots.Count);
        return snapshots;
    }
}
