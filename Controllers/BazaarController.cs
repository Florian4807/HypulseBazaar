using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyBazaar.Data;
using SkyBazaar.Models;

namespace SkyBazaar.Controllers;

/// <summary>
/// Controller for bazaar data API endpoints.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BazaarController : ControllerBase
{
    private readonly SkyBazaarDbContext _context;

    public BazaarController(SkyBazaarDbContext context)
    {
        _context = context;
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
            .OrderByDescending(s => s.Timestamp)
            .Take(limit)
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
    /// GET /api/bazaar/{productId}/history - Returns price history within time range.
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

        // Apply ordering and limit
        var snapshots = await query
            .OrderByDescending(s => s.Timestamp)
            .Take(limit ?? 1000)
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
}
