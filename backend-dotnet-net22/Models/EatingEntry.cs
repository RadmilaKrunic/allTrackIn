using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;

namespace AllTrackIn.Api.Models
{
    public class Meal
    {
        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("time")]
        public string Time { get; set; }

        [BsonElement("notes")]
        public string Notes { get; set; }
    }

    public class EatingEntry : BaseDocument
    {
        [BsonElement("entryType")]
        public string EntryType { get; set; } = "daily_log";

        [BsonElement("date")]
        public string Date { get; set; }

        [BsonElement("status")]
        public string Status { get; set; }

        [BsonElement("categories")]
        public List<string> Categories { get; set; }

        [BsonElement("meals")]
        public List<Meal> Meals { get; set; }

        [BsonElement("notes")]
        public string Notes { get; set; }

        [BsonElement("name")]
        public string Name { get; set; }

        [BsonElement("ingredients")]
        public List<string> Ingredients { get; set; }

        [BsonElement("instructions")]
        public string Instructions { get; set; }

        [BsonElement("tags")]
        public List<string> Tags { get; set; }
    }
}
