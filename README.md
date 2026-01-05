
# 星霜 Pro - Telegram 群组管理系统

基于 Cloudflare Workers 的智能 Telegram 群组管理机器人，提供入群审核、用户封禁、白名单管理等功能。

## ✨ 主要特性

### 🛡️ 智能入群审核
- **头像检测**：确保用户设置真实头像
- **中文昵称检测**：要求用户昵称包含中文
- **违禁词过滤**：自动识别并拒绝包含广告、赌博等违规内容的用户
- **自动封禁**：不符合要求的用户自动拒绝并封禁
- **重新检测**：用户修改资料后可申请重新审核

### 👥 用户管理
- **白名单系统**：白名单用户免审核直接通过
- **管理员权限**：超级管理员和普通管理员两级权限体系
- **封禁记录**：完整的封禁历史记录和管理
- **批量导入**：支持批量导入白名单用户

### 📊 管理面板
- **实时同步**：群组配置实时同步到数据库
- **可视化管理**：现代化的 Web 管理界面
- **分类展示**：封禁记录按群组分类展示
- **日志系统**：完整的操作日志记录

### 🔔 通知系统
- **管理员通知**：封禁操作实时通知管理员
- **一键解封**：管理员可快速解封用户
- **通知设置**：可配置通知的管理员和群组范围

## 🚀 快速开始

### 前置要求

