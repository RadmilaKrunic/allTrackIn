using LiteDB;

namespace AllTrackIn.Api.Models
{
    public class User : BaseDocument
    {
        [BsonField("email")]
        public string Email { get; set; } = string.Empty;

        [BsonField("name")]
        public string Name { get; set; } = string.Empty;

        [BsonField("passwordHash")]
        public string PasswordHash { get; set; } = string.Empty;
    }
}
