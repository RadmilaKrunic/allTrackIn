using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace AllTrackIn.Api.Controllers;

[ApiController]
[Route("api/calendar")]
[Authorize]
public class CalendarController : ControllerBase
{
    private readonly MongoDbContext _db;

    public CalendarController(MongoDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int year, [FromQuery] int month)
    {
        var uid = User.GetUserId();
        var start = new DateTime(year, month, 1).ToString("yyyy-MM-dd");
        var end = new DateTime(year, month, DateTime.DaysInMonth(year, month)).ToString("yyyy-MM-dd");

        var spendingFilter = Builders<SpendingEntry>.Filter.Eq(e => e.UserId, uid)
            & Builders<SpendingEntry>.Filter.Gte(e => e.Date, start)
            & Builders<SpendingEntry>.Filter.Lte(e => e.Date, end);

        var trainingFilter = Builders<TrainingEntry>.Filter.Eq(e => e.UserId, uid)
            & Builders<TrainingEntry>.Filter.Gte(e => e.Date, start)
            & Builders<TrainingEntry>.Filter.Lte(e => e.Date, end);

        var eventsFilter = Builders<EventEntry>.Filter.Eq(e => e.UserId, uid)
            & Builders<EventEntry>.Filter.Gte(e => e.Date, start)
            & Builders<EventEntry>.Filter.Lte(e => e.Date, end);

        var workFilter = Builders<WorkEntry>.Filter.Eq(e => e.UserId, uid)
            & Builders<WorkEntry>.Filter.Gte(e => e.Date, start)
            & Builders<WorkEntry>.Filter.Lte(e => e.Date, end);

        var eatingFilter = Builders<EatingEntry>.Filter.Eq(e => e.UserId, uid)
            & Builders<EatingEntry>.Filter.Gte(e => e.Date, start)
            & Builders<EatingEntry>.Filter.Lte(e => e.Date, end);

        var notesFilter = Builders<NoteEntry>.Filter.Eq(e => e.UserId, uid)
            & Builders<NoteEntry>.Filter.Gte(e => e.Date, start)
            & Builders<NoteEntry>.Filter.Lte(e => e.Date, end);

        var periodFilter = Builders<PeriodEntry>.Filter.Eq(e => e.UserId, uid)
            & Builders<PeriodEntry>.Filter.Gte(e => e.StartDate, start)
            & Builders<PeriodEntry>.Filter.Lte(e => e.StartDate, end)
            & Builders<PeriodEntry>.Filter.Not(Builders<PeriodEntry>.Filter.Exists("type"));

        var spendingTask = _db.Spending.FindAsync(spendingFilter);
        var trainingTask = _db.Training.FindAsync(trainingFilter);
        var eventsTask = _db.Events.FindAsync(eventsFilter);
        var workTask = _db.Work.FindAsync(workFilter);
        var eatingTask = _db.Eating.FindAsync(eatingFilter);
        var notesTask = _db.Notes.FindAsync(notesFilter);
        var periodTask = _db.Period.FindAsync(periodFilter);

        await Task.WhenAll(spendingTask, trainingTask, eventsTask, workTask, eatingTask, notesTask, periodTask);

        var spending = await (await spendingTask).ToListAsync();
        var training = await (await trainingTask).ToListAsync();
        var events = await (await eventsTask).ToListAsync();
        var work = await (await workTask).ToListAsync();
        var eating = await (await eatingTask).ToListAsync();
        var notes = await (await notesTask).ToListAsync();
        var period = await (await periodTask).ToListAsync();

        return Ok(new
        {
            spending = spending.Select(i => new { i.Id, i.UserId, i.Date, EntryType = i.EntryType.ToString(), i.Amount, i.Category, i.Status, module = "spending" }),
            training = training.Select(i => new { i.Id, i.UserId, i.Date, i.ActivityType, i.Status, module = "training" }),
            events = events.Select(i => new { i.Id, i.UserId, i.Date, i.Name, i.EventType, i.Status, i.Color, module = "events" }),
            work = work.Select(i => new { i.Id, i.UserId, i.Date, i.LocationType, i.Status, module = "work" }),
            eating = eating.Select(i => new { i.Id, i.UserId, i.Date, i.EntryType, i.Status, module = "eating" }),
            notes = notes.Select(i => new { i.Id, i.UserId, i.Date, i.Title, module = "notes" }),
            period = period.Select(i => new { i.Id, i.UserId, i.StartDate, i.EndDate, module = "period" })
        });
    }
}
