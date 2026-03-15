import axios from "axios";
import type {
  SpendingEntry,
  TrainingEntry,
  BookEntry,
  EventEntry,
  WorkEntry,
  EatingEntry,
  Category,
  Quote,
  Preferences,
  DashboardData,
  CalendarData,
  NoteEntry,
  PeriodEntry,
  PeriodSettings,
  PeriodPredictions,
  ReadingLogEntry,
  TodoEntry,
  HabitDefinition,
  HabitLog,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

const TOKEN_KEY = "alltrack_token";

const http = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT to every request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (r) => r.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("alltrack_user");
      window.location.href = import.meta.env.BASE_URL + "login";
    }
    return Promise.reject(
      new Error(
        err.response?.data?.error ??
          err.response?.data?.message ??
          err.message ??
          "An error occurred",
      ),
    );
  },
);

// Auth API (uses plain axios, not the authenticated http instance)
export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    axios
      .post<{
        token: string;
        user: { id: string; email: string; name: string };
      }>(`${BASE_URL}/auth/register`, data)
      .then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    axios
      .post<{
        token: string;
        user: { id: string; email: string; name: string };
      }>(`${BASE_URL}/auth/login`, data)
      .then((r) => r.data),
};

// ─── Generic CRUD factory ───────────────────────────────────────────────────
const crud = <T>(resource: string) => ({
  getAll: (params?: Record<string, unknown>) =>
    http.get<T[], T[]>(`/${resource}`, { params }),
  getOne: (id: string) => http.get<T, T>(`/${resource}/${id}`),
  create: (data: Partial<T>) => http.post<T, T>(`/${resource}`, data),
  update: (id: string, data: Partial<T>) =>
    http.put<T, T>(`/${resource}/${id}`, data),
  remove: (id: string) =>
    http.delete<{ success: boolean }, { success: boolean }>(
      `/${resource}/${id}`,
    ),
});

// ─── Module APIs ────────────────────────────────────────────────────────────
export const spendingApi = {
  getTransactions: (params?: Record<string, unknown>) =>
    http.get<SpendingEntry[], SpendingEntry[]>("/spending/transactions", {
      params,
    }),
  createTransaction: (data: Partial<SpendingEntry>) =>
    http.post<SpendingEntry, SpendingEntry>("/spending/transactions", data),
  updateTransaction: (id: string, data: Partial<SpendingEntry>) =>
    http.put<SpendingEntry, SpendingEntry>(
      `/spending/transactions/${id}`,
      data,
    ),
  deleteTransaction: (id: string) =>
    http.delete(`/spending/transactions/${id}`),

  getFixed: () => http.get<SpendingEntry[], SpendingEntry[]>("/spending/fixed"),
  createFixed: (data: Partial<SpendingEntry>) =>
    http.post<SpendingEntry, SpendingEntry>("/spending/fixed", data),
  updateFixed: (id: string, data: Partial<SpendingEntry>) =>
    http.put<SpendingEntry, SpendingEntry>(`/spending/fixed/${id}`, data),
  deleteFixed: (id: string) => http.delete(`/spending/fixed/${id}`),

  getProducts: () =>
    http.get<SpendingEntry[], SpendingEntry[]>("/spending/products"),
  createProduct: (data: Partial<SpendingEntry>) =>
    http.post<SpendingEntry, SpendingEntry>("/spending/products", data),
  updateProduct: (id: string, data: Partial<SpendingEntry>) =>
    http.put<SpendingEntry, SpendingEntry>(`/spending/products/${id}`, data),
  deleteProduct: (id: string) => http.delete(`/spending/products/${id}`),

  createShoppingList: (productIds: string[]) =>
    http.post<
      { items: SpendingEntry[]; estimatedTotal: number },
      { items: SpendingEntry[]; estimatedTotal: number }
    >("/spending/shopping-list", { productIds }),

  getCart: () => http.get<SpendingEntry[], SpendingEntry[]>("/spending/cart"),
  createCart: (productIds: string[], name?: string) =>
    http.post<SpendingEntry, SpendingEntry>("/spending/cart", {
      productIds,
      name,
    }),
  updateCart: (id: string, data: Partial<SpendingEntry>) =>
    http.put<SpendingEntry, SpendingEntry>(`/spending/cart/${id}`, data),
  deleteCart: (id: string) => http.delete(`/spending/cart/${id}`),

  getSummary: (params?: Record<string, unknown>) =>
    http.get("/spending/summary", { params }),
};

