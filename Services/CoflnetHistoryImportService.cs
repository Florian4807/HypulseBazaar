using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SkyBazaar.Data;
using SkyBazaar.Models;

namespace SkyBazaar.Services;

/// <summary>
/// Fetches Coflnet bazaar history and inserts rows compatible with <see cref="PriceSnapshot"/>.
/// </summary>
public interface ICoflnetHistoryImportService
{
    Task<CoflnetHistoryImportResultDto> ImportAsync(
        string productId,
        DateTime? start,
        DateTime? end,
        CancellationToken cancellationToken = default);
}

public class CoflnetHistoryImportService : ICoflnetHistoryImportService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly SkyBazaarDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CoflnetHistoryImportService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public CoflnetHistoryImportService(
        IHttpClientFactory httpClientFactory,
        SkyBazaarDbContext db,
        IConfiguration configuration,
        ILogger<CoflnetHistoryImportService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _db = db;
        _configuration = configuration;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<CoflnetHistoryImportResultDto> ImportAsync(
        string productId,
        DateTime? start,
        DateTime? end,
        CancellationToken cancellationToken = default)
    {
        var result = new CoflnetHistoryImportResultDto { ProductId = productId };

        if (string.IsNullOrWhiteSpace(productId))
        {
            return result;
        }

        var client = _httpClientFactory.CreateClient("Coflnet");
        var path = $"bazaar/{Uri.EscapeDataString(productId)}/history";
        var query = new List<string>();
        if (start.HasValue)
        {
            query.Add($"start={Uri.EscapeDataString(start.Value.ToUniversalTime().ToString("o", CultureInfo.InvariantCulture))}");
        }

        if (end.HasValue)
        {
            query.Add($"end={Uri.EscapeDataString(end.Value.ToUniversalTime().ToString("o", CultureInfo.InvariantCulture))}");
        }

        if (query.Count > 0)
        {
            path += "?" + string.Join("&", query);
        }

        _logger.LogInformation("Coflnet history GET {Path}", path);

        List<CoflnetHistoryPoint> points;
        try
        {
            var response = await client.GetAsync(path, cancellationToken);
            response.EnsureSuccessStatusCode();
            points = await response.Content.ReadFromJsonAsync<List<CoflnetHistoryPoint>>(JsonOptions, cancellationToken)
                     ?? new List<CoflnetHistoryPoint>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Coflnet history request failed for {ProductId}", productId);
            throw;
        }

        result.PointsReceived = points.Count;
        if (points.Count == 0)
        {
            return result;
        }

        var item = await _db.Items.FirstOrDefaultAsync(i => i.ProductId == productId, cancellationToken);
        if (item == null)
        {
            var now = DateTime.UtcNow;
            item = new BazaarItem
            {
                ProductId = productId,
                Name = FormatProductName(productId),
                CreatedAt = now,
                UpdatedAt = now,
            };
            _db.Items.Add(item);
            await _db.SaveChangesAsync(cancellationToken);
        }

        var minTs = DateTime.MaxValue;
        var maxTs = DateTime.MinValue;
        foreach (var p in points)
        {
            var ts = ParseCoflnetTimestamp(p.Timestamp);
            if (ts < minTs) minTs = ts;
            if (ts > maxTs) maxTs = ts;
        }

        var existing = await _db.Snapshots
            .AsNoTracking()
            .Where(s => s.BazaarItemId == item.Id && s.Timestamp >= minTs && s.Timestamp <= maxTs)
            .Select(s => s.Timestamp)
            .ToListAsync(cancellationToken);
        // SQLite returns Unspecified; parsed API times are UTC — normalize so HashSet dedup matches.
        var existingSet = existing.Select(NormalizeUtc).ToHashSet();

        var toAdd = new List<PriceSnapshot>();
        foreach (var p in points)
        {
            if (p.Buy <= 0 || p.Sell <= 0)
            {
                result.SkippedInvalid++;
                continue;
            }

            var ts = NormalizeUtc(ParseCoflnetTimestamp(p.Timestamp));
            if (existingSet.Contains(ts))
            {
                result.SkippedDuplicates++;
                continue;
            }

            toAdd.Add(new PriceSnapshot
            {
                BazaarItemId = item.Id,
                Timestamp = ts,
                BuyPrice = (decimal)p.Buy,
                SellPrice = (decimal)p.Sell,
                BuyVolume = p.BuyVolume,
                SellVolume = p.SellVolume,
                BuyMovingWeek = p.BuyMovingWeek,
                SellMovingWeek = p.SellMovingWeek,
                BuyOrdersCount = 0,
                SellOrdersCount = 0,
                SerializedBuyOrders = null,
                SerializedSellOrders = null,
                IsExternalImport = true,
            });
            existingSet.Add(ts);
        }

        if (toAdd.Count > 0)
        {
            _db.Snapshots.AddRange(toAdd);
            await _db.SaveChangesAsync(cancellationToken);
            result.Imported = toAdd.Count;
        }

        return result;
    }

    private static DateTime NormalizeUtc(DateTime dt)
    {
        return dt.Kind switch
        {
            DateTimeKind.Utc => dt,
            DateTimeKind.Local => dt.ToUniversalTime(),
            _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc),
        };
    }

    private static DateTime ParseCoflnetTimestamp(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return DateTime.SpecifyKind(DateTime.MinValue, DateTimeKind.Utc);
        }

        if (DateTimeOffset.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dto))
        {
            return dto.UtcDateTime;
        }

        return DateTime.SpecifyKind(DateTime.Parse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal), DateTimeKind.Utc);
    }

    private static string FormatProductName(string productId)
    {
        var s = productId
            .Replace("ENCHANTED_", "Enchanted ")
            .Replace("SUPER_", "Super ")
            .Replace("VERY_", "Very ")
            .Replace("ENDER_", "Ender ")
            .Replace("_", " ");
        var words = s.Split(' ');
        for (var i = 0; i < words.Length; i++)
        {
            if (words[i].Length > 0)
            {
                words[i] = char.ToUpper(words[i][0]) + words[i][1..].ToLowerInvariant();
            }
        }

        return string.Join(' ', words);
    }
}
