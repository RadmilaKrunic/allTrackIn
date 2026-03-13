import { Router, Request, Response, NextFunction } from 'express';
import { BaseService } from '../../shared/base.service';
import { db } from '../../config/database';
import { EatingEntry } from '../../types/models';

const service = new BaseService<EatingEntry>(db.eating);
const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, entryType } = req.query as Record<string, string>;
    const query: Record<string, unknown> = { userId: req.user!.id };
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
    if (entryType) query.entryType = entryType;
    res.json(await service.findAll(query, { sort: { date: -1 } }));
  } catch (err) { next(err); }
});

router.get('/recipes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.findAll({ userId: req.user!.id, entryType: 'recipe' }, { sort: { name: 1 } }));
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
