using MongoDB.Bson.Serialization.Attributes;

namespace AllTrackIn.Api.Models
{
    public class WorkEntry : BaseDocument
    {
        [BsonElement("date")]
        public string Date { get; set; } = string.Empty;

        [BsonElement("locationType")]
        public string LocationType { get; set; } = "office";

        [BsonElement("tableNumber")]
        public string TableNumber { get; set; }

        [BsonElement("startTime")]
        public string StartTime { get; set; }

        [BsonElement("endTime")]
        public string EndTime { get; set; }

        [BsonElement("notes")]
        public string Notes { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "plan";
    }
}
