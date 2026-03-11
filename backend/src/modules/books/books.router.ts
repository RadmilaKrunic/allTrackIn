import { Router, Request, Response, NextFunction } from 'express';
import { BaseService } from '../../shared/base.service';
import { db } from '../../config/database';
import { BookEntry } from '../../types/models';

const service = new BaseService<BookEntry>(db.books);
const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, listType } = req.query as Record<string, string>;
    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (listType) query.listType = listType;
    res.json(await service.findAll(query, { sort: { updatedAt: -1 } }));
  } catch (err) { next(err); }
});

router.get('/wishlist', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.findAll({ status: 'wishlist' }));
  } catch (err) { next(err); }
});

router.get('/borrowed', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.findAll({ borrowType: { $exists: true } }));
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
    res.status(201).json(await service.create(req.body));
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
