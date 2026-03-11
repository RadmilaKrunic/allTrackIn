import { Router, Request, Response, NextFunction } from 'express';
import { BaseService } from '../../shared/base.service';
import { db } from '../../config/database';
import { TrainingEntry } from '../../types/models';

const service = new BaseService<TrainingEntry>(db.training);
const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, activityType } = req.query as Record<string, string>;
    let items: TrainingEntry[];
    if (startDate && endDate) {
      items = await service.findAll({ date: { $gte: startDate, $lte: endDate } }, { sort: { date: -1 } });
    } else if (activityType) {
      items = await service.findAll({ activityType }, { sort: { date: -1 } });
    } else {
      items = await service.findAll({}, { sort: { date: -1 } });
    }
    res.json(items);
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
    const item = await service.create(req.body);
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await service.update(req.params.id, req.body);
    res.json(item);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
