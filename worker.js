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
  // scope 可选值（逗号分隔）：
  //   profile_name     用户昵称（入群检测）
  //   profile_username 用户@名（入群检测）
  //   profile_bio      用户简介（入群检测）
  //   msg_text         消息正文/媒体说明（群内发言）
  //   msg_quote        引用/被回复内容（群内发言）
  //   msg_forward      转发/外部引用来源（群内发言）
  //   all              全部方向
  DEFAULT_BAN_WORDS: [
    // 高危 - 全部方向拦截
    { word: '色情',     scope: 'all' },
    { word: '约炮',     scope: 'all' },
    { word: '上门',     scope: 'all' },
    { word: '外围',     scope: 'all' },
    { word: '楼凤',     scope: 'all' },
    { word: '赌场',     scope: 'all' },
    { word: '博彩',     scope: 'all' },
    { word: '彩票',     scope: 'all' },
    { word: '北京赛车', scope: 'all' },
    { word: 'PK10',     scope: 'all' },
    { word: 'USDT',     scope: 'all' },
    // 引流行为 - 资料+主动发言
    { word: '刷单',     scope: 'profile_name,profile_bio,msg_text' },
    { word: '接单',     scope: 'profile_name,profile_bio,msg_text' },
    { word: '加群',     scope: 'profile_bio,msg_text' },
    { word: '进群',     scope: 'profile_bio,msg_text' },
    { word: '拉人',     scope: 'profile_bio,msg_text' },
    { word: 'TG群',     scope: 'profile_bio,msg_text' },
    { word: '私聊',     scope: 'msg_text' },
    // 广告号特征 - 仅用户资料
    { word: '代理',     scope: 'profile_name,profile_bio' },
    { word: '兼职',     scope: 'profile_name,profile_bio' },
    { word: '日结',     scope: 'profile_name,profile_bio' },
    { word: '月入',     scope: 'profile_name,profile_bio' },
    { word: '躺赚',     scope: 'profile_name,profile_bio' },
    { word: '被动收入', scope: 'profile_name,profile_bio' },
    { word: '担保',     scope: 'profile_name,profile_bio' },
    { word: '诚信',     scope: 'profile_name,profile_bio' },
    { word: 'VPN',      scope: 'profile_name,profile_bio' },
    { word: '翻墙',     scope: 'profile_name,profile_bio' },
    { word: '科学上网', scope: 'profile_name,profile_bio' },
    { word: '梯子',     scope: 'profile_name,profile_bio' },
  ],
  
  // 权限定义
  PERMISSIONS: {
    // 群组管理权限
    MANAGE_GROUPS: 'manage_groups',         // 管理群组设置
    VIEW_GROUPS: 'view_groups',             // 查看群组
    
    // 封禁管理权限
    MANAGE_BANS: 'manage_bans',             // 管理封禁（解封、删除）
    VIEW_BANS: 'view_bans',                 // 查看封禁记录
    
    // 白名单管理权限
    MANAGE_WHITELIST: 'manage_whitelist',   // 管理白名单
    VIEW_WHITELIST: 'view_whitelist',       // 查看白名单
    
    // 违禁词管理权限
    MANAGE_BANWORDS: 'manage_banwords',     // 管理违禁词
    VIEW_BANWORDS: 'view_banwords',         // 查看违禁词
    
    // 日志查看权限
    VIEW_LOGS: 'view_logs',                 // 查看系统日志
    
    // 通知管理权限
    MANAGE_NOTIFICATIONS: 'manage_notifications', // 管理通知设置
    VIEW_NOTIFICATIONS: 'view_notifications',     // 查看通知设置
    
    // 管理员管理权限（仅超级管理员）
    MANAGE_ADMINS: 'manage_admins',         // 管理其他管理员
    MANAGE_PERMISSIONS: 'manage_permissions', // 管理权限
    
    // 系统管理权限（仅超级管理员）
    MANAGE_SYSTEM: 'manage_system',         // 系统设置（Webhook等）
    VIEW_SYSTEM: 'view_system',              // 查看系统状态
    
    // 消息管理权限（新增）
    MANAGE_MESSAGES: 'manage_messages',     // 管理消息检查设置
    VIEW_MESSAGES: 'view_messages'          // 查看消息日志
  },
  
  // 默认权限组合
  DEFAULT_PERMISSION_SETS: {
    // 普通管理员默认权限（可以自定义）
    DEFAULT: [
      'view_groups', 'view_bans', 'view_whitelist',
      'view_banwords', 'view_logs', 'view_notifications'
    ],
    
    // 群组管理员权限
    GROUP_MANAGER: [
      'view_groups', 'manage_groups', 'view_bans',
      'manage_bans', 'view_whitelist', 'manage_whitelist',
      'view_banwords', 'view_logs', 'view_notifications',
      'manage_notifications', 'view_messages'
    ],
    
    // 审核员权限
    REVIEWER: [
      'view_groups', 'view_bans', 'manage_bans',
      'view_whitelist', 'manage_whitelist',
      'view_banwords', 'view_logs', 'view_messages'
    ],
    
    // 观察员权限
    VIEWER: [
      'view_groups', 'view_bans', 'view_whitelist',
      'view_banwords', 'view_logs'
    ]
  }
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

// ==================== 新增工具函数 ====================
// 检查消息是否包含违禁词
// scopeKey: 当前检测方向，如 'msg_text'、'profile_bio' 等，传 null 则不过滤
async function checkMessageForBanWords(db, text, scopeKey) {
  if (!text) return { hasBanWord: false, words: [] };
  
  try {
    const banWords = await db.prepare('SELECT word, scope FROM ban_words').all();
    const lowerText = text.toLowerCase();
    const foundWords = [];
    
    for (const { word, scope } of banWords.results) {
      // scope过滤：词的scope为'all'，或包含当前检测方向，或未传scopeKey则不过滤
      if (scopeKey) {
        const scopes = (scope || 'all').split(',').map(s => s.trim());
        if (!scopes.includes('all') && !scopes.includes(scopeKey)) continue;
      }
      const lowerWord = word.toLowerCase();
      if (lowerText.includes(lowerWord)) {
        foundWords.push(word);
      }
    }
    
    return {
      hasBanWord: foundWords.length > 0,
      words: foundWords
    };
  } catch (e) {
    console.error('Check message for ban words error:', e);
    return { hasBanWord: false, words: [] };
  }
}

// ==================== 权限检查函数 ====================
function getSuperAdmins(env) {
  return (env.SUPER_ADMINS || '').split(',').map(id => id.trim()).filter(Boolean);
}

function hasPermission(user, permission, env) {
  // 超级管理员拥有所有权限
  if (user.is_super) return true;
  
  // 普通管理员检查权限
  if (!user.permissions) return false;
  
  // 解析权限数组（可能是JSON字符串或数组）
  let permissions;
  if (typeof user.permissions === 'string') {
    try {
      permissions = JSON.parse(user.permissions);
    } catch (e) {
      console.error('Parse permissions error:', e);
      return false;
    }
  } else {
    permissions = user.permissions;
  }
  
  return permissions.includes(permission);
}

async function getUserWithPermissions(db, env, userId) {
  const superAdmins = getSuperAdmins(env);
  const isSuper = superAdmins.includes(userId.toString());
  
  if (isSuper) {
    return {
      user_id: userId.toString(),
      is_super: true,
      permissions: Object.values(CONFIG.PERMISSIONS) // 超级管理员拥有所有权限
    };
  }
  
  try {
    const admin = await db.prepare(
      'SELECT * FROM admins WHERE user_id = ?'
    ).bind(userId.toString()).first();
    
    if (!admin) return null;
    
    return {
      ...admin,
      is_super: false,
      permissions: admin.permissions ? JSON.parse(admin.permissions) : CONFIG.DEFAULT_PERMISSION_SETS.DEFAULT
    };
  } catch (e) {
    console.error('Get user with permissions error:', e);
    return null;
  }
}

