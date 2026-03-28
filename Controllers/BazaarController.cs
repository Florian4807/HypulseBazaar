using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SkyBazaar.Data;
using SkyBazaar.Models;
using SkyBazaar.Services;

namespace SkyBazaar.Controllers;

/// <summary>
/// Controller for bazaar data API endpoints.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BazaarController : ControllerBase
{
    private readonly SkyBazaarDbContext _context;
    private readonly ICoflnetHistoryImportService _coflnetHistoryImport;
    private readonly IConfiguration _configuration;

    public BazaarController(
        SkyBazaarDbContext context,
        ICoflnetHistoryImportService coflnetHistoryImport,
        IConfiguration configuration)
    {
        _context = context;
        _coflnetHistoryImport = coflnetHistoryImport;
        _configuration = configuration;
    }

    /// <summary>
    /// GET /api/bazaar - Returns current prices for all items.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<BazaarItemDto>>> GetAllItems()
    {
        // Get the latest snapshot for each item
        var latestSnapshots = await _context.Snapshots
            .Include(s => s.BazaarItem)
            .GroupBy(s => s.BazaarItemId)
            .Select(g => g.OrderByDescending(s => s.Timestamp).First())
            .ToListAsync();

        var result = latestSnapshots.Select(s => new BazaarItemDto
        {
            ProductId = s.BazaarItem?.ProductId ?? string.Empty,
            Name = s.BazaarItem?.Name,
            CurrentBuyPrice = s.BuyPrice,
            CurrentSellPrice = s.SellPrice,
            BuyVolume = s.BuyVolume,
            SellVolume = s.SellVolume,
            LastUpdated = s.Timestamp
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// GET /api/bazaar/{productId} - Returns historical prices for specific item.
    /// </summary>
    [HttpGet("{productId}")]
    public async Task<ActionResult<PriceHistoryDto>> GetItemHistory(string productId, [FromQuery] int limit = 100)
    {
        var item = await _context.Items
            .FirstOrDefaultAsync(i => i.ProductId == productId);

        if (item == null)
        {
            return NotFound(new { message = $"Product '{productId}' not found" });
        }

        var snapshots = await _context.Snapshots
            .Where(s => s.BazaarItemId == item.Id)
            .OrderBy(s => s.Timestamp)
            .TakeLast(limit)
            .ToListAsync();

        var result = new PriceHistoryDto
        {
            ProductId = item.ProductId,
            ProductName = item.Name,
            Snapshots = snapshots.Select(s => new PriceSnapshotDto
            {
                Timestamp = s.Timestamp,
                BuyPrice = s.BuyPrice,
                SellPrice = s.SellPrice,
                BuyVolume = s.BuyVolume,
                SellVolume = s.SellVolume
            }).ToList()
        };

        return Ok(result);
    }

    /// <summary>
    /// GET /api/bazaar/{productId}/history — price history with optional filters.
    /// If <paramref name="limit"/> is set, returns at most that many newest points (after start/end filters).
    /// If <paramref name="limit"/> is omitted, returns up to <c>Bazaar:MaxHistoryPoints</c> (default 500000) newest points.
    /// </summary>
    [HttpGet("{productId}/history")]
    public async Task<ActionResult<PriceHistoryDto>> GetItemHistoryByDateRange(
        string productId,
        [FromQuery] DateTime? start,
        [FromQuery] DateTime? end,
        [FromQuery] int? limit)
    {
        var item = await _context.Items
            .FirstOrDefaultAsync(i => i.ProductId == productId);

        if (item == null)
        {
            return NotFound(new { message = $"Product '{productId}' not found" });
        }

        var query = _context.Snapshots
            .Where(s => s.BazaarItemId == item.Id);

        // Apply date range filters
        if (start.HasValue)
        {
            query = query.Where(s => s.Timestamp >= start.Value);
        }

        if (end.HasValue)
        {
            query = query.Where(s => s.Timestamp <= end.Value);
        }

        // Newest-first, optional cap, then chronological for charts (time increases left → right).
        // When limit is omitted, return full matching range (use Bazaar:MaxHistoryPoints as safety ceiling).
        var ordered = query.OrderByDescending(s => s.Timestamp);
        List<PriceSnapshot> snapshots;
        if (limit.HasValue)
        {
            snapshots = await ordered.Take(limit.Value).ToListAsync();
        }
        else
        {
            var maxPoints = _configuration.GetValue("Bazaar:MaxHistoryPoints", 500_000);
            snapshots = await ordered.Take(maxPoints).ToListAsync();
        }

        snapshots.Reverse();

        var result = new PriceHistoryDto
        {
            ProductId = item.ProductId,
            ProductName = item.Name,
            Snapshots = snapshots.Select(s => new PriceSnapshotDto
            {
                Timestamp = s.Timestamp,
                BuyPrice = s.BuyPrice,
                SellPrice = s.SellPrice,
                BuyVolume = s.BuyVolume,
                SellVolume = s.SellVolume
            }).ToList()
        };

        return Ok(result);
    }

    /// <summary>
    /// POST /api/bazaar/{productId}/import-coflnet-history — fetch Coflnet graph history and insert missing snapshots.
    /// Optional start/end (UTC) query params limit the range. Disable with Coflnet:EnableImport=false.
    /// </summary>
    [HttpPost("{productId}/import-coflnet-history")]
    public async Task<ActionResult<CoflnetHistoryImportResultDto>> ImportCoflnetHistory(
        string productId,
        [FromQuery] DateTime? start,
        [FromQuery] DateTime? end,
        CancellationToken cancellationToken)
    {
        if (!_configuration.GetValue("Coflnet:EnableImport", true))
        {
            return StatusCode(403, new { message = "Coflnet import is disabled (Coflnet:EnableImport)." });
        }

        try
        {
            var result = await _coflnetHistoryImport.ImportAsync(productId, start, end, cancellationToken);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            return BadRequest(new { message = "Coflnet request failed", detail = ex.Message });
        }
    }
}
