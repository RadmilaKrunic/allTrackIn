import { Router, Request, Response, NextFunction } from 'express';
import { BaseService } from '../../shared/base.service';
import { db } from '../../config/database';
import { HabitDefinition, HabitLog } from '../../types/models';

const habitService = new BaseService<HabitDefinition>(db.habits);
const logService = new BaseService<HabitLog>(db.habitLogs);
const router = Router();

// ─── Habit definitions ───────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await habitService.findAll({ userId: req.user!.id }, { sort: { order: 1, createdAt: 1 } }));
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await habitService.create({ active: true, ...req.body, userId: req.user!.id }));
  } catch (err) { next(err); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await habitService.update(req.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await habitService.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Habit logs ──────────────────────────────────────────────────────────────

// GET /api/habits/log?startDate=&endDate= — fetch logs for streak calculation
router.get('/log', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, date } = req.query as Record<string, string>;
    const query: Record<string, unknown> = { userId: req.user!.id };
    if (date) query.date = date;
    else if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
    res.json(await logService.findAll(query, { sort: { date: -1 } }));
  } catch (err) { next(err); }
});

// PUT /api/habits/log/:date/:habitId — upsert done/not-done
router.put('/log/:date/:habitId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, habitId } = req.params;
    const { done } = req.body as { done: boolean };

    const uid = req.user!.id;
    const existing = await logService.findAll({ userId: uid, date, habitId });
    if (existing.length > 0) {
      res.json(await logService.update(existing[0]._id!, { done }));
    } else {
      res.status(201).json(await logService.create({ userId: uid, date, habitId, done }));
    }
  } catch (err) { next(err); }
});

export default router;
