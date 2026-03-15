using LiteDB;
using System.Collections.Generic;

namespace AllTrackIn.Api.Models
{
    public class GymExercise
    {
        [BsonField("name")]
        public string Name { get; set; } = string.Empty;

        [BsonField("sets")]
        public int? Sets { get; set; }

        [BsonField("reps")]
        public int? Reps { get; set; }

        [BsonField("weight")]
        public double? Weight { get; set; }
    }

    public class TrainingEntry : BaseDocument
    {
        [BsonField("date")]
        public string Date { get; set; } = string.Empty;

        [BsonField("activityType")]
        public string ActivityType { get; set; } = string.Empty;

        [BsonField("status")]
        public string Status { get; set; } = "plan";

        [BsonField("duration")]
        public int? Duration { get; set; }

        [BsonField("notes")]
        public string Notes { get; set; }

        [BsonField("distance")]
        public double? Distance { get; set; }

        [BsonField("pace")]
        public string Pace { get; set; }

        [BsonField("workoutType")]
        public string WorkoutType { get; set; }

        [BsonField("exercises")]
        public List<GymExercise> Exercises { get; set; }

        [BsonField("properties")]
        public Dictionary<string, object> Properties { get; set; }
    }
}
