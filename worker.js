/**
 * 星霜Pro群组管理系统 - Cloudflare Worker
 * 基于 Cloudflare Workers + D1 数据库
 * 
 * 环境变量配置：
 * - BOT_TOKEN: Telegram Bot Token
 * - SUPER_ADMINS: 超级管理员ID列表（逗号分隔）
 * - WEBHOOK_SECRET: Webhook 安全密钥
 * - WEBAPP_URL: 管理面板 URL（可选，用于 /panel 命令）
 * D1 数据库绑定：DB
 */

// ==================== 配置 ====================
const CONFIG = {
  SESSION_DURATION: 24 * 60 * 60 * 1000,
  CACHE_DURATION: 30 * 1000,
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
    headers: { 
      'Content-Type': 'application/json', 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

function htmlResponse(html) {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// ==================== Telegram initData 验证 ====================
async function validateTelegramWebAppData(initData, botToken) {
  try {
    if (!initData || !botToken) {
      console.log('Missing initData or botToken');
      return null;
    }
    
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      console.log('Missing hash in initData');
      return null;
    }
    
    params.delete('hash');
    
    // 按字母顺序排序参数
    const dataCheckArr = [];
    const sortedKeys = Array.from(params.keys()).sort();
    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${params.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join('\n');
    
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const secretKeyData = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      encoder.encode(botToken)
    );
    
    const dataKey = await crypto.subtle.importKey(
      'raw',
      secretKeyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      dataKey,
      encoder.encode(dataCheckString)
    );
    
    const calculatedHash = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    if (calculatedHash !== hash) {
      console.log('Hash mismatch:', { calculated: calculatedHash, received: hash });
      return null;
    }
    
    // 验证时间戳（延长到 24 小时内有效，适应各种情况）
    const authDate = parseInt(params.get('auth_date') || '0');
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      console.log('Auth date expired:', { authDate, now, diff: now - authDate });
      return null;
    }
    
    const userStr = params.get('user');
    if (!userStr) {
      console.log('Missing user in initData');
      return null;
    }
    
    return JSON.parse(userStr);
  } catch (e) {
    console.error('Validate initData error:', e);
    return null;
  }
}

// ==================== 数据库操作 ====================
let dbInitialized = false;

async function ensureDatabase(db) {
  if (dbInitialized) return;
  
  try {
    // 检查表是否存在
    const check = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='groups'").first();
    if (check) {
      dbInitialized = true;
      return;
    }
  } catch (e) {
    // 表不存在，需要初始化
  }
  
  await initDatabase(db);
  dbInitialized = true;
}

async function initDatabase(db) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      title TEXT,
      username TEXT,
      photo_url TEXT,
      photo_base64 TEXT,
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
      photo_base64 TEXT,
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
      photo_base64 TEXT,
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
      photo_base64 TEXT,
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
    `CREATE TABLE IF NOT EXISTS user_cache (
      user_id TEXT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      photo_base64 TEXT,
      updated_at TEXT
    )`
  ];
  
  for (const sql of tables) {
    await db.prepare(sql).run();
  }
  
  const existingWords = await db.prepare('SELECT COUNT(*) as count FROM ban_words').first();
  if (existingWords.count === 0) {
    for (const word of CONFIG.DEFAULT_BAN_WORDS) {
      await db.prepare('INSERT OR IGNORE INTO ban_words (word, created_at) VALUES (?, ?)').bind(word, formatBeijingTime()).run();
    }
  }
  
  return { success: true, message: '数据库初始化完成' };
}

async function addLog(db, type, action, details, userId = null, groupId = null) {
  try {
    await db.prepare(
      'INSERT INTO logs (type, action, details, user_id, group_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(type, action, details, userId, groupId, formatBeijingTime()).run();
  } catch (e) {
    console.error('Add log error:', e);
  }
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

  async downloadFileAsBase64(filePath) {
    try {
      const url = this.getFileUrl(filePath);
      const response = await fetch(url);
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch (e) {
      console.error('Download file error:', e);
      return null;
    }
  }
}

// ==================== 用户信息获取与缓存 ====================
async function getUserInfoWithPhoto(telegram, db, userId) {
  // 检查缓存
  try {
    const cached = await db.prepare('SELECT * FROM user_cache WHERE user_id = ?').bind(userId.toString()).first();
    const now = new Date();
    
    if (cached) {
      const updatedAt = new Date(cached.updated_at);
      if (now - updatedAt < 24 * 60 * 60 * 1000) {
        return cached;
      }
    }
  } catch (e) {
    // 缓存表可能不存在
  }
  
  // 获取用户信息
  let userInfo = { user_id: userId.toString(), username: '', first_name: '', last_name: '', photo_base64: null };
  
  try {
    const chatResult = await telegram.getChat(userId);
    if (chatResult.ok) {
      const chat = chatResult.result;
      userInfo.username = chat.username || '';
      userInfo.first_name = chat.first_name || '';
      userInfo.last_name = chat.last_name || '';
      
      // 获取头像
      if (chat.photo) {
        const file = await telegram.getFile(chat.photo.small_file_id);
        if (file.ok) {
          userInfo.photo_base64 = await telegram.downloadFileAsBase64(file.result.file_path);
        }
      }
    }
  } catch (e) {
    console.error('Get user info error:', e);
  }
  
  // 更新缓存
  try {
    await db.prepare(`
      INSERT OR REPLACE INTO user_cache (user_id, username, first_name, last_name, photo_base64, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(userInfo.user_id, userInfo.username, userInfo.first_name, userInfo.last_name, userInfo.photo_base64, formatBeijingTime()).run();
  } catch (e) {
    // 忽略缓存错误
  }
  
  return userInfo;
}

async function getGroupInfoWithPhoto(telegram, db, chatId) {
  try {
    const chatInfo = await telegram.getChat(chatId);
    if (!chatInfo.ok) return null;
    
    const chat = chatInfo.result;
    let photoBase64 = null;
    
    if (chat.photo) {
      const file = await telegram.getFile(chat.photo.small_file_id);
      if (file.ok) {
        photoBase64 = await telegram.downloadFileAsBase64(file.result.file_path);
      }
    }
    
    return {
      id: chatId.toString(),
      title: chat.title,
      username: chat.username || null,
      photo_base64: photoBase64
    };
  } catch (e) {
    console.error('Get group info error:', e);
    return null;
  }
}

// ==================== 权限检查 ====================
function getSuperAdmins(env) {
  return (env.SUPER_ADMINS || '').split(',').map(id => id.trim()).filter(Boolean);
}

async function checkAdmin(db, env, userId) {
  const superAdmins = getSuperAdmins(env);
  if (superAdmins.includes(userId.toString())) return true;
  
  try {
    const admin = await db.prepare('SELECT * FROM admins WHERE user_id = ?').bind(userId.toString()).first();
    return !!admin;
  } catch (e) {
    return false;
  }
}

// ==================== 用户检测 ====================
async function checkUser(telegram, db, user, groupId) {
  const reasons = [];
  
  const group = await db.prepare('SELECT * FROM groups WHERE id = ?').bind(groupId.toString()).first();
  if (!group) return { passed: true, reasons: [] };
  
  const whitelist = await db.prepare(
    'SELECT * FROM whitelist WHERE user_id = ? AND (group_id IS NULL OR group_id = ?)'
  ).bind(user.id.toString(), groupId.toString()).first();
  if (whitelist) return { passed: true, reasons: [], whitelisted: true };
  
  if (group.require_avatar) {
    const photos = await telegram.getUserProfilePhotos(user.id);
    if (!photos.ok || photos.result.total_count === 0) {
      reasons.push('未设置头像');
    }
  }
  
  if (group.require_chinese_name) {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    if (!containsChinese(fullName)) {
      reasons.push('用户名不包含中文');
    }
  }
  
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
  return now + 86400;
}

// ==================== Webhook 处理 ====================
async function handleWebhook(request, env) {
  const telegram = new TelegramAPI(env.BOT_TOKEN);
  const db = env.DB;
  
  try {
    await ensureDatabase(db);
    const update = await request.json();
    
    if (update.chat_join_request) {
      const { chat, from } = update.chat_join_request;
      await handleJoinRequest(telegram, db, env, chat, from);
    }
    
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
    
    if (update.callback_query) {
      await handleCallbackQuery(telegram, db, env, update.callback_query);
    }
    
    if (update.message && update.message.text) {
      await handleCommand(telegram, db, env, update.message);
    }
    
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    try {
      await addLog(db, 'error', 'webhook_error', error.message);
    } catch (e) {}
    return jsonResponse({ ok: false, error: error.message });
  }
}

async function handleJoinRequest(telegram, db, env, chat, user) {
  await addLog(db, 'join', 'request', `用户 ${user.first_name} (${user.id}) 申请加入 ${chat.title}`, user.id.toString(), chat.id.toString());
  
  const userInfo = await getUserInfoWithPhoto(telegram, db, user.id);
  const checkResult = await checkUser(telegram, db, user, chat.id);
  
  if (checkResult.passed) {
    await telegram.approveChatJoinRequest(chat.id, user.id);
    await addLog(db, 'join', 'approved', `已批准用户 ${user.first_name} (${user.id}) 加入`, user.id.toString(), chat.id.toString());
  } else {
    await telegram.declineChatJoinRequest(chat.id, user.id);
    
    const group = await db.prepare('SELECT ban_duration FROM groups WHERE id = ?').bind(chat.id.toString()).first();
    const banDuration = group?.ban_duration || '24h';
    const banExpiry = calculateBanExpiry(banDuration);
    
    await telegram.banChatMember(chat.id, user.id, banExpiry);
    
    const expiryText = banExpiry ? new Date(banExpiry * 1000).toISOString() : null;
    await db.prepare(
      'INSERT INTO bans (user_id, username, first_name, last_name, photo_base64, group_id, reason, banned_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(user.id.toString(), user.username || '', user.first_name || '', user.last_name || '', 
           userInfo.photo_base64, chat.id.toString(), checkResult.reasons.join('; '), formatBeijingTime(), expiryText).run();
    
    await addLog(db, 'ban', 'auto_ban', `已封禁用户 ${user.first_name}: ${checkResult.reasons.join(', ')}`, user.id.toString(), chat.id.toString());
    
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
    
    await notifyAdmins(telegram, db, chat.id, user, checkResult.reasons, userInfo.photo_base64);
  }
}

async function handleCallbackQuery(telegram, db, env, query) {
  const [action, ...params] = query.data.split(':');
  
  if (action === 'recheck') {
    const [groupId, userId] = params;
    const checkResult = await checkUser(telegram, db, query.from, groupId);
    
    if (checkResult.passed) {
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
  const isPrivate = message.chat.type === 'private';
  
  if (!isPrivate) return;
  
  const isAdmin = await checkAdmin(db, env, userId);
  
  if (text === '/start') {
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
  } else if (text === '/help') {
    if (isAdmin) {
      await telegram.sendMessage(chatId, 
        `📖 <b>星霜Pro 帮助文档</b>\n\n` +
        `<b>管理员命令：</b>\n` +
        `/start - 开始使用\n` +
        `/panel - 打开Web管理面板\n` +
        `/status - 查看系统状态\n` +
        `/help - 显示此帮助\n\n` +
        `<b>功能说明：</b>\n` +
        `• 自动审核入群申请\n` +
        `• 检测用户头像、中文名、违禁词\n` +
        `• 自动封禁不合规用户\n` +
        `• 支持白名单管理\n` +
        `• 支持多群组管理\n` +
        `• 封禁通知推送\n\n` +
        `<b>使用方法：</b>\n` +
        `1. 将Bot添加为群组管理员\n` +
        `2. 开启群组"加入请求审核"\n` +
        `3. 在管理面板配置规则`
      );
    } else {
      await telegram.sendMessage(chatId, 
        `📖 <b>星霜Pro 帮助</b>\n\n` +
        `本Bot用于群组入群审核。\n\n` +
        `<b>入群要求：</b>\n` +
        `• 设置头像\n` +
        `• 用户名包含中文\n` +
        `• 不含违禁词\n\n` +
        `如申请被拒绝，请修改资料后点击"重新检测"按钮。`
      );
    }
  } else if (text === '/panel') {
    if (isAdmin) {
      const webAppUrl = env.WEBAPP_URL || `https://${env.CF_WORKER_NAME || 'your-worker'}.workers.dev`;
      await telegram.sendMessage(chatId, 
        `🌟 <b>星霜Pro 管理面板</b>\n\n` +
        `点击下方按钮打开管理面板：`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '🔧 打开管理面板', web_app: { url: webAppUrl } }
            ]]
          }
        }
      );
    } else {
      await telegram.sendMessage(chatId, '❌ 您没有管理员权限');
    }
  } else if (text === '/status') {
    if (isAdmin) {
      const groups = await db.prepare('SELECT COUNT(*) as count FROM groups').first();
      const bans = await db.prepare('SELECT COUNT(*) as count FROM bans WHERE is_active = 1').first();
      const whitelist = await db.prepare('SELECT COUNT(*) as count FROM whitelist').first();
      const dbAdmins = await db.prepare('SELECT COUNT(*) as count FROM admins').first();
      const superAdmins = getSuperAdmins(env);
      const webhookInfo = await telegram.getWebhookInfo();
      
      await telegram.sendMessage(chatId, 
        `📊 <b>系统状态</b>\n\n` +
        `群组数量: ${groups.count}\n` +
        `活跃封禁: ${bans.count}\n` +
        `白名单: ${whitelist.count}\n` +
        `超级管理员: ${superAdmins.length}\n` +
        `普通管理员: ${dbAdmins.count}\n` +
        `Webhook: ${webhookInfo.ok && webhookInfo.result.url ? '✅ 已连接' : '❌ 未设置'}\n` +
        `运行状态: ✅ 正常`
      );
    } else {
      await telegram.sendMessage(chatId, '❌ 您没有管理员权限');
    }
  }
}

