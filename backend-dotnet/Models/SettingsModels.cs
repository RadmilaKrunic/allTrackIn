using MongoDB.Bson.Serialization.Attributes;

namespace AllTrackIn.Api.Models;

public class Category : BaseDocument
{
    [BsonElement("type")]
    public string Type { get; set; } = "category";

    [BsonElement("module")]
    public string Module { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("color")]
    public string? Color { get; set; }

    [BsonElement("icon")]
    public string? Icon { get; set; }
}

public class Preferences : BaseDocument
{
    [BsonElement("type")]
    public string Type { get; set; } = "preferences";

    [BsonElement("theme")]
    public string Theme { get; set; } = "default";

    [BsonElement("enabledModules")]
    public List<string>? EnabledModules { get; set; }
}

public class Quote : BaseDocument
{
    [BsonElement("text")]
    public string Text { get; set; } = string.Empty;

    [BsonElement("author")]
    public string? Author { get; set; }

    [BsonElement("active")]
    public bool Active { get; set; } = true;
}
