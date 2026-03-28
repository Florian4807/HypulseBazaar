using Microsoft.AspNetCore.Mvc;
using SkyBazaar.Models;
using SkyBazaar.Services;

namespace SkyBazaar.Controllers;

/// <summary>
/// Controller for flip detection API endpoints.
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
    /// GET /api/flips - Returns top flip opportunities sorted by profit potential.
    /// </summary>
    /// <param name="count">Maximum number of flips to return (default 50).</param>
    /// <param name="minProfitPercent">Minimum profit percentage to include (default 1.0).</param>
    /// <returns>List of flip recommendations sorted by recommendation score.</returns>
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
    /// GET /api/flips/{productId} - Returns flip recommendation for a specific item.
    /// </summary>
    /// <param name="productId">The product identifier (e.g., "ENCHANTED_COAL").</param>
    /// <returns>Flip recommendation for the specified product.</returns>
    [HttpGet("{productId}")]
    public async Task<ActionResult<FlipRecommendationDto>> GetFlipForItem(string productId)
    {
        var flip = await _flipService.GetFlipForItemAsync(productId);

        if (flip == null)
        {
            return NotFound(new { message = $"Product '{productId}' not found or no valid flip data" });
        }

        return Ok(flip);
    }
}
