import { Router, Request, Response, NextFunction } from 'express';
import { BaseService } from '../../shared/base.service';
import { db } from '../../config/database';
import { EventEntry } from '../../types/models';

const service = new BaseService<EventEntry>(db.events);
const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query as Record<string, string>;
    const query: Record<string, unknown> = { userId: req.user!.id };
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
    res.json(await service.findAll(query, { sort: { date: 1 } }));
  } catch (err) { next(err); }
});

router.get('/upcoming', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    res.json(await service.findAll({ userId: req.user!.id, date: { $gte: today } }, { sort: { date: 1 }, limit: 20 }));
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await service.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await service.create({ ...req.body, userId: req.user!.id }));
  } catch (err) { next(err); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.update(req.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
