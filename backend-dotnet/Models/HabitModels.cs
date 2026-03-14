using MongoDB.Bson.Serialization.Attributes;

namespace AllTrackIn.Api.Models;

public class HabitDefinition : BaseDocument
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("icon")]
    public string? Icon { get; set; }

    [BsonElement("color")]
    public string? Color { get; set; }

    [BsonElement("active")]
    public bool Active { get; set; } = true;

    [BsonElement("order")]
    public int? Order { get; set; }
}

public class HabitLog : BaseDocument
{
    [BsonElement("date")]
    public string Date { get; set; } = string.Empty; // yyyy-MM-dd

    [BsonElement("habitId")]
    public string HabitId { get; set; } = string.Empty;

    [BsonElement("done")]
    public bool Done { get; set; }
}
