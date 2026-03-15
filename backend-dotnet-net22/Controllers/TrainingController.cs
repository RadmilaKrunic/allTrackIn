using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace AllTrackIn.Api.Controllers
{
    [ApiController]
    [Route("api/training")]
    [Authorize]
    public class TrainingController : ControllerBase
    {
        private readonly BaseService<TrainingEntry> _service;

        public TrainingController(LiteDbContext db)
        {
            _service = new BaseService<TrainingEntry>(db.Training);
        }

        [HttpGet]
        public IActionResult GetAll([FromQuery] string date, [FromQuery] string startDate, [FromQuery] string endDate)
        {
            var uid = User.GetUserId();
            var result = _service.FindAll(e => e.UserId == uid
                && (date == null || e.Date == date)
                && (startDate == null || endDate == null || (e.Date != null && string.Compare(e.Date, startDate) >= 0 && string.Compare(e.Date, endDate) <= 0)));
            return Ok(result.OrderByDescending(e => e.Date).ToList());
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
        public IActionResult Create([FromBody] TrainingEntry entry)
        {
            entry.UserId = User.GetUserId();
            entry.Id = null;
            var created = _service.Create(entry);
            return StatusCode(201, created);
        }

        [HttpPut("{id}")]
        public IActionResult Update(string id, [FromBody] TrainingEntry entry)
        {
            var uid = User.GetUserId();
            var existing = _service.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();

            existing.Date = entry.Date;
            existing.ActivityType = entry.ActivityType;
            existing.Status = entry.Status;
            existing.Duration = entry.Duration;
            existing.Notes = entry.Notes;
            existing.Distance = entry.Distance;
            existing.Pace = entry.Pace;
            existing.WorkoutType = entry.WorkoutType;
            existing.Exercises = entry.Exercises;
            existing.Properties = entry.Properties;

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
