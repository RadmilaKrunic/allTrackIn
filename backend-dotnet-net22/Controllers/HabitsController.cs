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
    [Route("api/habits")]
    [Authorize]
    public class HabitsController : ControllerBase
    {
        private readonly BaseService<HabitDefinition> _habitsService;
        private readonly BaseService<HabitLog> _logsService;

        public HabitsController(MongoDbContext db)
        {
            _habitsService = new BaseService<HabitDefinition>(db.Habits);
            _logsService = new BaseService<HabitLog>(db.HabitLogs);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool? active)
        {
            var uid = User.GetUserId();
            var filter = Builders<HabitDefinition>.Filter.Eq(e => e.UserId, uid);
            if (active.HasValue)
                filter &= Builders<HabitDefinition>.Filter.Eq(e => e.Active, active.Value);

            var sort = Builders<HabitDefinition>.Sort.Ascending(e => e.Order);
            var result = await _habitsService.FindAllAsync(filter, sort);
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] HabitDefinition habit)
        {
            habit.UserId = User.GetUserId();
            habit.Id = null;
            var created = await _habitsService.CreateAsync(habit);
            return StatusCode(201, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] HabitDefinition habit)
        {
            var uid = User.GetUserId();
            var existing = await _habitsService.FindByIdAsync(id);
            if (existing == null || existing.UserId != uid) return NotFound();

            var update = Builders<HabitDefinition>.Update
                .Set(e => e.Name, habit.Name)
                .Set(e => e.Icon, habit.Icon)
                .Set(e => e.Color, habit.Color)
                .Set(e => e.Active, habit.Active)
                .Set(e => e.Order, habit.Order);

            var updated = await _habitsService.UpdateAsync(id, update);
            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var uid = User.GetUserId();
            var existing = await _habitsService.FindByIdAsync(id);
            if (existing == null || existing.UserId != uid) return NotFound();
            await _habitsService.DeleteAsync(id);
            return NoContent();
        }

        [HttpGet("log")]
        public async Task<IActionResult> GetLogs([FromQuery] string date, [FromQuery] string startDate,
            [FromQuery] string endDate, [FromQuery] string habitId)
        {
            var uid = User.GetUserId();
            var filter = Builders<HabitLog>.Filter.Eq(e => e.UserId, uid);

            if (!string.IsNullOrEmpty(date))
                filter &= Builders<HabitLog>.Filter.Eq(e => e.Date, date);
            else if (!string.IsNullOrEmpty(startDate) && !string.IsNullOrEmpty(endDate))
                filter &= Builders<HabitLog>.Filter.Gte(e => e.Date, startDate)
                        & Builders<HabitLog>.Filter.Lte(e => e.Date, endDate);

            if (!string.IsNullOrEmpty(habitId))
                filter &= Builders<HabitLog>.Filter.Eq(e => e.HabitId, habitId);

            var result = await _logsService.FindAllAsync(filter);
            return Ok(result);
        }

        [HttpPut("log/{date}/{habitId}")]
        public async Task<IActionResult> ToggleLog(string date, string habitId, [FromBody] ToggleLogRequest req)
        {
            var uid = User.GetUserId();
            var filter = Builders<HabitLog>.Filter.Eq(e => e.UserId, uid)
                & Builders<HabitLog>.Filter.Eq(e => e.Date, date)
                & Builders<HabitLog>.Filter.Eq(e => e.HabitId, habitId);

            var existing = await _logsService.FindOneAsync(filter);

            if (existing == null)
            {
                var created = await _logsService.CreateAsync(new HabitLog
                {
                    UserId = uid,
                    Date = date,
                    HabitId = habitId,
                    Done = req.Done
                });
                return Ok(created);
            }

            var update = Builders<HabitLog>.Update.Set(e => e.Done, req.Done);
            var updated = await _logsService.UpdateAsync(existing.Id, update);
            return Ok(updated);
        }
    }

    public class ToggleLogRequest
    {
        public bool Done { get; set; }
    }
}
