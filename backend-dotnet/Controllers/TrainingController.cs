using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AllTrackIn.Api.Controllers;

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
    public IActionResult GetAll([FromQuery] string? date, [FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        var uid = User.GetUserId();
        var result = _service.FindAll(e => e.UserId == uid
            && (string.IsNullOrEmpty(date) || e.Date == date)
            && (string.IsNullOrEmpty(startDate) || string.IsNullOrEmpty(endDate) || (e.Date.CompareTo(startDate) >= 0 && e.Date.CompareTo(endDate) <= 0)))
            .OrderByDescending(e => e.Date).ToList();
        return Ok(result);
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
        return StatusCode(201, _service.Create(entry));
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
        return Ok(_service.Update(existing));
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
