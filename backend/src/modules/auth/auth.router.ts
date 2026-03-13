import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BaseService } from '../../shared/base.service';
import { db } from '../../config/database';
import { User } from '../../types/models';
import { JWT_SECRET, requireAuth } from '../../middleware/auth.middleware';

const userService = new BaseService<User>(db.users);
const router = Router();

function makeToken(user: User) {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name, password } = req.body as { email?: string; name?: string; password?: string };
    if (!email?.trim() || !password?.trim() || !name?.trim()) {
      return res.status(400).json({ error: 'Email, name and password are required' });
    }
    const existing = await userService.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userService.create({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash,
    });

    const token = makeToken(user);
    res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await userService.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = makeToken(user);
    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) { next(err); }
});

// GET /api/auth/me  (protected)
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.findById(req.user!.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id, email: user.email, name: user.name });
  } catch (err) { next(err); }
});

export default router;
