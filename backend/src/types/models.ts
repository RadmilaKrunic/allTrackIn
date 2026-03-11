// ─── Base ──────────────────────────────────────────────────────────────────
export interface BaseDocument {
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Spending ──────────────────────────────────────────────────────────────
export type TransactionType = 'expense' | 'income' | 'saving';
export type SpendingEntryType = 'transaction' | 'fixed' | 'product';

export interface SpendingEntry extends BaseDocument {
  entryType: SpendingEntryType;
  date?: string;
  amount: number;
  category: string;
  description?: string;
  transactionType?: TransactionType;
  // fixed bill extras
  dayOfMonth?: number;
  recurring?: boolean;
  // product extras
  name?: string;
  price?: number;
  unit?: string;
  // plan/done
  status: 'plan' | 'done';
}

// ─── Training ──────────────────────────────────────────────────────────────
export type ActivityType = 'running' | 'walking' | 'gym' | 'cycling' | 'yoga' | 'swimming' | 'other';

export interface TrainingEntry extends BaseDocument {
  date: string;
  activityType: ActivityType;
  status: 'plan' | 'done';
  duration?: number; // minutes
  notes?: string;
  // running / walking
  distance?: number; // km
  pace?: string;     // min/km
  // gym
  workoutType?: string;
  exercises?: Array<{ name: string; sets?: number; reps?: number; weight?: number }>;
  // extensible properties
  properties?: Record<string, unknown>;
}

// ─── Books ─────────────────────────────────────────────────────────────────
export type BookStatus = 'reading' | 'finished' | 'paused' | 'wishlist';
export type BorrowType = 'borrowed_from' | 'lent_to';

export interface BookEntry extends BaseDocument {
  title: string;
  author?: string;
  genre?: string;
  status: BookStatus;
  listType?: 'reading' | 'wishlist';
  startDate?: string;
  endDate?: string;
  rating?: number;
  notes?: string;
  // borrow
  borrowType?: BorrowType;
  borrowPerson?: string;
  borrowDate?: string;
}

// ─── Events ────────────────────────────────────────────────────────────────
export type EventType = 'birthday' | 'vacation' | 'appointment' | 'reminder' | 'holiday' | 'other';

export interface EventEntry extends BaseDocument {
  name: string;
  date: string;
  time?: string;
  endDate?: string;
  eventType: EventType;
  description?: string;
  location?: string;
  recurring?: boolean;
  status: 'plan' | 'done';
  color?: string;
}

// ─── Work ──────────────────────────────────────────────────────────────────
export type WorkLocationType = 'home' | 'office' | 'travel' | 'other';

export interface WorkEntry extends BaseDocument {
  date: string;
  locationType: WorkLocationType;
  tableNumber?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  status: 'plan' | 'done';
}

// ─── Eating ────────────────────────────────────────────────────────────────
export type EatingEntryType = 'daily_log' | 'recipe';

export interface EatingEntry extends BaseDocument {
  entryType: EatingEntryType;
  date?: string;
  status?: 'plan' | 'done';
  // daily log
  categories?: string[]; // e.g. ['no_sugar', 'no_flour', 'vegetarian']
  meals?: Array<{ name: string; time?: string; notes?: string }>;
  notes?: string;
  // recipe
  name?: string;
  ingredients?: string[];
  instructions?: string;
  tags?: string[];
}

// ─── Settings ──────────────────────────────────────────────────────────────
export interface Category extends BaseDocument {
  type: 'category';
  module: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface Preferences extends BaseDocument {
  type: 'preferences';
  theme: string;
}

export interface Quote extends BaseDocument {
  text: string;
  author?: string;
  active?: boolean;
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
export interface DashboardData {
  today: string;
  upcomingEvents: EventEntry[];
  todayTrainings: TrainingEntry[];
  todayWork: WorkEntry[];
  todayEating: EatingEntry[];
  dailyQuote: Quote | null;
}

export interface CalendarData {
  spending: SpendingEntry[];
  training: TrainingEntry[];
  events: EventEntry[];
  work: WorkEntry[];
  eating: EatingEntry[];
}
