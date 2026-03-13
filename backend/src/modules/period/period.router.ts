import { Router, Request, Response, NextFunction } from 'express';
import { BaseService } from '../../shared/base.service';
import { db } from '../../config/database';
import { PeriodEntry, PeriodSettings } from '../../types/models';

const entryService = new BaseService<PeriodEntry>(db.period);
// Reuse the period store for settings (type-discriminated)
const settingsService = new BaseService<PeriodSettings>(db.period);
const router = Router();

// ─── Period Settings ────────────────────────────────────────────────────────
router.get('/settings', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await settingsService.findOne({ type: 'period_settings' });
    res.json(s ?? { type: 'period_settings', averageCycleLength: 28, averageBleedingDays: 5 });
  } catch (err) { next(err); }
});

router.put('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await settingsService.findOne({ type: 'period_settings' });
    const data = { ...req.body, type: 'period_settings' };
    const result = existing
      ? await settingsService.update(existing._id!, data)
      : await settingsService.create(data);
    res.json(result);
  } catch (err) { next(err); }
});

// ─── Period Predictions ──────────────────────────────────────────────────────
router.get('/predictions', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await settingsService.findOne({ type: 'period_settings' }) as PeriodSettings | null;
    const cycleLength = settings?.averageCycleLength ?? 28;
    const bleedingDays = settings?.averageBleedingDays ?? 5;

    // Get last 6 actual cycles to compute average
    const entries = await entryService.findAll(
      { startDate: { $exists: true }, type: { $exists: false } },
      { sort: { startDate: -1 }, limit: 6 }
    );

    // Compute average cycle from actual entries if we have multiple
    let avgCycle = cycleLength;
    if (entries.length >= 2) {
      const sorted = [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate));
      let totalDays = 0;
      let count = 0;
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].startDate).getTime();
        const curr = new Date(sorted[i].startDate).getTime();
        const diff = Math.round((curr - prev) / 86400000);
        if (diff > 15 && diff < 60) { totalDays += diff; count++; }
      }
      if (count > 0) avgCycle = Math.round(totalDays / count);
    }

    // Last period start
    const lastEntry = entries[0] ?? null;
    const lastStart = lastEntry?.startDate ?? settings?.lastPeriodStart ?? null;

    let predictions: Array<{ startDate: string; endDate: string; cycleNumber: number }> = [];
    if (lastStart) {
      for (let i = 1; i <= 3; i++) {
        const start = new Date(lastStart);
        start.setDate(start.getDate() + avgCycle * i);
        const end = new Date(start);
        end.setDate(end.getDate() + bleedingDays - 1);
        predictions.push({
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          cycleNumber: i,
        });
      }
    }

    res.json({
      averageCycleLength: avgCycle,
      averageBleedingDays: bleedingDays,
      lastPeriodStart: lastStart,
      predictions,
    });
  } catch (err) { next(err); }
});

// ─── Period Entries CRUD ─────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year } = req.query as Record<string, string>;
    const query: Record<string, unknown> = { type: { $exists: false } };
    if (year) {
      query.startDate = {
        $gte: `${year}-01-01`,
        $lte: `${year}-12-31`,
      };
    }
    res.json(await entryService.findAll(query, { sort: { startDate: -1 } }));
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entry = await entryService.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Not found' });
    res.json(entry);
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.startDate) return res.status(400).json({ message: 'startDate is required' });
    res.status(201).json(await entryService.create(req.body));
  } catch (err) { next(err); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await entryService.update(req.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await entryService.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
