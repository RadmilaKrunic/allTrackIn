using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AllTrackIn.Api.Controllers;

[ApiController]
[Route("api/notes")]
[Authorize]
public class NotesController : ControllerBase
{
    private readonly BaseService<NoteEntry> _service;

    public NotesController(LiteDbContext db)
    {
        _service = new BaseService<NoteEntry>(db.Notes);
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
    public IActionResult Create([FromBody] NoteEntry entry)
    {
        entry.UserId = User.GetUserId();
        entry.Id = null;
        return StatusCode(201, _service.Create(entry));
    }

    [HttpPut("{id}")]
    public IActionResult Update(string id, [FromBody] NoteEntry entry)
    {
        var uid = User.GetUserId();
        var existing = _service.FindById(id);
        if (existing == null || existing.UserId != uid) return NotFound();
        existing.Date = entry.Date;
        existing.Title = entry.Title;
        existing.Text = entry.Text;
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
