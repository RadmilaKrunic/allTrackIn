using LiteDB;

namespace AllTrackIn.Api.Models
{
    public class WorkEntry : BaseDocument
    {
        [BsonField("date")]
        public string Date { get; set; } = string.Empty;

        [BsonField("locationType")]
        public string LocationType { get; set; } = "office";

        [BsonField("tableNumber")]
        public string TableNumber { get; set; }

        [BsonField("startTime")]
        public string StartTime { get; set; }

        [BsonField("endTime")]
        public string EndTime { get; set; }

        [BsonField("notes")]
        public string Notes { get; set; }

        [BsonField("status")]
        public string Status { get; set; } = "plan";
    }
}
