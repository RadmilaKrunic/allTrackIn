using MongoDB.Bson.Serialization.Attributes;

namespace AllTrackIn.Api.Models;

public class TodoItem
{
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [BsonElement("text")]
    public string Text { get; set; } = string.Empty;

    [BsonElement("done")]
    public bool Done { get; set; }
}

public class TodoEntry : BaseDocument
{
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("date")]
    public string Date { get; set; } = string.Empty; // yyyy-MM-dd

    [BsonElement("items")]
    public List<TodoItem> Items { get; set; } = [];
}