1. Cloudflare 账号
2. Telegram Bot Token（从 [@BotFather](https://t.me/BotFather) 获取）
3. 你的 Telegram 用户 ID

### 部署步骤

#### 1. 创建 Telegram Bot

1. 在 Telegram 中找到 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 创建新机器人
3. 按提示设置机器人名称和用户名
4. 保存获得的 Bot Token

#### 2. 获取你的 Telegram ID

1. 在 Telegram 中找到 [@userinfobot](https://t.me/userinfobot)
2. 发送任意消息
3. 机器人会返回你的用户 ID

#### 3. 在 Cloudflare 部署

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 Workers & Pages
3. 点击 "Create Application" > "Create Worker"
4. 复制项目代码到编辑器
5. 点击 "Deploy"

#### 4. 创建 D1 数据库

```bash
# 使用 Wrangler CLI
wrangler d1 create tgbot-db

# 或在 Cloudflare Dashboard 中创建
# Workers & Pages > D1 > Create Database
```

#### 5. 配置环境变量

在 Worker 设置中添加以下变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `BOT_TOKEN` | Telegram Bot Token | `123456:ABC-DEF...` |
| `SUPER_ADMIN_ID` | 超级管理员 ID（逗号分隔） | `123456789,987654321` |
| `WEBHOOK_SECRET` | Webhook 密钥（可选） | `your-secret-key` |

#### 6. 绑定 D1 数据库

在 Worker 设置中：
1. 进入 "Settings" > "Variables"
2. 在 "D1 Database Bindings" 添加绑定：
   - Variable name: `TGBOT_DB`
   - D1 Database: 选择刚创建的数据库

#### 7. 初始化数据库

1. 访问 `https://your-worker.workers.dev/admin`
2. 点击 "初始化 D1 数据库" 按钮
3. 等待初始化完成

#### 8. 设置 Webhook

1. 在管理面板中点击 "同步配置" 按钮
2. 或手动访问：`https://your-worker.workers.dev/api/set-webhook`

## 📖 使用指南

### 添加机器人到群组

1. 将机器人添加到你的群组
2. 给予机器人管理员权限（需要封禁用户的权限）
3. 机器人会自动记录群组信息

### 配置群组规则

在管理面板的"群组规则编辑器"中：

- **防广告**：开启后检测违禁词
- **中文名**：要求用户昵称包含中文
- **有头像**：要求用户设置头像
- **封禁时长**：选择封禁时长（1小时/24小时/永久）

### 管理白名单

1. 进入"用户白名单"页面
2. 点击"添加白名单用户"
3. 输入用户 ID
4. 选择适用群组（留空表示所有群组）
5. 添加备注（可选）

### 管理员设置

1. 进入"管理员管理"页面
2. 点击"添加管理员"
3. 输入用户 ID
4. 选择适用群组
5. 配置通知设置

### 违禁词管理

1. 进入"违禁词管理"页面
2. 添加单个违禁词或批量导入
3. 系统会自动检测用户昵称和用户名

## 🔧 API 接口

### 群组管理

```
GET  /api/groups              # 获取群组列表
POST /api/add-group           # 手动添加群组
POST /api/delete-group        # 删除群组
POST /api/groups/update       # 更新群组配置
```

### 封禁管理

```
GET  /api/bans                # 获取封禁列表
POST /api/unban               # 解封用户
POST /api/delete-ban          # 删除封禁记录
GET  /api/search-bans?q=      # 搜索封禁记录
```

### 白名单管理

```
GET    /api/whitelist         # 获取白名单
POST   /api/whitelist         # 添加白名单
PUT    /api/whitelist/:id     # 编辑白名单
DELETE /api/whitelist/:id     # 删除白名单
POST   /api/whitelist/batch   # 批量添加
```

### 管理员管理

```
GET    /api/admin             # 获取管理员列表
POST   /api/admin             # 添加管理员
PUT    /api/admin/:id         # 编辑管理员
DELETE /api/admin/:id         # 删除管理员
```

### 违禁词管理

```
GET    /api/forbidden-words           # 获取违禁词列表
POST   /api/forbidden-word            # 添加违禁词
PUT    /api/forbidden-word/:id        # 编辑违禁词
DELETE /api/forbidden-word/:id        # 删除违禁词
POST   /api/forbidden-words/batch     # 批量添加
```

### 系统管理

```
POST /api/init-db             # 初始化数据库
POST /api/set-webhook         # 设置 Webhook
GET  /api/webhook-info        # 获取 Webhook 信息
GET  /api/logs                # 获取系统日志
GET  /api/debug               # 获取调试信息
```

## 🗄️ 数据库结构

### groups 表
存储群组信息和配置

```sql
- chat_id: 群组 ID（主键）
- title: 群组标题
- username: 群组用户名
- block_ads: 是否启用防广告
- allow_chinese: 是否要求中文昵称
- require_avatar: 是否要求头像
- ban_duration: 封禁时长（秒）
- photo_url: 群组头像 URL
```

### bans 表
存储封禁记录

```sql
- id: 记录 ID（主键）
- user_id: 用户 ID
- chat_id: 群组 ID
- username: 用户名
- chat_title: 群组标题
- reason: 封禁原因
- timestamp: 封禁时间戳
```

### whitelist 表
存储白名单用户

```sql
- id: 记录 ID（主键）
- user_id: 用户 ID（唯一）
- username: 用户名
- remark: 备注
- chat_ids: 适用群组 JSON 数组
- display_name: 显示名称
- avatar_url: 头像 URL
```

### bot_admins 表
存储管理员信息（包含通知设置）

```sql
- id: 记录 ID（主键）
- user_id: 用户 ID（唯一）
- username: 用户名
- chat_ids: 管理权限群组 JSON 数组
- display_name: 显示名称
- avatar_url: 头像 URL
- is_super: 是否超级管理员
- notify: 通知开关
- notify_chat_ids: 通知群组 JSON 数组
```

### forbidden_words 表
存储违禁词

```sql
- id: 记录 ID（主键）
- word: 违禁词（唯一）
- created_at: 创建时间
```

### logs 表
存储系统日志

```sql
- id: 记录 ID（主键）
- admin_id: 操作管理员 ID
- action: 操作描述
- details: 详细信息
- type: 日志类型
- timestamp: 时间戳
```

## 🎯 功能亮点

### 入群审核流程

1. **用户提交入群申请**
2. **系统自动检测**
   - 检查是否是管理员（直接通过）
   - 检查是否在白名单（直接通过）
   - 检查头像、昵称、违禁词
3. **审核结果**
   - ✅ 符合要求：批准入群
   - ❌ 不符合要求：拒绝并封禁
4. **通知机制**
   - 通知管理员封禁信息
   - 私聊用户告知原因
   - 提供重新检测按钮

### 重新检测机制

1. 用户在私聊中收到拒绝通知
2. 修改资料后点击"重新检测"按钮
3. 系统重新评估用户资料
4. 符合要求则自动解封
5. 提示用户重新申请入群

### 管理员通知

封禁用户时，系统会向配置的管理员发送通知：
- 显示用户完整信息（昵称、用户名、ID）
- 显示封禁原因
- 提供一键解封按钮
- 提供加入白名单按钮

## 🔐 权限说明

### 超级管理员
- 配置在环境变量 `SUPER_ADMIN_ID` 中
- 拥有所有权限
- 可以添加/删除普通管理员
- 无法通过界面删除

### 普通管理员
- 通过管理面板添加
- 可指定管理的群组范围
- 可接收封禁通知
- 可手动解封用户

## 📝 注意事项

1. **Bot 权限**
   - 机器人需要群组管理员权限
   - 需要封禁用户的权限
   - 需要管理入群请求的权限

2. **数据安全**
   - 定期备份 D1 数据库
   - 妥善保管 Bot Token
   - 不要泄露 Webhook Secret

3. **性能优化**
   - 管理面板使用30秒缓存
   - 避免频繁刷新
   - 大量操作使用批量功能

4. **限制说明**
   - D1 数据库有查询限制
   - Telegram API 有调用频率限制
   - Worker 有执行时间限制