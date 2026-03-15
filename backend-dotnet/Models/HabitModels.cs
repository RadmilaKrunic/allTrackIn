using LiteDB;

namespace AllTrackIn.Api.Models;

public class HabitDefinition : BaseDocument
{
    [BsonField("name")]
    public string Name { get; set; } = string.Empty;

    [BsonField("icon")]
    public string? Icon { get; set; }

    [BsonField("color")]
    public string? Color { get; set; }

    [BsonField("active")]
    public bool Active { get; set; } = true;

    [BsonField("order")]
    public int? Order { get; set; }
}

public class HabitLog : BaseDocument
{
    [BsonField("date")]
    public string Date { get; set; } = string.Empty; // yyyy-MM-dd

    [BsonField("habitId")]
    public string HabitId { get; set; } = string.Empty;

    [BsonField("done")]
    public bool Done { get; set; }
}
