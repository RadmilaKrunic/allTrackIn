using LiteDB;

namespace AllTrackIn.Api.Models;

public class PeriodEntry : BaseDocument
{
    [BsonField("startDate")]
    public string StartDate { get; set; } = string.Empty;

    [BsonField("endDate")]
    public string? EndDate { get; set; }

    [BsonField("bleedingDays")]
    public int? BleedingDays { get; set; }

    [BsonField("symptoms")]
    public List<string>? Symptoms { get; set; }

    [BsonField("mood")]
    public string? Mood { get; set; }

    [BsonField("notes")]
    public string? Notes { get; set; }
}

public class PeriodSettings : BaseDocument
{
    [BsonField("averageCycleLength")]
    public int AverageCycleLength { get; set; } = 28;

    [BsonField("averageBleedingDays")]
    public int AverageBleedingDays { get; set; } = 5;

    [BsonField("lastPeriodStart")]
    public string? LastPeriodStart { get; set; }
}
