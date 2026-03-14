using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace AllTrackIn.Api.Controllers;

[ApiController]
[Route("api/notes")]
[Authorize]
public class NotesController : ControllerBase
{
    private readonly BaseService<NoteEntry> _service;

    public NotesController(MongoDbContext db)
    {
        _service = new BaseService<NoteEntry>(db.Notes);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? date, [FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        var uid = User.GetUserId();
        var filter = Builders<NoteEntry>.Filter.Eq(e => e.UserId, uid);

        if (!string.IsNullOrEmpty(date))
            filter &= Builders<NoteEntry>.Filter.Eq(e => e.Date, date);
        if (!string.IsNullOrEmpty(startDate) && !string.IsNullOrEmpty(endDate))
            filter &= Builders<NoteEntry>.Filter.Gte(e => e.Date, startDate) & Builders<NoteEntry>.Filter.Lte(e => e.Date, endDate);

        var sort = Builders<NoteEntry>.Sort.Descending(e => e.Date);
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
    public async Task<IActionResult> Create([FromBody] NoteEntry entry)
    {
        entry.UserId = User.GetUserId();
        entry.Id = null;
        var created = await _service.CreateAsync(entry);
        return StatusCode(201, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] NoteEntry entry)
    {
        var uid = User.GetUserId();
        var existing = await _service.FindByIdAsync(id);
        if (existing == null || existing.UserId != uid) return NotFound();

        var update = Builders<NoteEntry>.Update
            .Set(e => e.Date, entry.Date)
            .Set(e => e.Title, entry.Title)
            .Set(e => e.Text, entry.Text);

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
