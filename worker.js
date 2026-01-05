/**
 * 星霜Pro群组管理系统 - Cloudflare Worker
 * 基于 Cloudflare Workers + D1 数据库
 * 
 * 环境变量配置：
 * - BOT_TOKEN: Telegram Bot Token
 * - SUPER_ADMINS: 超级管理员ID列表（逗号分隔）
 * - WEBHOOK_SECRET: Webhook 安全密钥
 * 
 * D1 数据库绑定：DB
 */

// ==================== 配置 ====================
const CONFIG = {
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24小时会话
  CACHE_DURATION: 30 * 1000, // 30秒缓存
  TIMEZONE: 'Asia/Shanghai',
  DEFAULT_BAN_WORDS: [
    '代理', '兼职', '日结', '月入', '躺赚', '被动收入',
    '赌场', '博彩', '彩票', '北京赛车', 'PK10',
    'USDT', '担保', '诚信', '接单', '刷单',
    '色情', '约炮', '上门', '外围', '楼凤',
    'VPN', '翻墙', '科学上网', '梯子',
    '加群', '进群', '拉人', '私聊', 'TG群'
  ]
};

// ==================== 工具函数 ====================
function formatBeijingTime(date = new Date()) {
  return new Date(date).toLocaleString('zh-CN', { 
    timeZone: CONFIG.TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function generateToken() {
  return crypto.randomUUID() + '-' + Date.now().toString(36);
}

function containsChinese(text) {
  if (!text) return false;
  return /[\u4e00-\u9fa5\u3400-\u4dbf\u{20000}-\u{2a6df}]/u.test(text);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function htmlResponse(html) {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// ==================== 数据库操作 ====================
async function initDatabase(db) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      title TEXT,
      username TEXT,
      photo_url TEXT,
      anti_ad INTEGER DEFAULT 1,
      require_chinese_name INTEGER DEFAULT 1,
      require_avatar INTEGER DEFAULT 1,
      ban_duration TEXT DEFAULT '24h',
      created_at TEXT,
      updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS bans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      group_id TEXT NOT NULL,
      reason TEXT,
      banned_at TEXT,
      expires_at TEXT,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (group_id) REFERENCES groups(id)
    )`,
    `CREATE TABLE IF NOT EXISTS whitelist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      photo_url TEXT,
      group_id TEXT,
      note TEXT,
      created_at TEXT,
      UNIQUE(user_id, group_id)
    )`,
    `CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      photo_url TEXT,
      group_id TEXT,
      is_super INTEGER DEFAULT 0,
      created_at TEXT,
      UNIQUE(user_id, group_id)
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id TEXT NOT NULL,
      group_id TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT,
      UNIQUE(admin_id, group_id)
    )`,
    `CREATE TABLE IF NOT EXISTS ban_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT UNIQUE NOT NULL,
      created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      user_id TEXT,
      group_id TEXT,
      created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT,
      expires_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS pending_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT,
      UNIQUE(user_id, group_id)
    )`
  ];
  
  for (const sql of tables) {
    await db.prepare(sql).run();
  }
  
  // 初始化默认违禁词
  const existingWords = await db.prepare('SELECT COUNT(*) as count FROM ban_words').first();
  if (existingWords.count === 0) {
    for (const word of CONFIG.DEFAULT_BAN_WORDS) {
      await db.prepare('INSERT OR IGNORE INTO ban_words (word, created_at) VALUES (?, ?)').bind(word, formatBeijingTime()).run();
    }
  }
  
  return { success: true, message: '数据库初始化完成' };
}

async function addLog(db, type, action, details, userId = null, groupId = null) {
  await db.prepare(
    'INSERT INTO logs (type, action, details, user_id, group_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(type, action, details, userId, groupId, formatBeijingTime()).run();
}

// ==================== Telegram API ====================
class TelegramAPI {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async request(method, params = {}) {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return response.json();
  }

  async getChat(chatId) {
    return this.request('getChat', { chat_id: chatId });
  }

  async getChatMember(chatId, userId) {
    return this.request('getChatMember', { chat_id: chatId, user_id: userId });
  }

  async getUserProfilePhotos(userId) {
    return this.request('getUserProfilePhotos', { user_id: userId, limit: 1 });
  }

  async getFile(fileId) {
    return this.request('getFile', { file_id: fileId });
  }

  async approveChatJoinRequest(chatId, userId) {
    return this.request('approveChatJoinRequest', { chat_id: chatId, user_id: userId });
  }

  async declineChatJoinRequest(chatId, userId) {
    return this.request('declineChatJoinRequest', { chat_id: chatId, user_id: userId });
  }

  async banChatMember(chatId, userId, untilDate = null) {
    const params = { chat_id: chatId, user_id: userId };
    if (untilDate) params.until_date = untilDate;
    return this.request('banChatMember', params);
  }

  async unbanChatMember(chatId, userId) {
    return this.request('unbanChatMember', { chat_id: chatId, user_id: userId, only_if_banned: true });
  }

  async sendMessage(chatId, text, options = {}) {
    return this.request('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...options });
  }

  async answerCallbackQuery(callbackQueryId, text = '', showAlert = false) {
    return this.request('answerCallbackQuery', { callback_query_id: callbackQueryId, text, show_alert: showAlert });
  }

  async setWebhook(url, secret = null) {
    const params = { url, allowed_updates: ['message', 'chat_join_request', 'my_chat_member', 'callback_query'] };
    if (secret) params.secret_token = secret;
    return this.request('setWebhook', params);
  }

  async getWebhookInfo() {
    return this.request('getWebhookInfo');
  }

  getFileUrl(filePath) {
    return `https://api.telegram.org/file/bot${this.token}/${filePath}`;
  }
}

// ==================== 用户检测 ====================
async function checkUser(telegram, db, user, groupId) {
  const reasons = [];
  
  // 获取群组设置
  const group = await db.prepare('SELECT * FROM groups WHERE id = ?').bind(groupId.toString()).first();
  if (!group) return { passed: true, reasons: [] };
  
  // 检查白名单
  const whitelist = await db.prepare(
    'SELECT * FROM whitelist WHERE user_id = ? AND (group_id IS NULL OR group_id = ?)'
  ).bind(user.id.toString(), groupId.toString()).first();
  if (whitelist) return { passed: true, reasons: [], whitelisted: true };
  
  // 检查头像
  if (group.require_avatar) {
    const photos = await telegram.getUserProfilePhotos(user.id);
    if (!photos.ok || photos.result.total_count === 0) {
      reasons.push('未设置头像');
    }
  }
  
  // 检查中文名
  if (group.require_chinese_name) {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    if (!containsChinese(fullName)) {
      reasons.push('用户名不包含中文');
    }
  }
  
  // 检查违禁词
  if (group.anti_ad) {
    const banWords = await db.prepare('SELECT word FROM ban_words').all();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const username = (user.username || '').toLowerCase();
    
    for (const { word } of banWords.results) {
      if (fullName.includes(word.toLowerCase()) || username.includes(word.toLowerCase())) {
        reasons.push(`用户名包含违禁词: ${word}`);
        break;
      }
    }
  }
  
  return { passed: reasons.length === 0, reasons };
}

function calculateBanExpiry(duration) {
  if (duration === 'forever') return null;
  const now = Math.floor(Date.now() / 1000);
  if (duration === '1h') return now + 3600;
  if (duration === '24h') return now + 86400;
  if (duration === '7d') return now + 604800;
  return now + 86400; // 默认24小时
}

// ==================== Webhook 处理 ====================
async function handleWebhook(request, env) {
  const telegram = new TelegramAPI(env.BOT_TOKEN);
  const db = env.DB;
  
  try {
    const update = await request.json();
    
    // 处理入群请求
    if (update.chat_join_request) {
      const { chat, from } = update.chat_join_request;
      await handleJoinRequest(telegram, db, env, chat, from);
    }
    
    // 处理 Bot 加入/离开群组
    if (update.my_chat_member) {
      const { chat, new_chat_member } = update.my_chat_member;
      if (new_chat_member.status === 'administrator' || new_chat_member.status === 'member') {
        await syncGroup(telegram, db, chat.id);
        await addLog(db, 'system', 'bot_joined', `Bot加入群组: ${chat.title}`, null, chat.id.toString());
      } else if (new_chat_member.status === 'left' || new_chat_member.status === 'kicked') {
        await db.prepare('DELETE FROM groups WHERE id = ?').bind(chat.id.toString()).run();
        await addLog(db, 'system', 'bot_left', `Bot离开群组: ${chat.title}`, null, chat.id.toString());
      }
    }
    
    // 处理回调查询（重新检测按钮）
    if (update.callback_query) {
      await handleCallbackQuery(telegram, db, env, update.callback_query);
    }
    
    // 处理命令
    if (update.message && update.message.text) {
      await handleCommand(telegram, db, env, update.message);
    }
    
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    await addLog(db, 'error', 'webhook_error', error.message);
    return jsonResponse({ ok: false, error: error.message });
  }
}

