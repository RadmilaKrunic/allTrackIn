using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace AllTrackIn.Api.Controllers
{
    [ApiController]
    [Route("api/books")]
    [Authorize]
    public class BooksController : ControllerBase
    {
        private readonly BaseService<BookEntry> _service;

        public BooksController(LiteDbContext db)
        {
            _service = new BaseService<BookEntry>(db.Books);
        }

        [HttpGet]
        public IActionResult GetAll([FromQuery] string status, [FromQuery] string listType)
        {
            var uid = User.GetUserId();
            var result = _service.FindAll(e => e.UserId == uid
                && (status == null || e.Status == status)
                && (listType == null || e.ListType == listType));
            return Ok(result.OrderByDescending(e => e.CreatedAt).ToList());
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
        public IActionResult Create([FromBody] BookEntry entry)
        {
            entry.UserId = User.GetUserId();
            entry.Id = null;
            var created = _service.Create(entry);
            return StatusCode(201, created);
        }

        [HttpPut("{id}")]
        public IActionResult Update(string id, [FromBody] BookEntry entry)
        {
            var uid = User.GetUserId();
            var existing = _service.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();

            existing.Title = entry.Title;
            existing.Author = entry.Author;
            existing.Genre = entry.Genre;
            existing.Status = entry.Status;
            existing.ListType = entry.ListType;
            existing.StartDate = entry.StartDate;
            existing.EndDate = entry.EndDate;
            existing.Rating = entry.Rating;
            existing.Notes = entry.Notes;
            existing.BorrowType = entry.BorrowType;
            existing.BorrowPerson = entry.BorrowPerson;
            existing.BorrowDate = entry.BorrowDate;

            var updated = _service.Update(existing);
            return Ok(updated);
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
}
