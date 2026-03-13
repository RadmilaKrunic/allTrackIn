import { Router, Request, Response, NextFunction } from 'express';
import { BaseService } from '../../shared/base.service';
import { db } from '../../config/database';
import { Category, Preferences, Quote } from '../../types/models';

const settingsService = new BaseService<Category | Preferences>(db.settings);
const quotesService = new BaseService<Quote>(db.quotes);
const router = Router();

// ─── Categories ─────────────────────────────────────────────────────────────
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { module } = req.query as Record<string, string>;
    const query: Record<string, unknown> = { type: 'category', userId: req.user!.id };
    if (module) query.module = module;
    res.json(await settingsService.findAll(query, { sort: { module: 1, name: 1 } }));
  } catch (err) { next(err); }
});

router.post('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await settingsService.create({ ...req.body, type: 'category', userId: req.user!.id }));
  } catch (err) { next(err); }
});

router.put('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await settingsService.update(req.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await settingsService.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Preferences ────────────────────────────────────────────────────────────
router.get('/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prefs = await settingsService.findOne({ type: 'preferences', userId: req.user!.id });
    res.json(prefs ?? { type: 'preferences', theme: 'pastel' });
  } catch (err) { next(err); }
});

router.put('/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = req.user!.id;
    const existing = await settingsService.findOne({ type: 'preferences', userId: uid });
    const prefs = existing
      ? await settingsService.update(existing._id!, req.body)
      : await settingsService.create({ ...req.body, type: 'preferences', userId: uid });
    res.json(prefs);
  } catch (err) { next(err); }
});

// ─── Quotes / Affirmations ──────────────────────────────────────────────────
router.get('/quotes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await quotesService.findAll({ userId: req.user!.id }, { sort: { createdAt: -1 } }));
  } catch (err) { next(err); }
});

router.get('/quotes/random', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await quotesService.findAll({ userId: req.user!.id, active: { $ne: false } });
    if (!all.length) return res.json(null);
    res.json(all[Math.floor(Math.random() * all.length)]);
  } catch (err) { next(err); }
});

router.post('/quotes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await quotesService.create({ ...req.body, active: true, userId: req.user!.id }));
  } catch (err) { next(err); }
});

router.put('/quotes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await quotesService.update(req.params.id, req.body));
  } catch (err) { next(err); }
});

router.delete('/quotes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await quotesService.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
