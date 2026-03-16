using LiteDB;

namespace AllTrackIn.Api.Models
{
    public class ReadingLogEntry : BaseDocument
    {
        [BsonField("date")]
        public string Date { get; set; }

        [BsonField("read")]
        public bool Read { get; set; }
    }
}
