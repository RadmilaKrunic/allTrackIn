using System.Collections.Generic;

namespace AllTrackIn.Api.Models
{
    public class DashboardData
    {
        public string Today { get; set; } = string.Empty;
        public List<EventEntry> UpcomingEvents { get; set; } = new List<EventEntry>();
        public List<TrainingEntry> TodayTrainings { get; set; } = new List<TrainingEntry>();
        public List<WorkEntry> TodayWork { get; set; } = new List<WorkEntry>();
        public List<EatingEntry> TodayEating { get; set; } = new List<EatingEntry>();
        public Quote DailyQuote { get; set; }
    }

    public class CalendarData
    {
        public List<object> Spending { get; set; } = new List<object>();
        public List<object> Training { get; set; } = new List<object>();
        public List<object> Events { get; set; } = new List<object>();
        public List<object> Work { get; set; } = new List<object>();
        public List<object> Eating { get; set; } = new List<object>();
        public List<object> Notes { get; set; } = new List<object>();
        public List<object> Period { get; set; } = new List<object>();
    }
}
