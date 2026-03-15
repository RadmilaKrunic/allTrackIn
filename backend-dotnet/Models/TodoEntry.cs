using LiteDB;

namespace AllTrackIn.Api.Models;

public class TodoItem
{
    [BsonField("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [BsonField("text")]
    public string Text { get; set; } = string.Empty;

    [BsonField("done")]
    public bool Done { get; set; }
}

public class TodoEntry : BaseDocument
{
    [BsonField("title")]
    public string Title { get; set; } = string.Empty;

    [BsonField("date")]
    public string Date { get; set; } = string.Empty; // yyyy-MM-dd

    [BsonField("items")]
    public List<TodoItem> Items { get; set; } = [];
}
