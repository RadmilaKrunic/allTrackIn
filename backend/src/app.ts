import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import spendingRouter from './modules/spending/spending.router';
import trainingRouter from './modules/training/training.router';
import booksRouter from './modules/books/books.router';
import eventsRouter from './modules/events/events.router';
import workRouter from './modules/work/work.router';
import eatingRouter from './modules/eating/eating.router';
import settingsRouter from './modules/settings/settings.router';
import notesRouter from './modules/notes/notes.router';
import periodRouter from './modules/period/period.router';
import todoRouter from './modules/todo/todo.router';
import habitsRouter from './modules/habits/habits.router';
import authRouter from './modules/auth/auth.router';
import { requireAuth } from './middleware/auth.middleware';
import { errorHandler, notFound } from './middleware/error.middleware';
import { db } from './config/database';
import { BaseService } from './shared/base.service';
import {
  EventEntry, TrainingEntry, WorkEntry, EatingEntry, Quote,
  SpendingEntry, BookEntry, NoteEntry, PeriodEntry,
} from './types/models';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL ?? '*' }));
app.use(morgan('dev'));
app.use(express.json());

// ─── Auth routes (public) ────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// ─── All routes below require authentication ─────────────────────────────────
app.use('/api', requireAuth);

// ─── Dashboard aggregation ──────────────────────────────────────────────────
app.get('/api/dashboard', async (req, res, next) => {
  try {
    const uid = req.user!.id;
    const today = new Date().toISOString().split('T')[0];
    const twoWeeksAhead = new Date(Date.now() + 14 * 86_400_000).toISOString().split('T')[0];

    const [events, trainings, workLogs, eatingLogs, allQuotes] = await Promise.all([
      new BaseService<EventEntry>(db.events).findAll(
        { userId: uid, date: { $gte: today, $lte: twoWeeksAhead } },
        { sort: { date: 1 }, limit: 10 }
      ),
      new BaseService<TrainingEntry>(db.training).findAll({ userId: uid, date: today }),
      new BaseService<WorkEntry>(db.work).findAll({ userId: uid, date: today }),
      new BaseService<EatingEntry>(db.eating).findAll({ userId: uid, date: today }),
      new BaseService<Quote>(db.quotes).findAll({ userId: uid, active: { $ne: false } }),
    ]);

    const dailyQuote = allQuotes.length
      ? allQuotes[Math.floor(Math.random() * allQuotes.length)]
      : null;

    res.json({
      today,
      upcomingEvents: events,
      todayTrainings: trainings,
      todayWork: workLogs,
      todayEating: eatingLogs,
      dailyQuote,
    });
  } catch (err) { next(err); }
});

// ─── Calendar aggregation ───────────────────────────────────────────────────
app.get('/api/calendar', async (req, res, next) => {
  try {
    const uid = req.user!.id;
    const { year, month } = req.query as Record<string, string>;
    const start = new Date(+year, +month - 1, 1).toISOString().split('T')[0];
    const end = new Date(+year, +month, 0).toISOString().split('T')[0];
    const dateQ = { userId: uid, date: { $gte: start, $lte: end } };

    const [spending, training, events, work, eating, notes] = await Promise.all([
      new BaseService<SpendingEntry>(db.spending).findAll(dateQ),
      new BaseService<TrainingEntry>(db.training).findAll(dateQ),
      new BaseService<EventEntry>(db.events).findAll(dateQ),
      new BaseService<WorkEntry>(db.work).findAll(dateQ),
      new BaseService<EatingEntry>(db.eating).findAll(dateQ),
      new BaseService<NoteEntry>(db.notes).findAll(dateQ),
    ]);

    const period = await new BaseService<PeriodEntry>(db.period).findAll(
      { userId: uid, startDate: { $gte: start, $lte: end }, type: { $exists: false } }
    );

    res.json({
      spending: spending.map(i => ({ ...i, module: 'spending' })),
      training: training.map(i => ({ ...i, module: 'training' })),
      events: events.map(i => ({ ...i, module: 'events' })),
      work: work.map(i => ({ ...i, module: 'work' })),
      eating: eating.map(i => ({ ...i, module: 'eating' })),
      notes: notes.map(i => ({ ...i, module: 'notes' })),
      period: period.map(i => ({ ...i, module: 'period' })),
    });
  } catch (err) { next(err); }
});

// ─── Module routes ──────────────────────────────────────────────────────────
app.use('/api/spending', spendingRouter);
app.use('/api/training', trainingRouter);
app.use('/api/books', booksRouter);
app.use('/api/events', eventsRouter);
app.use('/api/work', workRouter);
app.use('/api/eating', eatingRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/notes', notesRouter);
app.use('/api/period', periodRouter);
app.use('/api/todos', todoRouter);
app.use('/api/habits', habitsRouter);

// ─── Serve frontend in production ───────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
