using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AllTrackIn.Api.Controllers;

[ApiController]
[Route("api/events")]
[Authorize]
public class EventsController : ControllerBase
{
    private readonly BaseService<EventEntry> _service;

    public EventsController(LiteDbContext db)
    {
        _service = new BaseService<EventEntry>(db.Events);
    }

    [HttpGet]
    public IActionResult GetAll([FromQuery] string? date, [FromQuery] string? startDate,
        [FromQuery] string? endDate, [FromQuery] string? eventType)
    {
        var uid = User.GetUserId();
        var result = _service.FindAll(e => e.UserId == uid
            && (string.IsNullOrEmpty(date) || e.Date == date)
            && (string.IsNullOrEmpty(startDate) || string.IsNullOrEmpty(endDate) || (e.Date.CompareTo(startDate) >= 0 && e.Date.CompareTo(endDate) <= 0))
            && (string.IsNullOrEmpty(eventType) || e.EventType == eventType))
            .OrderBy(e => e.Date).ToList();
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
    public IActionResult Create([FromBody] EventEntry entry)
    {
        entry.UserId = User.GetUserId();
        entry.Id = null;
        return StatusCode(201, _service.Create(entry));
    }

    [HttpPut("{id}")]
    public IActionResult Update(string id, [FromBody] EventEntry entry)
    {
        var uid = User.GetUserId();
        var existing = _service.FindById(id);
        if (existing == null || existing.UserId != uid) return NotFound();
        existing.Name = entry.Name;
        existing.Date = entry.Date;
        existing.Time = entry.Time;
        existing.EndDate = entry.EndDate;
        existing.EventType = entry.EventType;
        existing.Description = entry.Description;
        existing.Location = entry.Location;
        existing.Recurring = entry.Recurring;
        existing.Status = entry.Status;
        existing.Color = entry.Color;
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
