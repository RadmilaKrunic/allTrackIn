import Datastore from 'nedb-promises';
import path from 'path';

// On Railway: set DATA_PATH env var to the mounted volume path (e.g. /app/data)
// Locally: falls back to the repo's backend/data/ directory
const DATA_DIR = process.env.DATA_PATH ?? path.join(__dirname, '../../data');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStore = (filename: string): Datastore<any> =>
  Datastore.create({
    filename: path.join(DATA_DIR, `${filename}.db`),
    autoload: true,
  });

export const db = {
  users: createStore('users'),
  spending: createStore('spending'),
  training: createStore('training'),
  books: createStore('books'),
  events: createStore('events'),
  work: createStore('work'),
  eating: createStore('eating'),
  settings: createStore('settings'),
  quotes: createStore('quotes'),
  notes: createStore('notes'),
  period: createStore('period'),
  readingLog: createStore('reading_log'),
  todos: createStore('todos'),
  habits: createStore('habits'),
  habitLogs: createStore('habit_logs'),
};