async function handleJoinRequest(telegram, db, env, chat, user) {
  await addLog(db, 'join', 'request', `用户 ${user.first_name} (${user.id}) 申请加入 ${chat.title}`, user.id.toString(), chat.id.toString());
  
  const checkResult = await checkUser(telegram, db, user, chat.id);
  
  if (checkResult.passed) {
    await telegram.approveChatJoinRequest(chat.id, user.id);
    await addLog(db, 'join', 'approved', `已批准用户 ${user.first_name} (${user.id}) 加入`, user.id.toString(), chat.id.toString());
  } else {
    await telegram.declineChatJoinRequest(chat.id, user.id);
    
    // 获取封禁时长
    const group = await db.prepare('SELECT ban_duration FROM groups WHERE id = ?').bind(chat.id.toString()).first();
    const banDuration = group?.ban_duration || '24h';
    const banExpiry = calculateBanExpiry(banDuration);
    
    await telegram.banChatMember(chat.id, user.id, banExpiry);
    
    // 记录封禁
    const expiryText = banExpiry ? new Date(banExpiry * 1000).toISOString() : null;
    await db.prepare(
      'INSERT INTO bans (user_id, username, first_name, last_name, group_id, reason, banned_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(user.id.toString(), user.username || '', user.first_name || '', user.last_name || '', 
           chat.id.toString(), checkResult.reasons.join('; '), formatBeijingTime(), expiryText).run();
    
    await addLog(db, 'ban', 'auto_ban', `已封禁用户 ${user.first_name}: ${checkResult.reasons.join(', ')}`, user.id.toString(), chat.id.toString());
    
    // 通知用户
    try {
      await telegram.sendMessage(user.id, 
        `❌ <b>入群申请被拒绝</b>\n\n` +
        `群组: <b>${chat.title}</b>\n` +
        `原因: ${checkResult.reasons.join(', ')}\n\n` +
        `请修改您的个人资料后重新申请。`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '🔄 我已修改，重新检测', callback_data: `recheck:${chat.id}:${user.id}` }
            ]]
          }
        }
      );
    } catch (e) {
      console.log('Cannot send message to user:', e.message);
    }
    
    // 通知管理员
    await notifyAdmins(telegram, db, chat.id, user, checkResult.reasons);
  }
}

async function handleCallbackQuery(telegram, db, env, query) {
  const [action, ...params] = query.data.split(':');
  
  if (action === 'recheck') {
    const [groupId, userId] = params;
    const checkResult = await checkUser(telegram, db, query.from, groupId);
    
    if (checkResult.passed) {
      // 解封用户
      await telegram.unbanChatMember(groupId, userId);
      await db.prepare('UPDATE bans SET is_active = 0 WHERE user_id = ? AND group_id = ?').bind(userId, groupId).run();
      
      await telegram.answerCallbackQuery(query.id, '✅ 检测通过！请重新申请加入群组。', true);
      await telegram.sendMessage(userId, '✅ 您已通过检测，请重新申请加入群组。');
      
      await addLog(db, 'ban', 'unban_recheck', `用户 ${query.from.first_name} 重新检测通过`, userId, groupId);
    } else {
      await telegram.answerCallbackQuery(query.id, `❌ 检测未通过: ${checkResult.reasons.join(', ')}`, true);
    }
  } else if (action === 'unban') {
    const [groupId, userId] = params;
    await telegram.unbanChatMember(groupId, userId);
    await db.prepare('UPDATE bans SET is_active = 0 WHERE user_id = ? AND group_id = ?').bind(userId, groupId).run();
    await telegram.answerCallbackQuery(query.id, '✅ 已解封用户', false);
    await addLog(db, 'ban', 'admin_unban', `管理员解封用户`, userId, groupId);
  } else if (action === 'whitelist') {
    const [groupId, userId] = params;
    await db.prepare(
      'INSERT OR REPLACE INTO whitelist (user_id, group_id, created_at) VALUES (?, ?, ?)'
    ).bind(userId, groupId, formatBeijingTime()).run();
    await telegram.unbanChatMember(groupId, userId);
    await db.prepare('UPDATE bans SET is_active = 0 WHERE user_id = ? AND group_id = ?').bind(userId, groupId).run();
    await telegram.answerCallbackQuery(query.id, '✅ 已添加到白名单并解封', false);
    await addLog(db, 'whitelist', 'add_from_ban', `从封禁添加到白名单`, userId, groupId);
  }
}

async function handleCommand(telegram, db, env, message) {
  const text = message.text;
  const chatId = message.chat.id;
  const userId = message.from.id;
  
  if (text === '/start') {
    const isAdmin = await checkAdmin(db, env, userId);
    if (isAdmin) {
      await telegram.sendMessage(chatId, 
        `🌟 <b>星霜Pro群组管理系统</b>\n\n` +
        `欢迎使用星霜Pro！\n\n` +
        `您是管理员，可以使用以下命令：\n` +
        `/panel - 打开管理面板\n` +
        `/status - 查看系统状态\n` +
        `/help - 查看帮助`
      );
    } else {
      await telegram.sendMessage(chatId, 
        `🌟 <b>星霜Pro群组管理系统</b>\n\n` +
        `本Bot用于群组入群审核管理。\n\n` +
        `如果您的入群申请被拒绝，请修改个人资料后点击"重新检测"按钮。`
      );
    }
  } else if (text === '/status') {
    const isAdmin = await checkAdmin(db, env, userId);
    if (isAdmin) {
      const groups = await db.prepare('SELECT COUNT(*) as count FROM groups').first();
      const bans = await db.prepare('SELECT COUNT(*) as count FROM bans WHERE is_active = 1').first();
      const whitelist = await db.prepare('SELECT COUNT(*) as count FROM whitelist').first();
      
      await telegram.sendMessage(chatId, 
        `📊 <b>系统状态</b>\n\n` +
        `群组数量: ${groups.count}\n` +
        `活跃封禁: ${bans.count}\n` +
        `白名单: ${whitelist.count}\n` +
        `运行状态: ✅ 正常`
      );
    }
  }
}

async function notifyAdmins(telegram, db, groupId, user, reasons) {
  const notifications = await db.prepare(
    'SELECT admin_id FROM notifications WHERE (group_id IS NULL OR group_id = ?) AND enabled = 1'
  ).bind(groupId.toString()).all();
  
  const group = await db.prepare('SELECT title FROM groups WHERE id = ?').bind(groupId.toString()).first();
  
  for (const { admin_id } of notifications.results) {
    try {
      await telegram.sendMessage(admin_id, 
        `⚠️ <b>封禁通知</b>\n\n` +
        `群组: ${group?.title || groupId}\n` +
        `用户: ${user.first_name} ${user.last_name || ''}\n` +
        `ID: <code>${user.id}</code>\n` +
        `用户名: @${user.username || '无'}\n` +
        `原因: ${reasons.join(', ')}\n` +
        `时间: ${formatBeijingTime()}`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ 解封', callback_data: `unban:${groupId}:${user.id}` },
                { text: '📋 加入白名单', callback_data: `whitelist:${groupId}:${user.id}` }
              ]
            ]
          }
        }
      );
      await addLog(db, 'notification', 'sent', `通知已发送给管理员 ${admin_id}`, user.id.toString(), groupId.toString());
    } catch (e) {
      console.log('Cannot notify admin:', e.message);
    }
  }
}

async function syncGroup(telegram, db, chatId) {
  const chatInfo = await telegram.getChat(chatId);
  if (!chatInfo.ok) return;
  
  const chat = chatInfo.result;
  let photoUrl = null;
  
  if (chat.photo) {
    const file = await telegram.getFile(chat.photo.small_file_id);
    if (file.ok) {
      photoUrl = telegram.getFileUrl(file.result.file_path);
    }
  }
  
  await db.prepare(`
    INSERT OR REPLACE INTO groups (id, title, username, photo_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM groups WHERE id = ?), ?), ?)
  `).bind(
    chatId.toString(), chat.title, chat.username || null, photoUrl,
    chatId.toString(), formatBeijingTime(), formatBeijingTime()
  ).run();
}

