using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;

namespace AllTrackIn.Api.Models
{
    public class PeriodEntry : BaseDocument
    {
        [BsonElement("startDate")]
        public string StartDate { get; set; } = string.Empty;

        [BsonElement("endDate")]
        public string EndDate { get; set; }

        [BsonElement("bleedingDays")]
        public int? BleedingDays { get; set; }

        [BsonElement("symptoms")]
        public List<string> Symptoms { get; set; }

        [BsonElement("mood")]
        public string Mood { get; set; }

        [BsonElement("notes")]
        public string Notes { get; set; }
    }

    public class PeriodSettings : BaseDocument
    {
        [BsonElement("type")]
        public string Type { get; set; } = "period_settings";

        [BsonElement("averageCycleLength")]
        public int AverageCycleLength { get; set; } = 28;

        [BsonElement("averageBleedingDays")]
        public int AverageBleedingDays { get; set; } = 5;

        [BsonElement("lastPeriodStart")]
        public string LastPeriodStart { get; set; }
    }
}
