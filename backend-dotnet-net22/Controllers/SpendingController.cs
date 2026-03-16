using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;

namespace AllTrackIn.Api.Controllers
{
    [ApiController]
    [Route("api/spending")]
    [Authorize]
    public class SpendingController : ControllerBase
    {
        private readonly BaseService<SpendingEntry> _service;

        public SpendingController(LiteDbContext db)
        {
            _service = new BaseService<SpendingEntry>(db.Spending);
        }

        // ── Generic (filterable) ──────────────────────────────────────────────

        [HttpGet]
        public IActionResult GetAll([FromQuery] string entryType, [FromQuery] string date,
            [FromQuery] string startDate, [FromQuery] string endDate)
        {
            var uid = User.GetUserId();
            var result = _service.FindAll(e => e.UserId == uid
                && (entryType == null || e.EntryType == entryType)
                && (date == null || e.Date == date))
                .Where(e => startDate == null || endDate == null || (e.Date != null && string.Compare(e.Date, startDate) >= 0 && string.Compare(e.Date, endDate) <= 0))
                .ToList();
            return Ok(result.OrderByDescending(e => e.CreatedAt).ToList());
        }

        [HttpGet("{id}")]
        public IActionResult GetOne(string id)
        {
            var uid = User.GetUserId();
            var entry = _service.FindById(id);
            if (entry == null || entry.UserId != uid) return NotFound();
            return Ok(entry);
        }

        [HttpPost]
        public IActionResult Create([FromBody] SpendingEntry entry)
        {
            entry.UserId = User.GetUserId();
            entry.Id = null;
            var created = _service.Create(entry);
            return StatusCode(201, created);
        }

