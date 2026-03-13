import { Router, Request, Response, NextFunction } from 'express';
import { BaseService } from '../../shared/base.service';
import { db } from '../../config/database';
import { BookEntry, BaseDocument } from '../../types/models';

interface ReadingLogDoc extends BaseDocument {
  date: string;
  read: boolean;
}

const service = new BaseService<BookEntry>(db.books);
const logService = new BaseService<ReadingLogDoc>(db.readingLog);
const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, listType } = req.query as Record<string, string>;
    const query: Record<string, unknown> = { userId: req.user!.id };
    if (status) query.status = status;
    if (listType) query.listType = listType;
    res.json(await service.findAll(query, { sort: { updatedAt: -1 } }));
  } catch (err) { next(err); }
});

// ─── Reading Log ─────────────────────────────────────────────────────────────

router.get('/reading-log', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await logService.findAll({ userId: req.user!.id }, { sort: { date: -1 } }));
  } catch (err) { next(err); }
});

router.put('/reading-log/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = req.params;
    const { read } = req.body;
    const uid = req.user!.id;
    const existing = await logService.findAll({ userId: uid, date });
    if (existing.length > 0) {
      res.json(await logService.update(existing[0]._id!, { read }));
    } else {
      res.status(201).json(await logService.create({ userId: uid, date, read }));
    }
  } catch (err) { next(err); }
});

// ─── Book CRUD ───────────────────────────────────────────────────────────────

router.get('/wishlist', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.findAll({ userId: req.user!.id, status: 'wishlist' }));
  } catch (err) { next(err); }
});

router.get('/borrowed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.findAll({ userId: req.user!.id, borrowType: { $exists: true } }));
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
