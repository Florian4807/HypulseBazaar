namespace SkyBazaar.Models;

/// <summary>
/// Result of importing Coflnet history into local snapshots.
/// </summary>
public class CoflnetHistoryImportResultDto
{
    public string ProductId { get; set; } = string.Empty;

    public int Imported { get; set; }

    public int SkippedDuplicates { get; set; }

    public int SkippedInvalid { get; set; }

    public int PointsReceived { get; set; }
}
