namespace AllTrackIn.Api.Configuration
{
    public class LiteDbSettings
    {
        public string DatabasePath { get; set; } = "allTrackin.db";
    }

    public class JwtSettings
    {
        public string Secret { get; set; } = string.Empty;
        public int ExpiryDays { get; set; } = 30;
    }
}
