const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../utils/database');
const { isAuthenticated } = require('../middleware/auth');
const { strictLimiter, logAction } = require('../middleware/security');

const router = express.Router();

router.post('/register', strictLimiter, async (req, res) => {
  try {
    const { username, password, nickname } = req.body;
    if (!username || !password || !nickname) {
      return res.status(400).json({ error: '请填写完整信息' });
    }
    const db = getDb();
    const existingUser = db.data.users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    // 第一个注册的用户自动成为管理员
    const isFirstUser = db.data.users.length === 0;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      nickname,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      online: 0,
      role: isFirstUser ? 'admin' : 'agent',
      created_at: new Date().toISOString()
    };
    db.data.users.push(user);
    await db.write();
    await logAction('register', user.id, null, req.ip);
    res.json({ success: true, message: isFirstUser ? '注册成功（管理员）' : '注册成功（客服）' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/login', strictLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = getDb();
    const user = db.data.users.find(u => u.username === username);
    if (!user) return res.status(400).json({ error: '用户名或密码错误' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: '用户名或密码错误' });
    
    req.session.user = { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar };
    user.online = 1;
    await db.write();
    await logAction('login', user.id, null, req.ip);
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/logout', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const db = getDb();
    const user = db.data.users.find(u => u.id === userId);
    if (user) user.online = 0;
    await db.write();
    await logAction('logout', userId, null, req.ip);
    req.session.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/me', isAuthenticated, (req, res) => {
  res.json({ user: req.session.user });
});

module.exports = router;
