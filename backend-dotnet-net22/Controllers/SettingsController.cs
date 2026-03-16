using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace AllTrackIn.Api.Controllers
{
    [ApiController]
    [Route("settings")]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly LiteDbContext _db;

        public SettingsController(LiteDbContext db)
        {
            _db = db;
        }

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
                var service = new BaseService<Preferences>(_db.Preferences);
                prefs.Id = null;
                service.Create(prefs);
            }
            else
            {
                existing.Theme = prefs.Theme;
                existing.EnabledModules = prefs.EnabledModules;
                var service = new BaseService<Preferences>(_db.Preferences);
                service.Update(existing);
                prefs.Id = existing.Id;
            }
            return Ok(prefs);
        }

        [HttpGet("categories")]
        public IActionResult GetCategories([FromQuery] string module)
        {
            var uid = User.GetUserId();
            var result = _db.Categories.Find(e => e.UserId == uid
                && (module == null || e.Module == module))
                .OrderBy(e => e.Name)
                .ToList();
            return Ok(result);
        }

        [HttpPost("categories")]
        public IActionResult CreateCategory([FromBody] Category category)
        {
            category.UserId = User.GetUserId();
            category.Id = null;
            var service = new BaseService<Category>(_db.Categories);
            service.Create(category);
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

            var service = new BaseService<Category>(_db.Categories);
            var updated = service.Update(existing);
            return Ok(updated);
        }

        [HttpDelete("categories/{id}")]
        public IActionResult DeleteCategory(string id)
        {
            var uid = User.GetUserId();
            var existing = _db.Categories.FindOne(e => e.Id == id && e.UserId == uid);
            if (existing == null) return NotFound();
            _db.Categories.DeleteMany(e => e.Id == id && e.UserId == uid);
            return NoContent();
        }

        [HttpGet("quotes")]
        public IActionResult GetQuotes()
        {
            var uid = User.GetUserId();
            var result = _db.Quotes.Find(e => e.UserId == uid)
                .OrderByDescending(e => e.CreatedAt)
                .ToList();
            return Ok(result);
        }

        [HttpPost("quotes")]
        public IActionResult CreateQuote([FromBody] Quote quote)
        {
            quote.UserId = User.GetUserId();
            quote.Id = null;
            var service = new BaseService<Quote>(_db.Quotes);
            service.Create(quote);
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

            var service = new BaseService<Quote>(_db.Quotes);
            var updated = service.Update(existing);
            return Ok(updated);
        }

        [HttpDelete("quotes/{id}")]
        public IActionResult DeleteQuote(string id)
        {
            var uid = User.GetUserId();
            var existing = _db.Quotes.FindOne(e => e.Id == id && e.UserId == uid);
            if (existing == null) return NotFound();
            _db.Quotes.DeleteMany(e => e.Id == id && e.UserId == uid);
            return NoContent();
        }
    }
}
