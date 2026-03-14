using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;

namespace AllTrackIn.Api.Models
{
    public enum SpendingEntryType { Transaction, Fixed, Product, Cart }
    public enum TransactionType { Expense, Income, Saving }
    public enum SpendingFrequency { Daily, Weekly, Monthly, Yearly }

    public class CartItem
    {
        [BsonElement("productId")]
        public string ProductId { get; set; } = string.Empty;

        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("price")]
        public decimal? Price { get; set; }

        [BsonElement("unit")]
        public string Unit { get; set; }

        [BsonElement("category")]
        public string Category { get; set; } = string.Empty;

        [BsonElement("checked")]
        public bool Checked { get; set; }
    }

    public class SpendingEntry : BaseDocument
    {
        [BsonElement("entryType")]
        [BsonRepresentation(MongoDB.Bson.BsonType.String)]
        public SpendingEntryType EntryType { get; set; }

        [BsonElement("date")]
        public string Date { get; set; }

        [BsonElement("amount")]
        public decimal Amount { get; set; }

        [BsonElement("category")]
        public string Category { get; set; } = string.Empty;

        [BsonElement("description")]
        public string Description { get; set; }

        [BsonElement("transactionType")]
        [BsonRepresentation(MongoDB.Bson.BsonType.String)]
        public TransactionType? TransactionType { get; set; }

        [BsonElement("dayOfMonth")]
        public int? DayOfMonth { get; set; }

        [BsonElement("dayOfWeek")]
        public int? DayOfWeek { get; set; }

        [BsonElement("frequency")]
        [BsonRepresentation(MongoDB.Bson.BsonType.String)]
        public SpendingFrequency? Frequency { get; set; }

        [BsonElement("recurring")]
        public bool? Recurring { get; set; }

        [BsonElement("name")]
        public string Name { get; set; }

        [BsonElement("price")]
        public decimal? Price { get; set; }

        [BsonElement("unit")]
        public string Unit { get; set; }

        [BsonElement("cartItems")]
        public List<CartItem> CartItems { get; set; }

        [BsonElement("estimatedTotal")]
        public decimal? EstimatedTotal { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "plan";
    }
}
