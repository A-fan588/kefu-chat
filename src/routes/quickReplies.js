const express = require('express');
const { getDb } = require('../utils/database');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const db = getDb();
    const replies = db.data.quick_replies.filter(r => r.user_id === req.session.user.id || !r.user_id);
    replies.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ replies });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { title, content, file_url, message_type } = req.body;
    const db = getDb();
    const reply = {
      id: Date.now().toString(),
      user_id: req.session.user.id,
      title,
      content: content || '',
      file_url: file_url || null,
      message_type: message_type || 'text',
      created_at: new Date().toISOString()
    };
    db.data.quick_replies.push(reply);
    await db.write();
    res.json({ success: true, id: reply.id });
  } catch (err) {
    res.status(500).json({ error: '添加失败' });
  }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const db = getDb();
    const idx = db.data.quick_replies.findIndex(r => r.id === req.params.id && r.user_id === req.session.user.id);
    if (idx !== -1) {
      db.data.quick_replies.splice(idx, 1);
      await db.write();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
