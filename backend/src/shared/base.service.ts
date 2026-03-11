import Datastore from 'nedb-promises';
import { BaseDocument } from '../types/models';

interface FindOptions {
  sort?: Record<string, number>;
  skip?: number;
  limit?: number;
}

/**
 * Generic CRUD base service using NeDB.
 * Module services extend this via composition or inheritance (OCP).
 */
export class BaseService<T extends BaseDocument> {
  protected db: Datastore;

  constructor(datastore: Datastore) {
    this.db = datastore;
  }

  async findAll(query: Record<string, unknown> = {}, options: FindOptions = {}): Promise<T[]> {
    let cursor = this.db.find<T>(query);
    if (options.sort) cursor = cursor.sort(options.sort);
    if (options.skip) cursor = cursor.skip(options.skip);
    if (options.limit) cursor = cursor.limit(options.limit);
    return cursor.exec();
  }

  async findOne(query: Record<string, unknown>): Promise<T | null> {
    return this.db.findOne<T>(query);
  }

  async findById(id: string): Promise<T | null> {
    return this.db.findOne<T>({ _id: id });
  }

  async create(data: Omit<T, '_id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
    return this.db.insert<T>(doc as T);
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const updateData = { ...data, updatedAt: new Date() };
    await this.db.update({ _id: id }, { $set: updateData });
    return this.findById(id);
  }

  async delete(id: string): Promise<number> {
    return this.db.remove({ _id: id }, {});
  }

  async count(query: Record<string, unknown> = {}): Promise<number> {
    return this.db.count(query);
  }
}
