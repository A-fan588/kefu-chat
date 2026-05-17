const xss = require('xss');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../utils/database');

const xssFilter = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key]);
      }
    }
  }
  next();
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: '请求过于频繁，请稍后再试' }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: '操作过于频繁，请稍后再试' }
});

const logAction = async (action, userId, customerId, ip, details = '') => {
  try {
    const db = getDb();
    const log = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      action,
      user_id: userId || null,
      customer_id: customerId || null,
      ip,
      details,
      created_at: new Date().toISOString()
    };
    db.data.logs.push(log);
    await db.write();
  } catch (err) {
    console.error('日志记录失败:', err);
  }
};

const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; img-src 'self' data: *;");
  next();
};

module.exports = { xssFilter, apiLimiter, strictLimiter, logAction, securityHeaders };
