#!/usr/bin/env node
/**
 * Migrate NeDB data from backend/data/ to MongoDB
 *
 * Usage:
 *   cd scripts
 *   npm install
 *   node migrate-nedb-to-mongodb.js
 *
 * Env overrides:
 *   MONGO_URI  - defaults to mongodb://localhost:27017
 *   DB_NAME    - defaults to allTrackin
 */

const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const DATA_DIR = path.join(__dirname, '../backend/data');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME  = process.env.DB_NAME  || 'allTrackin';

// NeDB file → MongoDB collection mapping
const FILE_MAP = [
  { file: 'users.db',       collection: 'users'       },
  { file: 'spending.db',    collection: 'spending'    },
  { file: 'training.db',    collection: 'training'    },
  { file: 'books.db',       collection: 'books'       },
  { file: 'events.db',      collection: 'events'      },
  { file: 'work.db',        collection: 'work'        },
  { file: 'eating.db',      collection: 'eating'      },
  { file: 'todos.db',       collection: 'todos'       },
  { file: 'notes.db',       collection: 'notes'       },
  { file: 'period.db',      collection: 'period'      },
  { file: 'habits.db',      collection: 'habits'      },
  { file: 'habit_logs.db',  collection: 'habitLogs'   },
  { file: 'settings.db',    collection: 'settings'    },
  { file: 'quotes.db',      collection: 'quotes'      },
  { file: 'reading_log.db', collection: 'readingLogs' },
];

// Fields (besides _id) that hold cross-document id references
const ID_REF_FIELDS = new Set(['userId', 'habitId', 'productId']);

// ─── Helpers ────────────────────────────────────────────────────────────────

function readDbFile(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return [];
  return fs
    .readFileSync(filepath, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => JSON.parse(l));
}

/** Recursively convert a NeDB document body (no _id) to MongoDB-ready form. */
function convertBody(doc, idMap) {
  const out = {};
  for (const [k, v] of Object.entries(doc)) {
    if (k === '_id') continue;
    out[k] = convertValue(k, v, idMap);
  }
  return out;
}

function convertValue(key, value, idMap) {
  if (value === null || value === undefined) return value;

  // NeDB date stub  →  JS Date
  if (typeof value === 'object' && !Array.isArray(value) && value.$$date !== undefined) {
    return new Date(value.$$date);
  }

  // Known id-reference fields: remap to the new ObjectId hex string
  if (typeof value === 'string' && ID_REF_FIELDS.has(key)) {
    return idMap[value] || value;
  }

  // Recurse into arrays
  if (Array.isArray(value)) {
    return value.map(item =>
      typeof item === 'object' && item !== null ? convertBody(item, idMap) : item
    );
  }

  // Recurse into nested objects
  if (typeof value === 'object') {
    return convertBody(value, idMap);
  }

  return value;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Connecting to ${MONGO_URI}  db: ${DB_NAME}\n`);
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    // Pass 1 – build a global NeDB _id → new ObjectId hex map
    console.log('Building ID map...');
    const idMap = {};
    for (const { file } of FILE_MAP) {
      for (const doc of readDbFile(file)) {
        if (doc._id && !idMap[doc._id]) {
          idMap[doc._id] = new ObjectId().toHexString();
        }
      }
    }
    console.log(`Mapped ${Object.keys(idMap).length} document IDs\n`);

    // Pass 2 – migrate each collection
    let totalInserted = 0;
    for (const { file, collection } of FILE_MAP) {
      const docs = readDbFile(file);

      if (docs.length === 0) {
        console.log(`  skip  ${collection.padEnd(14)} (${file} is empty)`);
        continue;
      }

      const mongoDocs = docs.map(doc => ({
        _id: new ObjectId(idMap[doc._id]),
        ...convertBody(doc, idMap),
      }));

      await db.collection(collection).deleteMany({});
      await db.collection(collection).insertMany(mongoDocs);
      totalInserted += mongoDocs.length;
      console.log(`  ✓  ${collection.padEnd(14)} ${mongoDocs.length} docs  (${file})`);
    }

    console.log(`\nDone – ${totalInserted} documents inserted into "${DB_NAME}".`);
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