async function notifyAdmins(telegram, db, groupId, user, reasons, userPhoto) {
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
  const groupInfo = await getGroupInfoWithPhoto(telegram, db, chatId);
  if (!groupInfo) return;
  
  await db.prepare(`
    INSERT OR REPLACE INTO groups (id, title, username, photo_base64, created_at, updated_at, anti_ad, require_chinese_name, require_avatar, ban_duration)
    VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM groups WHERE id = ?), ?), ?, 
            COALESCE((SELECT anti_ad FROM groups WHERE id = ?), 1),
            COALESCE((SELECT require_chinese_name FROM groups WHERE id = ?), 1),
            COALESCE((SELECT require_avatar FROM groups WHERE id = ?), 1),
            COALESCE((SELECT ban_duration FROM groups WHERE id = ?), '24h'))
  `).bind(
    groupInfo.id, groupInfo.title, groupInfo.username, groupInfo.photo_base64,
    groupInfo.id, formatBeijingTime(), formatBeijingTime(),
    groupInfo.id, groupInfo.id, groupInfo.id, groupInfo.id
  ).run();
}

// ==================== API 路由 ====================
async function handleAPI(request, env, path) {
  const db = env.DB;
  const telegram = new TelegramAPI(env.BOT_TOKEN);
  const url = new URL(request.url);
  
  // 确保数据库已初始化
  await ensureDatabase(db);
  
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
  
  // 认证接口不需要 token
  if (path === '/api/auth' && request.method === 'POST') {
    try {
      const { initData } = await request.json();
      
      if (!initData) {
        return jsonResponse({ error: '缺少认证数据', code: 'NO_INIT_DATA' }, 400);
      }
      
      // 验证 Telegram WebApp 数据签名
      const user = await validateTelegramWebAppData(initData, env.BOT_TOKEN);
      if (!user) {
        return jsonResponse({ error: '签名验证失败或数据已过期', code: 'INVALID_SIGNATURE' }, 400);
      }
      
      const isAdmin = await checkAdmin(db, env, user.id);
      if (!isAdmin) {
        return jsonResponse({ error: '无管理员权限', code: 'NOT_ADMIN', userId: user.id }, 403);
      }
      
      const token = generateToken();
      const expiresAt = new Date(Date.now() + CONFIG.SESSION_DURATION).toISOString();
      
      await db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
        .bind(token, user.id.toString(), formatBeijingTime(), expiresAt).run();
      
      await addLog(db, 'auth', 'login', `管理员 ${user.first_name} (${user.id}) 登录`, user.id.toString());
      
      return jsonResponse({ token, user, expiresAt });
    } catch (e) {
      console.error('Auth error:', e);
      return jsonResponse({ error: '认证失败: ' + e.message, code: 'AUTH_ERROR' }, 500);
    }
  }
  
  // 其他 API 需要验证 token
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
  
  // 验证用户仍然是管理员
  const isStillAdmin = await checkAdmin(db, env, session.user_id);
  if (!isStillAdmin) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return jsonResponse({ error: '管理员权限已被撤销' }, 403);
  }
  
  try {
    if (path === '/api/stats') {
      const groups = await db.prepare('SELECT COUNT(*) as count FROM groups').first();
      const bans = await db.prepare('SELECT COUNT(*) as count FROM bans WHERE is_active = 1').first();
      const whitelist = await db.prepare('SELECT COUNT(*) as count FROM whitelist').first();
      const dbAdmins = await db.prepare('SELECT COUNT(*) as count FROM admins').first();
      const banWords = await db.prepare('SELECT COUNT(*) as count FROM ban_words').first();
      const logs = await db.prepare('SELECT COUNT(*) as count FROM logs').first();
      
      // 超级管理员数量
      const superAdmins = getSuperAdmins(env);
      const totalAdmins = (dbAdmins?.count || 0) + superAdmins.length;
      
      const webhookInfo = await telegram.getWebhookInfo();
      
      return jsonResponse({
        groups: groups?.count || 0,
        bans: bans?.count || 0,
        whitelist: whitelist?.count || 0,
        admins: totalAdmins,
        superAdminCount: superAdmins.length,
        dbAdminCount: dbAdmins?.count || 0,
        banWords: banWords?.count || 0,
        logs: logs?.count || 0,
        webhook: webhookInfo.ok ? webhookInfo.result : null
      });
    }
    
    // 获取用户信息（带头像）
    if (path.startsWith('/api/user/') && request.method === 'GET') {
      const userId = path.split('/')[3];
      const userInfo = await getUserInfoWithPhoto(telegram, db, userId);
      return jsonResponse(userInfo);
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
        await addLog(db, 'group', 'add', `手动添加群组 ${groupId}`, session.user_id);
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/groups/') && path.split('/').length === 4) {
      const groupId = path.split('/')[3];
      
      if (request.method === 'PUT') {
        const data = await request.json();
        await db.prepare(`
          UPDATE groups SET 
            anti_ad = ?, require_chinese_name = ?, require_avatar = ?, ban_duration = ?, updated_at = ?
          WHERE id = ?
        `).bind(
          data.anti_ad ? 1 : 0, data.require_chinese_name ? 1 : 0, 
          data.require_avatar ? 1 : 0, data.ban_duration, formatBeijingTime(), groupId
        ).run();
        await addLog(db, 'group', 'update', `更新群组设置 ${groupId}`, session.user_id);
        return jsonResponse({ success: true });
      }
      
      if (request.method === 'DELETE') {
        await db.prepare('DELETE FROM groups WHERE id = ?').bind(groupId).run();
        await addLog(db, 'group', 'delete', `删除群组 ${groupId}`, session.user_id);
        return jsonResponse({ success: true });
      }
    }
    
    // 刷新群组信息
    if (path.startsWith('/api/groups/') && path.endsWith('/refresh') && request.method === 'POST') {
      const groupId = path.split('/')[3];
      await syncGroup(telegram, db, groupId);
      return jsonResponse({ success: true });
    }
    
    // ========== 封禁管理 ==========
    if (path === '/api/bans') {
      const search = url.searchParams.get('search') || '';
      const groupId = url.searchParams.get('group_id');
      
      let query = 'SELECT b.*, g.title as group_title, g.photo_base64 as group_photo FROM bans b LEFT JOIN groups g ON b.group_id = g.id WHERE b.is_active = 1';
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
    
    if (path.startsWith('/api/bans/') && !path.includes('unban') && request.method === 'DELETE') {
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
        
        if (data.userIds) {
          const ids = data.userIds.split(/[\n,]/).map(id => id.trim()).filter(Boolean);
          for (const userId of ids) {
            const userInfo = await getUserInfoWithPhoto(telegram, db, userId);
            await db.prepare(
              'INSERT OR IGNORE INTO whitelist (user_id, username, first_name, last_name, photo_base64, group_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(userId, userInfo.username, userInfo.first_name, userInfo.last_name, userInfo.photo_base64, data.groupId || null, data.note || '', formatBeijingTime()).run();
          }
          await addLog(db, 'whitelist', 'batch_add', `批量添加 ${ids.length} 个用户`, session.user_id);
        } else {
          const userInfo = await getUserInfoWithPhoto(telegram, db, data.userId);
          await db.prepare(
            'INSERT OR REPLACE INTO whitelist (user_id, username, first_name, last_name, photo_base64, group_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            data.userId, userInfo.username || data.username || '', 
            userInfo.first_name || '', userInfo.last_name || '', userInfo.photo_base64,
            data.groupId || null, data.note || '', formatBeijingTime()
          ).run();
          await addLog(db, 'whitelist', 'add', `添加白名单用户 ${data.userId}`, session.user_id);
        }
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/whitelist/') && request.method === 'DELETE') {
      const whitelistId = path.split('/')[3];
      await db.prepare('DELETE FROM whitelist WHERE id = ?').bind(whitelistId).run();
      await addLog(db, 'whitelist', 'delete', `删除白名单`, session.user_id);
      return jsonResponse({ success: true });
    }
    
    // ========== 管理员管理 ==========
    if (path === '/api/admins') {
      if (request.method === 'GET') {
        const admins = await db.prepare('SELECT a.*, g.title as group_title FROM admins a LEFT JOIN groups g ON a.group_id = g.id ORDER BY a.created_at DESC').all();
        const superAdminIds = getSuperAdmins(env);
        
        // 获取超级管理员信息
        const superAdminInfos = [];
        for (const id of superAdminIds) {
          const info = await getUserInfoWithPhoto(telegram, db, id);
          superAdminInfos.push(info);
        }
        
        return jsonResponse({ admins: admins.results, superAdmins: superAdminInfos });
      }
      if (request.method === 'POST') {
        const data = await request.json();
        const userInfo = await getUserInfoWithPhoto(telegram, db, data.userId);
        
        await db.prepare(
          'INSERT OR REPLACE INTO admins (user_id, username, first_name, last_name, photo_base64, group_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          data.userId, userInfo.username, userInfo.first_name,
          userInfo.last_name, userInfo.photo_base64, data.groupId || null, formatBeijingTime()
        ).run();
        await addLog(db, 'admin', 'add', `添加管理员 ${data.userId}`, session.user_id);
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/admins/') && request.method === 'DELETE') {
      const adminId = path.split('/')[3];
      const admin = await db.prepare('SELECT * FROM admins WHERE id = ?').bind(adminId).first();
      const superAdmins = getSuperAdmins(env);
      
      if (admin && superAdmins.includes(admin.user_id)) {
        return jsonResponse({ error: '不能删除超级管理员' }, 400);
      }
      
      await db.prepare('DELETE FROM admins WHERE id = ?').bind(adminId).run();
      await addLog(db, 'admin', 'delete', `删除管理员`, session.user_id);
      return jsonResponse({ success: true });
    }
    
    // ========== 通知设置 ==========
    if (path === '/api/notifications') {
      if (request.method === 'GET') {
        // 获取所有管理员（包括超级管理员）
        const admins = await db.prepare('SELECT * FROM admins ORDER BY created_at DESC').all();
        const superAdminIds = getSuperAdmins(env);
        
        // 获取现有通知设置
        const notifications = await db.prepare(
          'SELECT n.*, g.title as group_title FROM notifications n LEFT JOIN groups g ON n.group_id = g.id ORDER BY n.created_at DESC'
        ).all();
        
        // 合并所有管理员ID
        const allAdminIds = new Set([
          ...superAdminIds,
          ...admins.results.map(a => a.user_id)
        ]);
        
        // 获取管理员信息
        const adminInfos = [];
        for (const adminId of allAdminIds) {
          const info = await getUserInfoWithPhoto(telegram, db, adminId);
          const notif = notifications.results.find(n => n.admin_id === adminId && !n.group_id);
          adminInfos.push({
            ...info,
            notification_id: notif?.id || null,
            enabled: notif ? notif.enabled : 0,
            is_super: superAdminIds.includes(adminId)
          });
        }
        
        return jsonResponse({ 
          admins: adminInfos,
          notifications: notifications.results 
        });
      }
      if (request.method === 'POST') {
        const data = await request.json();
        await db.prepare(
          'INSERT OR REPLACE INTO notifications (admin_id, group_id, enabled, created_at) VALUES (?, ?, ?, ?)'
        ).bind(data.adminId, data.groupId || null, data.enabled ? 1 : 0, formatBeijingTime()).run();
        await addLog(db, 'notification', 'update', `更新通知设置`, session.user_id);
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
          await addLog(db, 'banword', 'batch_add', `批量添加 ${wordList.length} 个违禁词`, session.user_id);
        } else {
          await db.prepare('INSERT OR IGNORE INTO ban_words (word, created_at) VALUES (?, ?)')
            .bind(data.word, formatBeijingTime()).run();
          await addLog(db, 'banword', 'add', `添加违禁词: ${data.word}`, session.user_id);
        }
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/banwords/') && request.method === 'DELETE') {
      const wordId = path.split('/')[3];
      await db.prepare('DELETE FROM ban_words WHERE id = ?').bind(wordId).run();
      await addLog(db, 'banword', 'delete', `删除违禁词`, session.user_id);
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
      await addLog(db, 'system', 'webhook_set', `设置Webhook: ${data.url}`, session.user_id);
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>星霜Pro 群组管理系统</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style>
    * { box-sizing: border-box; }
    html, body { 
      margin: 0; 
      padding: 0; 
      height: 100%; 
      overflow: hidden;
    }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    }
    #app {
      height: 100%;
      overflow: hidden;
    }
    .page {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
    }
    .page.hidden {
      display: none !important;
    }
    #mainPage {
      overflow: hidden;
    }
    #mainContent {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      padding-bottom: 20px;
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
      overflow: hidden;
      flex-shrink: 0;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .avatar-lg {
      width: 48px;
      height: 48px;
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
    input::placeholder, textarea::placeholder {
      color: rgba(255,255,255,0.4);
    }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
    .loading-spinner {
      border: 2px solid rgba(255,255,255,0.1);
      border-top: 2px solid #667eea;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 1s linear infinite;
      display: inline-block;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .fade-update {
      animation: fadeUpdate 0.3s ease;
    }
    @keyframes fadeUpdate {
      0% { opacity: 0.7; }
      100% { opacity: 1; }
    }
    .user-tag {
      background: rgba(102, 126, 234, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
    }
    .tabs-container {
      flex-shrink: 0;
      overflow-x: auto;
      padding: 0 16px 8px;
      display: flex;
      gap: 8px;
    }
    .tabs-container::-webkit-scrollbar {
      display: none;
    }
    .header-container {
      flex-shrink: 0;
      padding: 16px;
      padding-bottom: 8px;
    }
  </style>
</head>
<body class="text-white">
  <div id="app">
    <!-- 加载页面 -->
    <div id="loadingPage" class="page items-center justify-center">
      <div class="text-center">
        <div class="text-6xl mb-4">🌟</div>
        <h1 class="text-3xl font-bold mb-2">星霜Pro</h1>
        <p class="text-gray-400 mb-6">群组管理系统</p>
        <div class="loading-spinner mx-auto mb-4"></div>
        <div id="loadingStatus" class="text-gray-400">正在验证身份...</div>
      </div>
    </div>

    <!-- 错误页面 -->
    <div id="errorPage" class="page items-center justify-center hidden">
      <div class="text-center px-6">
        <div class="text-6xl mb-4">🚫</div>
        <h1 class="text-2xl font-bold mb-2" id="errorTitle">访问被拒绝</h1>
        <p id="errorMessage" class="text-gray-400 mb-4">请在 Telegram 中打开此页面</p>
        <div id="errorDetails" class="text-sm text-gray-500 mb-6"></div>
        <button onclick="retryAuth()" class="btn-primary px-6 py-2 rounded-lg">重试</button>
      </div>
    </div>

    <!-- 主界面 -->
    <div id="mainPage" class="page hidden">
      <!-- 头部 -->
      <div class="header-container">
        <header class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-3xl">🌟</span>
            <div>
              <h1 class="text-xl font-bold">星霜Pro</h1>
              <p class="text-xs text-gray-400" id="currentUser">群组管理系统</p>
            </div>
          </div>
          <button onclick="manualRefresh()" id="refreshBtn" class="p-2 rounded-lg glass hover:bg-white/10">🔄</button>
        </header>
      </div>

      <!-- 标签页导航 -->
      <div class="tabs-container">
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
      <div id="mainContent">
        <div id="content"></div>
      </div>
    </div>
  </div>

  <!-- 模态框 -->
  <div id="modal" class="modal" onclick="if(event.target === this) closeModal()">
    <div class="modal-content p-6" id="modalContent"></div>
  </div>

  <script>
    // ==================== 全局状态 ====================
    let token = null;
    let currentUser = null;
    let currentTab = 'dashboard';
    let dataCache = {};
    let isRefreshing = false;
    let tg = null;

    // ==================== 头像渲染辅助函数 ====================
    function renderAvatar(photoBase64, name, size) {
      size = size || '';
      var sizeClass = size === 'lg' ? 'avatar-lg' : '';
      var initial = (name || '?')[0].toUpperCase();
      if (photoBase64) {
        return '<div class="avatar ' + sizeClass + '"><img src="' + photoBase64 + '" alt="avatar" onerror="this.parentElement.innerHTML=\\'' + initial + '\\'"></div>';
      }
      return '<div class="avatar ' + sizeClass + '">' + initial + '</div>';
    }

    function renderUserInfo(user, showId) {
      showId = showId !== false;
      var name = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || '未知用户';
      var username = user.username ? '@' + user.username : '';
      var userId = user.user_id || user.id || '';
      
      return '<div class="flex items-center gap-3">' +
        renderAvatar(user.photo_base64, name) +
        '<div class="min-w-0 flex-1">' +
          '<div class="font-medium truncate">' + escapeHtml(name) + '</div>' +
          '<div class="text-xs text-gray-400 flex flex-wrap gap-2">' +
            (username ? '<span class="user-tag">' + escapeHtml(username) + '</span>' : '') +
            (showId && userId ? '<span>ID: ' + userId + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }

    function escapeHtml(text) {
      if (!text) return '';
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // ==================== API 调用 ====================
    async function api(path, options) {
      options = options || {};
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      
      try {
        var res = await fetch('/api' + path, Object.assign({}, options, { headers: headers }));
        var data = await res.json();
        if (res.status === 401 || res.status === 403) {
          showError('权限验证失败', data.error || '未知错误', 'ID: ' + (data.userId || '未知'));
          return null;
        }
        return data;
      } catch (e) {
        showToast('网络错误', 'error');
        throw e;
      }
    }

    // ==================== 页面切换 ====================
    function showPage(pageId) {
      document.querySelectorAll('.page').forEach(function(page) {
        page.classList.add('hidden');
      });
      document.getElementById(pageId).classList.remove('hidden');
    }

    // ==================== 显示错误页面 ====================
    function showError(title, message, details) {
      document.getElementById('errorTitle').textContent = title || '访问被拒绝';
      document.getElementById('errorMessage').textContent = message || '请在 Telegram 中打开此页面';
      document.getElementById('errorDetails').textContent = details || '';
      showPage('errorPage');
    }

    // ==================== 重试认证 ====================
    async function retryAuth() {
      showPage('loadingPage');
      await init();
    }

    // ==================== 认证 ====================
    async function init() {
      document.getElementById('loadingStatus').textContent = '正在初始化...';
      
      // 检查是否在 Telegram WebApp 中打开
      if (typeof Telegram === 'undefined' || !Telegram.WebApp) {
        showError('环境错误', '无法加载 Telegram WebApp SDK', '请确保在 Telegram 中打开');
        return;
      }
      
      tg = Telegram.WebApp;
      
      // 初始化 WebApp
      tg.ready();
      tg.expand();
      
      // 设置主题颜色
      if (tg.colorScheme === 'dark') {
        document.body.style.backgroundColor = tg.backgroundColor || '#1a1a2e';
      }
      
      // 检查 initData
      if (!tg.initData || tg.initData === '') {
        showError('认证数据缺失', '无法获取 Telegram 认证数据', '请通过 Bot 菜单按钮打开此页面');
        return;
      }
      
      document.getElementById('loadingStatus').textContent = '正在验证身份...';
      
      try {
        var auth = await api('/auth', {
          method: 'POST',
          body: JSON.stringify({ initData: tg.initData })
        });
        
        if (!auth) {
          // 错误已在 api 函数中处理
          return;
        }
        
        if (auth.error) {
          var details = '';
          if (auth.code === 'NOT_ADMIN') {
            details = '您的用户 ID: ' + (auth.userId || '未知');
          } else if (auth.code === 'INVALID_SIGNATURE') {
            details = '请重新通过 Bot 打开此页面';
          }
          showError('认证失败', auth.error, details);
          return;
        }
        
        if (auth.token) {
          token = auth.token;
          currentUser = auth.user;
          showMainPage();
        } else {
          showError('认证失败', '服务器未返回有效令牌');
        }
      } catch (e) {
        console.error('Init error:', e);
        showError('认证异常', e.message);
      }
    }

    function showMainPage() {
      showPage('mainPage');
      
      if (currentUser) {
        var name = currentUser.first_name || '';
        if (currentUser.last_name) name += ' ' + currentUser.last_name;
        document.getElementById('currentUser').textContent = name ? '欢迎, ' + name : '群组管理系统';
      }
      
      switchTab('dashboard');
    }

    // ==================== 标签页切换 ====================
    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab').forEach(function(t) {
        t.classList.remove('tab-active');
        if (t.dataset.tab === tab) t.classList.add('tab-active');
      });
      loadTabContent(true);
    }

    async function loadTabContent(showLoading) {
      var content = document.getElementById('content');
      if (showLoading) {
        content.innerHTML = '<div class="text-center py-10"><div class="loading-spinner"></div><div class="mt-2 text-gray-400">加载中...</div></div>';
      }
      
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
        content.classList.add('fade-update');
        setTimeout(function() { content.classList.remove('fade-update'); }, 300);
      } catch (e) {
        console.error('Load error:', e);
        if (showLoading) {
          content.innerHTML = '<div class="text-center py-10 text-red-400">加载失败，请重试</div>';
        }
      }
    }

    // 手动刷新
    async function manualRefresh() {
      if (isRefreshing) return;
      isRefreshing = true;
      var btn = document.getElementById('refreshBtn');
      btn.innerHTML = '<div class="loading-spinner"></div>';
      
      dataCache = {};
      await loadTabContent(false);
      
      btn.innerHTML = '🔄';
      isRefreshing = false;
      showToast('数据已刷新');
    }

    // ==================== 控制面板 ====================
    async function loadDashboard() {
      var stats = await api('/stats');
      if (!stats) return;
      
      var content = document.getElementById('content');
      
      content.innerHTML = 
        '<div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">' +
          '<div class="stat-card card p-4 text-center">' +
            '<div class="text-3xl mb-2">👥</div>' +
            '<div class="text-2xl font-bold">' + (stats.groups || 0) + '</div>' +
            '<div class="text-gray-400 text-sm">群组数量</div>' +
          '</div>' +
          '<div class="stat-card card p-4 text-center">' +
            '<div class="text-3xl mb-2">🚫</div>' +
            '<div class="text-2xl font-bold">' + (stats.bans || 0) + '</div>' +
            '<div class="text-gray-400 text-sm">封禁记录</div>' +
          '</div>' +
          '<div class="stat-card card p-4 text-center">' +
            '<div class="text-3xl mb-2">✅</div>' +
            '<div class="text-2xl font-bold">' + (stats.whitelist || 0) + '</div>' +
            '<div class="text-gray-400 text-sm">白名单</div>' +
          '</div>' +
          '<div class="stat-card card p-4 text-center">' +
            '<div class="text-3xl mb-2">👑</div>' +
            '<div class="text-2xl font-bold">' + (stats.admins || 0) + '</div>' +
            '<div class="text-gray-400 text-sm">管理员</div>' +
            '<div class="text-xs text-gray-500">超管:' + (stats.superAdminCount || 0) + ' 普通:' + (stats.dbAdminCount || 0) + '</div>' +
          '</div>' +
          '<div class="stat-card card p-4 text-center">' +
            '<div class="text-3xl mb-2">📝</div>' +
            '<div class="text-2xl font-bold">' + (stats.banWords || 0) + '</div>' +
            '<div class="text-gray-400 text-sm">违禁词</div>' +
          '</div>' +
          '<div class="stat-card card p-4 text-center">' +
            '<div class="text-3xl mb-2">📋</div>' +
            '<div class="text-2xl font-bold">' + (stats.logs || 0) + '</div>' +
            '<div class="text-gray-400 text-sm">日志记录</div>' +
          '</div>' +
        '</div>' +
        
        '<div class="card p-4 mb-4">' +
          '<h3 class="font-bold mb-3">🔗 Webhook 状态</h3>' +
          '<div class="text-sm">' +
            '<div class="flex justify-between py-2 border-b border-white/10">' +
              '<span class="text-gray-400">状态</span>' +
              '<span>' + (stats.webhook && stats.webhook.url ? '✅ 已连接' : '❌ 未设置') + '</span>' +
            '</div>' +
            (stats.webhook && stats.webhook.url ? 
              '<div class="flex justify-between py-2 border-b border-white/10">' +
                '<span class="text-gray-400">URL</span>' +
                '<span class="text-xs truncate max-w-[200px]">' + stats.webhook.url + '</span>' +
              '</div>' +
              '<div class="flex justify-between py-2">' +
                '<span class="text-gray-400">待处理更新</span>' +
                '<span>' + (stats.webhook.pending_update_count || 0) + '</span>' +
              '</div>' : '') +
          '</div>' +
          '<button onclick="showSetWebhookModal()" class="btn-primary w-full py-2 rounded-lg mt-3">设置 Webhook</button>' +
        '</div>' +
        
        '<div class="card p-4">' +
          '<h3 class="font-bold mb-3">⚙️ 快捷操作</h3>' +
          '<div class="grid grid-cols-2 gap-3">' +
            '<button onclick="switchTab(\\'groups\\')" class="glass p-3 rounded-lg text-center hover:bg-white/10">' +
              '<div class="text-2xl mb-1">➕</div>' +
              '<div class="text-sm">添加群组</div>' +
            '</button>' +
            '<button onclick="switchTab(\\'whitelist\\')" class="glass p-3 rounded-lg text-center hover:bg-white/10">' +
              '<div class="text-2xl mb-1">📋</div>' +
              '<div class="text-sm">管理白名单</div>' +
            '</button>' +
            '<button onclick="switchTab(\\'banwords\\')" class="glass p-3 rounded-lg text-center hover:bg-white/10">' +
              '<div class="text-2xl mb-1">📝</div>' +
              '<div class="text-sm">编辑违禁词</div>' +
            '</button>' +
            '<button onclick="switchTab(\\'logs\\')" class="glass p-3 rounded-lg text-center hover:bg-white/10">' +
              '<div class="text-2xl mb-1">📊</div>' +
              '<div class="text-sm">查看日志</div>' +
            '</button>' +
          '</div>' +
        '</div>';
    }

    // ==================== 群组管理 ====================
    async function loadGroups() {
      var groups = await api('/groups');
      if (!groups) return;
      dataCache.groups = groups;
      var content = document.getElementById('content');
      
      var html = '<div class="flex justify-between items-center mb-4">' +
        '<h2 class="text-lg font-bold">群组管理</h2>' +
        '<button onclick="showAddGroupModal()" class="btn-primary px-4 py-2 rounded-lg text-sm">➕ 添加群组</button>' +
      '</div><div class="space-y-3">';
      
      if (groups.length === 0) {
        html += '<div class="text-center py-10 text-gray-400">暂无群组，请先将Bot添加到群组</div>';
      } else {
        for (var i = 0; i < groups.length; i++) {
          var g = groups[i];
          html += '<div class="card p-4">' +
            '<div class="flex items-center gap-3 mb-3">' +
              renderAvatar(g.photo_base64, g.title, 'lg') +
              '<div class="flex-1 min-w-0">' +
                '<div class="font-bold truncate">' + escapeHtml(g.title || '未知群组') + '</div>' +
                '<div class="text-xs text-gray-400">' +
                  (g.username ? '<span class="user-tag">@' + g.username + '</span> ' : '') +
                  'ID: ' + g.id +
                '</div>' +
              '</div>' +
              '<button onclick="refreshGroup(\\'' + g.id + '\\')" class="p-2 rounded-lg glass hover:bg-white/10 text-sm" title="刷新群组信息">🔄</button>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-2 text-sm mb-3">' +
              '<div class="flex justify-between items-center">' +
                '<span class="text-gray-400">防广告</span>' +
                '<div class="switch ' + (g.anti_ad ? 'on' : '') + '" onclick="toggleGroupSetting(\\'' + g.id + '\\', \\'anti_ad\\', ' + (!g.anti_ad) + ')"></div>' +
              '</div>' +
              '<div class="flex justify-between items-center">' +
                '<span class="text-gray-400">中文名</span>' +
                '<div class="switch ' + (g.require_chinese_name ? 'on' : '') + '" onclick="toggleGroupSetting(\\'' + g.id + '\\', \\'require_chinese_name\\', ' + (!g.require_chinese_name) + ')"></div>' +
              '</div>' +
              '<div class="flex justify-between items-center">' +
                '<span class="text-gray-400">头像</span>' +
                '<div class="switch ' + (g.require_avatar ? 'on' : '') + '" onclick="toggleGroupSetting(\\'' + g.id + '\\', \\'require_avatar\\', ' + (!g.require_avatar) + ')"></div>' +
              '</div>' +
              '<div class="flex justify-between items-center">' +
                '<span class="text-gray-400">封禁</span>' +
                '<select onchange="updateBanDuration(\\'' + g.id + '\\', this.value)" class="px-2 py-1 rounded text-xs">' +
                  '<option value="1h"' + (g.ban_duration === '1h' ? ' selected' : '') + '>1小时</option>' +
                  '<option value="24h"' + (g.ban_duration === '24h' ? ' selected' : '') + '>24小时</option>' +
                  '<option value="7d"' + (g.ban_duration === '7d' ? ' selected' : '') + '>7天</option>' +
                  '<option value="forever"' + (g.ban_duration === 'forever' ? ' selected' : '') + '>永久</option>' +
                '</select>' +
              '</div>' +
            '</div>' +
            '<button onclick="deleteGroup(\\'' + g.id + '\\')" class="btn-danger w-full py-2 rounded-lg text-sm">删除群组</button>' +
          '</div>';
        }
      }
      
      html += '</div>';
      content.innerHTML = html;
    }

    async function refreshGroup(groupId) {
      showToast('正在刷新...');
      await api('/groups/' + groupId + '/refresh', { method: 'POST' });
      await loadGroups();
      showToast('群组信息已更新');
    }

    async function toggleGroupSetting(groupId, setting, value) {
      var groups = dataCache.groups || [];
      var group = null;
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].id === groupId) {
          group = groups[i];
          break;
        }
      }
      if (!group) return;
      
      var data = {
        anti_ad: group.anti_ad,
        require_chinese_name: group.require_chinese_name,
        require_avatar: group.require_avatar,
        ban_duration: group.ban_duration
      };
      data[setting] = value ? 1 : 0;
      
      await api('/groups/' + groupId, { method: 'PUT', body: JSON.stringify(data) });
      showToast('设置已更新');
      await loadGroups();
    }

    async function updateBanDuration(groupId, duration) {
      var groups = dataCache.groups || [];
      var group = null;
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].id === groupId) {
          group = groups[i];
          break;
        }
      }
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
      await loadGroups();
    }

    function showAddGroupModal() {
      showModal(
        '<h3 class="text-lg font-bold mb-4">添加群组</h3>' +
        '<div class="space-y-4">' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">群组 ID</label>' +
            '<input type="text" id="newGroupId" placeholder="例如: -1001234567890" class="w-full px-4 py-2 rounded-lg">' +
          '</div>' +
          '<div class="text-xs text-gray-400">' +
            '提示：需要先将 Bot 添加为群组管理员' +
          '</div>' +
          '<button onclick="addGroup()" class="btn-primary w-full py-2 rounded-lg">添加</button>' +
        '</div>'
      );
    }

    async function addGroup() {
      var groupId = document.getElementById('newGroupId').value.trim();
      if (!groupId) return showToast('请输入群组ID', 'error');
      
      var result = await api('/groups', { method: 'POST', body: JSON.stringify({ groupId: groupId }) });
      if (result && result.error) {
        showToast(result.error, 'error');
      } else if (result) {
        showToast('群组添加成功');
        closeModal();
        await loadGroups();
      }
    }

    // ==================== 封禁管理 ====================
    async function loadBans() {
      var bans = await api('/bans');
      if (!bans) return;
      var groups = dataCache.groups || await api('/groups') || [];
      var content = document.getElementById('content');
      
      var html = '<div class="flex flex-col md:flex-row gap-4 mb-4">' +
        '<input type="text" id="banSearch" placeholder="搜索用户ID/用户名..." class="flex-1 px-4 py-2 rounded-lg" onkeyup="debounceSearch(searchBans)">' +
        '<select id="banGroupFilter" class="px-4 py-2 rounded-lg" onchange="filterBans()">' +
          '<option value="">所有群组</option>';
      
      for (var i = 0; i < groups.length; i++) {
        html += '<option value="' + groups[i].id + '">' + escapeHtml(groups[i].title) + '</option>';
      }
      
      html += '</select></div><div id="bansList" class="space-y-3">' + renderBansList(bans, groups) + '</div>';
      content.innerHTML = html;
    }

    function renderBansList(bans, groups) {
      if (bans.length === 0) return '<div class="text-center py-10 text-gray-400">暂无封禁记录</div>';
      
      var grouped = {};
      for (var i = 0; i < bans.length; i++) {
        var b = bans[i];
        var key = b.group_id;
        if (!grouped[key]) grouped[key] = { title: b.group_title || b.group_id, photo: b.group_photo, bans: [] };
        grouped[key].bans.push(b);
      }
      
      var html = '';
      var keys = Object.keys(grouped);
      for (var j = 0; j < keys.length; j++) {
        var groupId = keys[j];
        var data = grouped[groupId];
        html += '<div class="card p-4">' +
          '<h3 class="font-bold mb-3 flex items-center gap-2">' +
            renderAvatar(data.photo, data.title) +
            '<span>' + escapeHtml(data.title) + '</span>' +
            '<span class="text-xs text-gray-400">(' + data.bans.length + ')</span>' +
          '</h3>' +
          '<div class="space-y-2">';
        
        for (var k = 0; k < data.bans.length; k++) {
          var b = data.bans[k];
          var name = ((b.first_name || '') + ' ' + (b.last_name || '')).trim() || '未知';
          html += '<div class="glass p-3 rounded-lg">' +
            '<div class="flex justify-between items-start mb-2">' +
              '<div class="flex items-center gap-3">' +
                renderAvatar(b.photo_base64, name) +
                '<div>' +
                  '<div class="font-medium">' + escapeHtml(name) + '</div>' +
                  '<div class="text-xs text-gray-400">' +
                    (b.username ? '<span class="user-tag">@' + b.username + '</span> ' : '') +
                    'ID: ' + b.user_id +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="flex gap-2">' +
                '<button onclick="unbanUser(\\'' + b.group_id + '\\', \\'' + b.user_id + '\\')" class="btn-success px-2 py-1 rounded text-xs">解封</button>' +
                '<button onclick="deleteBan(' + b.id + ')" class="btn-danger px-2 py-1 rounded text-xs">删除</button>' +
              '</div>' +
            '</div>' +
            '<div class="text-xs text-gray-400">' +
              '<div>原因: ' + escapeHtml(b.reason || '未知') + '</div>' +
              '<div>时间: ' + (b.banned_at || '') + '</div>' +
            '</div>' +
          '</div>';
        }
        
        html += '</div></div>';
      }
      
      return html;
    }

    var searchTimer = null;
    function debounceSearch(fn) {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(fn, 300);
    }

    async function searchBans() {
      var search = document.getElementById('banSearch').value;
      var groupId = document.getElementById('banGroupFilter').value;
      var bans = await api('/bans?search=' + encodeURIComponent(search) + '&group_id=' + groupId);
      if (!bans) return;
      var groups = dataCache.groups || [];
      document.getElementById('bansList').innerHTML = renderBansList(bans, groups);
    }

    async function filterBans() {
      await searchBans();
    }

    async function unbanUser(groupId, userId) {
      await api('/bans/unban', { method: 'POST', body: JSON.stringify({ groupId: groupId, userId: userId }) });
      showToast('用户已解封');
      await loadBans();
    }

    async function deleteBan(banId) {
      if (!confirm('确定要删除此封禁记录吗？')) return;
      await api('/bans/' + banId, { method: 'DELETE' });
      showToast('记录已删除');
      await loadBans();
    }

    // ==================== 白名单管理 ====================
    async function loadWhitelist() {
      var whitelist = await api('/whitelist');
      if (!whitelist) return;
      var groups = dataCache.groups || await api('/groups') || [];
      dataCache.groups = groups;
      var content = document.getElementById('content');
      
      var html = '<div class="flex flex-col md:flex-row gap-4 mb-4">' +
        '<input type="text" id="whitelistSearch" placeholder="搜索..." class="flex-1 px-4 py-2 rounded-lg" onkeyup="debounceSearch(searchWhitelist)">' +
        '<button onclick="showAddWhitelistModal()" class="btn-primary px-4 py-2 rounded-lg">➕ 添加</button>' +
        '<button onclick="showBatchImportModal()" class="btn-success px-4 py-2 rounded-lg">📥 批量导入</button>' +
      '</div><div id="whitelistList" class="grid gap-3 md:grid-cols-2">';
      
      if (whitelist.length === 0) {
        html += '<div class="text-center py-10 text-gray-400 col-span-2">暂无白名单用户</div>';
      } else {
        for (var i = 0; i < whitelist.length; i++) {
          var w = whitelist[i];
          var name = ((w.first_name || '') + ' ' + (w.last_name || '')).trim() || '用户 ' + w.user_id;
          html += '<div class="card p-4">' +
            '<div class="flex items-center gap-3">' +
              renderAvatar(w.photo_base64, name) +
              '<div class="flex-1 min-w-0">' +
                '<div class="font-medium truncate">' + escapeHtml(name) + '</div>' +
                '<div class="text-xs text-gray-400">' +
                  (w.username ? '<span class="user-tag">@' + w.username + '</span> ' : '') +
                  'ID: ' + w.user_id +
                '</div>' +
                '<div class="text-xs text-gray-400">' + (w.group_title ? '群组: ' + escapeHtml(w.group_title) : '全局白名单') + '</div>' +
                (w.note ? '<div class="text-xs text-blue-400">备注: ' + escapeHtml(w.note) + '</div>' : '') +
              '</div>' +
              '<button onclick="deleteWhitelist(' + w.id + ')" class="btn-danger p-2 rounded-lg text-sm">🗑️</button>' +
            '</div>' +
          '</div>';
        }
      }
      
      html += '</div>';
      content.innerHTML = html;
    }

    async function searchWhitelist() {
      var search = document.getElementById('whitelistSearch').value;
      var whitelist = await api('/whitelist?search=' + encodeURIComponent(search));
      if (!whitelist) return;
      
      var html = '';
      if (whitelist.length === 0) {
        html = '<div class="text-center py-10 text-gray-400 col-span-2">无匹配结果</div>';
      } else {
        for (var i = 0; i < whitelist.length; i++) {
          var w = whitelist[i];
          var name = ((w.first_name || '') + ' ' + (w.last_name || '')).trim() || '用户 ' + w.user_id;
          html += '<div class="card p-4">' +
            '<div class="flex items-center gap-3">' +
              renderAvatar(w.photo_base64, name) +
              '<div class="flex-1 min-w-0">' +
                '<div class="font-medium truncate">' + escapeHtml(name) + '</div>' +
                '<div class="text-xs text-gray-400">' +
                  (w.username ? '<span class="user-tag">@' + w.username + '</span> ' : '') +
                  'ID: ' + w.user_id +
                '</div>' +
                '<div class="text-xs text-gray-400">' + (w.group_title ? '群组: ' + escapeHtml(w.group_title) : '全局白名单') + '</div>' +
              '</div>' +
              '<button onclick="deleteWhitelist(' + w.id + ')" class="btn-danger p-2 rounded-lg text-sm">🗑️</button>' +
            '</div>' +
          '</div>';
        }
      }
      document.getElementById('whitelistList').innerHTML = html;
    }

    function showAddWhitelistModal() {
      showModal(
        '<h3 class="text-lg font-bold mb-4">添加白名单</h3>' +
        '<div class="space-y-4">' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">用户 ID</label>' +
            '<input type="text" id="wlUserId" class="w-full px-4 py-2 rounded-lg">' +
          '</div>' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">适用群组（留空为全局）</label>' +
            '<select id="wlGroupId" class="w-full px-4 py-2 rounded-lg">' +
              '<option value="">全局</option>' +
            '</select>' +
          '</div>' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">备注</label>' +
            '<input type="text" id="wlNote" class="w-full px-4 py-2 rounded-lg">' +
          '</div>' +
          '<button onclick="addWhitelist()" class="btn-primary w-full py-2 rounded-lg">添加</button>' +
        '</div>'
      );
      loadGroupsForSelect('wlGroupId');
    }

    function showBatchImportModal() {
      showModal(
        '<h3 class="text-lg font-bold mb-4">批量导入白名单</h3>' +
        '<div class="space-y-4">' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">用户ID列表（每行一个）</label>' +
            '<textarea id="batchUserIds" rows="8" class="w-full px-4 py-2 rounded-lg" placeholder="123456789&#10;987654321"></textarea>' +
          '</div>' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">适用群组</label>' +
            '<select id="batchGroupId" class="w-full px-4 py-2 rounded-lg">' +
              '<option value="">全局</option>' +
            '</select>' +
          '</div>' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">统一备注</label>' +
            '<input type="text" id="batchNote" class="w-full px-4 py-2 rounded-lg">' +
          '</div>' +
          '<button onclick="batchImportWhitelist()" class="btn-primary w-full py-2 rounded-lg">导入</button>' +
        '</div>'
      );
      loadGroupsForSelect('batchGroupId');
    }

    async function loadGroupsForSelect(selectId) {
      var groups = dataCache.groups || await api('/groups') || [];
      var select = document.getElementById(selectId);
      if (!select) return;
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        var option = document.createElement('option');
        option.value = g.id;
        option.textContent = g.title;
        select.appendChild(option);
      }
    }

    async function addWhitelist() {
      var userId = document.getElementById('wlUserId').value.trim();
      var groupId = document.getElementById('wlGroupId').value;
      var note = document.getElementById('wlNote').value.trim();
      
      if (!userId) return showToast('请输入用户ID', 'error');
      
      await api('/whitelist', { method: 'POST', body: JSON.stringify({ userId: userId, groupId: groupId, note: note }) });
      showToast('添加成功');
      closeModal();
      await loadWhitelist();
    }

    async function batchImportWhitelist() {
      var userIds = document.getElementById('batchUserIds').value.trim();
      var groupId = document.getElementById('batchGroupId').value;
      var note = document.getElementById('batchNote').value.trim();
      
      if (!userIds) return showToast('请输入用户ID', 'error');
      
      showToast('正在导入...');
      await api('/whitelist', { method: 'POST', body: JSON.stringify({ userIds: userIds, groupId: groupId, note: note }) });
      showToast('导入成功');
      closeModal();
      await loadWhitelist();
    }

    async function deleteWhitelist(id) {
      if (!confirm('确定要删除吗？')) return;
      await api('/whitelist/' + id, { method: 'DELETE' });
      showToast('已删除');
      await loadWhitelist();
    }

    // ==================== 管理员管理 ====================
    async function loadAdmins() {
      var data = await api('/admins');
      if (!data) return;
      var content = document.getElementById('content');
      
      var html = '<div class="flex justify-between items-center mb-4">' +
        '<h2 class="text-lg font-bold">管理员管理</h2>' +
        '<button onclick="showAddAdminModal()" class="btn-primary px-4 py-2 rounded-lg text-sm">➕ 添加管理员</button>' +
      '</div>' +
      
      '<div class="card p-4 mb-4">' +
        '<h3 class="font-bold mb-3">👑 超级管理员 (' + data.superAdmins.length + ')</h3>' +
        '<div class="space-y-2">';
      
      if (data.superAdmins.length === 0) {
        html += '<div class="text-gray-400">未配置超级管理员</div>';
      } else {
        for (var i = 0; i < data.superAdmins.length; i++) {
          var admin = data.superAdmins[i];
          var name = ((admin.first_name || '') + ' ' + (admin.last_name || '')).trim() || '超级管理员';
          html += '<div class="glass p-3 rounded-lg flex items-center justify-between">' +
            '<div class="flex items-center gap-3">' +
              renderAvatar(admin.photo_base64, name) +
              '<div>' +
                '<div class="font-medium">' + escapeHtml(name) + '</div>' +
                '<div class="text-xs text-gray-400">' +
                  (admin.username ? '<span class="user-tag">@' + admin.username + '</span> ' : '') +
                  'ID: ' + admin.user_id +
                '</div>' +
              '</div>' +
            '</div>' +
            '<span class="text-xs text-yellow-400">环境变量配置</span>' +
          '</div>';
        }
      }
      
      html += '</div></div>' +
      
      '<div class="card p-4">' +
        '<h3 class="font-bold mb-3">👤 普通管理员 (' + data.admins.length + ')</h3>' +
        '<div class="space-y-2">';
      
      if (data.admins.length === 0) {
        html += '<div class="text-gray-400">暂无普通管理员</div>';
      } else {
        for (var j = 0; j < data.admins.length; j++) {
          var a = data.admins[j];
          var aname = ((a.first_name || '') + ' ' + (a.last_name || '')).trim() || '管理员';
          html += '<div class="glass p-3 rounded-lg flex items-center justify-between">' +
            '<div class="flex items-center gap-3">' +
              renderAvatar(a.photo_base64, aname) +
              '<div>' +
                '<div class="font-medium">' + escapeHtml(aname) + '</div>' +
                '<div class="text-xs text-gray-400">' +
                  (a.username ? '<span class="user-tag">@' + a.username + '</span> ' : '') +
                  'ID: ' + a.user_id +
                '</div>' +
                '<div class="text-xs text-gray-400">' + (a.group_title ? '群组: ' + escapeHtml(a.group_title) : '全局管理员') + '</div>' +
              '</div>' +
            '</div>' +
            '<button onclick="deleteAdmin(' + a.id + ')" class="btn-danger p-2 rounded-lg text-sm">🗑️</button>' +
          '</div>';
        }
      }
      
      html += '</div></div>';
      content.innerHTML = html;
    }

    function showAddAdminModal() {
      showModal(
        '<h3 class="text-lg font-bold mb-4">添加管理员</h3>' +
        '<div class="space-y-4">' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">用户 ID</label>' +
            '<input type="text" id="adminUserId" class="w-full px-4 py-2 rounded-lg">' +
          '</div>' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">管理群组（留空为全局）</label>' +
            '<select id="adminGroupId" class="w-full px-4 py-2 rounded-lg">' +
              '<option value="">全局</option>' +
            '</select>' +
          '</div>' +
          '<button onclick="addAdmin()" class="btn-primary w-full py-2 rounded-lg">添加</button>' +
        '</div>'
      );
      loadGroupsForSelect('adminGroupId');
    }

    async function addAdmin() {
      var userId = document.getElementById('adminUserId').value.trim();
      var groupId = document.getElementById('adminGroupId').value;
      
      if (!userId) return showToast('请输入用户ID', 'error');
      
      await api('/admins', { method: 'POST', body: JSON.stringify({ userId: userId, groupId: groupId }) });
      showToast('添加成功');
      closeModal();
      await loadAdmins();
    }

    async function deleteAdmin(id) {
      if (!confirm('确定要删除此管理员吗？')) return;
      var result = await api('/admins/' + id, { method: 'DELETE' });
      if (result && result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('已删除');
        await loadAdmins();
      }
    }

    // ==================== 通知设置 ====================
    async function loadNotifications() {
      var data = await api('/notifications');
      if (!data) return;
      var groups = dataCache.groups || await api('/groups') || [];
      dataCache.groups = groups;
      var content = document.getElementById('content');
      
      var html = '<div class="mb-4">' +
        '<h2 class="text-lg font-bold">通知设置</h2>' +
        '<p class="text-sm text-gray-400">管理封禁通知推送设置</p>' +
      '</div>' +
      
      '<div class="card p-4 mb-4">' +
        '<h3 class="font-bold mb-3">📢 全局通知（所有群组）</h3>' +
        '<div class="space-y-2">';
      
      if (data.admins.length === 0) {
        html += '<div class="text-gray-400">暂无管理员</div>';
      } else {
        for (var i = 0; i < data.admins.length; i++) {
          var admin = data.admins[i];
          var name = ((admin.first_name || '') + ' ' + (admin.last_name || '')).trim() || '管理员';
          html += '<div class="glass p-3 rounded-lg flex items-center justify-between">' +
            '<div class="flex items-center gap-3">' +
              renderAvatar(admin.photo_base64, name) +
              '<div>' +
                '<div class="font-medium">' + escapeHtml(name) + 
                  (admin.is_super ? ' <span class="text-xs text-yellow-400">(超管)</span>' : '') +
                '</div>' +
                '<div class="text-xs text-gray-400">' +
                  (admin.username ? '<span class="user-tag">@' + admin.username + '</span> ' : '') +
                  'ID: ' + admin.user_id +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="switch ' + (admin.enabled ? 'on' : '') + '" onclick="toggleAdminNotification(\\'' + admin.user_id + '\\', ' + (!admin.enabled) + ', ' + (admin.notification_id || 'null') + ')"></div>' +
          '</div>';
        }
      }
      
      html += '</div></div>';
      
      // 群组特定通知
      html += '<div class="card p-4">' +
        '<h3 class="font-bold mb-3">🎯 群组专属通知</h3>' +
        '<p class="text-xs text-gray-400 mb-3">为特定群组单独设置通知接收人</p>' +
        '<button onclick="showAddGroupNotificationModal()" class="btn-primary px-4 py-2 rounded-lg text-sm mb-3">➕ 添加群组通知</button>' +
        '<div class="space-y-2">';
      
      var groupNotifs = [];
      for (var j = 0; j < data.notifications.length; j++) {
        if (data.notifications[j].group_id) {
          groupNotifs.push(data.notifications[j]);
        }
      }
      
      if (groupNotifs.length === 0) {
        html += '<div class="text-gray-400 text-sm">暂无群组专属通知设置</div>';
      } else {
        for (var k = 0; k < groupNotifs.length; k++) {
          var n = groupNotifs[k];
          html += '<div class="glass p-3 rounded-lg flex items-center justify-between">' +
            '<div>' +
              '<div class="font-medium">管理员 ID: ' + n.admin_id + '</div>' +
              '<div class="text-xs text-gray-400">群组: ' + escapeHtml(n.group_title || n.group_id) + '</div>' +
            '</div>' +
            '<div class="flex items-center gap-3">' +
              '<div class="switch ' + (n.enabled ? 'on' : '') + '" onclick="toggleNotification(' + n.id + ', ' + (!n.enabled) + ')"></div>' +
              '<button onclick="deleteNotification(' + n.id + ')" class="btn-danger p-2 rounded-lg text-sm">🗑️</button>' +
            '</div>' +
          '</div>';
        }
      }
      
      html += '</div></div>';
      content.innerHTML = html;
    }

    async function toggleAdminNotification(adminId, enabled, notifId) {
      await api('/notifications', { 
        method: 'POST', 
        body: JSON.stringify({ adminId: adminId, groupId: null, enabled: enabled }) 
      });
      showToast(enabled ? '通知已开启' : '通知已关闭');
      await loadNotifications();
    }

    function showAddGroupNotificationModal() {
      showModal(
        '<h3 class="text-lg font-bold mb-4">添加群组专属通知</h3>' +
        '<div class="space-y-4">' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">管理员 ID</label>' +
            '<input type="text" id="notifAdminId" class="w-full px-4 py-2 rounded-lg">' +
          '</div>' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">群组</label>' +
            '<select id="notifGroupId" class="w-full px-4 py-2 rounded-lg">' +
            '</select>' +
          '</div>' +
          '<button onclick="addGroupNotification()" class="btn-primary w-full py-2 rounded-lg">添加</button>' +
        '</div>'
      );
      
      var groups = dataCache.groups || [];
      var select = document.getElementById('notifGroupId');
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        var option = document.createElement('option');
        option.value = g.id;
        option.textContent = g.title;
        select.appendChild(option);
      }
    }

    async function addGroupNotification() {
      var adminId = document.getElementById('notifAdminId').value.trim();
      var groupId = document.getElementById('notifGroupId').value;
      
      if (!adminId) return showToast('请输入管理员ID', 'error');
      if (!groupId) return showToast('请选择群组', 'error');
      
      await api('/notifications', { method: 'POST', body: JSON.stringify({ adminId: adminId, groupId: groupId, enabled: true }) });
      showToast('添加成功');
      closeModal();
      await loadNotifications();
    }

    async function toggleNotification(id, enabled) {
      await api('/notifications/' + id, { method: 'PUT', body: JSON.stringify({ enabled: enabled }) });
      showToast(enabled ? '通知已开启' : '通知已关闭');
      await loadNotifications();
    }

    async function deleteNotification(id) {
      if (!confirm('确定要删除吗？')) return;
      await api('/notifications/' + id, { method: 'DELETE' });
      showToast('已删除');
      await loadNotifications();
    }

    // ==================== 违禁词管理 ====================
    async function loadBanwords() {
      var banwords = await api('/banwords');
      if (!banwords) return;
      dataCache.banwords = banwords;
      var content = document.getElementById('content');
      
      var html = '<div class="flex flex-col md:flex-row gap-4 mb-4">' +
        '<button onclick="showAddBanwordModal()" class="btn-primary px-4 py-2 rounded-lg">➕ 添加违禁词</button>' +
        '<button onclick="showBatchBanwordModal()" class="btn-success px-4 py-2 rounded-lg">📥 批量导入</button>' +
        '<button onclick="exportBanwords()" class="glass px-4 py-2 rounded-lg hover:bg-white/10">📤 导出</button>' +
      '</div>' +
      '<div class="card p-4">' +
        '<div class="mb-2 text-sm text-gray-400">共 ' + banwords.length + ' 个违禁词</div>' +
        '<div class="flex flex-wrap gap-2">';
      
      if (banwords.length === 0) {
        html += '<div class="text-gray-400">暂无违禁词</div>';
      } else {
        for (var i = 0; i < banwords.length; i++) {
          var w = banwords[i];
          html += '<span class="glass px-3 py-1 rounded-full text-sm flex items-center gap-2">' +
            escapeHtml(w.word) +
            '<button onclick="deleteBanword(' + w.id + ')" class="text-red-400 hover:text-red-300">×</button>' +
          '</span>';
        }
      }
      
      html += '</div></div>';
      content.innerHTML = html;
    }

    function showAddBanwordModal() {
      showModal(
        '<h3 class="text-lg font-bold mb-4">添加违禁词</h3>' +
        '<div class="space-y-4">' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">违禁词</label>' +
            '<input type="text" id="newBanword" class="w-full px-4 py-2 rounded-lg">' +
          '</div>' +
          '<button onclick="addBanword()" class="btn-primary w-full py-2 rounded-lg">添加</button>' +
        '</div>'
      );
    }

    function showBatchBanwordModal() {
      showModal(
        '<h3 class="text-lg font-bold mb-4">批量导入违禁词</h3>' +
        '<div class="space-y-4">' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">违禁词列表（每行一个）</label>' +
            '<textarea id="batchBanwords" rows="8" class="w-full px-4 py-2 rounded-lg"></textarea>' +
          '</div>' +
          '<button onclick="batchAddBanwords()" class="btn-primary w-full py-2 rounded-lg">导入</button>' +
        '</div>'
      );
    }

    async function addBanword() {
      var word = document.getElementById('newBanword').value.trim();
      if (!word) return showToast('请输入违禁词', 'error');
      
      await api('/banwords', { method: 'POST', body: JSON.stringify({ word: word }) });
      showToast('添加成功');
      closeModal();
      await loadBanwords();
    }

    async function batchAddBanwords() {
      var words = document.getElementById('batchBanwords').value.trim();
      if (!words) return showToast('请输入违禁词', 'error');
      
      await api('/banwords', { method: 'POST', body: JSON.stringify({ words: words }) });
      showToast('导入成功');
      closeModal();
      await loadBanwords();
    }

    async function deleteBanword(id) {
      await api('/banwords/' + id, { method: 'DELETE' });
      showToast('已删除');
      await loadBanwords();
    }

    async function exportBanwords() {
      var banwords = dataCache.banwords || await api('/banwords') || [];
      var words = [];
      for (var i = 0; i < banwords.length; i++) {
        words.push(banwords[i].word);
      }
      var text = words.join('\\n');
      await navigator.clipboard.writeText(text);
      showToast('已复制到剪贴板');
    }

    // ==================== 系统日志 ====================
    async function loadLogs() {
      var logs = await api('/logs');
      if (!logs) return;
      var content = document.getElementById('content');
      
      var types = ['all', 'join', 'ban', 'whitelist', 'admin', 'notification', 'system', 'error'];
      
      var html = '<div class="flex gap-2 overflow-x-auto pb-2 mb-4">';
      for (var i = 0; i < types.length; i++) {
        var t = types[i];
        html += '<button class="log-type-btn px-3 py-1 rounded-full text-sm whitespace-nowrap glass ' + 
          (t === 'all' ? 'tab-active' : '') + '" data-type="' + t + '" onclick="filterLogs(\\'' + t + '\\')">' +
          (t === 'all' ? '全部' : t) + '</button>';
      }
      html += '</div><div id="logsList" class="space-y-2">' + renderLogs(logs) + '</div>';
      
      content.innerHTML = html;
    }

    function renderLogs(logs) {
      if (logs.length === 0) return '<div class="text-center py-10 text-gray-400">暂无日志</div>';
      
      var typeColors = {
        join: 'text-green-400',
        ban: 'text-red-400',
        whitelist: 'text-blue-400',
        admin: 'text-yellow-400',
        notification: 'text-purple-400',
        system: 'text-gray-400',
        error: 'text-red-500',
        auth: 'text-cyan-400',
        group: 'text-orange-400',
        banword: 'text-pink-400'
      };
      
      var html = '';
      for (var i = 0; i < logs.length; i++) {
        var l = logs[i];
        html += '<div class="glass p-3 rounded-lg text-sm">' +
          '<div class="flex justify-between items-start mb-1">' +
            '<span class="font-medium ' + (typeColors[l.type] || 'text-gray-400') + '">[' + l.type + '] ' + escapeHtml(l.action) + '</span>' +
            '<span class="text-xs text-gray-500">' + (l.created_at || '') + '</span>' +
          '</div>' +
          '<div class="text-gray-400 text-xs">' + escapeHtml(l.details || '') + '</div>' +
        '</div>';
      }
      return html;
    }

    async function filterLogs(type) {
      var btns = document.querySelectorAll('.log-type-btn');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('tab-active');
        if (btns[i].dataset.type === type) btns[i].classList.add('tab-active');
      }
      
      var logs = await api('/logs?type=' + type);
      if (!logs) return;
      document.getElementById('logsList').innerHTML = renderLogs(logs);
    }

    // ==================== Webhook 设置 ====================
    function showSetWebhookModal() {
      var currentUrl = window.location.origin + '/webhook';
      showModal(
        '<h3 class="text-lg font-bold mb-4">设置 Webhook</h3>' +
        '<div class="space-y-4">' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">Webhook URL</label>' +
            '<input type="text" id="webhookUrl" value="' + currentUrl + '" class="w-full px-4 py-2 rounded-lg">' +
          '</div>' +
          '<div class="text-xs text-gray-400">' +
            '建议使用当前域名的 /webhook 路径' +
          '</div>' +
          '<button onclick="setWebhook()" class="btn-primary w-full py-2 rounded-lg">设置</button>' +
        '</div>'
      );
    }

    async function setWebhook() {
      var url = document.getElementById('webhookUrl').value.trim();
      if (!url) return showToast('请输入 URL', 'error');
      
      var result = await api('/webhook', { method: 'POST', body: JSON.stringify({ url: url }) });
      if (result && result.ok) {
        showToast('Webhook 设置成功');
        closeModal();
        await loadDashboard();
      } else {
        showToast('设置失败: ' + (result ? result.description || '未知错误' : '网络错误'), 'error');
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
    function showToast(message, type) {
      type = type || 'success';
      var toast = document.createElement('div');
      toast.className = 'toast ' + (type === 'error' ? 'bg-red-500' : 'bg-green-500');
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(function() { toast.remove(); }, 3000);
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
    
    // 确保数据库已初始化
    try {
      await ensureDatabase(env.DB);
    } catch (e) {
      console.error('Database init error:', e);
    }
    
    // Webhook 处理
    if (path === '/webhook') {
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
