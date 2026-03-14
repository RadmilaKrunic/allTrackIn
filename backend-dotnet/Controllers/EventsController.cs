using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace AllTrackIn.Api.Controllers;

[ApiController]
[Route("api/events")]
[Authorize]
public class EventsController : ControllerBase
{
    private readonly BaseService<EventEntry> _service;

    public EventsController(MongoDbContext db)
    {
        _service = new BaseService<EventEntry>(db.Events);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? date, [FromQuery] string? startDate,
        [FromQuery] string? endDate, [FromQuery] string? eventType)
    {
        var uid = User.GetUserId();
        var filter = Builders<EventEntry>.Filter.Eq(e => e.UserId, uid);

        if (!string.IsNullOrEmpty(date))
            filter &= Builders<EventEntry>.Filter.Eq(e => e.Date, date);
        if (!string.IsNullOrEmpty(startDate) && !string.IsNullOrEmpty(endDate))
            filter &= Builders<EventEntry>.Filter.Gte(e => e.Date, startDate) & Builders<EventEntry>.Filter.Lte(e => e.Date, endDate);
        if (!string.IsNullOrEmpty(eventType))
            filter &= Builders<EventEntry>.Filter.Eq(e => e.EventType, eventType);

        var sort = Builders<EventEntry>.Sort.Ascending(e => e.Date);
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
    public async Task<IActionResult> Create([FromBody] EventEntry entry)
    {
        entry.UserId = User.GetUserId();
        entry.Id = null;
        var created = await _service.CreateAsync(entry);
        return StatusCode(201, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] EventEntry entry)
    {
        var uid = User.GetUserId();
        var existing = await _service.FindByIdAsync(id);
        if (existing == null || existing.UserId != uid) return NotFound();

        var update = Builders<EventEntry>.Update
            .Set(e => e.Name, entry.Name)
            .Set(e => e.Date, entry.Date)
            .Set(e => e.Time, entry.Time)
            .Set(e => e.EndDate, entry.EndDate)
            .Set(e => e.EventType, entry.EventType)
            .Set(e => e.Description, entry.Description)
            .Set(e => e.Location, entry.Location)
            .Set(e => e.Recurring, entry.Recurring)
            .Set(e => e.Status, entry.Status)
            .Set(e => e.Color, entry.Color);

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
