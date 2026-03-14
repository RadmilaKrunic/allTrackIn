using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace AllTrackIn.Api.Controllers;

[ApiController]
[Route("api/work")]
[Authorize]
public class WorkController : ControllerBase
{
    private readonly BaseService<WorkEntry> _service;

    public WorkController(MongoDbContext db)
    {
        _service = new BaseService<WorkEntry>(db.Work);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? date, [FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        var uid = User.GetUserId();
        var filter = Builders<WorkEntry>.Filter.Eq(e => e.UserId, uid);

        if (!string.IsNullOrEmpty(date))
            filter &= Builders<WorkEntry>.Filter.Eq(e => e.Date, date);
        if (!string.IsNullOrEmpty(startDate) && !string.IsNullOrEmpty(endDate))
            filter &= Builders<WorkEntry>.Filter.Gte(e => e.Date, startDate) & Builders<WorkEntry>.Filter.Lte(e => e.Date, endDate);

        var sort = Builders<WorkEntry>.Sort.Descending(e => e.Date);
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
    public async Task<IActionResult> Create([FromBody] WorkEntry entry)
    {
        entry.UserId = User.GetUserId();
        entry.Id = null;
        var created = await _service.CreateAsync(entry);
        return StatusCode(201, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] WorkEntry entry)
    {
        var uid = User.GetUserId();
        var existing = await _service.FindByIdAsync(id);
        if (existing == null || existing.UserId != uid) return NotFound();

        var update = Builders<WorkEntry>.Update
            .Set(e => e.Date, entry.Date)
            .Set(e => e.LocationType, entry.LocationType)
            .Set(e => e.TableNumber, entry.TableNumber)
            .Set(e => e.StartTime, entry.StartTime)
            .Set(e => e.EndTime, entry.EndTime)
            .Set(e => e.Notes, entry.Notes)
            .Set(e => e.Status, entry.Status);

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
