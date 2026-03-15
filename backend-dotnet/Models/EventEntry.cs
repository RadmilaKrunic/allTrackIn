using LiteDB;

namespace AllTrackIn.Api.Models;

public class EventEntry : BaseDocument
{
    [BsonField("name")]
    public string Name { get; set; } = string.Empty;

    [BsonField("date")]
    public string Date { get; set; } = string.Empty;

    [BsonField("time")]
    public string? Time { get; set; }

    [BsonField("endDate")]
    public string? EndDate { get; set; }

    [BsonField("eventType")]
    public string EventType { get; set; } = "other"; // birthday, vacation, appointment, reminder, holiday, other

    [BsonField("description")]
    public string? Description { get; set; }

    [BsonField("location")]
    public string? Location { get; set; }

    [BsonField("recurring")]
    public bool? Recurring { get; set; }

    [BsonField("status")]
    public string Status { get; set; } = "plan";

    [BsonField("color")]
    public string? Color { get; set; }
}
