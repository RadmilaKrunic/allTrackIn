using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace AllTrackIn.Api.Controllers
{
    [ApiController]
    [Route("api/habits")]
    [Authorize]
    public class HabitsController : ControllerBase
    {
        private readonly BaseService<HabitDefinition> _habitsService;
        private readonly BaseService<HabitLog> _logsService;

        public HabitsController(LiteDbContext db)
        {
            _habitsService = new BaseService<HabitDefinition>(db.Habits);
            _logsService = new BaseService<HabitLog>(db.HabitLogs);
        }

        [HttpGet]
        public IActionResult GetAll([FromQuery] bool? active)
        {
            var uid = User.GetUserId();
            var result = _habitsService.FindAll(e => e.UserId == uid
                && (!active.HasValue || e.Active == active.Value));
            return Ok(result.OrderBy(e => e.Order).ToList());
        }

        [HttpPost]
        public IActionResult Create([FromBody] HabitDefinition habit)
        {
            habit.UserId = User.GetUserId();
            habit.Id = null;
            var created = _habitsService.Create(habit);
            return StatusCode(201, created);
        }

        [HttpPut("{id}")]
        public IActionResult Update(string id, [FromBody] HabitDefinition habit)
        {
            var uid = User.GetUserId();
            var existing = _habitsService.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();

            existing.Name = habit.Name;
            existing.Icon = habit.Icon;
            existing.Color = habit.Color;
            existing.Active = habit.Active;
            existing.Order = habit.Order;

            var updated = _habitsService.Update(existing);
            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(string id)
        {
            var uid = User.GetUserId();
            var existing = _habitsService.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();
            _habitsService.Delete(id);
            return NoContent();
        }

        [HttpGet("log")]
        public IActionResult GetLogs([FromQuery] string date, [FromQuery] string startDate,
            [FromQuery] string endDate, [FromQuery] string habitId)
        {
            var uid = User.GetUserId();
            var result = _logsService.FindAll(e => e.UserId == uid
                && (date == null || e.Date == date)
                && (date != null || startDate == null || endDate == null || (e.Date != null && string.Compare(e.Date, startDate) >= 0 && string.Compare(e.Date, endDate) <= 0))
                && (habitId == null || e.HabitId == habitId));
            return Ok(result);
        }

        [HttpPut("log/{date}/{habitId}")]
        public IActionResult ToggleLog(string date, string habitId, [FromBody] ToggleLogRequest req)
        {
            var uid = User.GetUserId();
            var existing = _logsService.FindOne(e => e.UserId == uid && e.Date == date && e.HabitId == habitId);

            if (existing == null)
            {
                var created = _logsService.Create(new HabitLog
                {
                    UserId = uid,
                    Date = date,
                    HabitId = habitId,
                    Done = req.Done
                });
                return Ok(created);
            }

            existing.Done = req.Done;
            var updated = _logsService.Update(existing);
            return Ok(updated);
        }
    }

    public class ToggleLogRequest
    {
        public bool Done { get; set; }
    }
}
