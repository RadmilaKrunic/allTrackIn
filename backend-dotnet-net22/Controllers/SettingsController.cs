using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using System;
using System.Threading.Tasks;

namespace AllTrackIn.Api.Controllers
{
    [ApiController]
    [Route("api/settings")]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly MongoDbContext _db;

        public SettingsController(MongoDbContext db)
        {
            _db = db;
        }

        [HttpGet("preferences")]
        public async Task<IActionResult> GetPreferences()
        {
            var uid = User.GetUserId();
            var filter = Builders<Preferences>.Filter.Eq(e => e.UserId, uid)
                & Builders<Preferences>.Filter.Eq(e => e.Type, "preferences");
            var prefs = await (await _db.Preferences.FindAsync(filter)).FirstOrDefaultAsync();
            return Ok(prefs ?? new Preferences { UserId = uid });
        }

        [HttpPut("preferences")]
        public async Task<IActionResult> UpsertPreferences([FromBody] Preferences prefs)
        {
            var uid = User.GetUserId();
            var filter = Builders<Preferences>.Filter.Eq(e => e.UserId, uid)
                & Builders<Preferences>.Filter.Eq(e => e.Type, "preferences");

            var existing = await (await _db.Preferences.FindAsync(filter)).FirstOrDefaultAsync();
            prefs.UserId = uid;
            prefs.Type = "preferences";

            if (existing == null)
            {
                prefs.Id = null;
                prefs.CreatedAt = DateTime.UtcNow;
                prefs.UpdatedAt = DateTime.UtcNow;
                await _db.Preferences.InsertOneAsync(prefs);
            }
            else
            {
                var update = Builders<Preferences>.Update
                    .Set(e => e.Theme, prefs.Theme)
                    .Set(e => e.EnabledModules, prefs.EnabledModules)
                    .Set(e => e.UpdatedAt, DateTime.UtcNow);
                await _db.Preferences.UpdateOneAsync(filter, update);
                prefs.Id = existing.Id;
            }
            return Ok(prefs);
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories([FromQuery] string module)
        {
            var uid = User.GetUserId();
            var filter = Builders<Category>.Filter.Eq(e => e.UserId, uid)
                & Builders<Category>.Filter.Eq(e => e.Type, "category");
            if (!string.IsNullOrEmpty(module))
                filter &= Builders<Category>.Filter.Eq(e => e.Module, module);

            var sort = Builders<Category>.Sort.Ascending(e => e.Name);
            var result = await (await _db.Categories.FindAsync(filter, new FindOptions<Category> { Sort = sort })).ToListAsync();
            return Ok(result);
        }

        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory([FromBody] Category category)
        {
            category.UserId = User.GetUserId();
            category.Id = null;
            category.Type = "category";
            category.CreatedAt = DateTime.UtcNow;
            category.UpdatedAt = DateTime.UtcNow;
            await _db.Categories.InsertOneAsync(category);
            return StatusCode(201, category);
        }

        [HttpPut("categories/{id}")]
        public async Task<IActionResult> UpdateCategory(string id, [FromBody] Category category)
        {
            var uid = User.GetUserId();
            var filter = Builders<Category>.Filter.Eq("_id", MongoDB.Bson.ObjectId.Parse(id))
                & Builders<Category>.Filter.Eq(e => e.UserId, uid);

            var update = Builders<Category>.Update
                .Set(e => e.Module, category.Module)
                .Set(e => e.Name, category.Name)
                .Set(e => e.Color, category.Color)
                .Set(e => e.Icon, category.Icon)
                .Set(e => e.UpdatedAt, DateTime.UtcNow);

            var result = await _db.Categories.UpdateOneAsync(filter, update);
            if (result.MatchedCount == 0) return NotFound();

            var updated = await (await _db.Categories.FindAsync(
                Builders<Category>.Filter.Eq("_id", MongoDB.Bson.ObjectId.Parse(id)))).FirstOrDefaultAsync();
            return Ok(updated);
        }

        [HttpDelete("categories/{id}")]
        public async Task<IActionResult> DeleteCategory(string id)
        {
            var uid = User.GetUserId();
            var filter = Builders<Category>.Filter.Eq("_id", MongoDB.Bson.ObjectId.Parse(id))
                & Builders<Category>.Filter.Eq(e => e.UserId, uid);
            var result = await _db.Categories.DeleteOneAsync(filter);
            if (result.DeletedCount == 0) return NotFound();
            return NoContent();
        }

        [HttpGet("quotes")]
        public async Task<IActionResult> GetQuotes()
        {
            var uid = User.GetUserId();
            var filter = Builders<Quote>.Filter.Eq(e => e.UserId, uid);
            var sort = Builders<Quote>.Sort.Descending(e => e.CreatedAt);
            var result = await (await _db.Quotes.FindAsync(filter, new FindOptions<Quote> { Sort = sort })).ToListAsync();
            return Ok(result);
        }

        [HttpPost("quotes")]
        public async Task<IActionResult> CreateQuote([FromBody] Quote quote)
        {
            quote.UserId = User.GetUserId();
            quote.Id = null;
            quote.CreatedAt = DateTime.UtcNow;
            quote.UpdatedAt = DateTime.UtcNow;
            await _db.Quotes.InsertOneAsync(quote);
            return StatusCode(201, quote);
        }

        [HttpPut("quotes/{id}")]
        public async Task<IActionResult> UpdateQuote(string id, [FromBody] Quote quote)
        {
            var uid = User.GetUserId();
            var filter = Builders<Quote>.Filter.Eq("_id", MongoDB.Bson.ObjectId.Parse(id))
                & Builders<Quote>.Filter.Eq(e => e.UserId, uid);

            var update = Builders<Quote>.Update
                .Set(e => e.Text, quote.Text)
                .Set(e => e.Author, quote.Author)
                .Set(e => e.Active, quote.Active)
                .Set(e => e.UpdatedAt, DateTime.UtcNow);

            var result = await _db.Quotes.UpdateOneAsync(filter, update);
            if (result.MatchedCount == 0) return NotFound();

            var updated = await (await _db.Quotes.FindAsync(
                Builders<Quote>.Filter.Eq("_id", MongoDB.Bson.ObjectId.Parse(id)))).FirstOrDefaultAsync();
            return Ok(updated);
        }

        [HttpDelete("quotes/{id}")]
        public async Task<IActionResult> DeleteQuote(string id)
        {
            var uid = User.GetUserId();
            var filter = Builders<Quote>.Filter.Eq("_id", MongoDB.Bson.ObjectId.Parse(id))
                & Builders<Quote>.Filter.Eq(e => e.UserId, uid);
            var result = await _db.Quotes.DeleteOneAsync(filter);
            if (result.DeletedCount == 0) return NotFound();
            return NoContent();
        }
    }
}
