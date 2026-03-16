using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    }
}
