using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;

namespace AllTrackIn.Api.Controllers
{
    [ApiController]
    [Route("api/calendar")]
    [Authorize]
    public class CalendarController : ControllerBase
    {
        private readonly LiteDbContext _db;

        public CalendarController(LiteDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public IActionResult Get([FromQuery] int year, [FromQuery] int month)
        {
            var uid = User.GetUserId();
            var start = new DateTime(year, month, 1).ToString("yyyy-MM-dd");
            var end = new DateTime(year, month, DateTime.DaysInMonth(year, month)).ToString("yyyy-MM-dd");

            var spending = _db.Spending.Find(e => e.UserId == uid
                && e.Date != null
                && string.Compare(e.Date, start) >= 0
                && string.Compare(e.Date, end) <= 0).ToList();

            var training = _db.Training.Find(e => e.UserId == uid
                && e.Date != null
                && string.Compare(e.Date, start) >= 0
                && string.Compare(e.Date, end) <= 0).ToList();

            var events = _db.Events.Find(e => e.UserId == uid
                && e.Date != null
                && string.Compare(e.Date, start) >= 0
                && string.Compare(e.Date, end) <= 0).ToList();

            var work = _db.Work.Find(e => e.UserId == uid
                && e.Date != null
                && string.Compare(e.Date, start) >= 0
                && string.Compare(e.Date, end) <= 0).ToList();

            var eating = _db.Eating.Find(e => e.UserId == uid
                && e.Date != null
                && string.Compare(e.Date, start) >= 0
                && string.Compare(e.Date, end) <= 0).ToList();

            var notes = _db.Notes.Find(e => e.UserId == uid
                && e.Date != null
                && string.Compare(e.Date, start) >= 0
                && string.Compare(e.Date, end) <= 0).ToList();

            var period = _db.Period.Find(e => e.UserId == uid
                && e.StartDate != null
                && string.Compare(e.StartDate, start) >= 0
                && string.Compare(e.StartDate, end) <= 0).ToList();

            return Ok(new
            {
                spending = spending.Select(i => new { i.Id, i.UserId, i.Date, i.EntryType, i.Amount, i.Category, i.Status, module = "spending" }),
                training = training.Select(i => new { i.Id, i.UserId, i.Date, i.ActivityType, i.Status, module = "training" }),
                events = events.Select(i => new { i.Id, i.UserId, i.Date, i.Name, i.EventType, i.Status, i.Color, module = "events" }),
                work = work.Select(i => new { i.Id, i.UserId, i.Date, i.LocationType, i.Status, module = "work" }),
                eating = eating.Select(i => new { i.Id, i.UserId, i.Date, i.EntryType, i.Status, module = "eating" }),
                notes = notes.Select(i => new { i.Id, i.UserId, i.Date, i.Title, module = "notes" }),
                period = period.Select(i => new { i.Id, i.UserId, i.StartDate, i.EndDate, module = "period" })
            });
        }
    }
}
