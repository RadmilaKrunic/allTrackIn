using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace AllTrackIn.Api.Controllers;

[ApiController]
[Route("api/todos")]
[Authorize]
public class TodosController : ControllerBase
{
    private readonly BaseService<TodoEntry> _service;

    public TodosController(MongoDbContext db)
    {
        _service = new BaseService<TodoEntry>(db.Todos);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? date)
    {
        var uid = User.GetUserId();
        var filter = Builders<TodoEntry>.Filter.Eq(e => e.UserId, uid);

        if (!string.IsNullOrEmpty(date))
            filter &= Builders<TodoEntry>.Filter.Eq(e => e.Date, date);

        var sort = Builders<TodoEntry>.Sort.Descending(e => e.Date);
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
    public async Task<IActionResult> Create([FromBody] TodoEntry entry)
    {
        entry.UserId = User.GetUserId();
        entry.Id = null;
        // Ensure each item has an ID
        foreach (var item in entry.Items)
            if (string.IsNullOrEmpty(item.Id)) item.Id = Guid.NewGuid().ToString();

        var created = await _service.CreateAsync(entry);
        return StatusCode(201, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] TodoEntry entry)
    {
        var uid = User.GetUserId();
        var existing = await _service.FindByIdAsync(id);
        if (existing == null || existing.UserId != uid) return NotFound();

        // Ensure each item has an ID
        foreach (var item in entry.Items)
            if (string.IsNullOrEmpty(item.Id)) item.Id = Guid.NewGuid().ToString();

        var update = Builders<TodoEntry>.Update
            .Set(e => e.Title, entry.Title)
            .Set(e => e.Date, entry.Date)
            .Set(e => e.Items, entry.Items);

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
