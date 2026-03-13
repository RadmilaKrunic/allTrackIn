import { Router, Request, Response, NextFunction } from 'express';
import { BaseService } from '../../shared/base.service';
import { db } from '../../config/database';
import { WorkEntry } from '../../types/models';

const service = new BaseService<WorkEntry>(db.work);
const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query as Record<string, string>;
    const query: Record<string, unknown> = { userId: req.user!.id };
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
    res.json(await service.findAll(query, { sort: { date: -1 } }));
  } catch (err) { next(err); }
});

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month } = req.query as Record<string, string>;
    const start = new Date(+year, +month - 1, 1).toISOString().split('T')[0];
    const end = new Date(+year, +month, 0).toISOString().split('T')[0];
    const items = await service.findAll({ userId: req.user!.id, date: { $gte: start, $lte: end } });
    const stats = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.locationType] = (acc[item.locationType] ?? 0) + 1;
      return acc;
    }, {});
    res.json({ stats, total: items.length });
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
