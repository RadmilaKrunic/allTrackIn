using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AllTrackIn.Api.Controllers;

[ApiController]
[Route("api/work")]
[Authorize]
public class WorkController : ControllerBase
{
    private readonly BaseService<WorkEntry> _service;

    public WorkController(LiteDbContext db)
    {
        _service = new BaseService<WorkEntry>(db.Work);
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
    public IActionResult Create([FromBody] WorkEntry entry)
    {
        entry.UserId = User.GetUserId();
        entry.Id = null;
        return StatusCode(201, _service.Create(entry));
    }

    [HttpPut("{id}")]
    public IActionResult Update(string id, [FromBody] WorkEntry entry)
    {
        var uid = User.GetUserId();
        var existing = _service.FindById(id);
        if (existing == null || existing.UserId != uid) return NotFound();
        existing.Date = entry.Date;
        existing.LocationType = entry.LocationType;
        existing.TableNumber = entry.TableNumber;
        existing.StartTime = entry.StartTime;
        existing.EndTime = entry.EndTime;
        existing.Notes = entry.Notes;
        existing.Status = entry.Status;
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
