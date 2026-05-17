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
const db = new Low(adapter, defaultData);

let dbReady = false;

const initDatabase = async () => {
  await db.read();
  db.data = db.data || defaultData;
  await db.write();
  dbReady = true;
  return db;
};

const getDb = () => {
  if (!dbReady) {
    throw new Error('Database not initialized');
  }
  return db;
};

module.exports = { db, initDatabase, getDb };
