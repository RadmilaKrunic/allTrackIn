using MongoDB.Bson.Serialization.Attributes;

namespace AllTrackIn.Api.Models
{
    public class User : BaseDocument
    {
        [BsonElement("email")]
        public string Email { get; set; } = string.Empty;

        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("passwordHash")]
        public string PasswordHash { get; set; } = string.Empty;
    }
}
