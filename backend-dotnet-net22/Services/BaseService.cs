using AllTrackIn.Api.Models;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AllTrackIn.Api.Services
{
    public class BaseService<T> where T : BaseDocument
    {
        public readonly IMongoCollection<T> Collection;

        public BaseService(IMongoCollection<T> collection)
        {
            Collection = collection;
        }

        public async Task<List<T>> FindAllAsync(FilterDefinition<T> filter, SortDefinition<T> sort = null, int? limit = null, int? skip = null)
        {
            var findOptions = new FindOptions<T>
            {
                Sort = sort,
                Limit = limit,
                Skip = skip
            };
            var cursor = await Collection.FindAsync(filter, findOptions);
            return await cursor.ToListAsync();
        }

        public async Task<T> FindOneAsync(FilterDefinition<T> filter)
        {
            var cursor = await Collection.FindAsync(filter);
            return await cursor.FirstOrDefaultAsync();
        }

        public async Task<T> FindByIdAsync(string id)
        {
            var filter = Builders<T>.Filter.Eq("_id", MongoDB.Bson.ObjectId.Parse(id));
            var cursor = await Collection.FindAsync(filter);
            return await cursor.FirstOrDefaultAsync();
        }

        public async Task<T> CreateAsync(T document)
        {
            document.CreatedAt = DateTime.UtcNow;
            document.UpdatedAt = DateTime.UtcNow;
            await Collection.InsertOneAsync(document);
            return document;
        }

        public async Task<T> UpdateAsync(string id, UpdateDefinition<T> update)
        {
            var filter = Builders<T>.Filter.Eq("_id", MongoDB.Bson.ObjectId.Parse(id));
            var finalUpdate = Builders<T>.Update.Combine(update, Builders<T>.Update.Set(d => d.UpdatedAt, DateTime.UtcNow));
            await Collection.UpdateOneAsync(filter, finalUpdate);
            return await FindByIdAsync(id);
        }

        public async Task<long> DeleteAsync(string id)
        {
            var filter = Builders<T>.Filter.Eq("_id", MongoDB.Bson.ObjectId.Parse(id));
            var result = await Collection.DeleteOneAsync(filter);
            return result.DeletedCount;
        }

        public async Task<long> CountAsync(FilterDefinition<T> filter)
        {
            return await Collection.CountDocumentsAsync(filter);
        }
    }
}
