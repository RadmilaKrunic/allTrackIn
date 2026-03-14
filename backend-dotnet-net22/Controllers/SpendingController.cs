using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using System.Threading.Tasks;

namespace AllTrackIn.Api.Controllers
{
    [ApiController]
    [Route("api/spending")]
    [Authorize]
    public class SpendingController : ControllerBase
    {
        private readonly BaseService<SpendingEntry> _service;

        public SpendingController(MongoDbContext db)
        {
            _service = new BaseService<SpendingEntry>(db.Spending);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string entryType, [FromQuery] string date,
            [FromQuery] string startDate, [FromQuery] string endDate)
        {
            var uid = User.GetUserId();
            var filter = Builders<SpendingEntry>.Filter.Eq(e => e.UserId, uid);

            if (!string.IsNullOrEmpty(entryType))
                filter &= Builders<SpendingEntry>.Filter.Regex(e => e.EntryType, new MongoDB.Bson.BsonRegularExpression($"^{entryType}$", "i"));
            if (!string.IsNullOrEmpty(date))
                filter &= Builders<SpendingEntry>.Filter.Eq(e => e.Date, date);
            if (!string.IsNullOrEmpty(startDate) && !string.IsNullOrEmpty(endDate))
                filter &= Builders<SpendingEntry>.Filter.Gte(e => e.Date, startDate) & Builders<SpendingEntry>.Filter.Lte(e => e.Date, endDate);

            var sort = Builders<SpendingEntry>.Sort.Descending(e => e.CreatedAt);
            var result = await _service.FindAllAsync(filter, sort);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetOne(string id)
        {
            var uid = User.GetUserId();
            var entry = await _service.FindByIdAsync(id);
            if (entry == null || entry.UserId != uid) return NotFound();
            return Ok(entry);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] SpendingEntry entry)
        {
            entry.UserId = User.GetUserId();
            entry.Id = null;
            var created = await _service.CreateAsync(entry);
            return StatusCode(201, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] SpendingEntry entry)
        {
            var uid = User.GetUserId();
            var existing = await _service.FindByIdAsync(id);
            if (existing == null || existing.UserId != uid) return NotFound();

            var update = Builders<SpendingEntry>.Update
                .Set(e => e.EntryType, entry.EntryType)
                .Set(e => e.Date, entry.Date)
                .Set(e => e.Amount, entry.Amount)
                .Set(e => e.Category, entry.Category)
                .Set(e => e.Description, entry.Description)
                .Set(e => e.TransactionType, entry.TransactionType)
                .Set(e => e.DayOfMonth, entry.DayOfMonth)
                .Set(e => e.DayOfWeek, entry.DayOfWeek)
                .Set(e => e.Frequency, entry.Frequency)
                .Set(e => e.Recurring, entry.Recurring)
                .Set(e => e.Name, entry.Name)
                .Set(e => e.Price, entry.Price)
                .Set(e => e.Unit, entry.Unit)
                .Set(e => e.CartItems, entry.CartItems)
                .Set(e => e.EstimatedTotal, entry.EstimatedTotal)
                .Set(e => e.Status, entry.Status);

            var updated = await _service.UpdateAsync(id, update);
            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var uid = User.GetUserId();
            var existing = await _service.FindByIdAsync(id);
            if (existing == null || existing.UserId != uid) return NotFound();
            await _service.DeleteAsync(id);
            return NoContent();
        }
    }
}
