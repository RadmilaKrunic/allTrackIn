using LiteDB;
using System.Collections.Generic;

namespace AllTrackIn.Api.Models
{
    public class Meal
    {
        [BsonField("name")]
        public string Name { get; set; } = string.Empty;

        [BsonField("time")]
        public string Time { get; set; }

        [BsonField("notes")]
        public string Notes { get; set; }
    }

    public class EatingEntry : BaseDocument
    {
        [BsonField("entryType")]
        public string EntryType { get; set; } = "daily_log";

        [BsonField("date")]
        public string Date { get; set; }

        [BsonField("status")]
        public string Status { get; set; }

        [BsonField("categories")]
        public List<string> Categories { get; set; }

        [BsonField("meals")]
        public List<Meal> Meals { get; set; }

        [BsonField("notes")]
        public string Notes { get; set; }

        [BsonField("name")]
        public string Name { get; set; }

        [BsonField("ingredients")]
        public List<string> Ingredients { get; set; }

        [BsonField("instructions")]
        public string Instructions { get; set; }

        [BsonField("tags")]
        public List<string> Tags { get; set; }
    }
}
