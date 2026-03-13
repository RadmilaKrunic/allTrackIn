import { BaseService } from '../../shared/base.service';
import { db } from '../../config/database';
import { SpendingEntry } from '../../types/models';

class SpendingService extends BaseService<SpendingEntry> {
  constructor() {
    super(db.spending);
  }

  async getByDateRange(startDate: string, endDate: string, userId?: string): Promise<SpendingEntry[]> {
    const query: Record<string, unknown> = { date: { $gte: startDate, $lte: endDate } };
    if (userId) query.userId = userId;
    return this.findAll(query, { sort: { date: -1 } });
  }

  async getByMonth(year: number, month: number, userId?: string): Promise<SpendingEntry[]> {
    const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    return this.getByDateRange(start, end, userId);
  }

  async getSummaryByCategory(
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<Record<string, { total: number; count: number; items: SpendingEntry[] }>> {
    const items = await this.getByDateRange(startDate, endDate, userId);
    return items.reduce<Record<string, { total: number; count: number; items: SpendingEntry[] }>>(
      (acc, item) => {
        const key = item.category || 'uncategorized';
        if (!acc[key]) acc[key] = { total: 0, count: 0, items: [] };
        acc[key].total += item.amount ?? 0;
        acc[key].count += 1;
        acc[key].items.push(item);
        return acc;
      },
      {}
    );
  }
}

export const spendingService = new SpendingService();
