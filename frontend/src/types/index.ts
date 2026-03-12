// ─── Shared domain types (mirrors backend) ──────────────────────────────────

export type PlanDoneStatus = 'plan' | 'done';

export interface BaseEntity {
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Spending
export type TransactionType = 'expense' | 'income' | 'saving';
export type SpendingEntryType = 'transaction' | 'fixed' | 'product' | 'cart';

export interface CartItem {
  productId: string;
  name: string;
  price?: number;
  unit?: string;
  category: string;
  checked: boolean;
}

export interface SpendingEntry extends BaseEntity {
  entryType: SpendingEntryType;
  date?: string;
  amount: number;
  category: string;
  description?: string;
  transactionType?: TransactionType;
  dayOfMonth?: number;
  dayOfWeek?: number;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurring?: boolean;
  name?: string;
  price?: number;
  unit?: string;
  cartItems?: CartItem[];
  estimatedTotal?: number;
  status: PlanDoneStatus;
}

// Training
export type ActivityType = 'running' | 'walking' | 'gym' | 'cycling' | 'yoga' | 'swimming' | 'other';

export interface TrainingEntry extends BaseEntity {
  date: string;
  activityType: ActivityType;
  status: PlanDoneStatus;
  duration?: number;
  notes?: string;
  distance?: number;
  pace?: string;
  workoutType?: string;
  exercises?: Array<{ name: string; sets?: number; reps?: number; weight?: number }>;
  properties?: Record<string, unknown>;
}

// Books
export type BookStatus = 'reading' | 'finished' | 'paused' | 'wishlist';
export type BorrowType = 'borrowed_from' | 'lent_to';

export interface BookEntry extends BaseEntity {
  title: string;
  author?: string;
  genre?: string;
  status: BookStatus;
  startDate?: string;
  endDate?: string;
  rating?: number;
  notes?: string;
  borrowType?: BorrowType;
  borrowPerson?: string;
  borrowDate?: string;
}

// Events
export type EventType = 'birthday' | 'vacation' | 'appointment' | 'reminder' | 'holiday' | 'other';

export interface EventEntry extends BaseEntity {
  name: string;
  date: string;
  time?: string;
  endDate?: string;
  eventType: EventType;
  description?: string;
  location?: string;
  recurring?: boolean;
  status: PlanDoneStatus;
  color?: string;
}

// Work
export type WorkLocationType = 'home' | 'office' | 'travel' | 'other';

export interface WorkEntry extends BaseEntity {
  date: string;
  locationType: WorkLocationType;
  tableNumber?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  status: PlanDoneStatus;
}

// Eating
export type EatingEntryType = 'daily_log' | 'recipe' | 'diet_log';

export interface EatingEntry extends BaseEntity {
  entryType: EatingEntryType;
  date?: string;
  status?: PlanDoneStatus;
  categories?: string[];
  meals?: Array<{ name: string; time?: string; notes?: string }>;
  notes?: string;
  name?: string;
  ingredients?: string[];
  instructions?: string;
  tags?: string[];
}

// Settings
export interface Category extends BaseEntity {
  type: 'category';
  module: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface Quote extends BaseEntity {
  text: string;
  author?: string;
  active?: boolean;
}

export interface Preferences extends BaseEntity {
  type: 'preferences';
  theme: string;
}

// Dashboard
export interface DashboardData {
  today: string;
  upcomingEvents: EventEntry[];
  todayTrainings: TrainingEntry[];
  todayWork: WorkEntry[];
  todayEating: EatingEntry[];
  dailyQuote: Quote | null;
}

export interface CalendarData {
  spending: Array<SpendingEntry & { module: string }>;
  training: Array<TrainingEntry & { module: string }>;
  events: Array<EventEntry & { module: string }>;
  work: Array<WorkEntry & { module: string }>;
  eating: Array<EatingEntry & { module: string }>;
}

// Theme
export type ModuleName = 'spending' | 'training' | 'books' | 'events' | 'work' | 'eating';
