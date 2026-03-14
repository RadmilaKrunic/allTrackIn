using MongoDB.Bson.Serialization.Attributes;

namespace AllTrackIn.Api.Models;

public class GymExercise
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("sets")]
    public int? Sets { get; set; }

    [BsonElement("reps")]
    public int? Reps { get; set; }

    [BsonElement("weight")]
    public double? Weight { get; set; }
}

public class TrainingEntry : BaseDocument
{
    [BsonElement("date")]
    public string Date { get; set; } = string.Empty;

    [BsonElement("activityType")]
    public string ActivityType { get; set; } = string.Empty; // running, walking, gym, cycling, yoga, swimming, other

    [BsonElement("status")]
    public string Status { get; set; } = "plan";

    [BsonElement("duration")]
    public int? Duration { get; set; } // minutes

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("distance")]
    public double? Distance { get; set; } // km

    [BsonElement("pace")]
    public string? Pace { get; set; } // min/km

    [BsonElement("workoutType")]
    public string? WorkoutType { get; set; }

    [BsonElement("exercises")]
    public List<GymExercise>? Exercises { get; set; }

    [BsonElement("properties")]
    public Dictionary<string, object>? Properties { get; set; }
}
