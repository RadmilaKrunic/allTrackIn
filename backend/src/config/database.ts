import Datastore from 'nedb-promises';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStore = (filename: string): Datastore<any> =>
  Datastore.create({
    filename: path.join(DATA_DIR, `${filename}.db`),
    autoload: true,
  });

export const db = {
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
};
