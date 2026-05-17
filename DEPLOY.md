# 系统部署指南

## 生产环境部署

### 1. 环境要求

- Node.js >= 14.x
- npm >= 6.x

### 2. 安装

```bash
# 克隆或上传项目代码
cd kefuxitong

# 安装生产依赖
npm install --production
```

### 3. 环境配置

编辑 `.env` 文件：

```env
PORT=3000
SESSION_SECRET=your_very_secret_key_here_change_this
NODE_ENV=production
```

**重要**：请务必修改 `SESSION_SECRET` 为强密码！

### 4. 使用 PM2 管理进程

```bash
# 全局安装 PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name kefu-chat

# 查看状态
pm2 status

# 查看日志
pm2 logs kefu-chat

# 设置开机自启
pm2 startup
pm2 save
```

### 5. Nginx 反向代理配置

创建 `/etc/nginx/sites-available/kefu` 文件：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 50M;
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/kefu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. 配置 HTTPS (使用 Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

构建并运行：

```bash
docker build -t kefu-chat .
docker run -d -p 3000:3000 -v ./kefu.db:/app/kefu.db -v ./public/uploads:/app/public/uploads kefu-chat
```

## 备份策略

### 数据库备份

```bash
# 每日备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /path/to/kefu.db /backup/kefu_$DATE.db
find /backup -name "kefu_*.db" -mtime +7 -delete
```

添加到 crontab：

```
0 2 * * * /path/to/backup.sh
```

## 性能优化建议

1. 启用 gzip 压缩
2. 配置静态资源缓存
3. 使用 CDN 加速上传文件
4. 根据负载增加服务器资源
5. 考虑使用 Redis 替代 SQLite 存储会话
