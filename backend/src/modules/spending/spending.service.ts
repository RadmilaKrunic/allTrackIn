import { BaseService } from '../../shared/base.service';
import { db } from '../../config/database';
import { SpendingEntry } from '../../types/models';

class SpendingService extends BaseService<SpendingEntry> {
  constructor() {
    super(db.spending);
  }

  async getByDateRange(startDate: string, endDate: string): Promise<SpendingEntry[]> {
    return this.findAll(
      { date: { $gte: startDate, $lte: endDate } },
      { sort: { date: -1 } }
    );
  }

  async getByMonth(year: number, month: number): Promise<SpendingEntry[]> {
    const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    return this.getByDateRange(start, end);
  }

  async getSummaryByCategory(
    startDate: string,
    endDate: string
  ): Promise<Record<string, { total: number; count: number; items: SpendingEntry[] }>> {
    const items = await this.getByDateRange(startDate, endDate);
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
