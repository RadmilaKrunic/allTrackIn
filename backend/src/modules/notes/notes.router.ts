import { Router, Request, Response, NextFunction } from 'express';
import { BaseService } from '../../shared/base.service';
import { db } from '../../config/database';
import { NoteEntry } from '../../types/models';

const service = new BaseService<NoteEntry>(db.notes);
const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, startDate, endDate } = req.query as Record<string, string>;
    const query: Record<string, unknown> = { userId: req.user!.id };
    if (date) query.date = date;
    else if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
    res.json(await service.findAll(query, { sort: { date: -1, createdAt: -1 } }));
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const note = await service.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.date) return res.status(400).json({ message: 'date is required' });
    if (!req.body.text?.trim()) return res.status(400).json({ message: 'text is required' });
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
