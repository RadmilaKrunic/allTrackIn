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
    [Route("api/books")]
    [Authorize]
    public class BooksController : ControllerBase
    {
        private readonly BaseService<BookEntry> _service;

        public BooksController(MongoDbContext db)
        {
            _service = new BaseService<BookEntry>(db.Books);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string status, [FromQuery] string listType)
        {
            var uid = User.GetUserId();
            var filter = Builders<BookEntry>.Filter.Eq(e => e.UserId, uid);

            if (!string.IsNullOrEmpty(status))
                filter &= Builders<BookEntry>.Filter.Eq(e => e.Status, status);
            if (!string.IsNullOrEmpty(listType))
                filter &= Builders<BookEntry>.Filter.Eq(e => e.ListType, listType);

            var sort = Builders<BookEntry>.Sort.Descending(e => e.CreatedAt);
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
        public async Task<IActionResult> Create([FromBody] BookEntry entry)
        {
            entry.UserId = User.GetUserId();
            entry.Id = null;
            var created = await _service.CreateAsync(entry);
            return StatusCode(201, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] BookEntry entry)
        {
            var uid = User.GetUserId();
            var existing = await _service.FindByIdAsync(id);
            if (existing == null || existing.UserId != uid) return NotFound();

            var update = Builders<BookEntry>.Update
                .Set(e => e.Title, entry.Title)
                .Set(e => e.Author, entry.Author)
                .Set(e => e.Genre, entry.Genre)
                .Set(e => e.Status, entry.Status)
                .Set(e => e.ListType, entry.ListType)
                .Set(e => e.StartDate, entry.StartDate)
                .Set(e => e.EndDate, entry.EndDate)
                .Set(e => e.Rating, entry.Rating)
                .Set(e => e.Notes, entry.Notes)
                .Set(e => e.BorrowType, entry.BorrowType)
                .Set(e => e.BorrowPerson, entry.BorrowPerson)
                .Set(e => e.BorrowDate, entry.BorrowDate);

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
