using LiteDB;

namespace AllTrackIn.Api.Models;

public class CartItem
{
    [BsonField("productId")]
    public string ProductId { get; set; } = string.Empty;

    [BsonField("name")]
    public string Name { get; set; } = string.Empty;

    [BsonField("price")]
    public decimal? Price { get; set; }

    [BsonField("unit")]
    public string? Unit { get; set; }

    [BsonField("category")]
    public string Category { get; set; } = string.Empty;

    [BsonField("checked")]
    public bool Checked { get; set; }
}

public class SpendingEntry : BaseDocument
{
    [BsonField("entryType")]
    public string EntryType { get; set; } = "transaction";

    [BsonField("date")]
    public string? Date { get; set; }

    [BsonField("amount")]
    public decimal Amount { get; set; }

    [BsonField("category")]
    public string Category { get; set; } = string.Empty;

    [BsonField("description")]
    public string? Description { get; set; }

    [BsonField("transactionType")]
    public string? TransactionType { get; set; }

    // Fixed bill extras
    [BsonField("dayOfMonth")]
    public int? DayOfMonth { get; set; }

    [BsonField("dayOfWeek")]
    public int? DayOfWeek { get; set; }

    [BsonField("frequency")]
    public string? Frequency { get; set; }

    [BsonField("recurring")]
    public bool? Recurring { get; set; }

    // Product extras
    [BsonField("name")]
    public string? Name { get; set; }

    [BsonField("price")]
    public decimal? Price { get; set; }

    [BsonField("unit")]
    public string? Unit { get; set; }

    // Cart extras
    [BsonField("cartItems")]
    public List<CartItem>? CartItems { get; set; }

    [BsonField("estimatedTotal")]
    public decimal? EstimatedTotal { get; set; }

    // Plan/done
    [BsonField("status")]
    public string Status { get; set; } = "plan";
}
