using LiteDB;
using System.Collections.Generic;

namespace AllTrackIn.Api.Models
{
    public class Category : BaseDocument
    {
        [BsonField("module")]
        public string Module { get; set; } = string.Empty;

        [BsonField("name")]
        public string Name { get; set; } = string.Empty;

        [BsonField("color")]
        public string Color { get; set; }

        [BsonField("icon")]
        public string Icon { get; set; }
    }

    public class Preferences : BaseDocument
    {
        [BsonField("theme")]
        public string Theme { get; set; } = "default";

        [BsonField("enabledModules")]
        public List<string> EnabledModules { get; set; }
    }

    public class Quote : BaseDocument
    {
        [BsonField("text")]
        public string Text { get; set; } = string.Empty;

        [BsonField("author")]
        public string Author { get; set; }

        [BsonField("active")]
        public bool Active { get; set; } = true;
    }
}
