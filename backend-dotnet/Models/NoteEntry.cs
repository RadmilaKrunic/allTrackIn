using MongoDB.Bson.Serialization.Attributes;

namespace AllTrackIn.Api.Models;

public class NoteEntry : BaseDocument
{
    [BsonElement("date")]
    public string Date { get; set; } = string.Empty;

    [BsonElement("title")]
    public string? Title { get; set; }

    [BsonElement("text")]
    public string Text { get; set; } = string.Empty;
}
