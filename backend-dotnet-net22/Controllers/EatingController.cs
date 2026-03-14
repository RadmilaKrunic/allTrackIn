using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using System.Threading.Tasks;

namespace AllTrackIn.Api.Controllers
{
    [ApiController]
    [Route("api/eating")]
    [Authorize]
    public class EatingController : ControllerBase
    {
        private readonly BaseService<EatingEntry> _service;

        public EatingController(MongoDbContext db)
        {
            _service = new BaseService<EatingEntry>(db.Eating);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string entryType, [FromQuery] string date,
            [FromQuery] string startDate, [FromQuery] string endDate)
        {
            var uid = User.GetUserId();
            var filter = Builders<EatingEntry>.Filter.Eq(e => e.UserId, uid);

            if (!string.IsNullOrEmpty(entryType))
                filter &= Builders<EatingEntry>.Filter.Eq(e => e.EntryType, entryType);
            if (!string.IsNullOrEmpty(date))
                filter &= Builders<EatingEntry>.Filter.Eq(e => e.Date, date);
            if (!string.IsNullOrEmpty(startDate) && !string.IsNullOrEmpty(endDate))
                filter &= Builders<EatingEntry>.Filter.Gte(e => e.Date, startDate) & Builders<EatingEntry>.Filter.Lte(e => e.Date, endDate);

            var sort = Builders<EatingEntry>.Sort.Descending(e => e.CreatedAt);
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
        public async Task<IActionResult> Create([FromBody] EatingEntry entry)
        {
            entry.UserId = User.GetUserId();
            entry.Id = null;
            var created = await _service.CreateAsync(entry);
            return StatusCode(201, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] EatingEntry entry)
        {
            var uid = User.GetUserId();
            var existing = await _service.FindByIdAsync(id);
            if (existing == null || existing.UserId != uid) return NotFound();

            var update = Builders<EatingEntry>.Update
                .Set(e => e.EntryType, entry.EntryType)
                .Set(e => e.Date, entry.Date)
                .Set(e => e.Status, entry.Status)
                .Set(e => e.Categories, entry.Categories)
                .Set(e => e.Meals, entry.Meals)
                .Set(e => e.Notes, entry.Notes)
                .Set(e => e.Name, entry.Name)
                .Set(e => e.Ingredients, entry.Ingredients)
                .Set(e => e.Instructions, entry.Instructions)
                .Set(e => e.Tags, entry.Tags);

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
}
