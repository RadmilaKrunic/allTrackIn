using MongoDB.Bson.Serialization.Attributes;

namespace AllTrackIn.Api.Models
{
    public class BookEntry : BaseDocument
    {
        [BsonElement("title")]
        public string Title { get; set; } = string.Empty;

        [BsonElement("author")]
        public string Author { get; set; }

        [BsonElement("genre")]
        public string Genre { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "wishlist";

        [BsonElement("listType")]
        public string ListType { get; set; }

        [BsonElement("startDate")]
        public string StartDate { get; set; }

        [BsonElement("endDate")]
        public string EndDate { get; set; }

        [BsonElement("rating")]
        public int? Rating { get; set; }

        [BsonElement("notes")]
        public string Notes { get; set; }

        [BsonElement("borrowType")]
        public string BorrowType { get; set; }

        [BsonElement("borrowPerson")]
        public string BorrowPerson { get; set; }

        [BsonElement("borrowDate")]
        public string BorrowDate { get; set; }
    }
}
