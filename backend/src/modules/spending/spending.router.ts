import { Router, Request, Response, NextFunction } from 'express';
import { spendingService } from './spending.service';

const router = Router();

router.get('/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = req.user!.id;
    const { startDate, endDate, year, month } = req.query as Record<string, string>;
    let items;
    if (year && month) {
      items = await spendingService.getByMonth(+year, +month, uid);
    } else if (startDate && endDate) {
      items = await spendingService.getByDateRange(startDate, endDate, uid);
    } else {
      items = await spendingService.findAll({ userId: uid, entryType: 'transaction' }, { sort: { date: -1 } });
    }
    res.json(items);
  } catch (err) { next(err); }
});

router.get('/transactions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await spendingService.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { next(err); }
});

router.post('/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await spendingService.create({ ...req.body, entryType: 'transaction', userId: req.user!.id });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/transactions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await spendingService.update(req.params.id, req.body);
    res.json(item);
  } catch (err) { next(err); }
});

router.delete('/transactions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await spendingService.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query as Record<string, string>;
    const summary = await spendingService.getSummaryByCategory(startDate, endDate, req.user!.id);
    res.json(summary);
  } catch (err) { next(err); }
});

router.get('/fixed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await spendingService.findAll({ userId: req.user!.id, entryType: 'fixed' }, { sort: { dayOfMonth: 1 } });
    res.json(items);
  } catch (err) { next(err); }
});

router.post('/fixed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await spendingService.create({ ...req.body, entryType: 'fixed', userId: req.user!.id });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/fixed/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await spendingService.update(req.params.id, req.body);
    res.json(item);
  } catch (err) { next(err); }
});

router.delete('/fixed/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await spendingService.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await spendingService.findAll({ userId: req.user!.id, entryType: 'product' }, { sort: { name: 1 } });
    res.json(items);
  } catch (err) { next(err); }
});

router.post('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await spendingService.create({ ...req.body, entryType: 'product', userId: req.user!.id });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await spendingService.update(req.params.id, req.body);
    res.json(item);
  } catch (err) { next(err); }
});

router.delete('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await spendingService.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/shopping-list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productIds } = req.body as { productIds: string[] };
    const allProducts = await spendingService.findAll({ userId: req.user!.id, entryType: 'product' });
    const selected = allProducts.filter(p => productIds.includes(p._id!));
    const total = selected.reduce((sum, p) => sum + (p.price ?? 0), 0);
    res.json({ items: selected, estimatedTotal: total });
  } catch (err) { next(err); }
});

// ─── Cart ─────────────────────────────────────────────────────────────────────

router.get('/cart', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await spendingService.findAll({ userId: req.user!.id, entryType: 'cart' }, { sort: { createdAt: -1 } });
    res.json(items);
  } catch (err) { next(err); }
});

router.post('/cart', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productIds, name } = req.body as { productIds: string[]; name?: string };
    const allProducts = await spendingService.findAll({ userId: req.user!.id, entryType: 'product' });
    const selected = allProducts.filter(p => productIds.includes(p._id!));
    const estimatedTotal = selected.reduce((sum, p) => sum + (p.price ?? 0), 0);
    const cartItems = selected.map(p => ({
      productId: p._id!,
      name: p.name ?? p.category,
      price: p.price,
      unit: p.unit,
      category: p.category,
      checked: false,
    }));
    const item = await spendingService.create({
      entryType: 'cart',
      userId: req.user!.id,
      name: name ?? `Shopping List ${new Date().toLocaleDateString()}`,
      category: 'cart',
      amount: estimatedTotal,
      estimatedTotal,
      cartItems,
      status: 'plan',
    } as any);
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put('/cart/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await spendingService.update(req.params.id, req.body);
    res.json(item);
  } catch (err) { next(err); }
});

router.delete('/cart/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await spendingService.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
