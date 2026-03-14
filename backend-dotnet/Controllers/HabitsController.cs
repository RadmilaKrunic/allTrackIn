using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace AllTrackIn.Api.Controllers;

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

    // ─── Habit Definitions ─────────────────────────────────────────────────────

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

    // ─── Habit Logs ────────────────────────────────────────────────────────────

    [HttpGet("logs")]
    public async Task<IActionResult> GetLogs([FromQuery] string? date, [FromQuery] string? habitId)
    {
        var uid = User.GetUserId();
        var filter = Builders<HabitLog>.Filter.Eq(e => e.UserId, uid);
        if (!string.IsNullOrEmpty(date))
            filter &= Builders<HabitLog>.Filter.Eq(e => e.Date, date);
        if (!string.IsNullOrEmpty(habitId))
            filter &= Builders<HabitLog>.Filter.Eq(e => e.HabitId, habitId);

        var result = await _logsService.FindAllAsync(filter);
        return Ok(result);
    }

    [HttpPost("logs")]
    public async Task<IActionResult> CreateLog([FromBody] HabitLog log)
    {
        log.UserId = User.GetUserId();
        log.Id = null;
        var created = await _logsService.CreateAsync(log);
        return StatusCode(201, created);
    }

    [HttpPut("logs/{id}")]
    public async Task<IActionResult> UpdateLog(string id, [FromBody] HabitLog log)
    {
        var uid = User.GetUserId();
        var existing = await _logsService.FindByIdAsync(id);
        if (existing == null || existing.UserId != uid) return NotFound();

        var update = Builders<HabitLog>.Update
            .Set(e => e.Date, log.Date)
            .Set(e => e.HabitId, log.HabitId)
            .Set(e => e.Done, log.Done);

        var updated = await _logsService.UpdateAsync(id, update);
        return Ok(updated);
    }

    [HttpDelete("logs/{id}")]
    public async Task<IActionResult> DeleteLog(string id)
    {
        var uid = User.GetUserId();
        var existing = await _logsService.FindByIdAsync(id);
        if (existing == null || existing.UserId != uid) return NotFound();
        await _logsService.DeleteAsync(id);
        return NoContent();
    }
}
