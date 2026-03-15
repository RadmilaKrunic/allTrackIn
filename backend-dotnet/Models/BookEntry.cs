using LiteDB;

namespace AllTrackIn.Api.Models;

public class BookEntry : BaseDocument
{
    [BsonField("title")]
    public string Title { get; set; } = string.Empty;

    [BsonField("author")]
    public string? Author { get; set; }

    [BsonField("genre")]
    public string? Genre { get; set; }

    [BsonField("status")]
    public string Status { get; set; } = "wishlist"; // reading, finished, paused, wishlist

    [BsonField("listType")]
    public string? ListType { get; set; } // reading, wishlist

    [BsonField("startDate")]
    public string? StartDate { get; set; }

    [BsonField("endDate")]
    public string? EndDate { get; set; }

    [BsonField("rating")]
    public int? Rating { get; set; }

    [BsonField("notes")]
    public string? Notes { get; set; }

    [BsonField("borrowType")]
    public string? BorrowType { get; set; } // borrowed_from, lent_to

    [BsonField("borrowPerson")]
    public string? BorrowPerson { get; set; }

    [BsonField("borrowDate")]
    public string? BorrowDate { get; set; }
}
