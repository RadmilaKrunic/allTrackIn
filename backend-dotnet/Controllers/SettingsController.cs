using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using LiteDB;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AllTrackIn.Api.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly LiteDbContext _db;

    public SettingsController(LiteDbContext db) => _db = db;

    [HttpGet("preferences")]
    public IActionResult GetPreferences()
    {
        var uid = User.GetUserId();
        var prefs = _db.Preferences.FindOne(e => e.UserId == uid);
        return Ok(prefs ?? new Preferences { UserId = uid });
    }

    [HttpPut("preferences")]
    public IActionResult UpsertPreferences([FromBody] Preferences prefs)
    {
        var uid = User.GetUserId();
        var existing = _db.Preferences.FindOne(e => e.UserId == uid);
        prefs.UserId = uid;
        if (existing == null)
        {
            prefs.Id = ObjectId.NewObjectId().ToString();
            prefs.CreatedAt = DateTime.UtcNow;
            prefs.UpdatedAt = DateTime.UtcNow;
            _db.Preferences.Insert(prefs);
        }
        else
        {
            existing.Theme = prefs.Theme;
            existing.EnabledModules = prefs.EnabledModules;
            existing.UpdatedAt = DateTime.UtcNow;
            _db.Preferences.Update(existing);
            prefs = existing;
        }
        return Ok(prefs);
    }

    [HttpGet("categories")]
    public IActionResult GetCategories([FromQuery] string? module)
    {
        var uid = User.GetUserId();
        var result = _db.Categories.Find(e => e.UserId == uid
            && (string.IsNullOrEmpty(module) || e.Module == module))
            .OrderBy(e => e.Name).ToList();
        return Ok(result);
    }

    [HttpPost("categories")]
    public IActionResult CreateCategory([FromBody] Category category)
    {
        category.UserId = User.GetUserId();
        category.Id = ObjectId.NewObjectId().ToString();
        category.CreatedAt = DateTime.UtcNow;
        category.UpdatedAt = DateTime.UtcNow;
        _db.Categories.Insert(category);
        return StatusCode(201, category);
    }

    [HttpPut("categories/{id}")]
    public IActionResult UpdateCategory(string id, [FromBody] Category category)
    {
        var uid = User.GetUserId();
        var existing = _db.Categories.FindOne(e => e.Id == id && e.UserId == uid);
        if (existing == null) return NotFound();
        existing.Module = category.Module;
        existing.Name = category.Name;
        existing.Color = category.Color;
        existing.Icon = category.Icon;
        existing.UpdatedAt = DateTime.UtcNow;
        _db.Categories.Update(existing);
        return Ok(existing);
    }

    [HttpDelete("categories/{id}")]
    public IActionResult DeleteCategory(string id)
    {
        var uid = User.GetUserId();
        var existing = _db.Categories.FindOne(e => e.Id == id && e.UserId == uid);
        if (existing == null) return NotFound();
        _db.Categories.Delete(existing.Id);
        return NoContent();
    }

    [HttpGet("quotes")]
    public IActionResult GetQuotes()
    {
        var uid = User.GetUserId();
        var result = _db.Quotes.Find(e => e.UserId == uid).OrderByDescending(e => e.CreatedAt).ToList();
        return Ok(result);
    }

    [HttpPost("quotes")]
    public IActionResult CreateQuote([FromBody] Quote quote)
    {
        quote.UserId = User.GetUserId();
        quote.Id = ObjectId.NewObjectId().ToString();
        quote.CreatedAt = DateTime.UtcNow;
        quote.UpdatedAt = DateTime.UtcNow;
        _db.Quotes.Insert(quote);
        return StatusCode(201, quote);
    }

    [HttpPut("quotes/{id}")]
    public IActionResult UpdateQuote(string id, [FromBody] Quote quote)
    {
        var uid = User.GetUserId();
        var existing = _db.Quotes.FindOne(e => e.Id == id && e.UserId == uid);
        if (existing == null) return NotFound();
        existing.Text = quote.Text;
        existing.Author = quote.Author;
        existing.Active = quote.Active;
        existing.UpdatedAt = DateTime.UtcNow;
        _db.Quotes.Update(existing);
        return Ok(existing);
    }

    [HttpDelete("quotes/{id}")]
    public IActionResult DeleteQuote(string id)
    {
        var uid = User.GetUserId();
        var existing = _db.Quotes.FindOne(e => e.Id == id && e.UserId == uid);
        if (existing == null) return NotFound();
        _db.Quotes.Delete(existing.Id);
        return NoContent();
    }
}
