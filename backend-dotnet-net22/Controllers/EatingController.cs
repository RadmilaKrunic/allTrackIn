using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace AllTrackIn.Api.Controllers
{
    [ApiController]
    [Route("api/eating")]
    [Authorize]
    public class EatingController : ControllerBase
    {
        private readonly BaseService<EatingEntry> _service;

        public EatingController(LiteDbContext db)
        {
            _service = new BaseService<EatingEntry>(db.Eating);
        }

        [HttpGet]
        public IActionResult GetAll([FromQuery] string entryType, [FromQuery] string date,
            [FromQuery] string startDate, [FromQuery] string endDate)
        {
            var uid = User.GetUserId();
            var result = _service.FindAll(e => e.UserId == uid
                && (entryType == null || e.EntryType == entryType)
                && (date == null || e.Date == date)
                && (startDate == null || endDate == null || (e.Date != null && string.Compare(e.Date, startDate) >= 0 && string.Compare(e.Date, endDate) <= 0)));
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
        public IActionResult Create([FromBody] EatingEntry entry)
        {
            entry.UserId = User.GetUserId();
            entry.Id = null;
            var created = _service.Create(entry);
            return StatusCode(201, created);
        }

        [HttpPut("{id}")]
        public IActionResult Update(string id, [FromBody] EatingEntry entry)
        {
            var uid = User.GetUserId();
            var existing = _service.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();

            existing.EntryType = entry.EntryType;
            existing.Date = entry.Date;
            existing.Status = entry.Status;
            existing.Categories = entry.Categories;
            existing.Meals = entry.Meals;
            existing.Notes = entry.Notes;
            existing.Name = entry.Name;
            existing.Ingredients = entry.Ingredients;
            existing.Instructions = entry.Instructions;
            existing.Tags = entry.Tags;

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
