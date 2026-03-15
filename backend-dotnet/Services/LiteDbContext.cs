using AllTrackIn.Api.Configuration;
using AllTrackIn.Api.Models;
using LiteDB;
using Microsoft.Extensions.Options;

namespace AllTrackIn.Api.Services;

public class LiteDbContext : IDisposable
{
    private readonly LiteDatabase _db;

    public LiteDbContext(IOptions<LiteDbSettings> settings)
    {
        _db = new LiteDatabase(settings.Value.DatabasePath);
        EnsureIndexes();
    }

    public ILiteCollection<User> Users => _db.GetCollection<User>("users");
    public ILiteCollection<SpendingEntry> Spending => _db.GetCollection<SpendingEntry>("spending");
    public ILiteCollection<TrainingEntry> Training => _db.GetCollection<TrainingEntry>("training");
    public ILiteCollection<BookEntry> Books => _db.GetCollection<BookEntry>("books");
    public ILiteCollection<EventEntry> Events => _db.GetCollection<EventEntry>("events");
    public ILiteCollection<WorkEntry> Work => _db.GetCollection<WorkEntry>("work");
    public ILiteCollection<EatingEntry> Eating => _db.GetCollection<EatingEntry>("eating");
    public ILiteCollection<TodoEntry> Todos => _db.GetCollection<TodoEntry>("todos");
    public ILiteCollection<NoteEntry> Notes => _db.GetCollection<NoteEntry>("notes");
    public ILiteCollection<PeriodEntry> Period => _db.GetCollection<PeriodEntry>("period");
    public ILiteCollection<PeriodSettings> PeriodSettings => _db.GetCollection<PeriodSettings>("periodSettings");
    public ILiteCollection<HabitDefinition> Habits => _db.GetCollection<HabitDefinition>("habits");
    public ILiteCollection<HabitLog> HabitLogs => _db.GetCollection<HabitLog>("habitLogs");
    public ILiteCollection<Category> Categories => _db.GetCollection<Category>("categories");
    public ILiteCollection<Preferences> Preferences => _db.GetCollection<Preferences>("preferences");
    public ILiteCollection<Quote> Quotes => _db.GetCollection<Quote>("quotes");

    private void EnsureIndexes()
    {
        Users.EnsureIndex(u => u.Email, unique: true);
        Spending.EnsureIndex(x => x.UserId);
        Training.EnsureIndex(x => x.UserId);
        Books.EnsureIndex(x => x.UserId);
        Events.EnsureIndex(x => x.UserId);
        Work.EnsureIndex(x => x.UserId);
        Eating.EnsureIndex(x => x.UserId);
        Todos.EnsureIndex(x => x.UserId);
        Notes.EnsureIndex(x => x.UserId);
        Period.EnsureIndex(x => x.UserId);
        PeriodSettings.EnsureIndex(x => x.UserId);
        Habits.EnsureIndex(x => x.UserId);
        HabitLogs.EnsureIndex(x => x.UserId);
        Quotes.EnsureIndex(x => x.UserId);
    }

    public void Dispose() => _db.Dispose();
}
