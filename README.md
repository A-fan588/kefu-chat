# 在线客服聊天系统

一个功能完整的网页版客服聊天系统，包含客户端和客服管理后台。

## 功能特性

### 客户端
- 响应式聊天界面，支持桌面和移动端
- 智能客服自动发送欢迎消息
- 快捷回复按钮
- 支持图片/视频/文件传输
- 实时输入状态显示

### 客服端
- 多客服支持，可注册登录
- 显示客户在线状态和输入状态
- 显示客户IP地址和地区
- 消息漫游，查看历史聊天记录
- 消息全局搜索
- 快捷回复管理
- 支持图片/视频/文件传输
- 客户自动分配给在线客服

### 安全防护
- XSS 攻击防护
- 请求频率限制
- CSRF 防护
- 敏感操作日志记录

## 技术栈

- **后端**: Node.js + Express + Socket.IO
- **数据库**: SQLite3
- **前端**: 原生 HTML/CSS/JavaScript

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动服务

```bash
npm start
```

开发模式（自动重启）:

```bash
npm run dev
```

### 访问

- 客户端: http://localhost:3000
- 客服端: http://localhost:3000/admin

## 项目结构

```
.
├── public/
│   ├── client/          # 客户端界面
│   ├── admin/           # 客服端界面
│   └── uploads/         # 文件上传目录
├── src/
│   ├── routes/          # API 路由
│   ├── middleware/      # 中间件
│   └── utils/           # 工具函数
├── logs/                # 日志目录
├── server.js            # 服务器入口
├── package.json
└── .env                 # 环境变量
```

## 数据库设计

详见 [DATABASE.md](./DATABASE.md)

## 部署指南

详见 [DEPLOY.md](./DEPLOY.md)

## 用户手册

详见 [USER_MANUAL.md](./USER_MANUAL.md)

## 安全测试报告

详见 [SECURITY.md](./SECURITY.md)

## License

MIT
