using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AllTrackIn.Api.Controllers;

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
        var result = _habitsService.FindAll(e => e.UserId == uid && (!active.HasValue || e.Active == active.Value))
            .OrderBy(e => e.Order).ToList();
        return Ok(result);
    }

    [HttpPost]
    public IActionResult Create([FromBody] HabitDefinition habit)
    {
        habit.UserId = User.GetUserId();
        habit.Id = null;
        return StatusCode(201, _habitsService.Create(habit));
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
        return Ok(_habitsService.Update(existing));
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
    public IActionResult GetLogs([FromQuery] string? date, [FromQuery] string? startDate,
        [FromQuery] string? endDate, [FromQuery] string? habitId)
    {
        var uid = User.GetUserId();
        var result = _logsService.FindAll(e => e.UserId == uid
            && (string.IsNullOrEmpty(date) || e.Date == date)
            && (string.IsNullOrEmpty(startDate) || string.IsNullOrEmpty(endDate) || (e.Date.CompareTo(startDate) >= 0 && e.Date.CompareTo(endDate) <= 0))
            && (string.IsNullOrEmpty(habitId) || e.HabitId == habitId));
        return Ok(result);
    }

    [HttpPut("log/{date}/{habitId}")]
    public IActionResult ToggleLog(string date, string habitId, [FromBody] ToggleLogRequest req)
    {
        var uid = User.GetUserId();
        var existing = _logsService.FindOne(e => e.UserId == uid && e.Date == date && e.HabitId == habitId);
        if (existing == null)
        {
            var created = _logsService.Create(new HabitLog { UserId = uid, Date = date, HabitId = habitId, Done = req.Done });
            return Ok(created);
        }
        existing.Done = req.Done;
        return Ok(_logsService.Update(existing));
    }
}

public record ToggleLogRequest(bool Done);
