using LiteDB;
using Newtonsoft.Json;
using System;

namespace AllTrackIn.Api.Models
{
    public abstract class BaseDocument
    {
        [BsonId]
        [JsonProperty("_id")]
        public string Id { get; set; }

        [BsonField("userId")]
        public string UserId { get; set; }

        [BsonField("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonField("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
