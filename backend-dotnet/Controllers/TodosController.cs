using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AllTrackIn.Api.Controllers;

[ApiController]
[Route("api/todos")]
[Authorize]
public class TodosController : ControllerBase
{
    private readonly BaseService<TodoEntry> _service;

    public TodosController(LiteDbContext db)
    {
        _service = new BaseService<TodoEntry>(db.Todos);
    }

    [HttpGet]
    public IActionResult GetAll([FromQuery] string? date)
    {
        var uid = User.GetUserId();
        var result = _service.FindAll(e => e.UserId == uid && (string.IsNullOrEmpty(date) || e.Date == date))
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
    public IActionResult Create([FromBody] TodoEntry entry)
    {
        entry.UserId = User.GetUserId();
        entry.Id = null;
        foreach (var item in entry.Items)
            if (string.IsNullOrEmpty(item.Id)) item.Id = Guid.NewGuid().ToString();
        return StatusCode(201, _service.Create(entry));
    }

    [HttpPut("{id}")]
    public IActionResult Update(string id, [FromBody] TodoEntry entry)
    {
        var uid = User.GetUserId();
        var existing = _service.FindById(id);
        if (existing == null || existing.UserId != uid) return NotFound();
        foreach (var item in entry.Items)
            if (string.IsNullOrEmpty(item.Id)) item.Id = Guid.NewGuid().ToString();
        existing.Title = entry.Title;
        existing.Date = entry.Date;
        existing.Items = entry.Items;
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
