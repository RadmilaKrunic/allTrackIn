using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AllTrackIn.Api.Controllers;

[ApiController]
[Route("api/period")]
[Authorize]
public class PeriodController : ControllerBase
{
    private readonly BaseService<PeriodEntry> _periodService;
    private readonly BaseService<PeriodSettings> _settingsService;

    public PeriodController(LiteDbContext db)
    {
        _periodService = new BaseService<PeriodEntry>(db.Period);
        _settingsService = new BaseService<PeriodSettings>(db.PeriodSettings);
    }

    [HttpGet]
    public IActionResult GetAll([FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        var uid = User.GetUserId();
        var result = _periodService.FindAll(e => e.UserId == uid
            && (string.IsNullOrEmpty(startDate) || string.IsNullOrEmpty(endDate) || (e.StartDate.CompareTo(startDate) >= 0 && e.StartDate.CompareTo(endDate) <= 0)))
            .OrderByDescending(e => e.StartDate).ToList();
        return Ok(result);
    }

    [HttpGet("settings")]
    public IActionResult GetSettings()
    {
        var uid = User.GetUserId();
        var settings = _settingsService.FindOne(e => e.UserId == uid);
        return Ok(settings ?? new PeriodSettings { UserId = uid });
    }

    [HttpPut("settings")]
    public IActionResult UpsertSettings([FromBody] PeriodSettings settings)
    {
        var uid = User.GetUserId();
        var existing = _settingsService.FindOne(e => e.UserId == uid);
        settings.UserId = uid;
        if (existing == null)
        {
            return Ok(_settingsService.Create(settings));
        }
        existing.AverageCycleLength = settings.AverageCycleLength;
        existing.AverageBleedingDays = settings.AverageBleedingDays;
        existing.LastPeriodStart = settings.LastPeriodStart;
        return Ok(_settingsService.Update(existing));
    }

    [HttpGet("{id}")]
    public IActionResult GetOne(string id)
    {
        var uid = User.GetUserId();
        var entry = _periodService.FindById(id);
        if (entry == null || entry.UserId != uid) return NotFound();
        return Ok(entry);
    }

    [HttpPost]
    public IActionResult Create([FromBody] PeriodEntry entry)
    {
        entry.UserId = User.GetUserId();
        entry.Id = null;
        return StatusCode(201, _periodService.Create(entry));
    }

    [HttpPut("{id}")]
    public IActionResult Update(string id, [FromBody] PeriodEntry entry)
    {
        var uid = User.GetUserId();
        var existing = _periodService.FindById(id);
        if (existing == null || existing.UserId != uid) return NotFound();
        existing.StartDate = entry.StartDate;
        existing.EndDate = entry.EndDate;
        existing.BleedingDays = entry.BleedingDays;
        existing.Symptoms = entry.Symptoms;
        existing.Mood = entry.Mood;
        existing.Notes = entry.Notes;
        return Ok(_periodService.Update(existing));
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(string id)
    {
        var uid = User.GetUserId();
        var existing = _periodService.FindById(id);
        if (existing == null || existing.UserId != uid) return NotFound();
        _periodService.Delete(id);
        return NoContent();
    }
}
