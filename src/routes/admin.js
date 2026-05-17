const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../utils/database');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

const ADMIN_USERNAME = '阿凡';

const isAdmin = async (req, res, next) => {
  const db = getDb();
  const user = db.data.users.find(u => u.id === req.session.user.id);
  
  if (!user || user.username !== ADMIN_USERNAME) {
    return res.status(403).json({ error: '无权限' });
  }
  next();
};

router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const db = getDb();
    const users = db.data.users.map(u => ({
      id: u.id,
      username: u.username,
      nickname: u.nickname,
      avatar: u.avatar,
      online: u.online,
      created_at: u.created_at
    }));
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const user = db.data.users.find(u => u.id === id);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({ user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      online: user.online,
      created_at: user.created_at
    }});
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, nickname, avatar, password } = req.body;
    const db = getDb();
    const userIndex = db.data.users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    if (username) db.data.users[userIndex].username = username;
    if (nickname) db.data.users[userIndex].nickname = nickname;
    if (avatar) db.data.users[userIndex].avatar = avatar;
    if (password) {
      db.data.users[userIndex].password = await bcrypt.hash(password, 10);
    }
    
    await db.write();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    const user = db.data.users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    if (user.username === ADMIN_USERNAME) {
      return res.status(400).json({ error: '不能删除管理员' });
    }
    
    db.data.users = db.data.users.filter(u => u.id !== id);
    await db.write();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/is-admin', isAuthenticated, async (req, res) => {
  try {
    const db = getDb();
    const user = db.data.users.find(u => u.id === req.session.user.id);
    res.json({ isAdmin: user && user.username === ADMIN_USERNAME });
  } catch (error) {
    res.json({ isAdmin: false });
  }
});

module.exports = router;
