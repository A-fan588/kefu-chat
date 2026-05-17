const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const { db, initDatabase, getDb } = require('./src/utils/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.json());

const sessionMiddleware = session({
  store: new FileStore({ path: './sessions' }),
  secret: 'kefu-secret-key-2024',
  resave: false,
  saveUninitialized: false
});

app.use(sessionMiddleware);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|webp|mp4|webm|mov|avi|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|7z/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) return cb(null, true);
    cb(new Error('不支持的文件类型'));
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const authRoutes = require('./src/routes/auth');
const quickReplyRoutes = require('./src/routes/quickReplies');
const adminRoutes = require('./src/routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/quick-replies', quickReplyRoutes);
app.use('/api/admin', adminRoutes);

app.post('/api/upload', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '未登录' });
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    res.json({ url: `/uploads/${req.file.filename}`, type: req.file.mimetype });
  });
});

app.post('/api/customer/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });
  res.json({ url: `/uploads/${req.file.filename}`, type: req.file.mimetype });
});

app.get('/api/customers', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '未登录' });
  const db = getDb();
  const customers = [...db.data.customers].sort((a, b) => new Date(b.last_active) - new Date(a.last_active));
  res.json({ customers });
});

app.get('/api/customers/:id/messages', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '未登录' });
  try {
    const db = getDb();
    const customerId = req.params.id;

    unreadMessages.forEach((count, key) => {
      if (key.endsWith(`:${customerId}`)) {
        unreadMessages.delete(key);
      }
    });

    const messages = db.data.messages
      .filter(m => m.customer_id === customerId)
      .map(m => {
        if (m.user_id) {
          const user = db.data.users.find(u => u.id === m.user_id);
          if (user) {
            return { ...m, user_nickname: user.nickname, user_avatar: user.avatar };
          }
        }
        return m;
      })
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    res.json({ messages });

    io.emit('messages:read', { customerId, readBy: req.session.user.id });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/unread-counts', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '未登录' });
  try {
    const userId = req.session.user.id;
    const userUnread = {};

    unreadMessages.forEach((count, key) => {
      if (key.startsWith(`${userId}:`)) {
        const customerId = key.split(':')[1];
        userUnread[customerId] = count;
      }
    });

    res.json({ unreadCounts: userUnread });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/search', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '未登录' });
  try {
    const { q } = req.query;
    if (!q) return res.json({ results: [] });
    const db = getDb();
    const results = db.data.messages
      .filter(m => m.content && m.content.toLowerCase().includes(q.toLowerCase()))
      .map(m => {
        const customer = db.data.customers.find(c => c.id === m.customer_id);
        const user = m.user_id ? db.data.users.find(u => u.id === m.user_id) : null;
        return {
          ...m,
          customer_nickname: customer?.nickname,
          user_nickname: user?.nickname
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 100);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin/index.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/client/index.html')));

const customerSockets = new Map();
const userSockets = new Map();
const typingStatus = new Map();
const unreadMessages = new Map();

const welcomeMessage = `🈲本产品不是1毛，1毛只是为了方便付款
✅如果想1毛就得到账号的免开尊口

⏭需要什么发对应数字给客服

1⃣ X(之前的蓝🕊)
2⃣📜✈(TG也叫⚡️报)
3⃣古哥
4⃣加速器
5⃣其它

▶一切账号都需要自备加速器
▶收到号，第一时间保存好，丢失无补，不存档！！
▶账号发出不支持退货退款，取号前请三思！！！

⏰客服工作时间早9:00—凌晨2:00 （其它时间段可以留言，上班就回复）
免责声明：本店提供的账号资源仅限
用来计算机技术学习/游戏下载/外贸
交流。用户若擅自利用本店账号资源
从事任何违反本国法律法规的活动，
由此引起的一切后果与本店无关。`;

const getOnlineUsers = () => {
  const database = getDb();
  return database.data.users.filter(u => u.online === 1);
};

const assignCustomer = (customerId) => {
  const onlineUsers = getOnlineUsers();
  if (onlineUsers.length === 0) return null;
  const user = onlineUsers[Math.floor(Math.random() * onlineUsers.length)];
  const database = getDb();
  const customer = database.data.customers.find(c => c.id === customerId);
  if (customer) customer.assigned_to = user.id;
  return user;
};

const getClientIP = (socket) => {
  const req = socket.request;
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (socket.handshake && socket.handshake.address) {
    return socket.handshake.address;
  }
  return 'unknown';
};

const normalizeIP = (ip) => {
  if (!ip) return 'unknown';
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  if (ip === '::1') {
    return '127.0.0.1';
  }
  return ip;
};

const getRegionFromIP = async (ip) => {
  const normalizedIP = normalizeIP(ip);
  
  if (normalizedIP === '127.0.0.1' || normalizedIP === 'localhost') return '本地';
  
  try {
    const response = await fetch(`http://ip-api.com/json/${normalizedIP}?lang=zh-CN`);
    const data = await response.json();
    
    if (data.status === 'success') {
      const region = data.regionName || '';
      const city = data.city || '';
      
      if (region && city) {
        return `${region}${city}`;
      } else if (region) {
        return region;
      } else if (data.country) {
        return data.country;
      }
    }
  } catch (error) {
    console.log('IP地理位置查询失败:', error);
  }
  
  return '未知地区';
};

const logAction = async (action, userId, targetId, ip) => {
  const database = getDb();
  database.data.logs.push({
    id: Date.now().toString(),
    action,
    user_id: userId,
    target_id: targetId,
    ip,
    created_at: new Date().toISOString()
  });
  await database.write();
};

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

io.on('connection', async (socket) => {
  const { type, uid } = socket.handshake.query;

  if (type === 'customer') {
    const database = getDb();
    let customer = database.data.customers.find(c => c.uid === uid);
    const rawIP = getClientIP(socket);
    const ip = normalizeIP(rawIP);
    const region = await getRegionFromIP(ip);

    if (!customer) {
      customer = {
        id: Date.now().toString(),
        uid,
        nickname: `${region} ${ip}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
        ip,
        region,
        online: 1,
        last_active: new Date().toISOString(),
        created_at: new Date().toISOString(),
        assigned_to: null
      };
      database.data.customers.push(customer);
      await database.write();
    } else {
      customer.online = 1;
      customer.last_active = new Date().toISOString();
      await database.write();
    }

    customerSockets.set(customer.id, socket.id);
    socket.customerId = customer.id;

    const assignedUser = assignCustomer(customer.id);

    let messages = database.data.messages.filter(m => m.customer_id === customer.id);
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    if (messages.length === 0) {
      const welcome = {
        id: Date.now().toString(),
        customer_id: customer.id,
        user_id: null,
        content: welcomeMessage,
        message_type: 'text',
        file_url: null,
        is_from_customer: 0,
        created_at: new Date().toISOString()
      };
      database.data.messages.push(welcome);
      messages.push(welcome);
      await database.write();
    }

    socket.emit('init', { customer, messages });
    
    const lastMessage = database.data.messages
      .filter(m => m.customer_id === customer.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    
    const customerWithPreview = {
      ...customer,
      preview: lastMessage ? (lastMessage.message_type === 'image' ? '📷 图片' : 
                            lastMessage.message_type === 'video' ? '📹 视频' :
                            lastMessage.message_type === 'file' ? '📎 文件' :
                            (lastMessage.content || '').substring(0, 50)) : ''
    };
    
    io.emit('customer:update', { customer: customerWithPreview, online: true });

    socket.on('message', async (data) => {
      const { content, message_type = 'text', file_url } = data;
      const database = getDb();
      const message = {
        id: Date.now().toString(),
        customer_id: customer.id,
        user_id: null,
        content,
        message_type,
        file_url: file_url || null,
        is_from_customer: 1,
        created_at: new Date().toISOString()
      };
      database.data.messages.push(message);

      const c = database.data.customers.find(x => x.id === customer.id);
      if (c) c.last_active = new Date().toISOString();

      await database.write();

      socket.emit('message', message);

      const onlineUsers = getOnlineUsers();
      onlineUsers.forEach(u => {
        if (userSockets.has(u.id)) {
          const unreadKey = `${u.id}:${customer.id}`;
          const currentUnread = unreadMessages.get(unreadKey) || 0;
          unreadMessages.set(unreadKey, currentUnread + 1);

          io.to(userSockets.get(u.id)).emit('message:notify', {
            customerId: customer.id,
            message,
            unreadCount: unreadMessages.get(unreadKey)
          });
        }
      });

      await logAction('customer_message', null, customer.id, ip);
    });

    socket.on('typing', (isTyping) => {
      typingStatus.set(`customer:${customer.id}`, isTyping);
      io.emit('typing:update', { customerId: customer.id, isTyping, from: 'customer' });
    });

    socket.on('disconnect', async () => {
      const database = getDb();
      const c = database.data.customers.find(x => x.id === customer.id);
      if (c) c.online = 0;
      await database.write();
      customerSockets.delete(customer.id);
      typingStatus.delete(`customer:${customer.id}`);
      io.emit('customer:update', { customer: c, online: false });
    });

  } else if (type === 'user') {
    const reqSession = socket.request.session;
    if (!reqSession || !reqSession.user) return socket.disconnect();

    const database = getDb();
    const user = reqSession.user;
    userSockets.set(user.id, socket.id);
    socket.userId = user.id;

    const dbUser = database.data.users.find(u => u.id === user.id);
    if (dbUser) dbUser.online = 1;
    await database.write();

    const customersWithPreview = [...database.data.customers].map(customer => {
      const lastMessage = database.data.messages
        .filter(m => m.customer_id === customer.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      
      return {
        ...customer,
        preview: lastMessage ? (lastMessage.message_type === 'image' ? '📷 图片' : 
                              lastMessage.message_type === 'video' ? '📹 视频' :
                              lastMessage.message_type === 'file' ? '📎 文件' :
                              (lastMessage.content || '').substring(0, 50)) : ''
      };
    }).sort((a, b) => new Date(b.last_active) - new Date(a.last_active));

    socket.emit('admin:init', { user, customers: customersWithPreview });
    io.emit('user:update', { user, online: true });

    socket.on('message', async (data) => {
      const { customerId, content, message_type = 'text', file_url } = data;
      const database = getDb();
      const message = {
        id: Date.now().toString(),
        customer_id: customerId,
        user_id: user.id,
        content,
        message_type,
        file_url: file_url || null,
        is_from_customer: 0,
        created_at: new Date().toISOString()
      };
      database.data.messages.push(message);
      await database.write();

      const messageWithUser = {
        ...message,
        user_nickname: user.nickname,
        user_avatar: user.avatar
      };

      socket.emit('message', { customerId, message: messageWithUser });

      if (customerSockets.has(customerId)) {
        io.to(customerSockets.get(customerId)).emit('message', messageWithUser);
      }

      const onlineUsers = getOnlineUsers();
      onlineUsers.forEach(u => {
        if (u.id !== user.id && userSockets.has(u.id)) {
          io.to(userSockets.get(u.id)).emit('message', { customerId, message: messageWithUser });
        }
      });
      
      console.log('发送客服消息:', { customerId, message_type, file_url });

      await logAction('agent_message', user.id, customerId, socket.handshake.address);
    });

    socket.on('typing', (data) => {
      typingStatus.set(`user:${user.id}`, data.isTyping);
      if (data.customerId && customerSockets.has(data.customerId)) {
        io.to(customerSockets.get(data.customerId)).emit('typing:update', {
          isTyping: data.isTyping,
          from: 'user'
        });
      }
    });

    socket.on('disconnect', async () => {
      const database = getDb();
      const dbUser = database.data.users.find(u => u.id === user.id);
      if (dbUser) dbUser.online = 0;
      await database.write();
      userSockets.delete(user.id);
      io.emit('user:update', { user, online: false });
    });
  }
});

const PORT = process.env.PORT || 3000;

initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`客服端: http://localhost:${PORT}/admin`);
    console.log(`客户端: http://localhost:${PORT}/`);
  });
});