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
    [Route("dashboard")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly LiteDbContext _db;
        private static readonly Random _random = new Random();

        public DashboardController(LiteDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public IActionResult Get()
        {
            var uid = User.GetUserId();
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var twoWeeksAhead = DateTime.UtcNow.AddDays(14).ToString("yyyy-MM-dd");

            var upcomingEvents = _db.Events.Find(e => e.UserId == uid && e.Date != null).ToList()
                .Where(e => string.Compare(e.Date, today) >= 0 && string.Compare(e.Date, twoWeeksAhead) <= 0)
                .OrderBy(e => e.Date)
                .Take(10)
                .ToList();

            var todayTrainings = _db.Training.Find(e => e.UserId == uid && e.Date == today).ToList();
            var todayWork = _db.Work.Find(e => e.UserId == uid && e.Date == today).ToList();
            var todayEating = _db.Eating.Find(e => e.UserId == uid && e.Date == today).ToList();

            var allQuotes = _db.Quotes.Find(e => e.UserId == uid && e.Active).ToList();
            Quote dailyQuote = allQuotes.Count > 0
                ? allQuotes[_random.Next(allQuotes.Count)]
                : null;

            return Ok(new DashboardData
            {
                Today = today,
                UpcomingEvents = upcomingEvents,
                TodayTrainings = todayTrainings,
                TodayWork = todayWork,
                TodayEating = todayEating,
                DailyQuote = dailyQuote
            });
        }
    }
}