export const trainingApi = crud<TrainingEntry>("training");
export const booksApi = {
  ...crud<BookEntry>("books"),
  getWishlist: () => http.get<BookEntry[], BookEntry[]>("/books/wishlist"),
  getBorrowed: () => http.get<BookEntry[], BookEntry[]>("/books/borrowed"),
  getReadingLog: () =>
    http.get<ReadingLogEntry[], ReadingLogEntry[]>("/books/reading-log"),
  toggleReadingDay: (date: string, read: boolean) =>
    http.put<ReadingLogEntry, ReadingLogEntry>(`/books/reading-log/${date}`, {
      read,
    }),
};
export const eventsApi = {
  ...crud<EventEntry>("events"),
  getUpcoming: () => http.get<EventEntry[], EventEntry[]>("/events/upcoming"),
};
export const workApi = {
  ...crud<WorkEntry>("work"),
  getStats: (params?: Record<string, unknown>) =>
    http.get("/work/stats", { params }),
};
export const eatingApi = {
  ...crud<EatingEntry>("eating"),
  getRecipes: () => http.get<EatingEntry[], EatingEntry[]>("/eating/recipes"),
};

export const settingsApi = {
  getCategories: (module?: string) =>
    http.get<Category[], Category[]>("/settings/categories", {
      params: { module },
    }),
  createCategory: (data: Partial<Category>) =>
    http.post<Category, Category>("/settings/categories", data),
  updateCategory: (id: string, data: Partial<Category>) =>
    http.put<Category, Category>(`/settings/categories/${id}`, data),
  deleteCategory: (id: string) => http.delete(`/settings/categories/${id}`),

  getPreferences: () =>
    http.get<Preferences, Preferences>("/settings/preferences"),
  updatePreferences: (data: Partial<Preferences>) =>
    http.put<Preferences, Preferences>("/settings/preferences", data),

  getQuotes: () => http.get<Quote[], Quote[]>("/settings/quotes"),
  getRandomQuote: () =>
    http.get<Quote | null, Quote | null>("/settings/quotes/random"),
  createQuote: (data: Partial<Quote>) =>
    http.post<Quote, Quote>("/settings/quotes", data),
  updateQuote: (id: string, data: Partial<Quote>) =>
    http.put<Quote, Quote>(`/settings/quotes/${id}`, data),
  deleteQuote: (id: string) => http.delete(`/settings/quotes/${id}`),
};

export const todoApi = crud<TodoEntry>("todos");

export const habitsApi = {
  ...crud<HabitDefinition>("habits"),
  getLogs: (params?: Record<string, unknown>) =>
    http.get<HabitLog[], HabitLog[]>("/habits/log", { params }),
  toggleLog: (date: string, habitId: string, done: boolean) =>
    http.put<HabitLog, HabitLog>(`/habits/log/${date}/${habitId}`, { done }),
};

export const notesApi = {
  ...crud<NoteEntry>("notes"),
  getByDate: (date: string) =>
    http.get<NoteEntry[], NoteEntry[]>("/notes", { params: { date } }),
};

export const periodApi = {
  ...crud<PeriodEntry>("period"),
  getSettings: () =>
    http.get<PeriodSettings, PeriodSettings>("/period/settings"),
  updateSettings: (data: Partial<PeriodSettings>) =>
    http.put<PeriodSettings, PeriodSettings>("/period/settings", data),
  getPredictions: () =>
    http.get<PeriodPredictions, PeriodPredictions>("/period/predictions"),
};

export const dashboardApi = {
  get: () => http.get<DashboardData, DashboardData>("/dashboard"),
  getCalendar: (year: number, month: number) =>
    http.get<CalendarData, CalendarData>("/calendar", {
      params: { year, month },
    }),
};