async function checkAdmin(db, env, userId) {
  const superAdmins = (env.SUPER_ADMINS || '').split(',').map(id => id.trim());
  if (superAdmins.includes(userId.toString())) return true;
  
  const admin = await db.prepare('SELECT * FROM admins WHERE user_id = ?').bind(userId.toString()).first();
  return !!admin;
}

// ==================== API 路由 ====================
async function handleAPI(request, env, path) {
  const db = env.DB;
  const telegram = new TelegramAPI(env.BOT_TOKEN);
  const url = new URL(request.url);
  
  // CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
  
  // 验证会话（除了初始化和登录）
  if (!path.includes('/init') && !path.includes('/auth')) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: '未授权' }, 401);
    }
    const token = authHeader.replace('Bearer ', '');
    const session = await db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?')
      .bind(token, new Date().toISOString()).first();
    if (!session) {
      return jsonResponse({ error: '会话已过期' }, 401);
    }
  }
  
  try {
    // 数据库初始化
    if (path === '/api/init') {
      const result = await initDatabase(db);
      return jsonResponse(result);
    }
    
    // 认证
    if (path === '/api/auth' && request.method === 'POST') {
      const { initData } = await request.json();
      // 解析 Telegram Web App initData
      const params = new URLSearchParams(initData);
      const userStr = params.get('user');
      if (!userStr) {
        return jsonResponse({ error: '无效的认证数据' }, 400);
      }
      
      const user = JSON.parse(userStr);
      const isAdmin = await checkAdmin(db, env, user.id);
      
      if (!isAdmin) {
        return jsonResponse({ error: '无管理员权限' }, 403);
      }
      
      const token = generateToken();
      const expiresAt = new Date(Date.now() + CONFIG.SESSION_DURATION).toISOString();
      
      await db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
        .bind(token, user.id.toString(), formatBeijingTime(), expiresAt).run();
      
      await addLog(db, 'auth', 'login', `管理员 ${user.first_name} 登录`, user.id.toString());
      
      return jsonResponse({ token, user, expiresAt });
    }
    
    // 开发模式登录
    if (path === '/api/auth/dev' && request.method === 'POST') {
      const { userId } = await request.json();
      const isAdmin = await checkAdmin(db, env, userId);
      
      if (!isAdmin) {
        return jsonResponse({ error: '无管理员权限' }, 403);
      }
      
      const token = generateToken();
      const expiresAt = new Date(Date.now() + CONFIG.SESSION_DURATION).toISOString();
      
      await db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
        .bind(token, userId.toString(), formatBeijingTime(), expiresAt).run();
      
      return jsonResponse({ token, user: { id: userId }, expiresAt });
    }
    
    // 获取统计数据
    if (path === '/api/stats') {
      const groups = await db.prepare('SELECT COUNT(*) as count FROM groups').first();
      const bans = await db.prepare('SELECT COUNT(*) as count FROM bans WHERE is_active = 1').first();
      const whitelist = await db.prepare('SELECT COUNT(*) as count FROM whitelist').first();
      const admins = await db.prepare('SELECT COUNT(*) as count FROM admins').first();
      const banWords = await db.prepare('SELECT COUNT(*) as count FROM ban_words').first();
      const logs = await db.prepare('SELECT COUNT(*) as count FROM logs').first();
      
      const webhookInfo = await telegram.getWebhookInfo();
      
      return jsonResponse({
        groups: groups.count,
        bans: bans.count,
        whitelist: whitelist.count,
        admins: admins.count,
        banWords: banWords.count,
        logs: logs.count,
        webhook: webhookInfo.ok ? webhookInfo.result : null
      });
    }
    
    // ========== 群组管理 ==========
    if (path === '/api/groups') {
      if (request.method === 'GET') {
        const groups = await db.prepare('SELECT * FROM groups ORDER BY updated_at DESC').all();
        return jsonResponse(groups.results);
      }
      if (request.method === 'POST') {
        const { groupId } = await request.json();
        await syncGroup(telegram, db, groupId);
        await addLog(db, 'group', 'add', `手动添加群组 ${groupId}`);
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/groups/') && request.method === 'PUT') {
      const groupId = path.split('/')[3];
      const data = await request.json();
      await db.prepare(`
        UPDATE groups SET 
          anti_ad = ?, require_chinese_name = ?, require_avatar = ?, ban_duration = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        data.anti_ad ? 1 : 0, data.require_chinese_name ? 1 : 0, 
        data.require_avatar ? 1 : 0, data.ban_duration, formatBeijingTime(), groupId
      ).run();
      await addLog(db, 'group', 'update', `更新群组设置 ${groupId}`);
      return jsonResponse({ success: true });
    }
    
    if (path.startsWith('/api/groups/') && request.method === 'DELETE') {
      const groupId = path.split('/')[3];
      await db.prepare('DELETE FROM groups WHERE id = ?').bind(groupId).run();
      await addLog(db, 'group', 'delete', `删除群组 ${groupId}`);
      return jsonResponse({ success: true });
    }
    
    // ========== 封禁管理 ==========
    if (path === '/api/bans') {
      const search = url.searchParams.get('search') || '';
      const groupId = url.searchParams.get('group_id');
      
      let query = 'SELECT b.*, g.title as group_title FROM bans b LEFT JOIN groups g ON b.group_id = g.id WHERE b.is_active = 1';
      const params = [];
      
      if (search) {
        query += ' AND (b.user_id LIKE ? OR b.username LIKE ? OR b.first_name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (groupId) {
        query += ' AND b.group_id = ?';
        params.push(groupId);
      }
      
      query += ' ORDER BY b.banned_at DESC LIMIT 100';
      
      const stmt = db.prepare(query);
      const bans = await (params.length ? stmt.bind(...params) : stmt).all();
      return jsonResponse(bans.results);
    }
    
    if (path.startsWith('/api/bans/') && request.method === 'DELETE') {
      const banId = path.split('/')[3];
      const ban = await db.prepare('SELECT * FROM bans WHERE id = ?').bind(banId).first();
      if (ban) {
        await telegram.unbanChatMember(ban.group_id, ban.user_id);
        await db.prepare('DELETE FROM bans WHERE id = ?').bind(banId).run();
        await addLog(db, 'ban', 'delete', `删除封禁记录`, ban.user_id, ban.group_id);
      }
      return jsonResponse({ success: true });
    }
    
    if (path === '/api/bans/unban' && request.method === 'POST') {
      const { groupId, userId } = await request.json();
      await telegram.unbanChatMember(groupId, userId);
      await db.prepare('UPDATE bans SET is_active = 0 WHERE user_id = ? AND group_id = ?').bind(userId, groupId).run();
      await addLog(db, 'ban', 'unban', `解封用户`, userId, groupId);
      return jsonResponse({ success: true });
    }
    
    // ========== 白名单管理 ==========
    if (path === '/api/whitelist') {
      if (request.method === 'GET') {
        const search = url.searchParams.get('search') || '';
        let query = 'SELECT w.*, g.title as group_title FROM whitelist w LEFT JOIN groups g ON w.group_id = g.id';
        const params = [];
        
        if (search) {
          query += ' WHERE w.user_id LIKE ? OR w.username LIKE ? OR w.first_name LIKE ?';
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY w.created_at DESC';
        
        const stmt = db.prepare(query);
        const whitelist = await (params.length ? stmt.bind(...params) : stmt).all();
        return jsonResponse(whitelist.results);
      }
      if (request.method === 'POST') {
        const data = await request.json();
        
        // 批量导入
        if (data.userIds) {
          const ids = data.userIds.split(/[\n,]/).map(id => id.trim()).filter(Boolean);
          for (const userId of ids) {
            await db.prepare(
              'INSERT OR IGNORE INTO whitelist (user_id, group_id, note, created_at) VALUES (?, ?, ?, ?)'
            ).bind(userId, data.groupId || null, data.note || '', formatBeijingTime()).run();
          }
          await addLog(db, 'whitelist', 'batch_add', `批量添加 ${ids.length} 个用户`);
        } else {
          // 尝试获取用户信息
          let userInfo = null;
          try {
            const member = await telegram.getChat(data.userId);
            if (member.ok) {
              userInfo = member.result;
            }
          } catch (e) {}
          
          await db.prepare(
            'INSERT OR REPLACE INTO whitelist (user_id, username, first_name, last_name, group_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            data.userId, userInfo?.username || data.username || '', 
            userInfo?.first_name || '', userInfo?.last_name || '',
            data.groupId || null, data.note || '', formatBeijingTime()
          ).run();
          await addLog(db, 'whitelist', 'add', `添加白名单用户 ${data.userId}`);
        }
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/whitelist/') && request.method === 'DELETE') {
      const whitelistId = path.split('/')[3];
      await db.prepare('DELETE FROM whitelist WHERE id = ?').bind(whitelistId).run();
      await addLog(db, 'whitelist', 'delete', `删除白名单`);
      return jsonResponse({ success: true });
    }
    
    // ========== 管理员管理 ==========
    if (path === '/api/admins') {
      if (request.method === 'GET') {
        const admins = await db.prepare('SELECT a.*, g.title as group_title FROM admins a LEFT JOIN groups g ON a.group_id = g.id ORDER BY a.created_at DESC').all();
        const superAdmins = (env.SUPER_ADMINS || '').split(',').map(id => id.trim()).filter(Boolean);
        return jsonResponse({ admins: admins.results, superAdmins });
      }
      if (request.method === 'POST') {
        const data = await request.json();
        
        let userInfo = null;
        try {
          const member = await telegram.getChat(data.userId);
          if (member.ok) userInfo = member.result;
        } catch (e) {}
        
        await db.prepare(
          'INSERT OR REPLACE INTO admins (user_id, username, first_name, last_name, group_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(
          data.userId, userInfo?.username || '', userInfo?.first_name || '',
          userInfo?.last_name || '', data.groupId || null, formatBeijingTime()
        ).run();
        await addLog(db, 'admin', 'add', `添加管理员 ${data.userId}`);
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/admins/') && request.method === 'DELETE') {
      const adminId = path.split('/')[3];
      const admin = await db.prepare('SELECT * FROM admins WHERE id = ?').bind(adminId).first();
      const superAdmins = (env.SUPER_ADMINS || '').split(',').map(id => id.trim());
      
      if (admin && superAdmins.includes(admin.user_id)) {
        return jsonResponse({ error: '不能删除超级管理员' }, 400);
      }
      
      await db.prepare('DELETE FROM admins WHERE id = ?').bind(adminId).run();
      await addLog(db, 'admin', 'delete', `删除管理员`);
      return jsonResponse({ success: true });
    }
    
    // ========== 通知设置 ==========
    if (path === '/api/notifications') {
      if (request.method === 'GET') {
        const notifications = await db.prepare(
          'SELECT n.*, g.title as group_title FROM notifications n LEFT JOIN groups g ON n.group_id = g.id ORDER BY n.created_at DESC'
        ).all();
        return jsonResponse(notifications.results);
      }
      if (request.method === 'POST') {
        const data = await request.json();
        await db.prepare(
          'INSERT OR REPLACE INTO notifications (admin_id, group_id, enabled, created_at) VALUES (?, ?, ?, ?)'
        ).bind(data.adminId, data.groupId || null, data.enabled ? 1 : 0, formatBeijingTime()).run();
        await addLog(db, 'notification', 'add', `添加通知设置`);
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/notifications/') && request.method === 'PUT') {
      const notifId = path.split('/')[3];
      const data = await request.json();
      await db.prepare('UPDATE notifications SET enabled = ? WHERE id = ?').bind(data.enabled ? 1 : 0, notifId).run();
      return jsonResponse({ success: true });
    }
    
    if (path.startsWith('/api/notifications/') && request.method === 'DELETE') {
      const notifId = path.split('/')[3];
      await db.prepare('DELETE FROM notifications WHERE id = ?').bind(notifId).run();
      return jsonResponse({ success: true });
    }
    
    // ========== 违禁词管理 ==========
    if (path === '/api/banwords') {
      if (request.method === 'GET') {
        const words = await db.prepare('SELECT * FROM ban_words ORDER BY created_at DESC').all();
        return jsonResponse(words.results);
      }
      if (request.method === 'POST') {
        const data = await request.json();
        
        if (data.words) {
          const wordList = data.words.split(/[\n,]/).map(w => w.trim()).filter(Boolean);
          for (const word of wordList) {
            await db.prepare('INSERT OR IGNORE INTO ban_words (word, created_at) VALUES (?, ?)')
              .bind(word, formatBeijingTime()).run();
          }
          await addLog(db, 'banword', 'batch_add', `批量添加 ${wordList.length} 个违禁词`);
        } else {
          await db.prepare('INSERT OR IGNORE INTO ban_words (word, created_at) VALUES (?, ?)')
            .bind(data.word, formatBeijingTime()).run();
          await addLog(db, 'banword', 'add', `添加违禁词: ${data.word}`);
        }
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/banwords/') && request.method === 'DELETE') {
      const wordId = path.split('/')[3];
      await db.prepare('DELETE FROM ban_words WHERE id = ?').bind(wordId).run();
      await addLog(db, 'banword', 'delete', `删除违禁词`);
      return jsonResponse({ success: true });
    }
    
    // ========== 日志管理 ==========
    if (path === '/api/logs') {
      const type = url.searchParams.get('type');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      
      let query = 'SELECT * FROM logs';
      const params = [];
      
      if (type && type !== 'all') {
        query += ' WHERE type = ?';
        params.push(type);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);
      
      const stmt = db.prepare(query);
      const logs = await stmt.bind(...params).all();
      return jsonResponse(logs.results);
    }
    
    // ========== Webhook 设置 ==========
    if (path === '/api/webhook' && request.method === 'POST') {
      const data = await request.json();
      const result = await telegram.setWebhook(data.url, env.WEBHOOK_SECRET);
      await addLog(db, 'system', 'webhook_set', `设置Webhook: ${data.url}`);
      return jsonResponse(result);
    }
    
    return jsonResponse({ error: 'Not found' }, 404);
    
  } catch (error) {
    console.error('API Error:', error);
    await addLog(db, 'error', 'api_error', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
}

// ==================== 前端页面 ====================
function getHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>星霜Pro 群组管理系统</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
    }
    .glass {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .tab-active { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .btn-danger {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .btn-success {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }
    .card {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    }
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    .modal.active { display: flex; }
    .modal-content {
      background: #1a1a2e;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 8px;
      color: white;
      z-index: 2000;
      animation: slideUp 0.3s;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .switch {
      width: 48px;
      height: 24px;
      background: #374151;
      border-radius: 12px;
      position: relative;
      cursor: pointer;
      transition: background 0.3s;
    }
    .switch.on { background: #10b981; }
    .switch::after {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      top: 2px;
      left: 2px;
      transition: left 0.3s;
    }
    .switch.on::after { left: 26px; }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
    }
    .stat-card {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
    }
    input, select, textarea {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
    }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
  </style>
</head>
<body class="text-white p-4">
  <div id="app">
    <!-- 登录页面 -->
    <div id="loginPage" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="text-6xl mb-4">🌟</div>
        <h1 class="text-3xl font-bold mb-2">星霜Pro</h1>
        <p class="text-gray-400 mb-6">群组管理系统</p>
        <div id="loginStatus" class="text-gray-400">正在验证身份...</div>
        <div id="devLogin" class="mt-4 hidden">
          <input type="text" id="devUserId" placeholder="管理员ID" class="px-4 py-2 rounded-lg mr-2">
          <button onclick="devLogin()" class="btn-primary px-4 py-2 rounded-lg">开发登录</button>
        </div>
      </div>
    </div>

    <!-- 主界面 -->
    <div id="mainPage" class="hidden">
      <!-- 头部 -->
      <header class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🌟</span>
          <div>
            <h1 class="text-xl font-bold">星霜Pro</h1>
            <p class="text-xs text-gray-400">群组管理系统</p>
          </div>
        </div>
        <button onclick="refreshData()" class="p-2 rounded-lg glass hover:bg-white/10">🔄</button>
      </header>

      <!-- 标签页导航 -->
      <div class="flex gap-2 overflow-x-auto pb-2 mb-6">
        <button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="dashboard" onclick="switchTab('dashboard')">📊 控制面板</button>
        <button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="groups" onclick="switchTab('groups')">👥 群组管理</button>
        <button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="bans" onclick="switchTab('bans')">🚫 封禁管理</button>
        <button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="whitelist" onclick="switchTab('whitelist')">✅ 白名单</button>
        <button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="admins" onclick="switchTab('admins')">👑 管理员</button>
        <button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="notifications" onclick="switchTab('notifications')">🔔 通知设置</button>
        <button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="banwords" onclick="switchTab('banwords')">📝 违禁词</button>
        <button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="logs" onclick="switchTab('logs')">📋 系统日志</button>
      </div>

      <!-- 内容区域 -->
      <div id="content"></div>
    </div>
  </div>

  <!-- 模态框 -->
  <div id="modal" class="modal" onclick="if(event.target === this) closeModal()">
    <div class="modal-content p-6" id="modalContent"></div>
  </div>

  <script>
    // ==================== 全局状态 ====================
    let token = localStorage.getItem('token');
    let currentTab = 'dashboard';
    let cache = {};
    let autoRefreshTimer = null;

    // ==================== API 调用 ====================
    async function api(path, options = {}) {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      
      try {
        const res = await fetch('/api' + path, { ...options, headers });
        const data = await res.json();
        if (res.status === 401) {
          localStorage.removeItem('token');
          location.reload();
        }
        return data;
      } catch (e) {
        showToast('网络错误', 'error');
        throw e;
      }
    }

    // ==================== 认证 ====================
    async function init() {
      // 尝试初始化数据库
      await api('/init');
      
      // 检查 Telegram Web App
      if (window.Telegram?.WebApp?.initData) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
        
        try {
          const auth = await api('/auth', {
            method: 'POST',
            body: JSON.stringify({ initData: Telegram.WebApp.initData })
          });
          
          if (auth.token) {
            token = auth.token;
            localStorage.setItem('token', token);
            showMainPage();
          } else {
            document.getElementById('loginStatus').textContent = auth.error || '认证失败';
          }
        } catch (e) {
          document.getElementById('loginStatus').textContent = '认证失败';
        }
      } else if (token) {
        // 尝试使用已有 token
        try {
          const stats = await api('/stats');
          if (!stats.error) {
            showMainPage();
          } else {
            localStorage.removeItem('token');
            showDevLogin();
          }
        } catch (e) {
          showDevLogin();
        }
      } else {
        showDevLogin();
      }
    }

    function showDevLogin() {
      document.getElementById('loginStatus').textContent = '请使用 Telegram 打开或开发模式登录';
      document.getElementById('devLogin').classList.remove('hidden');
    }

    async function devLogin() {
      const userId = document.getElementById('devUserId').value.trim();
      if (!userId) return showToast('请输入管理员ID', 'error');
      
      try {
        const auth = await api('/auth/dev', {
          method: 'POST',
          body: JSON.stringify({ userId })
        });
        
        if (auth.token) {
          token = auth.token;
          localStorage.setItem('token', token);
          showMainPage();
        } else {
          showToast(auth.error || '登录失败', 'error');
        }
      } catch (e) {
        showToast('登录失败', 'error');
      }
    }

    function showMainPage() {
      document.getElementById('loginPage').classList.add('hidden');
      document.getElementById('mainPage').classList.remove('hidden');
      switchTab('dashboard');
      startAutoRefresh();
    }

    // ==================== 标签页切换 ====================
    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('tab-active');
        if (t.dataset.tab === tab) t.classList.add('tab-active');
      });
      loadTabContent();
    }

    async function loadTabContent() {
      const content = document.getElementById('content');
      content.innerHTML = '<div class="text-center py-10">加载中...</div>';
      
      try {
        switch (currentTab) {
          case 'dashboard': await loadDashboard(); break;
          case 'groups': await loadGroups(); break;
          case 'bans': await loadBans(); break;
          case 'whitelist': await loadWhitelist(); break;
          case 'admins': await loadAdmins(); break;
          case 'notifications': await loadNotifications(); break;
          case 'banwords': await loadBanwords(); break;
          case 'logs': await loadLogs(); break;
        }
      } catch (e) {
        content.innerHTML = '<div class="text-center py-10 text-red-400">加载失败</div>';
      }
    }

    // ==================== 控制面板 ====================
    async function loadDashboard() {
      const stats = await api('/stats');
      const content = document.getElementById('content');
      
      content.innerHTML = \`
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div class="stat-card card p-4 text-center">
            <div class="text-3xl mb-2">👥</div>
            <div class="text-2xl font-bold">\${stats.groups || 0}</div>
            <div class="text-gray-400 text-sm">群组数量</div>
          </div>
          <div class="stat-card card p-4 text-center">
            <div class="text-3xl mb-2">🚫</div>
            <div class="text-2xl font-bold">\${stats.bans || 0}</div>
            <div class="text-gray-400 text-sm">封禁记录</div>
          </div>
          <div class="stat-card card p-4 text-center">
            <div class="text-3xl mb-2">✅</div>
            <div class="text-2xl font-bold">\${stats.whitelist || 0}</div>
            <div class="text-gray-400 text-sm">白名单</div>
          </div>
          <div class="stat-card card p-4 text-center">
            <div class="text-3xl mb-2">👑</div>
            <div class="text-2xl font-bold">\${stats.admins || 0}</div>
            <div class="text-gray-400 text-sm">管理员</div>
          </div>
          <div class="stat-card card p-4 text-center">
            <div class="text-3xl mb-2">📝</div>
            <div class="text-2xl font-bold">\${stats.banWords || 0}</div>
            <div class="text-gray-400 text-sm">违禁词</div>
          </div>
          <div class="stat-card card p-4 text-center">
            <div class="text-3xl mb-2">📋</div>
            <div class="text-2xl font-bold">\${stats.logs || 0}</div>
            <div class="text-gray-400 text-sm">日志记录</div>
          </div>
        </div>
        
        <div class="card p-4 mb-4">
          <h3 class="font-bold mb-3">🔗 Webhook 状态</h3>
          <div class="text-sm">
            <div class="flex justify-between py-2 border-b border-white/10">
              <span class="text-gray-400">状态</span>
              <span>\${stats.webhook?.url ? '✅ 已连接' : '❌ 未设置'}</span>
            </div>
            \${stats.webhook?.url ? \`
              <div class="flex justify-between py-2 border-b border-white/10">
                <span class="text-gray-400">URL</span>
                <span class="text-xs truncate max-w-[200px]">\${stats.webhook.url}</span>
              </div>
              <div class="flex justify-between py-2">
                <span class="text-gray-400">待处理更新</span>
                <span>\${stats.webhook.pending_update_count || 0}</span>
              </div>
            \` : ''}
          </div>
          <button onclick="showSetWebhookModal()" class="btn-primary w-full py-2 rounded-lg mt-3">设置 Webhook</button>
        </div>
        
        <div class="card p-4">
          <h3 class="font-bold mb-3">⚙️ 快捷操作</h3>
          <div class="grid grid-cols-2 gap-3">
            <button onclick="switchTab('groups')" class="glass p-3 rounded-lg text-center hover:bg-white/10">
              <div class="text-2xl mb-1">➕</div>
              <div class="text-sm">添加群组</div>
            </button>
            <button onclick="switchTab('whitelist')" class="glass p-3 rounded-lg text-center hover:bg-white/10">
              <div class="text-2xl mb-1">📋</div>
              <div class="text-sm">管理白名单</div>
            </button>
            <button onclick="switchTab('banwords')" class="glass p-3 rounded-lg text-center hover:bg-white/10">
              <div class="text-2xl mb-1">📝</div>
              <div class="text-sm">编辑违禁词</div>
            </button>
            <button onclick="switchTab('logs')" class="glass p-3 rounded-lg text-center hover:bg-white/10">
              <div class="text-2xl mb-1">📊</div>
              <div class="text-sm">查看日志</div>
            </button>
          </div>
        </div>
      \`;
    }

    // ==================== 群组管理 ====================
    async function loadGroups() {
      const groups = await api('/groups');
      const content = document.getElementById('content');
      
      content.innerHTML = \`
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold">群组管理</h2>
          <button onclick="showAddGroupModal()" class="btn-primary px-4 py-2 rounded-lg text-sm">➕ 添加群组</button>
        </div>
        <div class="space-y-3">
          \${groups.length === 0 ? '<div class="text-center py-10 text-gray-400">暂无群组</div>' : 
            groups.map(g => \`
              <div class="card p-4">
                <div class="flex items-center gap-3 mb-3">
                  <div class="avatar">\${g.title?.[0] || '?'}</div>
                  <div class="flex-1 min-w-0">
                    <div class="font-bold truncate">\${g.title || '未知群组'}</div>
                    <div class="text-xs text-gray-400">ID: \${g.id}</div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400">防广告</span>
                    <div class="switch \${g.anti_ad ? 'on' : ''}" onclick="toggleGroupSetting('\${g.id}', 'anti_ad', \${!g.anti_ad})"></div>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400">中文名</span>
                    <div class="switch \${g.require_chinese_name ? 'on' : ''}" onclick="toggleGroupSetting('\${g.id}', 'require_chinese_name', \${!g.require_chinese_name})"></div>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400">头像</span>
                    <div class="switch \${g.require_avatar ? 'on' : ''}" onclick="toggleGroupSetting('\${g.id}', 'require_avatar', \${!g.require_avatar})"></div>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400">封禁</span>
                    <select onchange="updateBanDuration('\${g.id}', this.value)" class="px-2 py-1 rounded text-xs">
                      <option value="1h" \${g.ban_duration === '1h' ? 'selected' : ''}>1小时</option>
                      <option value="24h" \${g.ban_duration === '24h' ? 'selected' : ''}>24小时</option>
                      <option value="7d" \${g.ban_duration === '7d' ? 'selected' : ''}>7天</option>
                      <option value="forever" \${g.ban_duration === 'forever' ? 'selected' : ''}>永久</option>
                    </select>
                  </div>
                </div>
                <button onclick="deleteGroup('\${g.id}')" class="btn-danger w-full py-2 rounded-lg text-sm">删除群组</button>
              </div>
            \`).join('')}
        </div>
      \`;
    }

    async function toggleGroupSetting(groupId, setting, value) {
      const groups = await api('/groups');
      const group = groups.find(g => g.id === groupId);
      if (!group) return;
      
      const data = {
        anti_ad: group.anti_ad,
        require_chinese_name: group.require_chinese_name,
        require_avatar: group.require_avatar,
        ban_duration: group.ban_duration
      };
      data[setting] = value ? 1 : 0;
      
      await api('/groups/' + groupId, { method: 'PUT', body: JSON.stringify(data) });
      showToast('设置已更新');
      loadGroups();
    }

    async function updateBanDuration(groupId, duration) {
      const groups = await api('/groups');
      const group = groups.find(g => g.id === groupId);
      if (!group) return;
      
      await api('/groups/' + groupId, {
        method: 'PUT',
        body: JSON.stringify({
          anti_ad: group.anti_ad,
          require_chinese_name: group.require_chinese_name,
          require_avatar: group.require_avatar,
          ban_duration: duration
        })
      });
      showToast('封禁时长已更新');
    }

    async function deleteGroup(groupId) {
      if (!confirm('确定要删除此群组吗？')) return;
      await api('/groups/' + groupId, { method: 'DELETE' });
      showToast('群组已删除');
      loadGroups();
    }

    function showAddGroupModal() {
      showModal(\`
        <h3 class="text-lg font-bold mb-4">添加群组</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">群组 ID</label>
            <input type="text" id="newGroupId" placeholder="例如: -1001234567890" class="w-full px-4 py-2 rounded-lg">
          </div>
          <div class="text-xs text-gray-400">
            提示：需要先将 Bot 添加为群组管理员
          </div>
          <button onclick="addGroup()" class="btn-primary w-full py-2 rounded-lg">添加</button>
        </div>
      \`);
    }

    async function addGroup() {
      const groupId = document.getElementById('newGroupId').value.trim();
      if (!groupId) return showToast('请输入群组ID', 'error');
      
      const result = await api('/groups', { method: 'POST', body: JSON.stringify({ groupId }) });
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('群组添加成功');
        closeModal();
        loadGroups();
      }
    }

    // ==================== 封禁管理 ====================
    async function loadBans() {
      const bans = await api('/bans');
      const groups = await api('/groups');
      const content = document.getElementById('content');
      
      content.innerHTML = \`
        <div class="flex flex-col md:flex-row gap-4 mb-4">
          <input type="text" id="banSearch" placeholder="搜索用户ID/用户名..." class="flex-1 px-4 py-2 rounded-lg" onkeyup="searchBans()">
          <select id="banGroupFilter" class="px-4 py-2 rounded-lg" onchange="filterBans()">
            <option value="">所有群组</option>
            \${groups.map(g => \`<option value="\${g.id}">\${g.title}</option>\`).join('')}
          </select>
        </div>
        <div id="bansList" class="space-y-3">
          \${renderBansList(bans)}
        </div>
      \`;
    }

    function renderBansList(bans) {
      if (bans.length === 0) return '<div class="text-center py-10 text-gray-400">暂无封禁记录</div>';
      
      // 按群组分组
      const grouped = {};
      bans.forEach(b => {
        const key = b.group_id;
        if (!grouped[key]) grouped[key] = { title: b.group_title || b.group_id, bans: [] };
        grouped[key].bans.push(b);
      });
      
      return Object.entries(grouped).map(([groupId, data]) => \`
        <div class="card p-4">
          <h3 class="font-bold mb-3 flex items-center gap-2">
            <span class="avatar text-sm">\${data.title?.[0] || '?'}</span>
            \${data.title}
            <span class="text-xs text-gray-400">(\${data.bans.length})</span>
          </h3>
          <div class="space-y-2">
            \${data.bans.map(b => \`
              <div class="glass p-3 rounded-lg">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <div class="font-medium">\${b.first_name || ''} \${b.last_name || ''}</div>
                    <div class="text-xs text-gray-400">@\${b.username || '无'} · ID: \${b.user_id}</div>
                  </div>
                  <div class="flex gap-2">
                    <button onclick="unbanUser('\${b.group_id}', '\${b.user_id}')" class="btn-success px-2 py-1 rounded text-xs">解封</button>
                    <button onclick="deleteBan(\${b.id})" class="btn-danger px-2 py-1 rounded text-xs">删除</button>
                  </div>
                </div>
                <div class="text-xs text-gray-400">
                  <div>原因: \${b.reason || '未知'}</div>
                  <div>时间: \${b.banned_at}</div>
                </div>
              </div>
            \`).join('')}
          </div>
        </div>
      \`).join('');
    }

    async function searchBans() {
      const search = document.getElementById('banSearch').value;
      const groupId = document.getElementById('banGroupFilter').value;
      const bans = await api(\`/bans?search=\${encodeURIComponent(search)}&group_id=\${groupId}\`);
      document.getElementById('bansList').innerHTML = renderBansList(bans);
    }

    async function filterBans() {
      searchBans();
    }

    async function unbanUser(groupId, userId) {
      await api('/bans/unban', { method: 'POST', body: JSON.stringify({ groupId, userId }) });
      showToast('用户已解封');
      loadBans();
    }

    async function deleteBan(banId) {
      if (!confirm('确定要删除此封禁记录吗？')) return;
      await api('/bans/' + banId, { method: 'DELETE' });
      showToast('记录已删除');
      loadBans();
    }

    // ==================== 白名单管理 ====================
    async function loadWhitelist() {
      const whitelist = await api('/whitelist');
      const groups = await api('/groups');
      const content = document.getElementById('content');
      
      content.innerHTML = \`
        <div class="flex flex-col md:flex-row gap-4 mb-4">
          <input type="text" id="whitelistSearch" placeholder="搜索..." class="flex-1 px-4 py-2 rounded-lg" onkeyup="searchWhitelist()">
          <button onclick="showAddWhitelistModal()" class="btn-primary px-4 py-2 rounded-lg">➕ 添加</button>
          <button onclick="showBatchImportModal()" class="btn-success px-4 py-2 rounded-lg">📥 批量导入</button>
        </div>
        <div id="whitelistList" class="grid gap-3 md:grid-cols-2">
          \${whitelist.length === 0 ? '<div class="text-center py-10 text-gray-400 col-span-2">暂无白名单用户</div>' :
            whitelist.map(w => \`
              <div class="card p-4">
                <div class="flex items-center gap-3">
                  <div class="avatar">\${w.first_name?.[0] || w.user_id?.[0] || '?'}</div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium truncate">\${w.first_name || ''} \${w.last_name || ''}</div>
                    <div class="text-xs text-gray-400">ID: \${w.user_id}</div>
                    <div class="text-xs text-gray-400">\${w.group_title ? '群组: ' + w.group_title : '全局白名单'}</div>
                    \${w.note ? \`<div class="text-xs text-blue-400">备注: \${w.note}</div>\` : ''}
                  </div>
                  <button onclick="deleteWhitelist(\${w.id})" class="btn-danger p-2 rounded-lg text-sm">🗑️</button>
                </div>
              </div>
            \`).join('')}
        </div>
      \`;
    }

    async function searchWhitelist() {
      const search = document.getElementById('whitelistSearch').value;
      const whitelist = await api(\`/whitelist?search=\${encodeURIComponent(search)}\`);
      document.getElementById('whitelistList').innerHTML = whitelist.length === 0 ? 
        '<div class="text-center py-10 text-gray-400 col-span-2">无匹配结果</div>' :
        whitelist.map(w => \`
          <div class="card p-4">
            <div class="flex items-center gap-3">
              <div class="avatar">\${w.first_name?.[0] || w.user_id?.[0] || '?'}</div>
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">\${w.first_name || ''} \${w.last_name || ''}</div>
                <div class="text-xs text-gray-400">ID: \${w.user_id}</div>
                <div class="text-xs text-gray-400">\${w.group_title ? '群组: ' + w.group_title : '全局白名单'}</div>
              </div>
              <button onclick="deleteWhitelist(\${w.id})" class="btn-danger p-2 rounded-lg text-sm">🗑️</button>
            </div>
          </div>
        \`).join('');
    }

    function showAddWhitelistModal() {
      showModal(\`
        <h3 class="text-lg font-bold mb-4">添加白名单</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">用户 ID</label>
            <input type="text" id="wlUserId" class="w-full px-4 py-2 rounded-lg">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">适用群组（留空为全局）</label>
            <select id="wlGroupId" class="w-full px-4 py-2 rounded-lg">
              <option value="">全局</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">备注</label>
            <input type="text" id="wlNote" class="w-full px-4 py-2 rounded-lg">
          </div>
          <button onclick="addWhitelist()" class="btn-primary w-full py-2 rounded-lg">添加</button>
        </div>
      \`);
      loadGroupsForSelect();
    }

    function showBatchImportModal() {
      showModal(\`
        <h3 class="text-lg font-bold mb-4">批量导入白名单</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">用户ID列表（每行一个）</label>
            <textarea id="batchUserIds" rows="8" class="w-full px-4 py-2 rounded-lg" placeholder="123456789\n987654321"></textarea>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">适用群组</label>
            <select id="batchGroupId" class="w-full px-4 py-2 rounded-lg">
              <option value="">全局</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">统一备注</label>
            <input type="text" id="batchNote" class="w-full px-4 py-2 rounded-lg">
          </div>
          <button onclick="batchImportWhitelist()" class="btn-primary w-full py-2 rounded-lg">导入</button>
        </div>
      \`);
      loadGroupsForSelect('batchGroupId');
    }

    async function loadGroupsForSelect(selectId = 'wlGroupId') {
      const groups = await api('/groups');
      const select = document.getElementById(selectId);
      groups.forEach(g => {
        const option = document.createElement('option');
        option.value = g.id;
        option.textContent = g.title;
        select.appendChild(option);
      });
    }

    async function addWhitelist() {
      const userId = document.getElementById('wlUserId').value.trim();
      const groupId = document.getElementById('wlGroupId').value;
      const note = document.getElementById('wlNote').value.trim();
      
      if (!userId) return showToast('请输入用户ID', 'error');
      
      await api('/whitelist', { method: 'POST', body: JSON.stringify({ userId, groupId, note }) });
      showToast('添加成功');
      closeModal();
      loadWhitelist();
    }

    async function batchImportWhitelist() {
      const userIds = document.getElementById('batchUserIds').value.trim();
      const groupId = document.getElementById('batchGroupId').value;
      const note = document.getElementById('batchNote').value.trim();
      
      if (!userIds) return showToast('请输入用户ID', 'error');
      
      await api('/whitelist', { method: 'POST', body: JSON.stringify({ userIds, groupId, note }) });
      showToast('导入成功');
      closeModal();
      loadWhitelist();
    }

    async function deleteWhitelist(id) {
      if (!confirm('确定要删除吗？')) return;
      await api('/whitelist/' + id, { method: 'DELETE' });
      showToast('已删除');
      loadWhitelist();
    }

    // ==================== 管理员管理 ====================
    async function loadAdmins() {
      const data = await api('/admins');
      const content = document.getElementById('content');
      
      content.innerHTML = \`
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold">管理员管理</h2>
          <button onclick="showAddAdminModal()" class="btn-primary px-4 py-2 rounded-lg text-sm">➕ 添加管理员</button>
        </div>
        
        <div class="card p-4 mb-4">
          <h3 class="font-bold mb-3">👑 超级管理员</h3>
          <div class="space-y-2">
            \${data.superAdmins.length === 0 ? '<div class="text-gray-400">未配置</div>' :
              data.superAdmins.map(id => \`
                <div class="glass p-3 rounded-lg flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="avatar">S</div>
                    <div>
                      <div class="font-medium">超级管理员</div>
                      <div class="text-xs text-gray-400">ID: \${id}</div>
                    </div>
                  </div>
                  <span class="text-xs text-yellow-400">环境变量配置</span>
                </div>
              \`).join('')}
          </div>
        </div>
        
        <div class="card p-4">
          <h3 class="font-bold mb-3">👤 普通管理员</h3>
          <div class="space-y-2">
            \${data.admins.length === 0 ? '<div class="text-gray-400">暂无管理员</div>' :
              data.admins.map(a => \`
                <div class="glass p-3 rounded-lg flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="avatar">\${a.first_name?.[0] || 'A'}</div>
                    <div>
                      <div class="font-medium">\${a.first_name || ''} \${a.last_name || ''}</div>
                      <div class="text-xs text-gray-400">ID: \${a.user_id}</div>
                      <div class="text-xs text-gray-400">\${a.group_title ? '群组: ' + a.group_title : '全局管理员'}</div>
                    </div>
                  </div>
                  <button onclick="deleteAdmin(\${a.id})" class="btn-danger p-2 rounded-lg text-sm">🗑️</button>
                </div>
              \`).join('')}
          </div>
        </div>
      \`;
    }

    function showAddAdminModal() {
      showModal(\`
        <h3 class="text-lg font-bold mb-4">添加管理员</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">用户 ID</label>
            <input type="text" id="adminUserId" class="w-full px-4 py-2 rounded-lg">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">管理群组（留空为全局）</label>
            <select id="adminGroupId" class="w-full px-4 py-2 rounded-lg">
              <option value="">全局</option>
            </select>
          </div>
          <button onclick="addAdmin()" class="btn-primary w-full py-2 rounded-lg">添加</button>
        </div>
      \`);
      loadGroupsForSelect('adminGroupId');
    }

    async function addAdmin() {
      const userId = document.getElementById('adminUserId').value.trim();
      const groupId = document.getElementById('adminGroupId').value;
      
      if (!userId) return showToast('请输入用户ID', 'error');
      
      await api('/admins', { method: 'POST', body: JSON.stringify({ userId, groupId }) });
      showToast('添加成功');
      closeModal();
      loadAdmins();
    }

    async function deleteAdmin(id) {
      if (!confirm('确定要删除此管理员吗？')) return;
      const result = await api('/admins/' + id, { method: 'DELETE' });
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('已删除');
        loadAdmins();
      }
    }

    // ==================== 通知设置 ====================
    async function loadNotifications() {
      const notifications = await api('/notifications');
      const admins = await api('/admins');
      const groups = await api('/groups');
      const content = document.getElementById('content');
      
      content.innerHTML = \`
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold">通知设置</h2>
          <button onclick="showAddNotificationModal()" class="btn-primary px-4 py-2 rounded-lg text-sm">➕ 添加</button>
        </div>
        <div class="space-y-3">
          \${notifications.length === 0 ? '<div class="text-center py-10 text-gray-400">暂无通知设置</div>' :
            notifications.map(n => \`
              <div class="card p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-medium">管理员 ID: \${n.admin_id}</div>
                    <div class="text-xs text-gray-400">\${n.group_title ? '群组: ' + n.group_title : '全局通知'}</div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="switch \${n.enabled ? 'on' : ''}" onclick="toggleNotification(\${n.id}, \${!n.enabled})"></div>
                    <button onclick="deleteNotification(\${n.id})" class="btn-danger p-2 rounded-lg text-sm">🗑️</button>
                  </div>
                </div>
              </div>
            \`).join('')}
        </div>
      \`;
    }

    function showAddNotificationModal() {
      showModal(\`
        <h3 class="text-lg font-bold mb-4">添加通知设置</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">管理员 ID</label>
            <input type="text" id="notifAdminId" class="w-full px-4 py-2 rounded-lg">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">接收群组通知（留空为全部）</label>
            <select id="notifGroupId" class="w-full px-4 py-2 rounded-lg">
              <option value="">全部群组</option>
            </select>
          </div>
          <button onclick="addNotification()" class="btn-primary w-full py-2 rounded-lg">添加</button>
        </div>
      \`);
      loadGroupsForSelect('notifGroupId');
    }

    async function addNotification() {
      const adminId = document.getElementById('notifAdminId').value.trim();
      const groupId = document.getElementById('notifGroupId').value;
      
      if (!adminId) return showToast('请输入管理员ID', 'error');
      
      await api('/notifications', { method: 'POST', body: JSON.stringify({ adminId, groupId, enabled: true }) });
      showToast('添加成功');
      closeModal();
      loadNotifications();
    }

    async function toggleNotification(id, enabled) {
      await api('/notifications/' + id, { method: 'PUT', body: JSON.stringify({ enabled }) });
      showToast(enabled ? '通知已开启' : '通知已关闭');
      loadNotifications();
    }

    async function deleteNotification(id) {
      if (!confirm('确定要删除吗？')) return;
      await api('/notifications/' + id, { method: 'DELETE' });
      showToast('已删除');
      loadNotifications();
    }

    // ==================== 违禁词管理 ====================
    async function loadBanwords() {
      const banwords = await api('/banwords');
      const content = document.getElementById('content');
      
      content.innerHTML = \`
        <div class="flex flex-col md:flex-row gap-4 mb-4">
          <button onclick="showAddBanwordModal()" class="btn-primary px-4 py-2 rounded-lg">➕ 添加违禁词</button>
          <button onclick="showBatchBanwordModal()" class="btn-success px-4 py-2 rounded-lg">📥 批量导入</button>
          <button onclick="exportBanwords()" class="glass px-4 py-2 rounded-lg hover:bg-white/10">📤 导出</button>
        </div>
        <div class="card p-4">
          <div class="flex flex-wrap gap-2">
            \${banwords.length === 0 ? '<div class="text-gray-400">暂无违禁词</div>' :
              banwords.map(w => \`
                <span class="glass px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  \${w.word}
                  <button onclick="deleteBanword(\${w.id})" class="text-red-400 hover:text-red-300">×</button>
                </span>
              \`).join('')}
          </div>
        </div>
      \`;
    }

    function showAddBanwordModal() {
      showModal(\`
        <h3 class="text-lg font-bold mb-4">添加违禁词</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">违禁词</label>
            <input type="text" id="newBanword" class="w-full px-4 py-2 rounded-lg">
          </div>
          <button onclick="addBanword()" class="btn-primary w-full py-2 rounded-lg">添加</button>
        </div>
      \`);
    }

    function showBatchBanwordModal() {
      showModal(\`
        <h3 class="text-lg font-bold mb-4">批量导入违禁词</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">违禁词列表（每行一个）</label>
            <textarea id="batchBanwords" rows="8" class="w-full px-4 py-2 rounded-lg"></textarea>
          </div>
          <button onclick="batchAddBanwords()" class="btn-primary w-full py-2 rounded-lg">导入</button>
        </div>
      \`);
    }

    async function addBanword() {
      const word = document.getElementById('newBanword').value.trim();
      if (!word) return showToast('请输入违禁词', 'error');
      
      await api('/banwords', { method: 'POST', body: JSON.stringify({ word }) });
      showToast('添加成功');
      closeModal();
      loadBanwords();
    }

    async function batchAddBanwords() {
      const words = document.getElementById('batchBanwords').value.trim();
      if (!words) return showToast('请输入违禁词', 'error');
      
      await api('/banwords', { method: 'POST', body: JSON.stringify({ words }) });
      showToast('导入成功');
      closeModal();
      loadBanwords();
    }

    async function deleteBanword(id) {
      await api('/banwords/' + id, { method: 'DELETE' });
      showToast('已删除');
      loadBanwords();
    }

    async function exportBanwords() {
      const banwords = await api('/banwords');
      const text = banwords.map(w => w.word).join('\\n');
      await navigator.clipboard.writeText(text);
      showToast('已复制到剪贴板');
    }

    // ==================== 系统日志 ====================
    async function loadLogs() {
      const logs = await api('/logs');
      const content = document.getElementById('content');
      
      const types = ['all', 'join', 'ban', 'whitelist', 'admin', 'notification', 'system', 'error'];
      
      content.innerHTML = \`
        <div class="flex gap-2 overflow-x-auto pb-2 mb-4">
          \${types.map(t => \`
            <button class="log-type-btn px-3 py-1 rounded-full text-sm whitespace-nowrap glass \${t === 'all' ? 'tab-active' : ''}" 
                    data-type="\${t}" onclick="filterLogs('\${t}')">
              \${t === 'all' ? '全部' : t}
            </button>
          \`).join('')}
        </div>
        <div id="logsList" class="space-y-2 max-h-[60vh] overflow-y-auto">
          \${renderLogs(logs)}
        </div>
      \`;
    }

    function renderLogs(logs) {
      if (logs.length === 0) return '<div class="text-center py-10 text-gray-400">暂无日志</div>';
      
      const typeColors = {
        join: 'text-green-400',
        ban: 'text-red-400',
        whitelist: 'text-blue-400',
        admin: 'text-yellow-400',
        notification: 'text-purple-400',
        system: 'text-gray-400',
        error: 'text-red-500'
      };
      
      return logs.map(l => \`
        <div class="glass p-3 rounded-lg text-sm">
          <div class="flex justify-between items-start mb-1">
            <span class="font-medium \${typeColors[l.type] || 'text-gray-400'}">[\${l.type}] \${l.action}</span>
            <span class="text-xs text-gray-500">\${l.created_at}</span>
          </div>
          <div class="text-gray-400 text-xs">\${l.details || ''}</div>
        </div>
      \`).join('');
    }

    async function filterLogs(type) {
      document.querySelectorAll('.log-type-btn').forEach(btn => {
        btn.classList.remove('tab-active');
        if (btn.dataset.type === type) btn.classList.add('tab-active');
      });
      
      const logs = await api(\`/logs?type=\${type}\`);
      document.getElementById('logsList').innerHTML = renderLogs(logs);
    }

    // ==================== Webhook 设置 ====================
    function showSetWebhookModal() {
      const currentUrl = window.location.origin + '/webhook';
      showModal(\`
        <h3 class="text-lg font-bold mb-4">设置 Webhook</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Webhook URL</label>
            <input type="text" id="webhookUrl" value="\${currentUrl}" class="w-full px-4 py-2 rounded-lg">
          </div>
          <div class="text-xs text-gray-400">
            建议使用当前域名的 /webhook 路径
          </div>
          <button onclick="setWebhook()" class="btn-primary w-full py-2 rounded-lg">设置</button>
        </div>
      \`);
    }

    async function setWebhook() {
      const url = document.getElementById('webhookUrl').value.trim();
      if (!url) return showToast('请输入 URL', 'error');
      
      const result = await api('/webhook', { method: 'POST', body: JSON.stringify({ url }) });
      if (result.ok) {
        showToast('Webhook 设置成功');
        closeModal();
        loadDashboard();
      } else {
        showToast('设置失败: ' + (result.description || '未知错误'), 'error');
      }
    }

    // ==================== 模态框 ====================
    function showModal(content) {
      document.getElementById('modalContent').innerHTML = content;
      document.getElementById('modal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('active');
    }

    // ==================== Toast 提示 ====================
    function showToast(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = \`toast \${type === 'error' ? 'bg-red-500' : 'bg-green-500'}\`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    // ==================== 数据刷新 ====================
    function refreshData() {
      cache = {};
      loadTabContent();
      showToast('数据已刷新');
    }

    function startAutoRefresh() {
      if (autoRefreshTimer) clearInterval(autoRefreshTimer);
      autoRefreshTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadTabContent();
        }
      }, 30000); // 30秒自动刷新
    }

    // ==================== 初始化 ====================
    document.addEventListener('DOMContentLoaded', init);
  </script>
</body>
</html>`;
}

// ==================== 主入口 ====================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Webhook 处理
    if (path === '/webhook') {
      // 验证 Webhook 密钥
      if (env.WEBHOOK_SECRET) {
        const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
        if (secret !== env.WEBHOOK_SECRET) {
          return jsonResponse({ error: 'Invalid secret' }, 403);
        }
      }
      return handleWebhook(request, env);
    }
    
    // API 路由
    if (path.startsWith('/api/')) {
      return handleAPI(request, env, path);
    }
    
    // 前端页面
    return htmlResponse(getHTML());
  }
};