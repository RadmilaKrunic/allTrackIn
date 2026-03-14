namespace AllTrackIn.Api.Models;

public class DashboardData
{
    public string Today { get; set; } = string.Empty;
    public List<EventEntry> UpcomingEvents { get; set; } = [];
    public List<TrainingEntry> TodayTrainings { get; set; } = [];
    public List<WorkEntry> TodayWork { get; set; } = [];
    public List<EatingEntry> TodayEating { get; set; } = [];
    public Quote? DailyQuote { get; set; }
}

public class CalendarData
{
    public List<object> Spending { get; set; } = [];
    public List<object> Training { get; set; } = [];
    public List<object> Events { get; set; } = [];
    public List<object> Work { get; set; } = [];
    public List<object> Eating { get; set; } = [];
    public List<object> Notes { get; set; } = [];
    public List<object> Period { get; set; } = [];
}
