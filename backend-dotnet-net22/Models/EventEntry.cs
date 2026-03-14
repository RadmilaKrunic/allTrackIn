using MongoDB.Bson.Serialization.Attributes;

namespace AllTrackIn.Api.Models
{
    public class EventEntry : BaseDocument
    {
        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("date")]
        public string Date { get; set; } = string.Empty;

        [BsonElement("time")]
        public string Time { get; set; }

        [BsonElement("endDate")]
        public string EndDate { get; set; }

        [BsonElement("eventType")]
        public string EventType { get; set; } = "other";

        [BsonElement("description")]
        public string Description { get; set; }

        [BsonElement("location")]
        public string Location { get; set; }

        [BsonElement("recurring")]
        public bool? Recurring { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "plan";

        [BsonElement("color")]
        public string Color { get; set; }
    }
}
