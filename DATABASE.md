# 数据库设计文档

## 概述

系统使用 LowDB（基于 JSON 文件的数据库）存储数据，数据保存在 `db.json` 文件中。

## 数据结构

### users（客服账号表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 主键，时间戳生成 |
| username | string | 用户名，唯一 |
| password | string | 密码，bcrypt 加密 |
| nickname | string | 昵称 |
| avatar | string | 头像 URL |
| online | number | 在线状态（0-离线，1-在线） |
| created_at | string | 创建时间，ISO 格式 |

### customers（客户表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 主键，时间戳生成 |
| uid | string | 客户唯一标识，用于识别回访客户 |
| nickname | string | 客户昵称 |
| avatar | string | 客户头像 URL |
| ip | string | IP 地址 |
| region | string | 地区 |
| online | number | 在线状态（0-离线，1-在线） |
| last_active | string | 最后活跃时间，ISO 格式 |
| created_at | string | 创建时间，ISO 格式 |
| assigned_to | string | 分配给的客服 ID |

### messages（消息表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 主键，时间戳生成 |
| customer_id | string | 客户 ID |
| user_id | string | 客服 ID（可为空表示系统消息） |
| content | string | 消息内容 |
| message_type | string | 消息类型（text/image/video/file） |
| file_url | string | 文件 URL |
| is_from_customer | number | 是否来自客户（0-客服，1-客户） |
| created_at | string | 创建时间，ISO 格式 |

### quick_replies（快捷回复表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 主键，时间戳生成 |
| user_id | string | 客服 ID（可为空表示公共快捷语） |
| title | string | 快捷语标题 |
| content | string | 快捷语内容 |
| created_at | string | 创建时间，ISO 格式 |

### logs（操作日志表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 主键，时间戳生成 |
| action | string | 操作类型 |
| user_id | string | 操作用户 ID |
| customer_id | string | 相关客户 ID |
| ip | string | IP 地址 |
| details | string | 详情 |
| created_at | string | 操作时间，ISO 格式 |
