const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const dbPath = path.join(__dirname, '../../db.json');

const defaultData = {
  users: [],
  customers: [],
  messages: [],
  quick_replies: [],
  logs: []
};

const adapter = new JSONFile(dbPath);
const db = new Low(adapter);

const initDatabase = async () => {
  await db.read();
  if (!db.data) {
    db.data = defaultData;
    await db.write();
  }
  return db;
};

const getDb = () => {
  if (!db.data) {
    db.data = defaultData;
    db.write().catch(() => {});
  }
  return db;
};

module.exports = { db, initDatabase, getDb };
