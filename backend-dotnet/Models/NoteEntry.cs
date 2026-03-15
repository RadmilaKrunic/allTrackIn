using LiteDB;

namespace AllTrackIn.Api.Models;

public class NoteEntry : BaseDocument
{
    [BsonField("date")]
    public string Date { get; set; } = string.Empty;

    [BsonField("title")]
    public string? Title { get; set; }

    [BsonField("text")]
    public string Text { get; set; } = string.Empty;
}
