using System.ComponentModel.DataAnnotations;

namespace SkyBazaar.Models;

/// <summary>
/// Represents a bazaar item/product in the SkyBlock economy.
/// </summary>
public class BazaarItem
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string ProductId { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Name { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property for price snapshots.
    /// </summary>
    public ICollection<PriceSnapshot> Snapshots { get; set; } = new List<PriceSnapshot>();
}
