using AllTrackIn.Api.Extensions;
using AllTrackIn.Api.Models;
using AllTrackIn.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;

namespace AllTrackIn.Api.Controllers
{
    [ApiController]
    [Route("period")]
    [Authorize]
    public class PeriodController : ControllerBase
    {
        private readonly BaseService<PeriodEntry> _periodService;
        private readonly BaseService<PeriodSettings> _settingsService;

        public PeriodController(LiteDbContext db)
        {
            _periodService = new BaseService<PeriodEntry>(db.Period);
            _settingsService = new BaseService<PeriodSettings>(db.PeriodSettings);
        }

        [HttpGet]
        public IActionResult GetAll([FromQuery] string startDate, [FromQuery] string endDate)
        {
            var uid = User.GetUserId();
            var result = _periodService.FindAll(e => e.UserId == uid)
                .Where(e => startDate == null || endDate == null || (e.StartDate != null && string.Compare(e.StartDate, startDate) >= 0 && string.Compare(e.StartDate, endDate) <= 0))
                .ToList();
            return Ok(result.OrderByDescending(e => e.StartDate).ToList());
        }

        [HttpGet("settings")]
        public IActionResult GetSettings()
        {
            var uid = User.GetUserId();
            var settings = _settingsService.FindOne(e => e.UserId == uid);
            return Ok(settings ?? new PeriodSettings { UserId = uid });
        }

        [HttpPut("settings")]
        public IActionResult UpsertSettings([FromBody] PeriodSettings settings)
        {
            var uid = User.GetUserId();
            var existing = _settingsService.FindOne(e => e.UserId == uid);
            settings.UserId = uid;

            if (existing == null)
            {
                settings.Id = null;
                _settingsService.Create(settings);
            }
            else
            {
                existing.AverageCycleLength = settings.AverageCycleLength;
                existing.AverageBleedingDays = settings.AverageBleedingDays;
                existing.LastPeriodStart = settings.LastPeriodStart;
                _settingsService.Update(existing);
                settings.Id = existing.Id;
            }
            return Ok(settings);
        }

        [HttpGet("predictions")]
        public IActionResult GetPredictions()
        {
            var uid = User.GetUserId();
            var settings = _settingsService.FindOne(e => e.UserId == uid);
            var cycleLength = settings?.AverageCycleLength ?? 28;
            var bleedingDays = settings?.AverageBleedingDays ?? 5;

            var entries = _periodService.FindAll(e => e.UserId == uid && e.StartDate != null)
                .OrderByDescending(e => e.StartDate)
                .Take(6)
                .ToList();

            var avgCycle = cycleLength;
            if (entries.Count >= 2)
            {
                var sorted = entries.OrderBy(e => e.StartDate).ToList();
                var totalDays = 0;
                var count = 0;
                for (var i = 1; i < sorted.Count; i++)
                {
                    var prev = DateTime.Parse(sorted[i - 1].StartDate);
                    var curr = DateTime.Parse(sorted[i].StartDate);
                    var diff = (int)Math.Round((curr - prev).TotalDays);
                    if (diff > 15 && diff < 60) { totalDays += diff; count++; }
                }
                if (count > 0) avgCycle = (int)Math.Round((double)totalDays / count);
            }

            var lastStart = entries.FirstOrDefault()?.StartDate ?? settings?.LastPeriodStart;

            var predictions = new List<object>();
            if (lastStart != null)
            {
                for (var i = 1; i <= 3; i++)
                {
                    var start = DateTime.Parse(lastStart).AddDays(avgCycle * i);
                    var end = start.AddDays(bleedingDays - 1);
                    predictions.Add(new
                    {
                        startDate = start.ToString("yyyy-MM-dd"),
                        endDate = end.ToString("yyyy-MM-dd"),
                        cycleNumber = i
                    });
                }
            }

            return Ok(new
            {
                averageCycleLength = avgCycle,
                averageBleedingDays = bleedingDays,
                lastPeriodStart = lastStart,
                predictions
            });
        }

        [HttpGet("{id}")]
        public IActionResult GetOne(string id)
        {
            var uid = User.GetUserId();
            var entry = _periodService.FindById(id);
            if (entry == null || entry.UserId != uid) return NotFound();
            return Ok(entry);
        }

        [HttpPost]
        public IActionResult Create([FromBody] PeriodEntry entry)
        {
            entry.UserId = User.GetUserId();
            entry.Id = null;
            var created = _periodService.Create(entry);
            return StatusCode(201, created);
        }

        [HttpPut("{id}")]
        public IActionResult Update(string id, [FromBody] PeriodEntry entry)
        {
            var uid = User.GetUserId();
            var existing = _periodService.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();

            existing.StartDate = entry.StartDate;
            existing.EndDate = entry.EndDate;
            existing.BleedingDays = entry.BleedingDays;
            existing.Symptoms = entry.Symptoms;
            existing.Mood = entry.Mood;
            existing.Notes = entry.Notes;

            var updated = _periodService.Update(existing);
            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(string id)
        {
            var uid = User.GetUserId();
            var existing = _periodService.FindById(id);
            if (existing == null || existing.UserId != uid) return NotFound();
            _periodService.Delete(id);
            return NoContent();
        }
    }
}