// ==================== 权限验证中间件 ====================
async function checkAPIPermission(request, env, db, requiredPermission) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return { error: jsonResponse({ error: '未授权' }, 401), user: null };
  }
  
  const token = authHeader.replace('Bearer ', '');
  const session = await db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?')
    .bind(token, new Date().toISOString()).first();
  
  if (!session) {
    return { error: jsonResponse({ error: '会话已过期' }, 401), user: null };
  }
  
  const user = await getUserWithPermissions(db, env, session.user_id);
  if (!user) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return { error: jsonResponse({ error: '用户权限已被撤销' }, 403), user: null };
  }
  
  // 检查特定权限（如果提供了）
  if (requiredPermission && !hasPermission(user, requiredPermission, env)) {
    return { error: jsonResponse({ error: '权限不足' }, 403), user: null };
  }
  
  return { error: null, user };
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
    // 无论新旧库，都先执行迁移（ALTER TABLE 失败代表列已存在，直接忽略）
    try {
      await db.prepare("ALTER TABLE ban_words ADD COLUMN scope TEXT NOT NULL DEFAULT 'all'").run();
    } catch (e) { /* 列已存在，忽略 */ }

    // 检查核心表是否存在
    const result = await db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('groups', 'admins')"
    ).all();
    const exists = new Set(result.map(item => item.name));
    if (exists.has('groups') && exists.has('admins')) {
        dbInitialized = true;
        return;
    }
  } catch (e) {
    // 表不存在或查询异常，执行初始化
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
      check_messages INTEGER DEFAULT 1,
      require_chinese_name INTEGER DEFAULT 1,
      require_avatar INTEGER DEFAULT 1,
      ban_duration TEXT DEFAULT '24h',
      action_on_message TEXT DEFAULT 'delete',
      mute_duration INTEGER DEFAULT 10,
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
      permissions TEXT DEFAULT '[]',
      note TEXT,
      created_at TEXT,
      updated_at TEXT,
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
      scope TEXT NOT NULL DEFAULT 'all',
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
    for (const item of CONFIG.DEFAULT_BAN_WORDS) {
      await db.prepare('INSERT OR IGNORE INTO ban_words (word, scope, created_at) VALUES (?, ?, ?)')
        .bind(item.word, item.scope, formatBeijingTime()).run();
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
    const params = { 
      url, 
      allowed_updates: [
        'message', 
        'chat_join_request', 
        'my_chat_member', 
        'callback_query',
        'edited_message'
      ] 
    };
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
    const banWords = await db.prepare('SELECT word, scope FROM ban_words').all();
    
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const username = (user.username || '').toLowerCase();
    
    // 实时获取用户简介（bio）
    let userBio = '';
    try {
      const chatResult = await telegram.getChat(user.id);
      if (chatResult.ok) {
        userBio = chatResult.result.bio || '';
      }
    } catch (e) {
      console.error('Failed to get user bio:', e);
    }
    const bio = userBio.toLowerCase();

    // 按scope分方向检测，命中即记录并退出
    let hitWord = null;
    let hitSource = null;

    outer: for (const { word, scope } of banWords.results) {
      const scopes = (scope || 'all').split(',').map(s => s.trim());
      const matchAll = scopes.includes('all');
      const lowerWord = word.toLowerCase();

      if ((matchAll || scopes.includes('profile_name')) && fullName.includes(lowerWord)) {
        hitWord = word; hitSource = '昵称'; break outer;
      }
      if ((matchAll || scopes.includes('profile_username')) && username && username.includes(lowerWord)) {
        hitWord = word; hitSource = '用户名'; break outer;
      }
      if ((matchAll || scopes.includes('profile_bio')) && bio && bio.includes(lowerWord)) {
        hitWord = word; hitSource = '简介'; break outer;
      }
    }

    if (hitWord) {
      reasons.push(`${hitSource}包含违禁词: ${hitWord}`);
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

// ==================== 提取消息中所有需要检测的文本 ====================
// 每个 part 携带 scopeKey，对应 ban_words.scope 中的方向值
function extractAllMessageTexts(message) {
  const parts = [];

  // 1. 消息正文 / 图片说明
  if (message.text) parts.push({ source: '消息正文', text: message.text, scopeKey: 'msg_text' });
  if (message.caption) parts.push({ source: '媒体说明', text: message.caption, scopeKey: 'msg_text' });

  // 2. 用户引用（Quote）的文本
  if (message.quote && message.quote.text) {
    parts.push({ source: '引用文本', text: message.quote.text, scopeKey: 'msg_quote' });
  }

  // 3. 外部引用（external_reply）—— 引用其他频道/群组的消息
  if (message.external_reply) {
    const er = message.external_reply;
    if (er.origin && er.origin.chat && er.origin.chat.title) {
      parts.push({ source: '外部引用来源标题', text: er.origin.chat.title, scopeKey: 'msg_forward' });
    }
    if (er.text) parts.push({ source: '外部引用正文', text: er.text, scopeKey: 'msg_forward' });
    if (er.caption) parts.push({ source: '外部引用说明', text: er.caption, scopeKey: 'msg_forward' });
  }

  // 4. 普通回复（reply_to_message）的文本
  if (message.reply_to_message) {
    const reply = message.reply_to_message;
    if (reply.text) parts.push({ source: '被回复消息正文', text: reply.text, scopeKey: 'msg_quote' });
    if (reply.caption) parts.push({ source: '被回复消息说明', text: reply.caption, scopeKey: 'msg_quote' });
    if (reply.quote && reply.quote.text) {
      parts.push({ source: '被回复消息引用文本', text: reply.quote.text, scopeKey: 'msg_quote' });
    }
  }

  // 5. 转发来源信息
  if (message.forward_from_chat && message.forward_from_chat.title) {
    parts.push({ source: '转发来源标题', text: message.forward_from_chat.title, scopeKey: 'msg_forward' });
  }
  if (message.forward_origin) {
    const fo = message.forward_origin;
    if (fo.chat && fo.chat.title) {
      parts.push({ source: '转发来源频道标题', text: fo.chat.title, scopeKey: 'msg_forward' });
    }
    if (fo.sender_user_name) {
      parts.push({ source: '转发来源用户名', text: fo.sender_user_name, scopeKey: 'msg_forward' });
    }
  }

  return parts;
}

// ==================== 处理群组消息 ====================
async function handleGroupMessage(telegram, db, env, message) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const messageId = message.message_id;
  const text = message.text || message.caption || '';

  // 忽略机器人的消息
  if (message.from.is_bot) return;

  // 检查用户是否在白名单
  const whitelist = await db.prepare(
    'SELECT * FROM whitelist WHERE user_id = ? AND (group_id IS NULL OR group_id = ?)'
  ).bind(userId.toString(), chatId.toString()).first();
  if (whitelist) {
    return; // 白名单用户跳过检查
  }

  // 检查用户是否是管理员（包括超级管理员和普通管理员）
  const user = await getUserWithPermissions(db, env, userId);
  if (user) {
    // 用户是管理员，跳过消息检查
    return;
  }

  // 获取群组设置
  const group = await db.prepare('SELECT * FROM groups WHERE id = ?').bind(chatId.toString()).first();
  if (!group) return;

  // 检查是否启用了消息检查
  if (!group.check_messages) return;

  // 记录消息日志（用于防刷屏）
  await addLog(db, 'message', 'sent', `用户 ${message.from.first_name} 发送消息: ${text.substring(0, 50)}...`, userId.toString(), chatId.toString());

  // 检查消息内容（包括正文、引用、外部引用、回复、转发来源等所有字段）
  let violations = [];

  // 提取消息中所有需要检测的文本片段
  const textParts = extractAllMessageTexts(message);

  // 对每个文本片段逐一检测违禁词（按scopeKey过滤，只检查该方向生效的词）
  for (const part of textParts) {
    const banWordResult = await checkMessageForBanWords(db, part.text, part.scopeKey);
    if (banWordResult.hasBanWord) {
      violations.push({
        type: 'ban_word',
        words: banWordResult.words,
        message: `[${part.source}] 包含违禁词: ${banWordResult.words.join(', ')}`
      });
    }
  }

  // 如果有违规行为，进行处理
  if (violations.length > 0) {
    await handleMessageViolation(telegram, db, env, group, message, violations);
  }

  // 防刷屏检查（可选）
  await checkSpamProtection(telegram, db, env, group, message);
}

// 处理消息违规
async function handleMessageViolation(telegram, db, env, group, message, violations) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const messageId = message.message_id;
  const violationsText = violations.map(v => v.message).join('; ');
  
  // 记录违规日志
  await addLog(db, 'violation', 'detected', violationsText, userId.toString(), chatId.toString());
  
  // 根据群组设置采取行动
  const action = group.action_on_message || 'delete';
  
  try {
    // 删除违规消息
    await telegram.request('deleteMessage', {
      chat_id: chatId,
      message_id: messageId
    });
    
    await addLog(db, 'moderation', 'message_deleted', `删除违规消息: ${violationsText}`, userId.toString(), chatId.toString());
    
    // 根据设置执行进一步操作
    switch (action) {
      case 'delete_ban':
        // 删除并封禁
        // 再次检查是否在白名单或是管理员（防止误封）
        const whitelist = await db.prepare(
          'SELECT * FROM whitelist WHERE user_id = ? AND (group_id IS NULL OR group_id = ?)'
        ).bind(userId.toString(), chatId.toString()).first();
        
        const user = await getUserWithPermissions(db, env, userId);
        
        // 如果是白名单或管理员，不封禁
        if (whitelist || user) {
          await addLog(db, 'moderation', 'skip_ban', `用户是白名单或管理员，跳过封禁`, userId.toString(), chatId.toString());
          break;
        }
        
        const banExpiry = calculateBanExpiry(group.ban_duration);
        await telegram.banChatMember(chatId, userId, banExpiry);
        
        const expiryText = banExpiry ? new Date(banExpiry * 1000).toISOString() : null;
        await db.prepare(
          'INSERT INTO bans (user_id, username, first_name, last_name, photo_base64, group_id, reason, banned_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          userId.toString(), message.from.username || '', message.from.first_name || '', 
          message.from.last_name || '', null, chatId.toString(), 
          violationsText, formatBeijingTime(), expiryText
        ).run();
        
        await notifyAdmins(telegram, db, env, chatId, message.from, [violationsText], null);
        break;
        
      case 'mute':
        // 禁言
        // 检查是否在白名单或是管理员
        const whitelistMute = await db.prepare(
          'SELECT * FROM whitelist WHERE user_id = ? AND (group_id IS NULL OR group_id = ?)'
        ).bind(userId.toString(), chatId.toString()).first();
        
        const userMute = await getUserWithPermissions(db, env, userId);
        
        // 如果是白名单或管理员，不禁言
        if (whitelistMute || userMute) {
          await addLog(db, 'moderation', 'skip_mute', `用户是白名单或管理员，跳过禁言`, userId.toString(), chatId.toString());
          break;
        }
        
        const muteUntil = Math.floor(Date.now() / 1000) + (group.mute_duration || 10) * 60;
        await telegram.request('restrictChatMember', {
          chat_id: chatId,
          user_id: userId,
          permissions: {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false
          },
          until_date: muteUntil
        });
        
        await addLog(db, 'moderation', 'user_muted', `用户被禁言 ${group.mute_duration}分钟: ${violationsText}`, userId.toString(), chatId.toString());
        break;
        
      case 'warn':
        // 警告用户
        try {
          await telegram.sendMessage(
            chatId,
            `⚠️ <b>警告</b>\n用户 ${message.from.first_name} 违反群规:\n${violationsText}`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {
          console.log('Failed to send warning message:', e.message);
        }
        break;
        
      default:
        // 仅删除消息
        break;
    }
    
  } catch (e) {
    console.error('Handle message violation error:', e);
    await addLog(db, 'error', 'moderation_failed', e.message, userId.toString(), chatId.toString());
  }
}

// 防刷屏检查
async function checkSpamProtection(telegram, db, env, group, message) {
  // 检查是否在白名单或是管理员
  const whitelist = await db.prepare(
    'SELECT * FROM whitelist WHERE user_id = ? AND (group_id IS NULL OR group_id = ?)'
  ).bind(message.from.id.toString(), message.chat.id.toString()).first();
  
  const user = await getUserWithPermissions(db, env, message.from.id);
  
  // 如果是白名单或管理员，跳过刷屏检查
  if (whitelist || user) {
    return;
  }
  
  // 简单示例：检查短时间内大量消息
  const recentMessages = await db.prepare(
    'SELECT COUNT(*) as count FROM logs WHERE user_id = ? AND group_id = ? AND type = ? AND created_at > datetime(?, ?)'
  ).bind(
    message.from.id.toString(),
    message.chat.id.toString(),
    'message',
    formatBeijingTime(new Date(Date.now() - 60000)), // 过去1分钟
    '-1 minute'
  ).first();
  
  if (recentMessages && recentMessages.count > 15) {
    // 如果1分钟内发送超过15条消息，视为刷屏
    await telegram.request('restrictChatMember', {
      chat_id: message.chat.id,
      user_id: message.from.id,
      permissions: {
        can_send_messages: false,
        can_send_media_messages: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false
      },
      until_date: Math.floor(Date.now() / 1000) + 300 // 禁言5分钟
    });
    
    await addLog(db, 'moderation', 'anti_spam', '用户因刷屏被禁言5分钟', message.from.id.toString(), message.chat.id.toString());
  }
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
    
    if (update.message) {
      // 处理命令（私聊和群聊）
      if (update.message.text && (update.message.text.startsWith('/') || update.message.chat.type === 'private')) {
        await handleCommand(telegram, db, env, update.message);
      }
      
      // 处理群组消息（检查违禁词）
      if (update.message.chat.type === 'group' || update.message.chat.type === 'supergroup') {
        await handleGroupMessage(telegram, db, env, update.message);
      }
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
  
  // 检查是否是管理员（包括超级管理员）
  const adminUser = await getUserWithPermissions(db, env, user.id);
  if (adminUser) {
    // 用户是管理员，直接批准入群申请
    await telegram.approveChatJoinRequest(chat.id, user.id);
    await addLog(db, 'join', 'approved', `管理员 ${user.first_name} (${user.id}) 直接通过入群申请`, user.id.toString(), chat.id.toString());
    return;
  }
  
  // 检查用户是否在白名单
  const whitelist = await db.prepare(
    'SELECT * FROM whitelist WHERE user_id = ? AND (group_id IS NULL OR group_id = ?)'
  ).bind(user.id.toString(), chat.id.toString()).first();
  if (whitelist) {
    // 用户在白名单，直接批准入群申请
    await telegram.approveChatJoinRequest(chat.id, user.id);
    await addLog(db, 'join', 'approved', `白名单用户 ${user.first_name} (${user.id}) 直接通过入群申请`, user.id.toString(), chat.id.toString());
    return;
  }
  
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
    
    await notifyAdmins(telegram, db, env, chat.id, user, checkResult.reasons, userInfo.photo_base64);
  }
}

async function handleCallbackQuery(telegram, db, env, query) {
  const [action, ...params] = query.data.split(':');
  
  if (action === 'recheck') {
    const [groupId, userId] = params;
    
    // 检查是否是管理员或白名单
    const adminUser = await getUserWithPermissions(db, env, userId);
    const whitelist = await db.prepare(
      'SELECT * FROM whitelist WHERE user_id = ? AND (group_id IS NULL OR group_id = ?)'
    ).bind(userId, groupId).first();
    
    if (adminUser || whitelist) {
      await telegram.unbanChatMember(groupId, userId);
      await db.prepare('UPDATE bans SET is_active = 0 WHERE user_id = ? AND group_id = ?').bind(userId, groupId).run();
      await telegram.answerCallbackQuery(query.id, '✅ 您是管理员/白名单，已解封！请重新申请加入群组。', true);
      await telegram.sendMessage(userId, '✅ 您已解封，请重新申请加入群组。');
      await addLog(db, 'ban', 'unban_admin_whitelist', `管理员/白名单用户重新检测通过`, userId, groupId);
      return;
    }
    
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
    
    // 检查操作者权限（需要 manage_bans 权限）
    const operator = await getUserWithPermissions(db, env, query.from.id);
    if (!operator || (!operator.is_super && !hasPermission(operator, CONFIG.PERMISSIONS.MANAGE_BANS, env))) {
      await telegram.answerCallbackQuery(query.id, '❌ 权限不足', true);
      return;
    }
    
    await telegram.unbanChatMember(groupId, userId);
    await db.prepare('UPDATE bans SET is_active = 0 WHERE user_id = ? AND group_id = ?').bind(userId, groupId).run();
    await telegram.answerCallbackQuery(query.id, '✅ 已解封用户', false);
    await addLog(db, 'ban', 'admin_unban', `管理员解封用户`, userId, groupId);
  } else if (action === 'whitelist') {
    const [groupId, userId] = params;
    
    // 检查操作者权限（需要 manage_whitelist 权限）
    const operator = await getUserWithPermissions(db, env, query.from.id);
    if (!operator || (!operator.is_super && !hasPermission(operator, CONFIG.PERMISSIONS.MANAGE_WHITELIST, env))) {
      await telegram.answerCallbackQuery(query.id, '❌ 权限不足', true);
      return;
    }
    
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
  
  const user = await getUserWithPermissions(db, env, userId);
  const isAdmin = !!user;
  
  if (text === '/start') {
    if (isAdmin) {
      const roleText = user.is_super ? '超级管理员' : '普通管理员';
      await telegram.sendMessage(chatId, 
        `🌟 <b>星霜Pro群组管理系统</b>\n\n` +
        `欢迎使用星霜Pro！\n\n` +
        `您的身份: <b>${roleText}</b>\n` +
        `可用命令：\n` +
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
      const roleText = user.is_super ? '超级管理员' : '普通管理员';
      await telegram.sendMessage(chatId, 
        `📖 <b>星霜Pro 帮助文档</b>\n\n` +
        `<b>您的身份:</b> ${roleText}\n` +
        `<b>可用命令：</b>\n` +
        `/start - 开始使用\n` +
        `/panel - 打开Web管理面板\n` +
        `/status - 查看系统状态\n` +
        `/help - 显示此帮助\n\n` +
        `<b>权限说明：</b>\n` +
        (user.is_super ? '• 拥有所有权限，可以管理系统所有功能\n' : '') +
        (!user.is_super ? '• 您的权限由超级管理员设置\n' : '') +
        `• 具体权限请查看管理面板\n\n` +
        `<b>功能说明：</b>\n` +
        `• 自动审核入群申请\n` +
        `• 检测用户头像、中文名、违禁词\n` +
        `• 自动封禁不合规用户\n` +
        `• 支持白名单管理\n` +
        `• 支持多群组管理\n` +
        `• 封禁通知推送\n` +
        `• 群内消息违禁词检测\n` +
        `• 违规消息自动处理\n\n` +
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

async function notifyAdmins(telegram, db, env, groupId, user, reasons, userPhoto) {
  const notifications = await db.prepare(
    'SELECT admin_id FROM notifications WHERE (group_id IS NULL OR group_id = ?) AND enabled = 1'
  ).bind(groupId.toString()).all();
  
  const group = await db.prepare('SELECT title FROM groups WHERE id = ?').bind(groupId.toString()).first();
  
  for (const { admin_id } of notifications.results) {
    try {
      const admin = await getUserWithPermissions(db, env, admin_id);
      // 检查管理员是否有查看封禁的权限
      if (!admin || (!admin.is_super && !hasPermission(admin, CONFIG.PERMISSIONS.VIEW_BANS, env))) {
        continue;
      }
      
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
                { 
                  text: '✅ 解封', 
                  callback_data: `unban:${groupId}:${user.id}`,
                  visible: admin.is_super || hasPermission(admin, CONFIG.PERMISSIONS.MANAGE_BANS, env)
                },
                { 
                  text: '📋 加入白名单', 
                  callback_data: `whitelist:${groupId}:${user.id}`,
                  visible: admin.is_super || hasPermission(admin, CONFIG.PERMISSIONS.MANAGE_WHITELIST, env)
                }
              ].filter(btn => btn.visible !== false)
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
    INSERT OR REPLACE INTO groups (id, title, username, photo_base64, created_at, updated_at, 
            anti_ad, check_messages, require_chinese_name, require_avatar, ban_duration, action_on_message, mute_duration)
    VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM groups WHERE id = ?), ?), ?, 
            COALESCE((SELECT anti_ad FROM groups WHERE id = ?), 1),
            COALESCE((SELECT check_messages FROM groups WHERE id = ?), 1),
            COALESCE((SELECT require_chinese_name FROM groups WHERE id = ?), 1),
            COALESCE((SELECT require_avatar FROM groups WHERE id = ?), 1),
            COALESCE((SELECT ban_duration FROM groups WHERE id = ?), '24h'),
            COALESCE((SELECT action_on_message FROM groups WHERE id = ?), 'delete'),
            COALESCE((SELECT mute_duration FROM groups WHERE id = ?), 10))
  `).bind(
    groupInfo.id, groupInfo.title, groupInfo.username, groupInfo.photo_base64,
    groupInfo.id, formatBeijingTime(), formatBeijingTime(),
    groupInfo.id, groupInfo.id, groupInfo.id, groupInfo.id, 
    groupInfo.id, groupInfo.id, groupInfo.id
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
      
      const admin = await getUserWithPermissions(db, env, user.id);
      if (!admin) {
        return jsonResponse({ error: '无管理员权限', code: 'NOT_ADMIN', userId: user.id }, 403);
      }
      
      const token = generateToken();
      const expiresAt = new Date(Date.now() + CONFIG.SESSION_DURATION).toISOString();
      
      await db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
        .bind(token, user.id.toString(), formatBeijingTime(), expiresAt).run();
      
      await addLog(db, 'auth', 'login', `管理员 ${user.first_name} (${user.id}) 登录`, user.id.toString());
      
      // 返回用户信息和权限
      return jsonResponse({ 
        token, 
        user: { ...user, is_super: admin.is_super },
        permissions: admin.permissions,
        is_super: admin.is_super,
        expiresAt 
      });
    } catch (e) {
      console.error('Auth error:', e);
      return jsonResponse({ error: '认证失败: ' + e.message, code: 'AUTH_ERROR' }, 500);
    }
  }
  
  // ========== 获取权限配置（公开接口） ==========
  if (path === '/api/permissions/config' && request.method === 'GET') {
    return jsonResponse({
      permissions: CONFIG.PERMISSIONS,
      permissionSets: CONFIG.DEFAULT_PERMISSION_SETS,
      permissionDescriptions: {
        manage_groups: '管理群组设置',
        view_groups: '查看群组信息',
        manage_bans: '管理封禁（解封、删除）',
        view_bans: '查看封禁记录',
        manage_whitelist: '管理白名单',
        view_whitelist: '查看白名单',
        manage_banwords: '管理违禁词',
        view_banwords: '查看违禁词',
        view_logs: '查看系统日志',
        manage_notifications: '管理通知设置',
        view_notifications: '查看通知设置',
        manage_admins: '管理其他管理员',
        manage_permissions: '管理权限',
        manage_system: '系统设置',
        view_system: '查看系统状态',
        manage_messages: '管理消息检查设置',
        view_messages: '查看消息日志'
      }
    });
  }
  
  // 其他 API 需要验证 token 和权限
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
  
  // 获取用户信息和权限
  const user = await getUserWithPermissions(db, env, session.user_id);
  if (!user) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return jsonResponse({ error: '管理员权限已被撤销' }, 403);
  }
  
  try {
    // ========== 系统状态 ==========
    if (path === '/api/stats') {
      const groups = await db.prepare('SELECT COUNT(*) as count FROM groups').first();
      const bans = await db.prepare('SELECT COUNT(*) as count FROM bans WHERE is_active = 1').first();
      const whitelist = await db.prepare('SELECT COUNT(*) as count FROM whitelist').first();
      const dbAdmins = await db.prepare('SELECT COUNT(*) as count FROM admins').first();
      const superAdmins = getSuperAdmins(env);
      const banWords = await db.prepare('SELECT COUNT(*) as count FROM ban_words').first();
      const logs = await db.prepare('SELECT COUNT(*) as count FROM logs').first();
      
      // 超级管理员数量
      const totalAdmins = (dbAdmins?.count || 0) + superAdmins.length;
      
      // 获取webhook信息，但只对超级管理员或有view_system权限的管理员
      let webhookInfo = null;
      if (user.is_super || hasPermission(user, CONFIG.PERMISSIONS.VIEW_SYSTEM, env)) {
        const webhookResult = await telegram.getWebhookInfo();
        if (webhookResult.ok) {
          webhookInfo = webhookResult.result;
        }
      }
      
      return jsonResponse({
        groups: groups?.count || 0,
        bans: bans?.count || 0,
        whitelist: whitelist?.count || 0,
        admins: totalAdmins,
        superAdminCount: superAdmins.length,
        dbAdminCount: dbAdmins?.count || 0,
        banWords: banWords?.count || 0,
        logs: logs?.count || 0,
        webhook: webhookInfo,
        user: {
          is_super: user.is_super,
          permissions: user.permissions
        }
      });
    }
    
    // ========== 获取当前用户信息 ==========
    if (path === '/api/me' && request.method === 'GET') {
      return jsonResponse({
        user_id: user.user_id,
        is_super: user.is_super,
        permissions: user.permissions,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        photo_base64: user.photo_base64
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
        // 需要 view_groups 权限
        if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.VIEW_GROUPS, env)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        const groups = await db.prepare('SELECT * FROM groups ORDER BY updated_at DESC').all();
        return jsonResponse(groups.results);
      }
      if (request.method === 'POST') {
        // 需要 manage_groups 权限
        if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.MANAGE_GROUPS, env)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        const { groupId } = await request.json();
        await syncGroup(telegram, db, groupId);
        await addLog(db, 'group', 'add', `手动添加群组 ${groupId}`, user.user_id);
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/groups/') && path.split('/').length === 4) {
      const groupId = path.split('/')[3];
      
      if (request.method === 'PUT') {
        // 需要 manage_groups 权限
        if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.MANAGE_GROUPS, env)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        const data = await request.json();
        await db.prepare(`
          UPDATE groups SET 
            anti_ad = ?, check_messages = ?, require_chinese_name = ?, 
            require_avatar = ?, ban_duration = ?, action_on_message = ?, mute_duration = ?, updated_at = ?
          WHERE id = ?
        `).bind(
          data.anti_ad ? 1 : 0, data.check_messages ? 1 : 0, data.require_chinese_name ? 1 : 0, 
          data.require_avatar ? 1 : 0, data.ban_duration, data.action_on_message || 'delete',
          data.mute_duration || 10, formatBeijingTime(), groupId
        ).run();
        await addLog(db, 'group', 'update', `更新群组设置 ${groupId}`, user.user_id);
        return jsonResponse({ success: true });
      }
      
      if (request.method === 'DELETE') {
        // 需要 manage_groups 权限
        if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.MANAGE_GROUPS, env)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        await db.prepare('DELETE FROM groups WHERE id = ?').bind(groupId).run();
        await addLog(db, 'group', 'delete', `删除群组 ${groupId}`, user.user_id);
        return jsonResponse({ success: true });
      }
    }
    
    // 刷新群组信息
    if (path.startsWith('/api/groups/') && path.endsWith('/refresh') && request.method === 'POST') {
      // 需要 manage_groups 权限
      if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.MANAGE_GROUPS, env)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      
      const groupId = path.split('/')[3];
      await syncGroup(telegram, db, groupId);
      return jsonResponse({ success: true });
    }
    
    // ========== 封禁管理 ==========
    if (path === '/api/bans') {
      const search = url.searchParams.get('search') || '';
      const groupId = url.searchParams.get('group_id');
      
      // 需要 view_bans 权限
      if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.VIEW_BANS, env)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      
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
      
      // 需要 manage_bans 权限
      if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.MANAGE_BANS, env)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      
      const ban = await db.prepare('SELECT * FROM bans WHERE id = ?').bind(banId).first();
      if (ban) {
        await telegram.unbanChatMember(ban.group_id, ban.user_id);
        await db.prepare('DELETE FROM bans WHERE id = ?').bind(banId).run();
        await addLog(db, 'ban', 'delete', `删除封禁记录`, ban.user_id, ban.group_id);
      }
      return jsonResponse({ success: true });
    }
    
    if (path === '/api/bans/unban' && request.method === 'POST') {
      // 需要 manage_bans 权限
      if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.MANAGE_BANS, env)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      
      const { groupId, userId } = await request.json();
      await telegram.unbanChatMember(groupId, userId);
      await db.prepare('UPDATE bans SET is_active = 0 WHERE user_id = ? AND group_id = ?').bind(userId, groupId).run();
      await addLog(db, 'ban', 'unban', `解封用户`, userId, groupId);
      return jsonResponse({ success: true });
    }
    
    // ========== 白名单管理 ==========
    if (path === '/api/whitelist') {
      if (request.method === 'GET') {
        // 需要 view_whitelist 权限
        if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.VIEW_WHITELIST, env)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
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
        // 需要 manage_whitelist 权限
        if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.MANAGE_WHITELIST, env)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        const data = await request.json();
        
        if (data.userIds) {
          const ids = data.userIds.split(/[\n,]/).map(id => id.trim()).filter(Boolean);
          for (const userId of ids) {
            const userInfo = await getUserInfoWithPhoto(telegram, db, userId);
            await db.prepare(
              'INSERT OR IGNORE INTO whitelist (user_id, username, first_name, last_name, photo_base64, group_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(userId, userInfo.username, userInfo.first_name, userInfo.last_name, userInfo.photo_base64, data.groupId || null, data.note || '', formatBeijingTime()).run();
          }
          await addLog(db, 'whitelist', 'batch_add', `批量添加 ${ids.length} 个用户`, user.user_id);
        } else {
          const userInfo = await getUserInfoWithPhoto(telegram, db, data.userId);
          await db.prepare(
            'INSERT OR REPLACE INTO whitelist (user_id, username, first_name, last_name, photo_base64, group_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            data.userId, userInfo.username || data.username || '', 
            userInfo.first_name || '', userInfo.last_name || '', userInfo.photo_base64,
            data.groupId || null, data.note || '', formatBeijingTime()
          ).run();
          await addLog(db, 'whitelist', 'add', `添加白名单用户 ${data.userId}`, user.user_id);
        }
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/whitelist/') && request.method === 'DELETE') {
      // 需要 manage_whitelist 权限
      if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.MANAGE_WHITELIST, env)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      
      const whitelistId = path.split('/')[3];
      await db.prepare('DELETE FROM whitelist WHERE id = ?').bind(whitelistId).run();
      await addLog(db, 'whitelist', 'delete', `删除白名单`, user.user_id);
      return jsonResponse({ success: true });
    }
    
    // ========== 管理员管理 ==========
    if (path === '/api/admins') {
      if (request.method === 'GET') {
        // 只有超级管理员可以查看所有管理员
        if (!user.is_super) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        const admins = await db.prepare('SELECT a.*, g.title as group_title FROM admins a LEFT JOIN groups g ON a.group_id = g.id ORDER BY a.created_at DESC').all();
        const superAdminIds = getSuperAdmins(env);
        
        // 获取超级管理员信息
        const superAdminInfos = [];
        for (const id of superAdminIds) {
          const info = await getUserInfoWithPhoto(telegram, db, id);
          superAdminInfos.push(info);
        }
        
        return jsonResponse({ 
          admins: admins.results, 
          superAdmins: superAdminInfos,
          permissionConfig: {
            permissions: CONFIG.PERMISSIONS,
            permissionSets: CONFIG.DEFAULT_PERMISSION_SETS
          }
        });
      }
      if (request.method === 'POST') {
        // 只有超级管理员可以添加管理员
        if (!user.is_super) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        const data = await request.json();
        const userInfo = await getUserInfoWithPhoto(telegram, db, data.userId);
        
        // 检查是否是超级管理员
        const superAdmins = getSuperAdmins(env);
        if (superAdmins.includes(data.userId.toString())) {
          return jsonResponse({ error: '不能添加超级管理员' }, 400);
        }
        
        // 设置默认权限
        let permissions = CONFIG.DEFAULT_PERMISSION_SETS.DEFAULT;
        if (data.permissions) {
          permissions = data.permissions;
        } else if (data.permissionSet && CONFIG.DEFAULT_PERMISSION_SETS[data.permissionSet]) {
          permissions = CONFIG.DEFAULT_PERMISSION_SETS[data.permissionSet];
        }
        
        await db.prepare(
          'INSERT OR REPLACE INTO admins (user_id, username, first_name, last_name, photo_base64, group_id, permissions, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          data.userId, userInfo.username, userInfo.first_name,
          userInfo.last_name, userInfo.photo_base64, data.groupId || null,
          JSON.stringify(permissions), data.note || '', formatBeijingTime()
        ).run();
        await addLog(db, 'admin', 'add', `添加管理员 ${data.userId}，权限: ${permissions.join(', ')}`, user.user_id);
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/admins/') && request.method === 'DELETE') {
      // 只有超级管理员可以删除管理员
      if (!user.is_super) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      
      const adminId = path.split('/')[3];
      const admin = await db.prepare('SELECT * FROM admins WHERE id = ?').bind(adminId).first();
      const superAdmins = getSuperAdmins(env);
      
      if (admin && superAdmins.includes(admin.user_id)) {
        return jsonResponse({ error: '不能删除超级管理员' }, 400);
      }
      
      await db.prepare('DELETE FROM admins WHERE id = ?').bind(adminId).run();
      await addLog(db, 'admin', 'delete', `删除管理员`, user.user_id);
      return jsonResponse({ success: true });
    }
    
    // 更新管理员权限
    if (path.startsWith('/api/admins/') && path.endsWith('/permissions') && request.method === 'PUT') {
      // 只有超级管理员可以修改权限
      if (!user.is_super) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      
      const adminId = path.split('/')[3];
      const data = await request.json();
      
      const admin = await db.prepare('SELECT * FROM admins WHERE id = ?').bind(adminId).first();
      if (!admin) {
        return jsonResponse({ error: '管理员不存在' }, 404);
      }
      
      // 检查是否是超级管理员
      const superAdmins = getSuperAdmins(env);
      if (superAdmins.includes(admin.user_id)) {
        return jsonResponse({ error: '不能修改超级管理员权限' }, 400);
      }
      
      await db.prepare('UPDATE admins SET permissions = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(data.permissions), formatBeijingTime(), adminId).run();
      
      await addLog(db, 'admin', 'update_permissions', `更新管理员权限: ${data.permissions.join(', ')}`, user.user_id);
      return jsonResponse({ success: true });
    }
    
    // ========== 通知设置 ==========
    if (path === '/api/notifications') {
      if (request.method === 'GET') {
        // 需要 view_notifications 权限
        if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.VIEW_NOTIFICATIONS, env)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        // 获取现有通知设置
        const notifications = await db.prepare(
          'SELECT n.*, g.title as group_title FROM notifications n LEFT JOIN groups g ON n.group_id = g.id ORDER BY n.created_at DESC'
        ).all();
        
        // 获取所有管理员ID（包括超级管理员和普通管理员）
        const admins = await db.prepare('SELECT * FROM admins ORDER BY created_at DESC').all();
        const superAdminIds = getSuperAdmins(env);
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
          notifications: notifications.results,
          currentAdmin: {
            id: user.user_id,
            is_super: user.is_super,
            permissions: user.permissions
          }
        });
      }
      if (request.method === 'POST') {
        // 需要 manage_notifications 权限
        if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.MANAGE_NOTIFICATIONS, env)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        const data = await request.json();
        
        // 普通管理员只能管理自己的通知设置
        if (!user.is_super && data.adminId !== user.user_id) {
          return jsonResponse({ error: '只能管理自己的通知设置' }, 403);
        }
        
        await db.prepare(
          'INSERT OR REPLACE INTO notifications (admin_id, group_id, enabled, created_at) VALUES (?, ?, ?, ?)'
        ).bind(data.adminId, data.groupId || null, data.enabled ? 1 : 0, formatBeijingTime()).run();
        await addLog(db, 'notification', 'update', `更新通知设置`, user.user_id);
        return jsonResponse({ success: true });
      }
    }
    
    // 修复：添加通知更新接口（用于开关操作）
    if (path.startsWith('/api/notifications/') && request.method === 'PUT') {
      // 需要 manage_notifications 权限
      if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.MANAGE_NOTIFICATIONS, env)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      
      const notifId = path.split('/')[3];
      const data = await request.json();
      
      // 检查通知设置是否存在
      const notification = await db.prepare('SELECT * FROM notifications WHERE id = ?').bind(notifId).first();
      if (!notification) {
        return jsonResponse({ error: '通知设置不存在' }, 404);
      }
      
      // 如果是普通管理员，检查是否是自己的设置
      if (!user.is_super && notification.admin_id !== user.user_id) {
        return jsonResponse({ error: '只能管理自己的通知设置' }, 403);
      }
      
      await db.prepare('UPDATE notifications SET enabled = ? WHERE id = ?').bind(data.enabled ? 1 : 0, notifId).run();
      await addLog(db, 'notification', 'update', `更新通知设置状态`, user.user_id);
      return jsonResponse({ success: true });
    }
    
    if (path.startsWith('/api/notifications/') && request.method === 'DELETE') {
      // 需要 manage_notifications 权限
      if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.MANAGE_NOTIFICATIONS, env)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      
      const notifId = path.split('/')[3];
      
      // 检查通知设置是否存在
      const notification = await db.prepare('SELECT * FROM notifications WHERE id = ?').bind(notifId).first();
      if (!notification) {
        return jsonResponse({ error: '通知设置不存在' }, 404);
      }
      
      // 如果是普通管理员，检查是否是自己的设置
      if (!user.is_super && notification.admin_id !== user.user_id) {
        return jsonResponse({ error: '只能管理自己的通知设置' }, 403);
      }
      
      await db.prepare('DELETE FROM notifications WHERE id = ?').bind(notifId).run();
      await addLog(db, 'notification', 'delete', `删除通知设置`, user.user_id);
      return jsonResponse({ success: true });
    }
    
    // ========== 违禁词管理 ==========
    if (path === '/api/banwords') {
      if (request.method === 'GET') {
        // 需要 view_banwords 权限
        if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.VIEW_BANWORDS, env)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        const words = await db.prepare('SELECT * FROM ban_words ORDER BY created_at DESC').all();
        return jsonResponse(words.results);
      }
      if (request.method === 'POST') {
        // 需要 manage_banwords 权限
        if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.MANAGE_BANWORDS, env)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        const data = await request.json();
        const scope = data.scope || 'all';

        if (data.words) {
          // 批量导入：格式支持 "word" 或 "word|scope"，每行一个
          const wordList = data.words.split(/\n/).map(w => w.trim()).filter(Boolean);
          let added = 0;
          for (const line of wordList) {
            const parts = line.split('|');
            const w = parts[0].trim();
            const s = parts[1] ? parts[1].trim() : scope;
            if (!w) continue;
            await db.prepare('INSERT OR IGNORE INTO ban_words (word, scope, created_at) VALUES (?, ?, ?)')
              .bind(w, s, formatBeijingTime()).run();
            added++;
          }
          await addLog(db, 'banword', 'batch_add', `批量添加 ${added} 个违禁词`, user.user_id);
        } else {
          await db.prepare('INSERT OR IGNORE INTO ban_words (word, scope, created_at) VALUES (?, ?, ?)')
            .bind(data.word, scope, formatBeijingTime()).run();
          await addLog(db, 'banword', 'add', `添加违禁词: ${data.word} (scope: ${scope})`, user.user_id);
        }
        return jsonResponse({ success: true });
      }
      // PUT：修改单个词的scope
      if (request.method === 'PUT') {
        if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.MANAGE_BANWORDS, env)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        const data = await request.json();
        if (!data.id || !data.scope) return jsonResponse({ error: '参数错误' }, 400);
        await db.prepare('UPDATE ban_words SET scope = ? WHERE id = ?').bind(data.scope, data.id).run();
        await addLog(db, 'banword', 'update_scope', `修改违禁词scope: id=${data.id} scope=${data.scope}`, user.user_id);
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/banwords/') && request.method === 'DELETE') {
      // 需要 manage_banwords 权限
      if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.MANAGE_BANWORDS, env)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      
      const wordId = path.split('/')[3];
      await db.prepare('DELETE FROM ban_words WHERE id = ?').bind(wordId).run();
      await addLog(db, 'banword', 'delete', `删除违禁词`, user.user_id);
      return jsonResponse({ success: true });
    }
    
    // ========== 日志管理 ==========
    if (path === '/api/logs') {
      // 需要 view_logs 权限
      if (!user.is_super && !hasPermission(user, CONFIG.PERMISSIONS.VIEW_LOGS, env)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }

      // DELETE：清除日志（仅超级管理员）
      if (request.method === 'DELETE') {
        if (!user.is_super) {
          return jsonResponse({ error: '权限不足，仅超级管理员可清除日志' }, 403);
        }
        const delType = url.searchParams.get('type');
        if (delType && delType !== 'all') {
          await db.prepare('DELETE FROM logs WHERE type = ?').bind(delType).run();
          await addLog(db, 'system', 'logs_cleared', `清除了类型为 [${delType}] 的日志`, user.user_id);
        } else {
          await db.prepare('DELETE FROM logs').run();
          await addLog(db, 'system', 'logs_cleared', '清除了全部日志', user.user_id);
        }
        return jsonResponse({ ok: true });
      }
      
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
      // 只有超级管理员可以设置Webhook
      if (!user.is_super) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      
      const data = await request.json();
      const result = await telegram.setWebhook(data.url, env.WEBHOOK_SECRET);
      await addLog(db, 'system', 'webhook_set', `设置Webhook: ${data.url}`, user.user_id);
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
    .btn-warning {
      background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
    }
    .btn-info {
      background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);
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
    .permission-tag {
      background: rgba(16, 185, 129, 0.2);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      display: inline-block;
      margin: 2px;
    }
    .permission-tag.disabled {
      background: rgba(239, 68, 68, 0.2);
      opacity: 0.6;
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
    .permission-checkbox {
      display: flex;
      align-items: center;
      padding: 8px;
      border-radius: 8px;
      margin-bottom: 4px;
      background: rgba(255, 255, 255, 0.03);
    }
    .permission-checkbox:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      margin-right: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .checkbox.checked {
      background: #667eea;
      border-color: #667eea;
    }
    .checkbox.checked::after {
      content: '✓';
      color: white;
      font-size: 12px;
      font-weight: bold;
    }
    .permission-group {
      margin-bottom: 16px;
      padding: 12px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
    }
    .permission-group-title {
      font-weight: bold;
      margin-bottom: 8px;
      color: #a78bfa;
    }
    .admin-only {
      opacity: 0.7;
      position: relative;
    }
    .admin-only::after {
      content: '👑';
      position: absolute;
      top: 2px;
      right: 2px;
      font-size: 10px;
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
          <div class="flex items-center gap-2">
            <span id="userRole" class="text-xs px-2 py-1 rounded bg-blue-500/20">加载中...</span>
            <button onclick="manualRefresh()" id="refreshBtn" class="p-2 rounded-lg glass hover:bg-white/10">🔄</button>
          </div>
        </header>
      </div>

      <!-- 标签页导航 -->
      <div class="tabs-container" id="tabsContainer">
        <!-- 标签页会根据权限动态生成 -->
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
    let tg = null;
    let permissionConfig = null;
    
    // ==================== 用户ID辅助函数 ====================
    function getCurrentUserId() {
        if (!currentUser) return null;
        // 优先使用 user_id，如果不存在则使用 id
        return currentUser.user_id || currentUser.id;
    }
    
    // ==================== 权限检查 ====================
    function checkPermission(permission) {
      if (!currentUser) return false;
      if (currentUser.is_super) return true;
      if (!currentUser.permissions) return false;
      return currentUser.permissions.includes(permission);
    }
    
    // ==================== 缓存系统 ====================
    const dataCache = {
      // 缓存结构: { data: any, timestamp: number, loading: boolean }
      stats: null,
      groups: null,
      bans: null,
      whitelist: null,
      admins: null,
      notifications: null,
      banwords: null,
      logs: null,
      
      // 缓存时间配置（毫秒）
      cacheTimes: {
        stats: 30000,     // 30秒
        groups: 30000,    // 30秒
        bans: 10000,      // 10秒
        whitelist: 30000, // 30秒
        admins: 60000,    // 60秒
        notifications: 60000, // 60秒
        banwords: 60000,  // 60秒
        logs: 5000        // 5秒
      },
      
      // 检查缓存是否有效
      isValid(cacheKey) {
        const cache = this[cacheKey];
        if (!cache || !cache.timestamp) return false;
        const cacheTime = this.cacheTimes[cacheKey] || 30000;
        return Date.now() - cache.timestamp < cacheTime;
      },
      
      // 获取缓存数据
      get(cacheKey) {
        if (this.isValid(cacheKey)) {
          return this[cacheKey].data;
        }
        return null;
      },
      
      // 设置缓存数据
      set(cacheKey, data) {
        this[cacheKey] = {
          data: data,
          timestamp: Date.now(),
          loading: false
        };
      },
      
      // 标记为正在加载
      setLoading(cacheKey, loading = true) {
        if (this[cacheKey]) {
          this[cacheKey].loading = loading;
        } else {
          this[cacheKey] = { loading: loading };
        }
      },
      
      // 检查是否正在加载
      isLoading(cacheKey) {
        return this[cacheKey] && this[cacheKey].loading === true;
      },
      
      // 清除特定缓存
      clear(cacheKey) {
        this[cacheKey] = null;
      },
      
      // 清除所有缓存
      clearAll() {
        Object.keys(this.cacheTimes).forEach(key => {
          this[key] = null;
        });
      },
      
      // 获取数据（带缓存逻辑）
      async fetch(cacheKey, apiPath, forceRefresh = false) {
        // 如果强制刷新或缓存无效，则重新获取
        if (forceRefresh || !this.isValid(cacheKey)) {
          this.setLoading(cacheKey, true);
          try {
            const data = await api(apiPath);
            if (data !== null) {
              this.set(cacheKey, data);
            }
            return data;
          } finally {
            this.setLoading(cacheKey, false);
          }
        }
        
        // 如果正在加载，等待一小段时间后重试
        if (this.isLoading(cacheKey)) {
          await new Promise(resolve => setTimeout(resolve, 100));
          return this.fetch(cacheKey, apiPath, false);
        }
        
        // 返回缓存数据
        return this.get(cacheKey);
      }
    };

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
        console.error('API Error:', e);
        showToast('网络错误，请重试', 'error');
        return null;
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
        // 先获取权限配置
        var config = await api('/permissions/config');
        if (config) {
          permissionConfig = config;
        }
        
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
          currentUser = {
            // 确保所有用户字段都被正确设置
            id: auth.user.id,
            user_id: auth.user.id.toString(), // 统一使用字符串格式
            username: auth.user.username,
            first_name: auth.user.first_name,
            last_name: auth.user.last_name,
            is_super: auth.is_super,
            permissions: auth.permissions
          };
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
        // 统一获取用户名
        var firstName = currentUser.first_name || '';
        var lastName = currentUser.last_name || '';
        var username = currentUser.username || '';
        var displayName = '';
        
        if (firstName || lastName) {
          displayName = (firstName + ' ' + lastName).trim();
        } else if (username) {
          displayName = username;
        } else {
          displayName = '管理员';
        }
        
        document.getElementById('currentUser').textContent = displayName ? '欢迎, ' + displayName : '群组管理系统';
        
        // 显示用户角色
        var roleText = currentUser.is_super ? '👑 超级管理员' : '👤 普通管理员';
        document.getElementById('userRole').textContent = roleText;
        if (currentUser.is_super) {
          document.getElementById('userRole').className = 'text-xs px-2 py-1 rounded bg-yellow-500/20';
        } else {
          document.getElementById('userRole').className = 'text-xs px-2 py-1 rounded bg-blue-500/20';
        }
      }
      
      // 根据权限动态生成标签页
      generateTabs();
      switchTab('dashboard');
    }

    // 生成标签页（根据权限）
    function generateTabs() {
      var tabsContainer = document.getElementById('tabsContainer');
      var html = '';
      
      // 控制面板（所有管理员都能访问）
      html += '<button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="dashboard" onclick="switchTab(\\'dashboard\\')">📊 控制面板</button>';
      
      // 群组管理
      if (checkPermission('view_groups')) {
        html += '<button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="groups" onclick="switchTab(\\'groups\\')">👥 群组管理</button>';
      }
      
      // 封禁管理
      if (checkPermission('view_bans')) {
        html += '<button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="bans" onclick="switchTab(\\'bans\\')">🚫 封禁管理</button>';
      }
      
      // 白名单
      if (checkPermission('view_whitelist')) {
        html += '<button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="whitelist" onclick="switchTab(\\'whitelist\\')">✅ 白名单</button>';
      }
      
      // 管理员管理（仅超级管理员）
      if (currentUser.is_super) {
        html += '<button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="admins" onclick="switchTab(\\'admins\\')">👑 管理员</button>';
      }
      
      // 通知设置
      if (checkPermission('view_notifications')) {
        html += '<button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="notifications" onclick="switchTab(\\'notifications\\')">🔔 通知设置</button>';
      }
      
      // 违禁词
      if (checkPermission('view_banwords')) {
        html += '<button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="banwords" onclick="switchTab(\\'banwords\\')">📝 违禁词</button>';
      }
      
      // 系统日志
      if (checkPermission('view_logs')) {
        html += '<button class="tab px-4 py-2 rounded-lg whitespace-nowrap glass" data-tab="logs" onclick="switchTab(\\'logs\\')">📋 系统日志</button>';
      }
      
      tabsContainer.innerHTML = html;
    }

    // ==================== 标签页切换 ====================
    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab').forEach(function(t) {
        t.classList.remove('tab-active');
        if (t.dataset.tab === tab) t.classList.add('tab-active');
      });
      loadTabContent();
    }

    async function loadTabContent() {
      var content = document.getElementById('content');
      
      // 显示加载状态
      content.innerHTML = '<div class="text-center py-10"><div class="loading-spinner"></div><div class="mt-2 text-gray-400">加载中...</div></div>';
      
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
        content.innerHTML = '<div class="text-center py-10 text-red-400">加载失败: ' + escapeHtml(e.message) + '</div>';
      }
    }

    // 手动刷新
    async function manualRefresh() {
      var btn = document.getElementById('refreshBtn');
      var originalHtml = btn.innerHTML;
      btn.innerHTML = '<div class="loading-spinner"></div>';
      
      // 清除当前标签页的缓存
      dataCache.clear(currentTab);
      if (currentTab === 'bans') dataCache.clear('groups');
      if (currentTab === 'whitelist') dataCache.clear('groups');
      if (currentTab === 'notifications') dataCache.clear('groups');
      
      await loadTabContent();
      
      btn.innerHTML = originalHtml;
      showToast('数据已刷新');
    }

    // ==================== 控制面板 ====================
    async function loadDashboard() {
      var stats = await dataCache.fetch('stats', '/stats');
      if (!stats) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">加载失败，请重试</div>';
        return;
      }
      
      var content = document.getElementById('content');
      
      // 显示当前用户权限
      var permissionsHtml = '';
      if (currentUser.permissions && currentUser.permissions.length > 0) {
        permissionsHtml = '<div class="mt-2"><div class="text-xs text-gray-400 mb-1">您的权限:</div><div class="flex flex-wrap gap-1">';
        currentUser.permissions.forEach(function(p) {
          permissionsHtml += '<span class="permission-tag">' + escapeHtml(p) + '</span>';
        });
        permissionsHtml += '</div></div>';
      }
      
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
        
        (currentUser.is_super ? 
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
          '</div>' : '') +
        
        '<div class="card p-4">' +
          '<h3 class="font-bold mb-3">⚙️ 快捷操作</h3>' +
          '<div class="grid grid-cols-2 gap-3">' +
            (checkPermission('view_groups') ? 
              '<button onclick="switchTab(\\'groups\\')" class="glass p-3 rounded-lg text-center hover:bg-white/10">' +
                '<div class="text-2xl mb-1">➕</div>' +
                '<div class="text-sm">' + (checkPermission('manage_groups') ? '管理群组' : '查看群组') + '</div>' +
              '</button>' : '') +
            (checkPermission('view_whitelist') ? 
              '<button onclick="switchTab(\\'whitelist\\')" class="glass p-3 rounded-lg text-center hover:bg-white/10">' +
                '<div class="text-2xl mb-1">📋</div>' +
                '<div class="text-sm">' + (checkPermission('manage_whitelist') ? '管理白名单' : '查看白名单') + '</div>' +
              '</button>' : '') +
            (checkPermission('view_banwords') ? 
              '<button onclick="switchTab(\\'banwords\\')" class="glass p-3 rounded-lg text-center hover:bg-white/10">' +
                '<div class="text-2xl mb-1">📝</div>' +
                '<div class="text-sm">' + (checkPermission('manage_banwords') ? '管理违禁词' : '查看违禁词') + '</div>' +
              '</button>' : '') +
            (checkPermission('view_logs') ? 
              '<button onclick="switchTab(\\'logs\\')" class="glass p-3 rounded-lg text-center hover:bg-white/10">' +
                '<div class="text-2xl mb-1">📊</div>' +
                '<div class="text-sm">查看日志</div>' +
              '</button>' : '') +
          '</div>' +
          permissionsHtml +
        '</div>';
    }

    // ==================== 群组管理 ====================
    async function loadGroups() {
      if (!checkPermission('view_groups')) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">权限不足</div>';
        return;
      }
      
      var groups = await dataCache.fetch('groups', '/groups');
      if (!groups) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">加载失败，请重试</div>';
        return;
      }
      
      var content = document.getElementById('content');
      
      var html = '<div class="flex justify-between items-center mb-4">' +
        '<h2 class="text-lg font-bold">群组管理</h2>';
      
      if (checkPermission('manage_groups')) {
        html += '<button onclick="showAddGroupModal()" class="btn-primary px-4 py-2 rounded-lg text-sm">➕ 添加群组</button>';
      }
      
      html += '</div><div class="space-y-3">';
      
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
              (checkPermission('manage_groups') ? 
                '<button onclick="refreshGroup(\\'' + g.id + '\\')" class="p-2 rounded-lg glass hover:bg-white/10 text-sm" title="刷新群组信息">🔄</button>' : '') +
            '</div>';
          
          if (checkPermission('manage_groups')) {
            html += '<div class="grid grid-cols-2 gap-2 text-sm mb-3">' +
              '<div class="flex justify-between items-center">' +
                '<span class="text-gray-400">防广告</span>' +
                '<div class="switch ' + (g.anti_ad ? 'on' : '') + '" onclick="toggleGroupSetting(\\'' + g.id + '\\', \\'anti_ad\\', ' + (!g.anti_ad) + ')"></div>' +
              '</div>' +
              '<div class="flex justify-between items-center">' +
                '<span class="text-gray-400">检查消息</span>' +
                '<div class="switch ' + (g.check_messages ? 'on' : '') + '" onclick="toggleGroupSetting(\\'' + g.id + '\\', \\'check_messages\\', ' + (!g.check_messages) + ')"></div>' +
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
              '<div class="flex justify-between items-center">' +
                '<span class="text-gray-400">违规处理</span>' +
                '<select onchange="updateMessageAction(\\'' + g.id + '\\', this.value)" class="px-2 py-1 rounded text-xs">' +
                  '<option value="delete"' + (g.action_on_message === 'delete' ? ' selected' : '') + '>仅删除</option>' +
                  '<option value="delete_ban"' + (g.action_on_message === 'delete_ban' ? ' selected' : '') + '>删除并封禁</option>' +
                  '<option value="mute"' + (g.action_on_message === 'mute' ? ' selected' : '') + '>删除并禁言</option>' +
                  '<option value="warn"' + (g.action_on_message === 'warn' ? ' selected' : '') + '>删除并警告</option>' +
                '</select>' +
              '</div>' +
              '<div class="flex justify-between items-center">' +
                '<span class="text-gray-400">禁言时长(分)</span>' +
                '<input type="number" value="' + (g.mute_duration || 10) + '" min="1" max="1440" onchange="updateMuteDuration(\\'' + g.id + '\\', this.value)" class="w-16 px-2 py-1 rounded text-xs">' +
              '</div>' +
            '</div>' +
            '<button onclick="deleteGroup(\\'' + g.id + '\\')" class="btn-danger w-full py-2 rounded-lg text-sm">删除群组</button>';
          }
          
          html += '</div>';
        }
      }
      
      html += '</div>';
      content.innerHTML = html;
    }

    async function refreshGroup(groupId) {
      if (!checkPermission('manage_groups')) {
        showToast('权限不足', 'error');
        return;
      }
      
      showToast('正在刷新...');
      await api('/groups/' + groupId + '/refresh', { method: 'POST' });
      dataCache.clear('groups');
      await loadGroups();
      showToast('群组信息已更新');
    }

    async function toggleGroupSetting(groupId, setting, value) {
      if (!checkPermission('manage_groups')) {
        showToast('权限不足', 'error');
        return;
      }
      
      var groups = dataCache.get('groups') || [];
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
        check_messages: group.check_messages,
        require_chinese_name: group.require_chinese_name,
        require_avatar: group.require_avatar,
        ban_duration: group.ban_duration,
        action_on_message: group.action_on_message,
        mute_duration: group.mute_duration
      };
      data[setting] = value ? 1 : 0;
      
      await api('/groups/' + groupId, { method: 'PUT', body: JSON.stringify(data) });
      showToast('设置已更新');
      dataCache.clear('groups');
      await loadGroups();
    }

    async function updateBanDuration(groupId, duration) {
      if (!checkPermission('manage_groups')) {
        showToast('权限不足', 'error');
        return;
      }
      
      var groups = dataCache.get('groups') || [];
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
          check_messages: group.check_messages,
          require_chinese_name: group.require_chinese_name,
          require_avatar: group.require_avatar,
          ban_duration: duration,
          action_on_message: group.action_on_message,
          mute_duration: group.mute_duration
        })
      });
      showToast('封禁时长已更新');
      dataCache.clear('groups');
      await loadGroups();
    }

    // 新增：更新消息处理方式
    async function updateMessageAction(groupId, action) {
      if (!checkPermission('manage_groups')) {
        showToast('权限不足', 'error');
        return;
      }
      
      var groups = dataCache.get('groups') || [];
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
          check_messages: group.check_messages,
          require_chinese_name: group.require_chinese_name,
          require_avatar: group.require_avatar,
          ban_duration: group.ban_duration,
          action_on_message: action,
          mute_duration: group.mute_duration
        })
      });
      showToast('消息处理方式已更新');
      dataCache.clear('groups');
      await loadGroups();
    }

    // 新增：更新禁言时长
    async function updateMuteDuration(groupId, duration) {
      if (!checkPermission('manage_groups')) {
        showToast('权限不足', 'error');
        return;
      }
      
      var durationNum = parseInt(duration);
      if (isNaN(durationNum) || durationNum < 1 || durationNum > 1440) {
        showToast('请输入1-1440之间的数字', 'error');
        return;
      }
      
      var groups = dataCache.get('groups') || [];
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
          check_messages: group.check_messages,
          require_chinese_name: group.require_chinese_name,
          require_avatar: group.require_avatar,
          ban_duration: group.ban_duration,
          action_on_message: group.action_on_message,
          mute_duration: durationNum
        })
      });
      showToast('禁言时长已更新');
      dataCache.clear('groups');
      await loadGroups();
    }

    async function deleteGroup(groupId) {
      if (!checkPermission('manage_groups')) {
        showToast('权限不足', 'error');
        return;
      }
      
      if (!confirm('确定要删除此群组吗？')) return;
      await api('/groups/' + groupId, { method: 'DELETE' });
      showToast('群组已删除');
      dataCache.clear('groups');
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
      if (!checkPermission('manage_groups')) {
        showToast('权限不足', 'error');
        return;
      }
      
      var groupId = document.getElementById('newGroupId').value.trim();
      if (!groupId) return showToast('请输入群组ID', 'error');
      
      var result = await api('/groups', { method: 'POST', body: JSON.stringify({ groupId: groupId }) });
      if (result && result.error) {
        showToast(result.error, 'error');
      } else if (result) {
        showToast('群组添加成功');
        closeModal();
        dataCache.clear('groups');
        await loadGroups();
      }
    }

    // ==================== 封禁管理 ====================
    async function loadBans() {
      if (!checkPermission('view_bans')) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">权限不足</div>';
        return;
      }
      
      var bans = await dataCache.fetch('bans', '/bans');
      if (!bans) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">加载失败，请重试</div>';
        return;
      }
      
      var groups = await dataCache.fetch('groups', '/groups') || [];
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
                (checkPermission('manage_bans') ? 
                  '<button onclick="unbanUser(\\'' + b.group_id + '\\', \\'' + b.user_id + '\\')" class="btn-success px-2 py-1 rounded text-xs">解封</button>' : '') +
                (checkPermission('manage_bans') ? 
                  '<button onclick="deleteBan(' + b.id + ')" class="btn-danger px-2 py-1 rounded text-xs">删除</button>' : '') +
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
      if (!checkPermission('view_bans')) return;
      
      var search = document.getElementById('banSearch').value;
      var groupId = document.getElementById('banGroupFilter').value;
      var bans = await api('/bans?search=' + encodeURIComponent(search) + '&group_id=' + groupId);
      if (!bans) return;
      var groups = dataCache.get('groups') || [];
      document.getElementById('bansList').innerHTML = renderBansList(bans, groups);
    }

    async function filterBans() {
      await searchBans();
    }

    async function unbanUser(groupId, userId) {
      if (!checkPermission('manage_bans')) {
        showToast('权限不足', 'error');
        return;
      }
      
      await api('/bans/unban', { method: 'POST', body: JSON.stringify({ groupId: groupId, userId: userId }) });
      showToast('用户已解封');
      dataCache.clear('bans');
      await loadBans();
    }

    async function deleteBan(banId) {
      if (!checkPermission('manage_bans')) {
        showToast('权限不足', 'error');
        return;
      }
      
      if (!confirm('确定要删除此封禁记录吗？')) return;
      await api('/bans/' + banId, { method: 'DELETE' });
      showToast('记录已删除');
      dataCache.clear('bans');
      await loadBans();
    }

    // ==================== 白名单管理 ====================
    async function loadWhitelist() {
      if (!checkPermission('view_whitelist')) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">权限不足</div>';
        return;
      }
      
      var whitelist = await dataCache.fetch('whitelist', '/whitelist');
      if (!whitelist) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">加载失败，请重试</div>';
        return;
      }
      
      var groups = await dataCache.fetch('groups', '/groups') || [];
      var content = document.getElementById('content');
      
      var html = '<div class="flex flex-col md:flex-row gap-4 mb-4">' +
        '<input type="text" id="whitelistSearch" placeholder="搜索..." class="flex-1 px-4 py-2 rounded-lg" onkeyup="debounceSearch(searchWhitelist)">';
      
      if (checkPermission('manage_whitelist')) {
        html += '<button onclick="showAddWhitelistModal()" class="btn-primary px-4 py-2 rounded-lg">➕ 添加</button>' +
                '<button onclick="showBatchImportModal()" class="btn-success px-4 py-2 rounded-lg">📥 批量导入</button>';
      }
      
      html += '</div><div id="whitelistList" class="grid gap-3 md:grid-cols-2">';
      
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
              (checkPermission('manage_whitelist') ? 
                '<button onclick="deleteWhitelist(' + w.id + ')" class="btn-danger p-2 rounded-lg text-sm">🗑️</button>' : '') +
            '</div>' +
          '</div>';
        }
      }
      
      html += '</div>';
      content.innerHTML = html;
    }

    async function searchWhitelist() {
      if (!checkPermission('view_whitelist')) return;
      
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
              (checkPermission('manage_whitelist') ? 
                '<button onclick="deleteWhitelist(' + w.id + ')" class="btn-danger p-2 rounded-lg text-sm">🗑️</button>' : '') +
            '</div>' +
          '</div>';
        }
      }
      document.getElementById('whitelistList').innerHTML = html;
    }

    function showAddWhitelistModal() {
      if (!checkPermission('manage_whitelist')) {
        showToast('权限不足', 'error');
        return;
      }
      
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
      if (!checkPermission('manage_whitelist')) {
        showToast('权限不足', 'error');
        return;
      }
      
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
      var groups = dataCache.get('groups') || [];
      var select = document.getElementById(selectId);
      if (!select) return;
      
      // 清除现有选项（除了第一个）
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        var option = document.createElement('option');
        option.value = g.id;
        option.textContent = g.title;
        select.appendChild(option);
      }
    }

    async function addWhitelist() {
      if (!checkPermission('manage_whitelist')) {
        showToast('权限不足', 'error');
        return;
      }
      
      var userId = document.getElementById('wlUserId').value.trim();
      var groupId = document.getElementById('wlGroupId').value;
      var note = document.getElementById('wlNote').value.trim();
      
      if (!userId) return showToast('请输入用户ID', 'error');
      
      await api('/whitelist', { method: 'POST', body: JSON.stringify({ userId: userId, groupId: groupId, note: note }) });
      showToast('添加成功');
      closeModal();
      dataCache.clear('whitelist');
      await loadWhitelist();
    }

    async function batchImportWhitelist() {
      if (!checkPermission('manage_whitelist')) {
        showToast('权限不足', 'error');
        return;
      }
      
      var userIds = document.getElementById('batchUserIds').value.trim();
      var groupId = document.getElementById('batchGroupId').value;
      var note = document.getElementById('batchNote').value.trim();
      
      if (!userIds) return showToast('请输入用户ID', 'error');
      
      showToast('正在导入...');
      await api('/whitelist', { method: 'POST', body: JSON.stringify({ userIds: userIds, groupId: groupId, note: note }) });
      showToast('导入成功');
      closeModal();
      dataCache.clear('whitelist');
      await loadWhitelist();
    }

    async function deleteWhitelist(id) {
      if (!checkPermission('manage_whitelist')) {
        showToast('权限不足', 'error');
        return;
      }
      
      if (!confirm('确定要删除吗？')) return;
      await api('/whitelist/' + id, { method: 'DELETE' });
      showToast('已删除');
      dataCache.clear('whitelist');
      await loadWhitelist();
    }

    // ==================== 管理员管理（仅超级管理员） ====================
    async function loadAdmins() {
      if (!currentUser.is_super) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">权限不足</div>';
        return;
      }
      
      var data = await dataCache.fetch('admins', '/admins');
      if (!data) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">加载失败，请重试</div>';
        return;
      }
      
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
          var permissions = a.permissions ? JSON.parse(a.permissions) : [];
          
          html += '<div class="glass p-3 rounded-lg">' +
            '<div class="flex justify-between items-start mb-2">' +
              '<div class="flex items-center gap-3">' +
                renderAvatar(a.photo_base64, aname) +
                '<div>' +
                  '<div class="font-medium">' + escapeHtml(aname) + '</div>' +
                  '<div class="text-xs text-gray-400">' +
                    (a.username ? '<span class="user-tag">@' + a.username + '</span> ' : '') +
                    'ID: ' + a.user_id +
                  '</div>' +
                  '<div class="text-xs text-gray-400">' + (a.group_title ? '群组: ' + escapeHtml(a.group_title) : '全局管理员') + '</div>' +
                  (a.note ? '<div class="text-xs text-blue-400">备注: ' + escapeHtml(a.note) + '</div>' : '') +
                '</div>' +
              '</div>' +
              '<button onclick="deleteAdmin(' + a.id + ')" class="btn-danger p-2 rounded-lg text-sm">🗑️</button>' +
            '</div>' +
            '<div class="text-xs">' +
              '<div class="text-gray-400 mb-1">权限:</div>' +
              '<div class="flex flex-wrap gap-1">';
          
          // 显示权限
          if (permissions.length > 0) {
            permissions.forEach(function(p) {
              html += '<span class="permission-tag">' + escapeHtml(p) + '</span>';
            });
          } else {
            html += '<span class="text-gray-500">无权限</span>';
          }
          
          html += '</div>' +
                '<button onclick="showEditPermissionsModal(' + a.id + ', \\'' + a.user_id + '\\', \\'' + encodeURIComponent(JSON.stringify(permissions)) + '\\')" class="text-xs text-blue-400 mt-2">编辑权限</button>' +
              '</div>' +
            '</div>';
        }
      }
      
      html += '</div></div>';
      content.innerHTML = html;
    }

    function showAddAdminModal() {
      if (!currentUser.is_super) {
        showToast('权限不足', 'error');
        return;
      }
      
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
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">备注</label>' +
            '<input type="text" id="adminNote" class="w-full px-4 py-2 rounded-lg">' +
          '</div>' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">权限预设</label>' +
            '<select id="adminPermissionSet" class="w-full px-4 py-2 rounded-lg" onchange="applyPermissionSet(this.value)">' +
              '<option value="">选择预设</option>' +
              '<option value="DEFAULT">默认权限</option>' +
              '<option value="GROUP_MANAGER">群组管理员</option>' +
              '<option value="REVIEWER">审核员</option>' +
              '<option value="VIEWER">观察员</option>' +
            '</select>' +
          '</div>' +
          '<div id="permissionsSelection"></div>' +
          '<button onclick="addAdmin()" class="btn-primary w-full py-2 rounded-lg">添加</button>' +
        '</div>'
      );
      
      loadGroupsForSelect('adminGroupId');
      loadPermissionsSelection();
    }

    function showEditPermissionsModal(adminId, userId, encodedPermissions) {
      if (!currentUser.is_super) {
        showToast('权限不足', 'error');
        return;
      }
      
      // 解码并解析权限
      var currentPermissions = [];
      if (encodedPermissions) {
        try {
          currentPermissions = JSON.parse(decodeURIComponent(encodedPermissions));
        } catch (e) {
          console.error('Parse permissions error:', e);
          currentPermissions = [];
        }
      }
      
      showModal(
        '<h3 class="text-lg font-bold mb-4">编辑权限</h3>' +
        '<div class="space-y-4">' +
          '<div class="text-sm text-gray-400">用户 ID: ' + userId + '</div>' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">权限预设</label>' +
            '<select id="editPermissionSet" class="w-full px-4 py-2 rounded-lg" onchange="applyEditPermissionSet(this.value)">' +
              '<option value="">选择预设</option>' +
              '<option value="DEFAULT">默认权限</option>' +
              '<option value="GROUP_MANAGER">群组管理员</option>' +
              '<option value="REVIEWER">审核员</option>' +
              '<option value="VIEWER">观察员</option>' +
            '</select>' +
          '</div>' +
          '<div id="editPermissionsSelection"></div>' +
          '<button onclick="updateAdminPermissions(' + adminId + ')" class="btn-primary w-full py-2 rounded-lg">保存权限</button>' +
        '</div>'
      );
      
      loadEditPermissionsSelection(currentPermissions);
    }

    function loadPermissionsSelection() {
      if (!permissionConfig) return;
      
      var container = document.getElementById('permissionsSelection');
      if (!container) return;
      
      container.innerHTML = '<div class="text-sm text-gray-400 mb-2">详细权限:</div>' + renderPermissionCheckboxes([], 'permission_');
    }

    function loadEditPermissionsSelection(currentPermissions) {
      if (!permissionConfig) return;
      
      var container = document.getElementById('editPermissionsSelection');
      if (!container) return;
      
      container.innerHTML = '<div class="text-sm text-gray-400 mb-2">详细权限:</div>' + renderPermissionCheckboxes(currentPermissions, 'edit_permission_');
    }

    function renderPermissionCheckboxes(selectedPermissions, prefix) {
      if (!permissionConfig) return '';
      
      var permissions = permissionConfig.permissions;
      var descriptions = permissionConfig.permissionDescriptions;
      
      // 分组权限
      var groups = {
        '群组管理': ['manage_groups', 'view_groups'],
        '封禁管理': ['manage_bans', 'view_bans'],
        '白名单管理': ['manage_whitelist', 'view_whitelist'],
        '违禁词管理': ['manage_banwords', 'view_banwords'],
        '通知管理': ['manage_notifications', 'view_notifications'],
        '日志查看': ['view_logs'],
        '消息管理': ['manage_messages', 'view_messages'],
        '管理员管理': ['manage_admins', 'manage_permissions'],
        '系统管理': ['manage_system', 'view_system']
      };
      
      var html = '';
      
      // 普通管理员不能拥有的权限（仅超级管理员）
      var superAdminOnly = ['manage_admins', 'manage_permissions', 'manage_system'];
      
      for (var groupName in groups) {
        var groupPermissions = groups[groupName];
        var hasPermissionsInGroup = groupPermissions.some(p => selectedPermissions.includes(p));
        
        html += '<div class="permission-group">' +
                  '<div class="permission-group-title">' + groupName + '</div>';
        
        groupPermissions.forEach(function(permission) {
          var isSuperOnly = superAdminOnly.includes(permission);
          var isChecked = selectedPermissions.includes(permission);
          var description = descriptions[permission] || permission;
          
          html += '<div class="permission-checkbox ' + (isSuperOnly ? 'admin-only' : '') + '">' +
                    '<div class="checkbox ' + (isChecked ? 'checked' : '') + '" onclick="toggleCheckbox(this)" data-permission="' + permission + '"></div>' +
                    '<div class="flex-1">' +
                      '<div class="text-sm">' + escapeHtml(description) + '</div>' +
                      '<div class="text-xs text-gray-400">' + permission + '</div>' +
                    '</div>' +
                    (isSuperOnly ? '<span class="text-xs text-yellow-400">超管</span>' : '') +
                  '</div>';
        });
        
        html += '</div>';
      }
      
      return html;
    }

    function toggleCheckbox(element) {
      var permission = element.dataset.permission;
      var isSuperOnly = ['manage_admins', 'manage_permissions', 'manage_system'].includes(permission);
      
      if (isSuperOnly && !currentUser.is_super) {
        showToast('仅超级管理员可分配此权限', 'error');
        return;
      }
      
      element.classList.toggle('checked');
    }

    function applyPermissionSet(setName) {
      if (!permissionConfig || !permissionConfig.permissionSets[setName]) return;
      
      var permissions = permissionConfig.permissionSets[setName];
      var checkboxes = document.querySelectorAll('#permissionsSelection .checkbox');
      
      checkboxes.forEach(function(checkbox) {
        var permission = checkbox.dataset.permission;
        if (permission && permissions.includes(permission)) {
          checkbox.classList.add('checked');
        } else {
          checkbox.classList.remove('checked');
        }
      });
    }

    function applyEditPermissionSet(setName) {
      if (!permissionConfig || !permissionConfig.permissionSets[setName]) return;
      
      var permissions = permissionConfig.permissionSets[setName];
      var checkboxes = document.querySelectorAll('#editPermissionsSelection .checkbox');
      
      checkboxes.forEach(function(checkbox) {
        var permission = checkbox.dataset.permission;
        if (permission && permissions.includes(permission)) {
          checkbox.classList.add('checked');
        } else {
          checkbox.classList.remove('checked');
        }
      });
    }

    function getSelectedPermissions(containerId) {
      var selected = [];
      var container = document.getElementById(containerId);
      if (!container) return selected;
      
      var checkboxes = container.querySelectorAll('.checkbox.checked');
      checkboxes.forEach(function(checkbox) {
        var permission = checkbox.dataset.permission;
        if (permission) selected.push(permission);
      });
      return selected;
    }

    async function addAdmin() {
      if (!currentUser.is_super) {
        showToast('权限不足', 'error');
        return;
      }
      
      var userId = document.getElementById('adminUserId').value.trim();
      var groupId = document.getElementById('adminGroupId').value;
      var note = document.getElementById('adminNote').value.trim();
      
      if (!userId) return showToast('请输入用户ID', 'error');
      
      // 获取选择的权限
      var permissions = getSelectedPermissions('permissionsSelection');
      
      await api('/admins', { 
        method: 'POST', 
        body: JSON.stringify({ 
          userId: userId, 
          groupId: groupId, 
          note: note,
          permissions: permissions
        }) 
      });
      showToast('添加成功');
      closeModal();
      dataCache.clear('admins');
      await loadAdmins();
    }

    async function updateAdminPermissions(adminId) {
      if (!currentUser.is_super) {
        showToast('权限不足', 'error');
        return;
      }
      
      // 获取选择的权限
      var permissions = getSelectedPermissions('editPermissionsSelection');
      
      await api('/admins/' + adminId + '/permissions', { 
        method: 'PUT', 
        body: JSON.stringify({ permissions: permissions }) 
      });
      showToast('权限更新成功');
      closeModal();
      dataCache.clear('admins');
      await loadAdmins();
    }

    async function deleteAdmin(id) {
      if (!currentUser.is_super) {
        showToast('权限不足', 'error');
        return;
      }
      
      if (!confirm('确定要删除此管理员吗？')) return;
      var result = await api('/admins/' + id, { method: 'DELETE' });
      if (result && result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('已删除');
        dataCache.clear('admins');
        await loadAdmins();
      }
    }

    // ==================== 通知设置 ====================
    async function loadNotifications() {
      if (!checkPermission('view_notifications')) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">权限不足</div>';
        return;
      }
      
      var data = await dataCache.fetch('notifications', '/notifications');
      if (!data) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">加载失败，请重试</div>';
        return;
      }
      
      var groups = await dataCache.fetch('groups', '/groups') || [];
      var content = document.getElementById('content');
      
      var html = '<div class="mb-4">' +
        '<h2 class="text-lg font-bold">通知设置</h2>' +
        '<p class="text-sm text-gray-400">管理封禁通知推送设置</p>' +
      '</div>' +
      
      '<div class="card p-4 mb-4">' +
        '<h3 class="font-bold mb-3">📢 全局通知（所有群组）</h3>' +
        '<div class="space-y-2">';
      
      if (data.admins && data.admins.length > 0) {
        for (var i = 0; i < data.admins.length; i++) {
          var admin = data.admins[i];
          var name = ((admin.first_name || '') + ' ' + (admin.last_name || '')).trim() || '管理员';
          var canToggle = currentUser.is_super || admin.user_id === getCurrentUserId();
          
          html += '<div class="glass p-3 rounded-lg flex items-center justify-between">' +
            '<div class="flex items-center gap-3">' +
              renderAvatar(admin.photo_base64, name) +
              '<div>' +
                '<div class="font-medium">' + escapeHtml(name) + 
                  (admin.is_super ? ' <span class="text-xs text-yellow-400">(超管)</span>' : '') +
                  (admin.user_id === getCurrentUserId() ? ' <span class="text-xs text-blue-400">(我)</span>' : '') +
                '</div>' +
                '<div class="text-xs text-gray-400">' +
                  (admin.username ? '<span class="user-tag">@' + admin.username + '</span> ' : '') +
                  'ID: ' + admin.user_id +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="switch ' + (admin.enabled ? 'on' : '') + (canToggle ? '' : ' opacity-50 cursor-not-allowed') + '" onclick="' + (canToggle ? 'toggleAdminNotification(\\'' + admin.user_id + '\\', ' + (!admin.enabled) + ', ' + (admin.notification_id || 'null') + ')' : '') + '"></div>' +
          '</div>';
        }
      } else {
        html += '<div class="text-gray-400">暂无管理员</div>';
      }
      
      html += '</div></div>';
      
      // 群组特定通知
      html += '<div class="card p-4">' +
        '<h3 class="font-bold mb-3">🎯 群组专属通知</h3>' +
        '<p class="text-xs text-gray-400 mb-3">为特定群组单独设置通知接收人</p>';
      
      // 修复：检查是否有 manage_notifications 权限（不仅是超级管理员）
      if (currentUser.is_super || checkPermission('manage_notifications')) {
        html += '<button onclick="showAddGroupNotificationModal()" class="btn-primary px-4 py-2 rounded-lg text-sm mb-3">➕ 添加群组通知</button>';
      }
      
      html += '<div class="space-y-2">';
      
      var groupNotifs = [];
      for (var j = 0; j < (data.notifications || []).length; j++) {
        if (data.notifications[j].group_id) {
          groupNotifs.push(data.notifications[j]);
        }
      }
      
      if (groupNotifs.length === 0) {
        html += '<div class="text-gray-400 text-sm">暂无群组专属通知设置</div>';
      } else {
        for (var k = 0; k < groupNotifs.length; k++) {
          var n = groupNotifs[k];
          var canToggle = currentUser.is_super || n.admin_id === getCurrentUserId();
          
          html += '<div class="glass p-3 rounded-lg flex items-center justify-between">' +
            '<div>' +
              '<div class="font-medium">管理员 ID: ' + n.admin_id + 
                (n.admin_id === getCurrentUserId() ? ' <span class="text-xs text-blue-400">(我)</span>' : '') +
              '</div>' +
              '<div class="text-xs text-gray-400">群组: ' + escapeHtml(n.group_title || n.group_id) + '</div>' +
            '</div>' +
            '<div class="flex items-center gap-3">' +
              '<div class="switch ' + (n.enabled ? 'on' : '') + (canToggle ? '' : ' opacity-50 cursor-not-allowed') + '" onclick="' + (canToggle ? 'toggleNotification(' + n.id + ', ' + (!n.enabled) + ')' : '') + '"></div>' +
              (canToggle ? 
                '<button onclick="deleteNotification(' + n.id + ')" class="btn-danger p-2 rounded-lg text-sm">🗑️</button>' : 
                '<span class="text-xs text-gray-500 p-2">只读</span>') +
            '</div>' +
          '</div>';
        }
      }
      
      html += '</div></div>';
      
      content.innerHTML = html;
    }

    // 修复：showAddGroupNotificationModal 函数，支持普通管理员
    function showAddGroupNotificationModal() {
      // 检查权限
      if (!currentUser.is_super && !checkPermission('manage_notifications')) {
        showToast('权限不足', 'error');
        return;
      }
      
      var modalContent = '<h3 class="text-lg font-bold mb-4">添加群组专属通知</h3>' +
        '<div class="space-y-4">';
      
      // 如果是超级管理员，可以指定任意管理员
      if (currentUser.is_super) {
        modalContent += 
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">管理员 ID</label>' +
            '<input type="text" id="notifAdminId" class="w-full px-4 py-2 rounded-lg">' +
          '</div>';
      } else {
        // 普通管理员只能添加自己的通知，显示当前用户信息
        modalContent += 
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">管理员</label>' +
            '<div class="glass p-3 rounded-lg">' +
              renderUserInfo(currentUser, false) +
            '</div>' +
            '<input type="hidden" id="notifAdminId" value="' + getCurrentUserId() + '">' +
          '</div>';
      }
      
      modalContent += 
        '<div>' +
          '<label class="block text-sm text-gray-400 mb-1">群组</label>' +
          '<select id="notifGroupId" class="w-full px-4 py-2 rounded-lg">' +
          '</select>' +
        '</div>' +
        '<button onclick="addGroupNotification()" class="btn-primary w-full py-2 rounded-lg">添加</button>' +
      '</div>';
      
      showModal(modalContent);
      
      var groups = dataCache.get('groups') || [];
      var select = document.getElementById('notifGroupId');
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        var option = document.createElement('option');
        option.value = g.id;
        option.textContent = g.title;
        select.appendChild(option);
      }
    }

    // 修复开关问题
    // 修改 toggleAdminNotification 函数，使用更新接口而不是每次都创建新记录
    async function toggleAdminNotification(adminId, enabled, notifId) {
      // 如果是普通管理员，检查是否是自己的通知
      if (!currentUser.is_super && adminId !== getCurrentUserId()) {
        showToast('只能管理自己的通知设置', 'error');
        return;
      }
      
      // 修复：如果有 notification_id，使用更新接口；否则使用创建接口
      var result;
      if (notifId) {
        // 使用更新接口
        result = await api('/notifications/' + notifId, {
          method: 'PUT',
          body: JSON.stringify({ enabled: enabled })
        });
      } else {
        // 使用创建接口
        result = await api('/notifications', {
          method: 'POST',
          body: JSON.stringify({ adminId: adminId, groupId: null, enabled: enabled })
        });
      }
      
      if (result && result.error) {
        showToast(result.error, 'error');
      } else {
        showToast(enabled ? '通知已开启' : '通知已关闭');
        dataCache.clear('notifications');
        await loadNotifications();
      }
    }

    async function toggleNotification(id, enabled) {
      // 获取通知详情
      var data = dataCache.get('notifications');
      if (!data) {
        showToast('数据加载失败，请刷新重试', 'error');
        return;
      }
      
      // 查找通知
      var notification = null;
      for (var i = 0; i < data.notifications.length; i++) {
        if (data.notifications[i].id == id) {
          notification = data.notifications[i];
          break;
        }
      }
      
      if (!notification) {
        showToast('通知设置不存在', 'error');
        return;
      }
      
      // 检查权限：普通管理员只能管理自己的通知
      if (!currentUser.is_super && notification.admin_id !== getCurrentUserId()) {
        showToast('只能管理自己的通知设置', 'error');
        return;
      }
      
      var result = await api('/notifications/' + id, { method: 'PUT', body: JSON.stringify({ enabled: enabled }) });
      if (result && result.error) {
        showToast(result.error, 'error');
      } else {
        showToast(enabled ? '通知已开启' : '通知已关闭');
        dataCache.clear('notifications');
        await loadNotifications();
      }
    }

    // 修复：addGroupNotification 函数，支持权限检查
    async function addGroupNotification() {
      // 检查权限
      if (!currentUser.is_super && !checkPermission('manage_notifications')) {
        showToast('权限不足', 'error');
        return;
      }
      
      var adminId = document.getElementById('notifAdminId').value.trim();
      var groupId = document.getElementById('notifGroupId').value;
      
      if (!adminId) return showToast('请输入管理员ID', 'error');
      if (!groupId) return showToast('请选择群组', 'error');
      
      // 普通管理员只能添加自己的通知
      if (!currentUser.is_super && adminId !== getCurrentUserId()) {
        showToast('只能添加自己的通知设置', 'error');
        return;
      }
      
      var result = await api('/notifications', { 
        method: 'POST', 
        body: JSON.stringify({ 
          adminId: adminId, 
          groupId: groupId, 
          enabled: true 
        }) 
      });
      
      if (result && result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('添加成功');
        closeModal();
        dataCache.clear('notifications');
        await loadNotifications();
      }
    }

    async function deleteNotification(id) {
      // 获取通知详情
      var data = dataCache.get('notifications');
      if (!data) {
        showToast('数据加载失败，请刷新重试', 'error');
        return;
      }
      
      // 查找通知
      var notification = null;
      for (var i = 0; i < data.notifications.length; i++) {
        if (data.notifications[i].id == id) {
          notification = data.notifications[i];
          break;
        }
      }
      
      if (!notification) {
        showToast('通知设置不存在', 'error');
        return;
      }
      
      // 检查权限：普通管理员只能删除自己的通知
      if (!currentUser.is_super && notification.admin_id !== getCurrentUserId()) {
        showToast('只能删除自己的通知设置', 'error');
        return;
      }
      
      if (!confirm('确定要删除吗？')) return;
      
      var result = await api('/notifications/' + id, { method: 'DELETE' });
      if (result && result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('已删除');
        dataCache.clear('notifications');
        await loadNotifications();
      }
    }

    // ==================== 违禁词管理 ====================
    var SCOPE_CONFIG = {
      'all':              { label: '全局',    color: 'text-red-400',    bg: 'bg-red-500',    desc: '所有方向均拦截' },
      'profile_name':     { label: '昵称',    color: 'text-blue-400',   bg: 'bg-blue-500',   desc: '用户昵称（入群检测）' },
      'profile_username': { label: '@用户名', color: 'text-cyan-400',   bg: 'bg-cyan-500',   desc: '用户@名（入群检测）' },
      'profile_bio':      { label: '简介',    color: 'text-purple-400', bg: 'bg-purple-500', desc: '用户简介（入群检测）' },
      'msg_text':         { label: '消息',    color: 'text-green-400',  bg: 'bg-green-500',  desc: '消息正文（群内发言）' },
      'msg_quote':        { label: '引用',    color: 'text-yellow-400', bg: 'bg-yellow-500', desc: '引用/被回复内容' },
      'msg_forward':      { label: '转发',    color: 'text-orange-400', bg: 'bg-orange-500', desc: '转发/外部引用来源' }
    };

    var SCOPE_GROUPS = [
      { key: 'all',     label: '全部',      filter: null },
      { key: 'global',  label: '🔴 全局拦截', filter: function(s) { return s === 'all'; } },
      { key: 'profile', label: '👤 用户资料', filter: function(s) { return s !== 'all' && s.includes('profile') && !s.includes('msg'); } },
      { key: 'message', label: '💬 消息内容', filter: function(s) { return s !== 'all' && s.includes('msg') && !s.includes('profile'); } },
      { key: 'mixed',   label: '🔀 混合',    filter: function(s) { return s !== 'all' && s.includes('profile') && s.includes('msg'); } }
    ];

    var currentBanwordGroup = 'all';

    function getScopeBadges(scope) {
      var scopes = (scope || 'all').split(',').map(function(s) { return s.trim(); });
      var html = '';
      for (var i = 0; i < scopes.length; i++) {
        var cfg = SCOPE_CONFIG[scopes[i]];
        if (cfg) {
          html += '<span class="text-xs px-1.5 py-0.5 rounded ' + cfg.bg + ' bg-opacity-20 ' + cfg.color + '">' + cfg.label + '</span>';
        }
      }
      return html;
    }

    function getScopeSelectHtml(selectedScope) {
      selectedScope = selectedScope || 'all';
      var selectedScopes = selectedScope.split(',').map(function(s) { return s.trim(); });
      var html = '<div class="space-y-2">';
      var keys = Object.keys(SCOPE_CONFIG);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var cfg = SCOPE_CONFIG[k];
        var checked = selectedScopes.includes(k) || selectedScope === 'all' && k === 'all';
        html += '<label class="flex items-center gap-2 cursor-pointer">' +
          '<input type="checkbox" class="scope-checkbox" value="' + k + '"' + (checked ? ' checked' : '') + '>' +
          '<span class="text-xs px-1.5 py-0.5 rounded ' + cfg.bg + ' bg-opacity-20 ' + cfg.color + '">' + cfg.label + '</span>' +
          '<span class="text-sm text-gray-400">' + cfg.desc + '</span>' +
        '</label>';
      }
      html += '</div>';
      return html;
    }

    function collectScopeValue() {
      var checkboxes = document.querySelectorAll('.scope-checkbox:checked');
      var vals = [];
      for (var i = 0; i < checkboxes.length; i++) {
        vals.push(checkboxes[i].value);
      }
      if (vals.length === 0 || vals.includes('all')) return 'all';
      return vals.join(',');
    }

    async function loadBanwords() {
      if (!checkPermission('view_banwords')) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">权限不足</div>';
        return;
      }

      var banwords = await dataCache.fetch('banwords', '/banwords');
      if (!banwords) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">加载失败，请重试</div>';
        return;
      }

      var content = document.getElementById('content');

      var html = '<div class="flex flex-col md:flex-row gap-4 mb-4">';
      if (checkPermission('manage_banwords')) {
        html += '<button onclick="showAddBanwordModal()" class="btn-primary px-4 py-2 rounded-lg">➕ 添加违禁词</button>' +
                '<button onclick="showBatchBanwordModal()" class="btn-success px-4 py-2 rounded-lg">📥 批量导入</button>' +
                '<button onclick="exportBanwords()" class="glass px-4 py-2 rounded-lg hover:bg-white/10">📤 导出</button>';
      }
      html += '</div>';

      html += '<div class="flex gap-2 overflow-x-auto pb-2 mb-4">';
      for (var gi = 0; gi < SCOPE_GROUPS.length; gi++) {
        var g = SCOPE_GROUPS[gi];
        var count = 0;
        if (g.filter === null) {
          count = banwords.length;
        } else {
          for (var bi = 0; bi < banwords.length; bi++) {
            var ws = (banwords[bi].scope || 'all');
            if (g.filter(ws)) count++;
          }
        }
        html += '<button class="banword-group-btn px-3 py-1 rounded-full text-sm whitespace-nowrap glass ' +
          (g.key === currentBanwordGroup ? 'tab-active' : '') +
          '" data-group="' + g.key + '" onclick="filterBanwordGroup(\\'' + g.key + '\\')">' +
          g.label + ' <span class="text-xs opacity-60">(' + count + ')</span></button>';
      }
      html += '</div>';

      html += '<div id="banwordsList">' + renderBanwords(banwords, currentBanwordGroup) + '</div>';
      content.innerHTML = html;
    }

    function renderBanwords(banwords, groupKey) {
      var group = null;
      for (var gi = 0; gi < SCOPE_GROUPS.length; gi++) {
        if (SCOPE_GROUPS[gi].key === groupKey) { group = SCOPE_GROUPS[gi]; break; }
      }
      var filtered = [];
      for (var i = 0; i < banwords.length; i++) {
        var ws = (banwords[i].scope || 'all');
        if (!group || group.filter === null || group.filter(ws)) {
          filtered.push(banwords[i]);
        }
      }

      if (filtered.length === 0) {
        return '<div class="card p-4 text-center text-gray-400">该分组暂无违禁词</div>';
      }

      var grouped = {};
      for (var i = 0; i < filtered.length; i++) {
        var s = filtered[i].scope || 'all';
        if (!grouped[s]) grouped[s] = [];
        grouped[s].push(filtered[i]);
      }

      // 排序：all优先，然后按scope字符串排序
      var scopeKeys = Object.keys(grouped).sort(function(a, b) {
        if (a === 'all') return -1;
        if (b === 'all') return 1;
        return a.localeCompare(b);
      });

      var html = '';
      for (var si = 0; si < scopeKeys.length; si++) {
        var sk = scopeKeys[si];
        var words = grouped[sk];
        html += '<div class="card p-4 mb-3">' +
          '<div class="flex items-center gap-2 mb-3">' +
            getScopeBadges(sk) +
            '<span class="text-xs text-gray-500">' + words.length + ' 个词</span>' +
          '</div>' +
          '<div class="flex flex-wrap gap-2">';
        for (var wi = 0; wi < words.length; wi++) {
          var w = words[wi];
          html += '<span class="glass px-3 py-1 rounded-full text-sm flex items-center gap-1">' +
            escapeHtml(w.word);
          if (checkPermission('manage_banwords')) {
            html += '<button onclick="showEditScopeModal(' + w.id + ',\\'' + (w.scope || 'all') + '\\')" class="text-gray-400 hover:text-blue-300 text-xs ml-1" title="修改范围">✎</button>' +
                    '<button onclick="deleteBanword(' + w.id + ')" class="text-red-400 hover:text-red-300 ml-0.5">×</button>';
          }
          html += '</span>';
        }
        html += '</div></div>';
      }
      return html;
    }

    async function filterBanwordGroup(groupKey) {
      currentBanwordGroup = groupKey;
      var btns = document.querySelectorAll('.banword-group-btn');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('tab-active');
        if (btns[i].dataset.group === groupKey) btns[i].classList.add('tab-active');
      }
      var banwords = dataCache.get('banwords') || await api('/banwords') || [];
      document.getElementById('banwordsList').innerHTML = renderBanwords(banwords, groupKey);
    }

    function showAddBanwordModal() {
      if (!checkPermission('manage_banwords')) { showToast('权限不足', 'error'); return; }
      showModal(
        '<h3 class="text-lg font-bold mb-4">添加违禁词</h3>' +
        '<div class="space-y-4">' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">违禁词</label>' +
            '<input type="text" id="newBanword" class="w-full px-4 py-2 rounded-lg" placeholder="输入违禁词">' +
          '</div>' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-2">检测范围（可多选）</label>' +
            getScopeSelectHtml('all') +
          '</div>' +
          '<button onclick="addBanword()" class="btn-primary w-full py-2 rounded-lg">添加</button>' +
        '</div>'
      );
    }

    function showBatchBanwordModal() {
      if (!checkPermission('manage_banwords')) { showToast('权限不足', 'error'); return; }
      showModal(
        '<h3 class="text-lg font-bold mb-4">批量导入违禁词</h3>' +
        '<div class="space-y-4">' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-1">违禁词列表（每行一个，支持 词|scope 格式）</label>' +
            '<textarea id="batchBanwords" rows="8" class="w-full px-4 py-2 rounded-lg" placeholder="例：&#10;约炮&#10;VPN|profile_name,profile_bio&#10;刷单|profile_bio,msg_text"></textarea>' +
          '</div>' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-2">未指定scope的词，默认使用：</label>' +
            getScopeSelectHtml('all') +
          '</div>' +
          '<button onclick="batchAddBanwords()" class="btn-primary w-full py-2 rounded-lg">导入</button>' +
        '</div>'
      );
    }

    function showEditScopeModal(id, currentScope) {
      if (!checkPermission('manage_banwords')) { showToast('权限不足', 'error'); return; }
      showModal(
        '<h3 class="text-lg font-bold mb-4">修改检测范围</h3>' +
        '<div class="space-y-4">' +
          '<div>' +
            '<label class="block text-sm text-gray-400 mb-2">检测范围（可多选）</label>' +
            getScopeSelectHtml(currentScope) +
          '</div>' +
          '<button onclick="updateBanwordScope(' + id + ')" class="btn-primary w-full py-2 rounded-lg">保存</button>' +
        '</div>'
      );
    }

    async function addBanword() {
      if (!checkPermission('manage_banwords')) { showToast('权限不足', 'error'); return; }
      var word = document.getElementById('newBanword').value.trim();
      if (!word) return showToast('请输入违禁词', 'error');
      var scope = collectScopeValue();
      var result = await api('/banwords', { method: 'POST', body: JSON.stringify({ word: word, scope: scope }) });
      if (result && result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('添加成功');
        closeModal();
        dataCache.clear('banwords');
        await loadBanwords();
      }
    }

    async function batchAddBanwords() {
      if (!checkPermission('manage_banwords')) { showToast('权限不足', 'error'); return; }
      var words = document.getElementById('batchBanwords').value.trim();
      if (!words) return showToast('请输入违禁词', 'error');
      var scope = collectScopeValue();
      var result = await api('/banwords', { method: 'POST', body: JSON.stringify({ words: words, scope: scope }) });
      if (result && result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('导入成功');
        closeModal();
        dataCache.clear('banwords');
        await loadBanwords();
      }
    }

    async function updateBanwordScope(id) {
      if (!checkPermission('manage_banwords')) { showToast('权限不足', 'error'); return; }
      var scope = collectScopeValue();
      var result = await api('/banwords', { method: 'PUT', body: JSON.stringify({ id: id, scope: scope }) });
      if (result && result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('已更新');
        closeModal();
        dataCache.clear('banwords');
        await loadBanwords();
      }
    }

    async function deleteBanword(id) {
      if (!checkPermission('manage_banwords')) { showToast('权限不足', 'error'); return; }
      if (!confirm('确定要删除吗？')) return;
      var result = await api('/banwords/' + id, { method: 'DELETE' });
      if (result && result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('已删除');
        dataCache.clear('banwords');
        await loadBanwords();
      }
    }

    async function exportBanwords() {
      var banwords = dataCache.get('banwords') || await api('/banwords') || [];
      var lines = [];
      for (var i = 0; i < banwords.length; i++) {
        var w = banwords[i];
        lines.push(w.scope && w.scope !== 'all' ? w.word + '|' + w.scope : w.word);
      }
      var text = lines.join(String.fromCharCode(10));
      await navigator.clipboard.writeText(text);
      showToast('已复制到剪贴板');
    }

    // ==================== 系统日志 ====================
    var currentLogType = 'all';

    async function loadLogs() {
      if (!checkPermission('view_logs')) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">权限不足</div>';
        return;
      }
      
      var logs = await dataCache.fetch('logs', '/logs');
      if (!logs) {
        document.getElementById('content').innerHTML = '<div class="text-center py-10 text-red-400">加载失败，请重试</div>';
        return;
      }
      
      var content = document.getElementById('content');
      
      var types = ['all', 'join', 'ban', 'whitelist', 'admin', 'notification', 'system', 'error', 'message', 'violation', 'moderation'];
      
      var html = '<div class="flex items-center justify-between mb-4">' +
        '<div class="flex gap-2 overflow-x-auto pb-2 flex-1 mr-3">';
      for (var i = 0; i < types.length; i++) {
        var t = types[i];
        html += '<button class="log-type-btn px-3 py-1 rounded-full text-sm whitespace-nowrap glass ' + 
          (t === 'all' ? 'tab-active' : '') + '" data-type="' + t + '" onclick="filterLogs(\\'' + t + '\\')">' +
          (t === 'all' ? '全部' : t) + '</button>';
      }
      html += '</div>';
      if (currentUser && currentUser.is_super) {
        html += '<button onclick="clearLogs()" class="px-3 py-1 rounded-lg text-sm whitespace-nowrap bg-red-500 bg-opacity-20 text-red-400 border border-red-500 border-opacity-30 hover:bg-opacity-40 transition-all flex-shrink-0">🗑 清除日志</button>';
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
        banword: 'text-pink-400',
        message: 'text-indigo-400',
        violation: 'text-rose-400',
        moderation: 'text-amber-400'
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
      if (!checkPermission('view_logs')) return;
      currentLogType = type;
      
      var btns = document.querySelectorAll('.log-type-btn');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('tab-active');
        if (btns[i].dataset.type === type) btns[i].classList.add('tab-active');
      }
      
      var logs = await api('/logs?type=' + type);
      if (!logs) return;
      document.getElementById('logsList').innerHTML = renderLogs(logs);
    }

    async function clearLogs() {
      if (!currentUser || !currentUser.is_super) {
        showToast('权限不足', 'error');
        return;
      }
      var typeLabel = currentLogType === 'all' ? '全部日志' : '[' + currentLogType + '] 类型日志';
      if (!confirm('确定要清除' + typeLabel + '吗？此操作不可恢复。')) return;
      
      var url = '/logs' + (currentLogType !== 'all' ? '?type=' + currentLogType : '');
      var result = await api(url, { method: 'DELETE' });
      if (result && result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('已清除' + typeLabel);
        dataCache.clear('logs');
        await loadLogs();
        // 如果之前筛选了某个类型，清除后重新切回该类型
        if (currentLogType !== 'all') {
          await filterLogs(currentLogType);
        }
      }
    }

    // ==================== Webhook 设置 ====================
    function showSetWebhookModal() {
      if (!currentUser.is_super) {
        showToast('权限不足', 'error');
        return;
      }
      
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
      if (!currentUser.is_super) {
        showToast('权限不足', 'error');
        return;
      }
      
      var url = document.getElementById('webhookUrl').value.trim();
      if (!url) return showToast('请输入 URL', 'error');
      
      var result = await api('/webhook', { method: 'POST', body: JSON.stringify({ url: url }) });
      if (result && result.ok) {
        showToast('Webhook 设置成功');
        closeModal();
        dataCache.clear('stats');
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