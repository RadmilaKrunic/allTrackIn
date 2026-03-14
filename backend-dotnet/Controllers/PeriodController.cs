using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace AllTrackIn.Api.Controllers;

[ApiController]
[Route("api/period")]
[Authorize]
public class PeriodController : ControllerBase
{
    private readonly BaseService<PeriodEntry> _periodService;
    private readonly MongoDbContext _db;

    public PeriodController(MongoDbContext db)
    {
        _db = db;
        _periodService = new BaseService<PeriodEntry>(db.Period);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        var uid = User.GetUserId();
        // Exclude period_settings documents (they have a "type" field)
        var filter = Builders<PeriodEntry>.Filter.Eq(e => e.UserId, uid)
            & Builders<PeriodEntry>.Filter.Not(Builders<PeriodEntry>.Filter.Exists("type"));

        if (!string.IsNullOrEmpty(startDate) && !string.IsNullOrEmpty(endDate))
            filter &= Builders<PeriodEntry>.Filter.Gte(e => e.StartDate, startDate)
                    & Builders<PeriodEntry>.Filter.Lte(e => e.StartDate, endDate);

        var sort = Builders<PeriodEntry>.Sort.Descending(e => e.StartDate);
        var result = await _periodService.FindAllAsync(filter, sort);
        return Ok(result);
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var uid = User.GetUserId();
        var collection = _db.Period.Database.GetCollection<PeriodSettings>("period");
        var filter = Builders<PeriodSettings>.Filter.Eq(e => e.UserId, uid)
            & Builders<PeriodSettings>.Filter.Eq(e => e.Type, "period_settings");
        var settings = await (await collection.FindAsync(filter)).FirstOrDefaultAsync();
        return Ok(settings ?? new PeriodSettings { UserId = uid });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpsertSettings([FromBody] PeriodSettings settings)
    {
        var uid = User.GetUserId();
        var collection = _db.Period.Database.GetCollection<PeriodSettings>("period");
        var filter = Builders<PeriodSettings>.Filter.Eq(e => e.UserId, uid)
            & Builders<PeriodSettings>.Filter.Eq(e => e.Type, "period_settings");

        var existing = await (await collection.FindAsync(filter)).FirstOrDefaultAsync();
        settings.UserId = uid;
        settings.Type = "period_settings";

        if (existing == null)
        {
            settings.Id = null;
            settings.CreatedAt = DateTime.UtcNow;
            settings.UpdatedAt = DateTime.UtcNow;
            await collection.InsertOneAsync(settings);
        }
        else
        {
            var update = Builders<PeriodSettings>.Update
                .Set(e => e.AverageCycleLength, settings.AverageCycleLength)
                .Set(e => e.AverageBleedingDays, settings.AverageBleedingDays)
                .Set(e => e.LastPeriodStart, settings.LastPeriodStart)
                .Set(e => e.UpdatedAt, DateTime.UtcNow);
            await collection.UpdateOneAsync(filter, update);
            settings.Id = existing.Id;
        }
        return Ok(settings);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOne(string id)
    {
        var uid = User.GetUserId();
        var entry = await _periodService.FindByIdAsync(id);
        if (entry == null || entry.UserId != uid) return NotFound();
        return Ok(entry);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PeriodEntry entry)
    {
        entry.UserId = User.GetUserId();
        entry.Id = null;
        var created = await _periodService.CreateAsync(entry);
        return StatusCode(201, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] PeriodEntry entry)
    {
        var uid = User.GetUserId();
        var existing = await _periodService.FindByIdAsync(id);
        if (existing == null || existing.UserId != uid) return NotFound();

        var update = Builders<PeriodEntry>.Update
            .Set(e => e.StartDate, entry.StartDate)
            .Set(e => e.EndDate, entry.EndDate)
            .Set(e => e.BleedingDays, entry.BleedingDays)
            .Set(e => e.Symptoms, entry.Symptoms)
            .Set(e => e.Mood, entry.Mood)
            .Set(e => e.Notes, entry.Notes);

        var updated = await _periodService.UpdateAsync(id, update);
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var uid = User.GetUserId();
        var existing = await _periodService.FindByIdAsync(id);
        if (existing == null || existing.UserId != uid) return NotFound();
        await _periodService.DeleteAsync(id);
        return NoContent();
    }
}
