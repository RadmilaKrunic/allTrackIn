using AllTrackIn.Api.Models;
using LiteDB;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;

namespace AllTrackIn.Api.Services
{
    public class BaseService<T> where T : BaseDocument
    {
        public readonly ILiteCollection<T> Collection;

        public BaseService(ILiteCollection<T> collection)
        {
            Collection = collection;
        }

        public List<T> FindAll(Expression<Func<T, bool>> predicate = null)
            => predicate == null ? Collection.FindAll().ToList() : Collection.Find(predicate).ToList();

        public T FindOne(Expression<Func<T, bool>> predicate)
            => Collection.FindOne(predicate);

        public T FindById(string id)
            => Collection.FindById(id);

        public T Create(T document)
        {
            document.Id = ObjectId.NewObjectId().ToString();
            document.CreatedAt = DateTime.UtcNow;
            document.UpdatedAt = DateTime.UtcNow;
            Collection.Insert(document);
            return document;
        }

        public T Update(T document)
        {
            document.UpdatedAt = DateTime.UtcNow;
            Collection.Update(document);
            return document;
        }

        public bool Delete(string id)
            => Collection.Delete(id);

        public int Count(Expression<Func<T, bool>> predicate)
            => Collection.Count(predicate);
    }
}
