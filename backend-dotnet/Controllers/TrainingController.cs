using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace AllTrackIn.Api.Controllers;

[ApiController]
[Route("api/training")]
[Authorize]
public class TrainingController : ControllerBase
{
    private readonly BaseService<TrainingEntry> _service;

    public TrainingController(MongoDbContext db)
    {
        _service = new BaseService<TrainingEntry>(db.Training);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? date, [FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        var uid = User.GetUserId();
        var filter = Builders<TrainingEntry>.Filter.Eq(e => e.UserId, uid);

        if (!string.IsNullOrEmpty(date))
            filter &= Builders<TrainingEntry>.Filter.Eq(e => e.Date, date);
        if (!string.IsNullOrEmpty(startDate) && !string.IsNullOrEmpty(endDate))
            filter &= Builders<TrainingEntry>.Filter.Gte(e => e.Date, startDate) & Builders<TrainingEntry>.Filter.Lte(e => e.Date, endDate);

        var sort = Builders<TrainingEntry>.Sort.Descending(e => e.Date);
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
    public async Task<IActionResult> Create([FromBody] TrainingEntry entry)
    {
        entry.UserId = User.GetUserId();
        entry.Id = null;
        var created = await _service.CreateAsync(entry);
        return StatusCode(201, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] TrainingEntry entry)
    {
        var uid = User.GetUserId();
        var existing = await _service.FindByIdAsync(id);
        if (existing == null || existing.UserId != uid) return NotFound();

        var update = Builders<TrainingEntry>.Update
            .Set(e => e.Date, entry.Date)
            .Set(e => e.ActivityType, entry.ActivityType)
            .Set(e => e.Status, entry.Status)
            .Set(e => e.Duration, entry.Duration)
            .Set(e => e.Notes, entry.Notes)
            .Set(e => e.Distance, entry.Distance)
            .Set(e => e.Pace, entry.Pace)
            .Set(e => e.WorkoutType, entry.WorkoutType)
            .Set(e => e.Exercises, entry.Exercises)
            .Set(e => e.Properties, entry.Properties);

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