        [HttpPut("{id}")]
        public IActionResult Update(string id, [FromBody] SpendingEntry entry)
        {
            var uid = User.GetUserId();
            var existing = _service.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();

            existing.EntryType = entry.EntryType;
            existing.Date = entry.Date;
            existing.Amount = entry.Amount;
            existing.Category = entry.Category;
            existing.Description = entry.Description;
            existing.TransactionType = entry.TransactionType;
            existing.DayOfMonth = entry.DayOfMonth;
            existing.DayOfWeek = entry.DayOfWeek;
            existing.Frequency = entry.Frequency;
            existing.Recurring = entry.Recurring;
            existing.Name = entry.Name;
            existing.Price = entry.Price;
            existing.Unit = entry.Unit;
            existing.CartItems = entry.CartItems;
            existing.EstimatedTotal = entry.EstimatedTotal;
            existing.Status = entry.Status;

            var updated = _service.Update(existing);
            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(string id)
        {
            var uid = User.GetUserId();
            var existing = _service.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();
            _service.Delete(id);
            return NoContent();
        }

        // ── Transactions ──────────────────────────────────────────────────────

        [HttpGet("transactions")]
        public IActionResult GetTransactions()
        {
            var uid = User.GetUserId();
            var result = _service.FindAll(e => e.UserId == uid && e.EntryType == "transaction");
            return Ok(result.OrderByDescending(e => e.Date).ToList());
        }

        [HttpPost("transactions")]
        public IActionResult CreateTransaction([FromBody] SpendingEntry entry)
        {
            entry.UserId = User.GetUserId();
            entry.Id = null;
            entry.EntryType = "transaction";
            var created = _service.Create(entry);
            return StatusCode(201, created);
        }

        [HttpPut("transactions/{id}")]
        public IActionResult UpdateTransaction(string id, [FromBody] SpendingEntry entry)
        {
            var uid = User.GetUserId();
            var existing = _service.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();

            existing.Date = entry.Date;
            existing.Amount = entry.Amount;
            existing.Category = entry.Category;
            existing.Description = entry.Description;
            existing.TransactionType = entry.TransactionType;
            existing.Status = entry.Status;

            var updated = _service.Update(existing);
            return Ok(updated);
        }

        [HttpDelete("transactions/{id}")]
        public IActionResult DeleteTransaction(string id)
        {
            var uid = User.GetUserId();
            var existing = _service.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();
            _service.Delete(id);
            return NoContent();
        }

        // ── Fixed Bills ───────────────────────────────────────────────────────

        [HttpGet("fixed")]
        public IActionResult GetFixed()
        {
            var uid = User.GetUserId();
            var result = _service.FindAll(e => e.UserId == uid && e.EntryType == "fixed");
            return Ok(result.OrderByDescending(e => e.CreatedAt).ToList());
        }

        [HttpPost("fixed")]
        public IActionResult CreateFixed([FromBody] SpendingEntry entry)
        {
            entry.UserId = User.GetUserId();
            entry.Id = null;
            entry.EntryType = "fixed";
            var created = _service.Create(entry);
            return StatusCode(201, created);
        }

        [HttpPut("fixed/{id}")]
        public IActionResult UpdateFixed(string id, [FromBody] SpendingEntry entry)
        {
            var uid = User.GetUserId();
            var existing = _service.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();

            existing.Amount = entry.Amount;
            existing.Category = entry.Category;
            existing.Description = entry.Description;
            existing.Frequency = entry.Frequency;
            existing.DayOfMonth = entry.DayOfMonth;
            existing.DayOfWeek = entry.DayOfWeek;
            existing.Status = entry.Status;

            var updated = _service.Update(existing);
            return Ok(updated);
        }

        [HttpDelete("fixed/{id}")]
        public IActionResult DeleteFixed(string id)
        {
            var uid = User.GetUserId();
            var existing = _service.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();
            _service.Delete(id);
            return NoContent();
        }

        // ── Products ──────────────────────────────────────────────────────────

        [HttpGet("products")]
        public IActionResult GetProducts()
        {
            var uid = User.GetUserId();
            var result = _service.FindAll(e => e.UserId == uid && e.EntryType == "product");
            return Ok(result.OrderByDescending(e => e.CreatedAt).ToList());
        }

        [HttpPost("products")]
        public IActionResult CreateProduct([FromBody] SpendingEntry entry)
        {
            entry.UserId = User.GetUserId();
            entry.Id = null;
            entry.EntryType = "product";
            var created = _service.Create(entry);
            return StatusCode(201, created);
        }

        [HttpPut("products/{id}")]
        public IActionResult UpdateProduct(string id, [FromBody] SpendingEntry entry)
        {
            var uid = User.GetUserId();
            var existing = _service.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();

            existing.Name = entry.Name;
            existing.Price = entry.Price;
            existing.Unit = entry.Unit;
            existing.Category = entry.Category;
            existing.Status = entry.Status;

            var updated = _service.Update(existing);
            return Ok(updated);
        }

        [HttpDelete("products/{id}")]
        public IActionResult DeleteProduct(string id)
        {
            var uid = User.GetUserId();
            var existing = _service.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();
            _service.Delete(id);
            return NoContent();
        }

        // ── Shopping List ─────────────────────────────────────────────────────

        [HttpPost("shopping-list")]
        public IActionResult CreateShoppingList([FromBody] ShoppingListRequest body)
        {
            var uid = User.GetUserId();
            var products = _service.FindAll(e => e.UserId == uid && e.EntryType == "product"
                && body.ProductIds.Contains(e.Id));
            var estimatedTotal = products.Sum(p => p.Price ?? 0);
            return Ok(new { items = products, estimatedTotal });
        }

        // ── Cart ──────────────────────────────────────────────────────────────

        [HttpGet("cart")]
        public IActionResult GetCart()
        {
            var uid = User.GetUserId();
            var result = _service.FindAll(e => e.UserId == uid && e.EntryType == "cart");
            return Ok(result.OrderByDescending(e => e.CreatedAt).ToList());
        }

        [HttpPost("cart")]
        public IActionResult CreateCart([FromBody] CreateCartRequest body)
        {
            var uid = User.GetUserId();
            var products = _service.FindAll(e => e.UserId == uid && e.EntryType == "product"
                && body.ProductIds.Contains(e.Id));
            var cartItems = products.Select(p => new CartItem
            {
                ProductId = p.Id,
                Name = p.Name ?? p.Category,
                Price = p.Price,
                Unit = p.Unit,
                Category = p.Category,
                Checked = false,
            }).ToList();
            var estimatedTotal = products.Sum(p => p.Price ?? 0);
            var entry = new SpendingEntry
            {
                UserId = uid,
                EntryType = "cart",
                Name = body.Name ?? "Shopping List",
                CartItems = cartItems,
                EstimatedTotal = estimatedTotal,
                Status = "plan",
            };
            var created = _service.Create(entry);
            return StatusCode(201, created);
        }

        [HttpPut("cart/{id}")]
        public IActionResult UpdateCart(string id, [FromBody] SpendingEntry entry)
        {
            var uid = User.GetUserId();
            var existing = _service.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();

            if (entry.CartItems != null) existing.CartItems = entry.CartItems;
            if (entry.Name != null) existing.Name = entry.Name;
            if (entry.Status != null) existing.Status = entry.Status;

            var updated = _service.Update(existing);
            return Ok(updated);
        }

        [HttpDelete("cart/{id}")]
        public IActionResult DeleteCart(string id)
        {
            var uid = User.GetUserId();
            var existing = _service.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();
            _service.Delete(id);
            return NoContent();
        }

        // ── Summary ───────────────────────────────────────────────────────────

        [HttpGet("summary")]
        public IActionResult GetSummary([FromQuery] string month)
        {
            var uid = User.GetUserId();
            var monthStr = month ?? DateTime.UtcNow.ToString("yyyy-MM");
            var all = _service.FindAll(e => e.UserId == uid && e.EntryType == "transaction"
                && e.Date != null && e.Date.StartsWith(monthStr) && e.Status == "done");
            var expenses = all.Where(e => e.TransactionType == "expense").Sum(e => e.Amount);
            var income = all.Where(e => e.TransactionType == "income").Sum(e => e.Amount);
            var saving = all.Where(e => e.TransactionType == "saving").Sum(e => e.Amount);
            return Ok(new { month = monthStr, expenses, income, saving, balance = income - expenses });
        }
    }

    public class ShoppingListRequest
    {
        [JsonProperty("productIds")]
        public List<string> ProductIds { get; set; } = new List<string>();
    }

    public class CreateCartRequest
    {
        [JsonProperty("productIds")]
        public List<string> ProductIds { get; set; } = new List<string>();

        [JsonProperty("name")]
        public string Name { get; set; }
    }
}
