using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace AllTrackIn.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly MongoDbContext _db;

    public DashboardController(MongoDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var uid = User.GetUserId();
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var twoWeeksAhead = DateTime.UtcNow.AddDays(14).ToString("yyyy-MM-dd");

        var eventsFilter = Builders<EventEntry>.Filter.Eq(e => e.UserId, uid)
            & Builders<EventEntry>.Filter.Gte(e => e.Date, today)
            & Builders<EventEntry>.Filter.Lte(e => e.Date, twoWeeksAhead);

        var trainingsFilter = Builders<TrainingEntry>.Filter.Eq(e => e.UserId, uid)
            & Builders<TrainingEntry>.Filter.Eq(e => e.Date, today);

        var workFilter = Builders<WorkEntry>.Filter.Eq(e => e.UserId, uid)
            & Builders<WorkEntry>.Filter.Eq(e => e.Date, today);

        var eatingFilter = Builders<EatingEntry>.Filter.Eq(e => e.UserId, uid)
            & Builders<EatingEntry>.Filter.Eq(e => e.Date, today);

        var quotesFilter = Builders<Quote>.Filter.Eq(e => e.UserId, uid)
            & Builders<Quote>.Filter.Eq(e => e.Active, true);

        var eventsSort = Builders<EventEntry>.Sort.Ascending(e => e.Date);

        var eventsCursorTask = _db.Events.FindAsync(eventsFilter, new FindOptions<EventEntry> { Sort = eventsSort, Limit = 10 });
        var trainingsCursorTask = _db.Training.FindAsync(trainingsFilter);
        var workCursorTask = _db.Work.FindAsync(workFilter);
        var eatingCursorTask = _db.Eating.FindAsync(eatingFilter);
        var quotesCursorTask = _db.Quotes.FindAsync(quotesFilter);

        await Task.WhenAll(eventsCursorTask, trainingsCursorTask, workCursorTask, eatingCursorTask, quotesCursorTask);

        var allQuotes = await (await quotesCursorTask).ToListAsync();
        Quote? dailyQuote = allQuotes.Count > 0
            ? allQuotes[Random.Shared.Next(allQuotes.Count)]
            : null;

        return Ok(new DashboardData
        {
            Today = today,
            UpcomingEvents = await (await eventsCursorTask).ToListAsync(),
            TodayTrainings = await (await trainingsCursorTask).ToListAsync(),
            TodayWork = await (await workCursorTask).ToListAsync(),
            TodayEating = await (await eatingCursorTask).ToListAsync(),
            DailyQuote = dailyQuote
        });
    }
}
