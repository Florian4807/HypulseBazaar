using Microsoft.AspNetCore.Mvc;
using SkyBazaar.Models;
using SkyBazaar.Services;

namespace SkyBazaar.Controllers;

/// <summary>
/// API for bid–ask spread rankings (Hypixel instant buy minus instant sell).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class FlipsController : ControllerBase
{
    private readonly IFlipDetectionService _flipService;

    public FlipsController(IFlipDetectionService flipService)
    {
        _flipService = flipService;
    }

    /// <summary>
    /// GET /api/flips — top items by spread score (instant buy − instant sell).
    /// </summary>
    /// <param name="count">Maximum number of rows to return (default 50).</param>
    /// <param name="minProfitPercent">Minimum spread percentage vs instant sell (default 1.0).</param>
    /// <returns>Spread rankings sorted by recommendation score.</returns>
    [HttpGet]
    public async Task<ActionResult<FlipsResponseDto>> GetTopFlips(
        [FromQuery] int count = 50,
        [FromQuery] decimal minProfitPercent = 1.0m)
    {
        var flips = await _flipService.GetTopFlipsAsync(count, minProfitPercent);

        var response = new FlipsResponseDto
        {
            Flips = flips,
            GeneratedAt = DateTime.UtcNow,
            TotalItemsAnalyzed = flips.Count
        };

        return Ok(response);
    }

    /// <summary>
    /// GET /api/flips/{productId} — latest spread metrics for one product.
    /// </summary>
    /// <param name="productId">Product id (e.g. ENCHANTED_COAL).</param>
    /// <returns>Spread data or 404 if missing or no valid bid–ask book.</returns>
    [HttpGet("{productId}")]
    public async Task<ActionResult<FlipRecommendationDto>> GetFlipForItem(string productId)
    {
        var flip = await _flipService.GetFlipForItemAsync(productId);

        if (flip == null)
        {
            return NotFound(new { message = $"Product '{productId}' not found or no valid spread data (instant buy must exceed instant sell)" });
        }

        return Ok(flip);
    }
}
