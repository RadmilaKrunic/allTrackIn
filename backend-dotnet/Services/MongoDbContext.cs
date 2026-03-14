using AllTrackIn.Api.Configuration;
using AllTrackIn.Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace AllTrackIn.Api.Services;

public class MongoDbContext
{
    private readonly IMongoDatabase _database;

    public MongoDbContext(IOptions<MongoDbSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        _database = client.GetDatabase(settings.Value.DatabaseName);

        CreateIndexes();
    }

    public IMongoCollection<User> Users => _database.GetCollection<User>("users");
    public IMongoCollection<SpendingEntry> Spending => _database.GetCollection<SpendingEntry>("spending");
    public IMongoCollection<TrainingEntry> Training => _database.GetCollection<TrainingEntry>("training");
    public IMongoCollection<BookEntry> Books => _database.GetCollection<BookEntry>("books");
    public IMongoCollection<EventEntry> Events => _database.GetCollection<EventEntry>("events");
    public IMongoCollection<WorkEntry> Work => _database.GetCollection<WorkEntry>("work");
    public IMongoCollection<EatingEntry> Eating => _database.GetCollection<EatingEntry>("eating");
    public IMongoCollection<TodoEntry> Todos => _database.GetCollection<TodoEntry>("todos");
    public IMongoCollection<NoteEntry> Notes => _database.GetCollection<NoteEntry>("notes");
    public IMongoCollection<PeriodEntry> Period => _database.GetCollection<PeriodEntry>("period");
    public IMongoCollection<HabitDefinition> Habits => _database.GetCollection<HabitDefinition>("habits");
    public IMongoCollection<HabitLog> HabitLogs => _database.GetCollection<HabitLog>("habitLogs");
    public IMongoCollection<Category> Categories => _database.GetCollection<Category>("settings");
    public IMongoCollection<Preferences> Preferences => _database.GetCollection<Preferences>("settings");
    public IMongoCollection<Quote> Quotes => _database.GetCollection<Quote>("quotes");

    private void CreateIndexes()
    {
        // User email index (unique)
        Users.Indexes.CreateOne(
            new CreateIndexModel<User>(
                Builders<User>.IndexKeys.Ascending(u => u.Email),
                new CreateIndexOptions { Unique = true }));

        // userId indexes for all collections
        CreateUserIdIndex(Spending);
        CreateUserIdIndex(Training);
        CreateUserIdIndex(Books);
        CreateUserIdIndex(Events);
        CreateUserIdIndex(Work);
        CreateUserIdIndex(Eating);
        CreateUserIdIndex(Todos);
        CreateUserIdIndex(Notes);
        CreateUserIdIndex(Period);
        CreateUserIdIndex(Habits);
        CreateUserIdIndex(HabitLogs);
        CreateUserIdIndex(Quotes);
    }

    private static void CreateUserIdIndex<T>(IMongoCollection<T> collection) where T : BaseDocument
    {
        collection.Indexes.CreateOne(
            new CreateIndexModel<T>(
                Builders<T>.IndexKeys.Ascending(d => d.UserId)));
    }
}
