const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const dbPath = path.join(__dirname, '../../db.json');

const defaultData = {
  users: [],
  customers: [],
  messages: [],
  quick_replies: [],
  logs: []
};

const adapter = new FileSync(dbPath);
const db = low(adapter);

// 初始化数据（幂等操作）
db.defaults(defaultData).write();

const initDatabase = async () => {
  return db;
};

const getDb = () => {
  // 确保持有 .data 属性
  if (!db.data) {
    db.data = defaultData;
    db.write();
  }
  return db;
};

module.exports = { db, initDatabase, getDb };
