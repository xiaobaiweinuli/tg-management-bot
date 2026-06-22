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
  BAN_WORD_CACHE_DURATION: 60 * 1000,
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

const ALLOWED_SCOPES = new Set([
  'all',
  'profile_name',
  'profile_username',
  'profile_bio',
  'msg_text',
  'msg_quote',
  'msg_forward'
]);

const ALLOWED_BAN_DURATIONS = new Set(['1h', '24h', '7d', 'forever']);
const ALLOWED_MESSAGE_ACTIONS = new Set(['delete', 'delete_ban', 'mute', 'warn']);
const ALLOWED_MATCH_TYPES = new Set(['plain', 'regex']);
const MAX_API_LIMIT = 200;

let banWordsCache = {
  items: null,
  expiresAt: 0,
  loadingPromise: null
};

// ==================== 工具函数 ====================
function formatBeijingTime(date = new Date()) {
  return new Date(date).toLocaleString('zh-CN', { 
    timeZone: CONFIG.TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function nowIso(date = new Date()) {
  return new Date(date).toISOString();
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

function getD1Rows(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  return result.results || [];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeGroupId(groupId) {
  if (groupId === undefined || groupId === null || groupId === '') return null;
  return groupId.toString();
}

function normalizeId(value) {
  if (value === undefined || value === null) return null;
  const text = value.toString().trim();
  return /^-?\d{1,32}$/.test(text) ? text : null;
}

function parseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

function normalizePermissions(permissions) {
  const allowed = new Set(Object.values(CONFIG.PERMISSIONS));
  return parseJsonArray(permissions, permissions && Array.isArray(permissions) ? permissions : [])
    .filter(permission => allowed.has(permission));
}

function normalizeScope(scope) {
  const raw = (scope || 'all').toString().split(',').map(s => s.trim()).filter(Boolean);
  if (raw.length === 0 || raw.includes('all')) return 'all';
  const unique = [];
  for (const item of raw) {
    if (!ALLOWED_SCOPES.has(item)) return null;
    if (!unique.includes(item)) unique.push(item);
  }
  return unique.join(',');
}

function normalizeMatchType(matchType) {
  const value = (matchType || 'plain').toString();
  return ALLOWED_MATCH_TYPES.has(value) ? value : null;
}

function normalizeApiLimit(value, fallback = 100) {
  const limit = parseInt(value || fallback, 10);
  if (!Number.isFinite(limit) || limit < 1) return fallback;
  return Math.min(limit, MAX_API_LIMIT);
}

function parseDateParam(value, label, endOfDay = false) {
  if (!value) return { value: null, error: null };
  const text = value.toString().trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+08:00`
    : text;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) {
    return { value: null, error: `${label}格式错误` };
  }
  return { value: date.toISOString(), error: null };
}

function validateRegex(pattern) {
  try {
    new RegExp(pattern, 'i');
    return true;
  } catch (e) {
    return false;
  }
}

function invalidateBanWordsCache() {
  banWordsCache = { items: null, expiresAt: 0, loadingPromise: null };
}

// ==================== 新增工具函数 ====================
async function getBanWords(db, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && banWordsCache.items && banWordsCache.expiresAt > now) {
    return banWordsCache.items;
  }

  if (!forceRefresh && banWordsCache.loadingPromise) {
    return banWordsCache.loadingPromise;
  }

  banWordsCache.loadingPromise = (async () => {
    try {
      let rows;
      try {
        const result = await db.prepare('SELECT id, word, scope, match_type FROM ban_words ORDER BY id ASC').all();
        rows = getD1Rows(result);
      } catch (e) {
        const result = await db.prepare('SELECT id, word, scope FROM ban_words ORDER BY id ASC').all();
        rows = getD1Rows(result).map(item => ({ ...item, match_type: 'plain' }));
      }

      const items = rows.map(item => ({
        id: item.id,
        word: item.word || '',
        scope: normalizeScope(item.scope) || 'all',
        match_type: normalizeMatchType(item.match_type) || 'plain'
      })).filter(item => item.word);

      banWordsCache.items = items;
      banWordsCache.expiresAt = Date.now() + CONFIG.BAN_WORD_CACHE_DURATION;
      return items;
    } finally {
      banWordsCache.loadingPromise = null;
    }
  })();

  return banWordsCache.loadingPromise;
}

function scopeApplies(scope, scopeKey) {
  if (!scopeKey) return true;
  const scopes = (scope || 'all').split(',').map(s => s.trim());
  return scopes.includes('all') || scopes.includes(scopeKey);
}

function banWordMatches(text, banWord) {
  if (!text || !banWord?.word) return false;
  if (banWord.match_type === 'regex') {
    try {
      return new RegExp(banWord.word, 'i').test(text);
    } catch (e) {
      return false;
    }
  }
  return text.toLowerCase().includes(banWord.word.toLowerCase());
}

// 检查消息是否包含违禁词
// scopeKey: 当前检测方向，如 'msg_text'、'profile_bio' 等，传 null 则不过滤
async function checkMessageForBanWords(db, text, scopeKey) {
  if (!text) return { hasBanWord: false, words: [] };
  
  try {
    const banWords = await getBanWords(db);
    const foundWords = [];
    
    for (const item of banWords) {
      if (!scopeApplies(item.scope, scopeKey)) continue;
      if (banWordMatches(text, item)) {
        foundWords.push(item.word);
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

function hasGlobalAdminScope(user) {
  if (!user) return false;
  if (user.is_super) return true;
  return !!user.is_global_admin;
}

function getAccessibleGroupIds(user) {
  if (!user) return [];
  if (hasGlobalAdminScope(user)) return null;
  return user.group_ids || [];
}

function canAccessGroup(user, groupId) {
  if (!user) return false;
  if (hasGlobalAdminScope(user)) return true;
  const normalized = normalizeGroupId(groupId);
  if (!normalized) return false;
  return (user.group_ids || []).includes(normalized);
}

function recordHasPermission(record, permission) {
  return normalizePermissions(record.permissions).includes(permission);
}

function hasScopedPermission(user, permission, groupId = null) {
  if (!user) return false;
  if (user.is_super) return true;
  const records = user.admin_records || [];
  const normalizedGroupId = normalizeGroupId(groupId);

  if (!normalizedGroupId) {
    return records.some(record => recordHasPermission(record, permission));
  }

  return records.some(record => {
    const recordGroupId = normalizeGroupId(record.group_id);
    return (!recordGroupId || recordGroupId === normalizedGroupId) && recordHasPermission(record, permission);
  });
}

function appendGroupScope(query, params, columnName, user) {
  const groupIds = getAccessibleGroupIds(user);
  if (groupIds === null) return query;
  if (!groupIds.length) return `${query} AND 1 = 0`;
  query += ` AND ${columnName} IN (${groupIds.map(() => '?').join(',')})`;
  params.push(...groupIds);
  return query;
}

function appendOptionalGroupScope(query, params, columnName, user, includeGlobal = false) {
  const groupIds = getAccessibleGroupIds(user);
  if (groupIds === null) return query;
  if (!groupIds.length) return `${query} AND 1 = 0`;
  const placeholders = groupIds.map(() => '?').join(',');
  query += includeGlobal
    ? ` AND (${columnName} IN (${placeholders}) OR ${columnName} IS NULL)`
    : ` AND ${columnName} IN (${placeholders})`;
  params.push(...groupIds);
  return query;
}

async function isWhitelisted(db, userId, groupId) {
  return db.prepare(
    'SELECT * FROM whitelist WHERE user_id = ? AND (group_id IS NULL OR group_id = ?)'
  ).bind(userId.toString(), groupId.toString()).first();
}

async function isExemptUser(db, env, userId, groupId) {
  const whitelist = await isWhitelisted(db, userId, groupId);
  if (whitelist) return { exempt: true, reason: 'whitelist' };

  const admin = await getUserWithPermissions(db, env, userId);
  if (admin && canAccessGroup(admin, groupId)) {
    return { exempt: true, reason: 'admin', user: admin };
  }

  return { exempt: false, user: admin };
}

async function findScopedRecord(db, table, idColumn, idValue, groupId) {
  const normalizedGroupId = normalizeGroupId(groupId);
  if (normalizedGroupId) {
    return db.prepare(`SELECT * FROM ${table} WHERE ${idColumn} = ? AND group_id = ?`)
      .bind(idValue.toString(), normalizedGroupId).first();
  }
  return db.prepare(`SELECT * FROM ${table} WHERE ${idColumn} = ? AND group_id IS NULL`)
    .bind(idValue.toString()).first();
}

async function upsertWhitelist(db, data) {
  const userId = data.userId.toString();
  const groupId = normalizeGroupId(data.groupId);
  const existing = await findScopedRecord(db, 'whitelist', 'user_id', userId, groupId);
  if (existing) {
    await db.prepare(
      'UPDATE whitelist SET username = COALESCE(?, username), first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), photo_base64 = COALESCE(?, photo_base64), note = COALESCE(?, note), created_at = ? WHERE id = ?'
    ).bind(
      data.username ?? null,
      data.first_name ?? null,
      data.last_name ?? null,
      data.photo_base64 ?? null,
      data.note ?? null,
      data.createdAt || formatBeijingTime(),
      existing.id
    ).run();
    return existing.id;
  }

  const result = await db.prepare(
    'INSERT INTO whitelist (user_id, username, first_name, last_name, photo_base64, group_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    userId,
    data.username || '',
    data.first_name || '',
    data.last_name || '',
    data.photo_base64 || null,
    groupId,
    data.note || '',
    data.createdAt || formatBeijingTime()
  ).run();
  return result.meta?.last_row_id || null;
}

async function upsertAdmin(db, data) {
  const userId = data.userId.toString();
  const groupId = normalizeGroupId(data.groupId);
  const existing = await findScopedRecord(db, 'admins', 'user_id', userId, groupId);
  const permissions = JSON.stringify(normalizePermissions(data.permissions));
  if (existing) {
    await db.prepare(
      'UPDATE admins SET username = ?, first_name = ?, last_name = ?, photo_base64 = ?, permissions = ?, note = ?, updated_at = ? WHERE id = ?'
    ).bind(data.username || '', data.first_name || '', data.last_name || '', data.photo_base64 || null, permissions, data.note || '', formatBeijingTime(), existing.id).run();
    return existing.id;
  }
  const result = await db.prepare(
    'INSERT INTO admins (user_id, username, first_name, last_name, photo_base64, group_id, permissions, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(userId, data.username || '', data.first_name || '', data.last_name || '', data.photo_base64 || null, groupId, permissions, data.note || '', formatBeijingTime(), formatBeijingTime()).run();
  return result.meta?.last_row_id || null;
}

async function upsertNotification(db, data) {
  const adminId = data.adminId.toString();
  const groupId = normalizeGroupId(data.groupId);
  const existing = await findScopedRecord(db, 'notifications', 'admin_id', adminId, groupId);
  if (existing) {
    await db.prepare('UPDATE notifications SET enabled = ? WHERE id = ?')
      .bind(data.enabled ? 1 : 0, existing.id).run();
    return existing.id;
  }
  const result = await db.prepare(
    'INSERT INTO notifications (admin_id, group_id, enabled, created_at) VALUES (?, ?, ?, ?)'
  ).bind(adminId, groupId, data.enabled ? 1 : 0, formatBeijingTime()).run();
  return result.meta?.last_row_id || null;
}

async function getUserWithPermissions(db, env, userId) {
  const superAdmins = getSuperAdmins(env);
  const isSuper = superAdmins.includes(userId.toString());
  
  if (isSuper) {
    return {
      user_id: userId.toString(),
      is_super: true,
      is_global_admin: true,
      group_ids: null,
      admin_records: [],
      permissions: Object.values(CONFIG.PERMISSIONS) // 超级管理员拥有所有权限
    };
  }
  
  try {
    const result = await db.prepare(
      'SELECT * FROM admins WHERE user_id = ? ORDER BY group_id IS NOT NULL, created_at DESC'
    ).bind(userId.toString()).all();
    const rows = getD1Rows(result);
    
    if (rows.length === 0) return null;

    const permissionSet = new Set();
    const groupIds = new Set();
    const adminRecords = rows.map(row => {
      const permissions = row.permissions ? normalizePermissions(row.permissions) : CONFIG.DEFAULT_PERMISSION_SETS.DEFAULT;
      permissions.forEach(permission => permissionSet.add(permission));
      const groupId = normalizeGroupId(row.group_id);
      if (groupId) groupIds.add(groupId);
      return { ...row, group_id: groupId, permissions };
    });

    const primary = adminRecords[0];
    const isGlobalAdmin = adminRecords.some(row => !row.group_id);
    
    return {
      ...primary,
      user_id: userId.toString(),
      is_super: false,
      is_global_admin: isGlobalAdmin,
      group_ids: Array.from(groupIds),
      admin_records: adminRecords,
      permissions: Array.from(permissionSet)
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
  if (requiredPermission && !hasScopedPermission(user, requiredPermission)) {
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
    // 检查核心表是否存在
    const result = await db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('groups', 'admins')"
    ).all();
    const exists = new Set(getD1Rows(result).map(item => item.name));
    if (!exists.has('groups') || !exists.has('admins')) {
      await initDatabase(db);
    } else {
      await runMigrations(db);
    }
  } catch (e) {
    await initDatabase(db);
  }

  dbInitialized = true;
}

async function runMigrations(db) {
  const statements = [
    "ALTER TABLE ban_words ADD COLUMN scope TEXT NOT NULL DEFAULT 'all'",
    "ALTER TABLE ban_words ADD COLUMN match_type TEXT NOT NULL DEFAULT 'plain'",
    "ALTER TABLE logs ADD COLUMN created_at_iso TEXT",
    "ALTER TABLE bans ADD COLUMN banned_at_iso TEXT",
    "CREATE TABLE IF NOT EXISTS failed_actions (id INTEGER PRIMARY KEY AUTOINCREMENT, action_type TEXT NOT NULL, method TEXT NOT NULL, payload TEXT NOT NULL, user_id TEXT, group_id TEXT, error TEXT, attempts INTEGER DEFAULT 0, next_retry_at TEXT, status TEXT DEFAULT 'pending', created_at TEXT, updated_at TEXT)",
    "CREATE INDEX IF NOT EXISTS idx_logs_type_created ON logs(type, created_at_iso)",
    "CREATE INDEX IF NOT EXISTS idx_logs_user_group_created ON logs(user_id, group_id, created_at_iso)",
    "CREATE INDEX IF NOT EXISTS idx_ban_words_scope_created ON ban_words(scope, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_bans_group_created ON bans(group_id, banned_at_iso)",
    "CREATE INDEX IF NOT EXISTS idx_failed_actions_status_retry ON failed_actions(status, next_retry_at)"
  ];

  for (const sql of statements) {
    try {
      await db.prepare(sql).run();
    } catch (e) {
      // 兼容旧库：列已存在等迁移错误直接忽略。
    }
  }
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
      banned_at_iso TEXT,
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
      match_type TEXT NOT NULL DEFAULT 'plain',
      created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      user_id TEXT,
      group_id TEXT,
      created_at TEXT,
      created_at_iso TEXT
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
    )`,
    `CREATE TABLE IF NOT EXISTS failed_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT NOT NULL,
      user_id TEXT,
      group_id TEXT,
      error TEXT,
      attempts INTEGER DEFAULT 0,
      next_retry_at TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT,
      updated_at TEXT
    )`
  ];
  
  for (const sql of tables) {
    await db.prepare(sql).run();
  }
  
  const existingWords = await db.prepare('SELECT COUNT(*) as count FROM ban_words').first();
  if (existingWords.count === 0) {
    for (const item of CONFIG.DEFAULT_BAN_WORDS) {
      await db.prepare('INSERT OR IGNORE INTO ban_words (word, scope, match_type, created_at) VALUES (?, ?, ?, ?)')
        .bind(item.word, item.scope, 'plain', formatBeijingTime()).run();
    }
  }

  await runMigrations(db);
  
  return { success: true, message: '数据库初始化完成' };
}

async function addLog(db, type, action, details, userId = null, groupId = null) {
  try {
    await db.prepare(
      'INSERT INTO logs (type, action, details, user_id, group_id, created_at, created_at_iso) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(type, action, details, userId, groupId, formatBeijingTime(), nowIso()).run();
  } catch (e) {
    console.error('Add log error:', e);
  }
}

async function recordFailedAction(db, actionType, method, payload, error, userId = null, groupId = null) {
  try {
    await db.prepare(
      'INSERT INTO failed_actions (action_type, method, payload, user_id, group_id, error, attempts, next_retry_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)'
    ).bind(
      actionType,
      method,
      JSON.stringify(payload || {}),
      userId,
      groupId,
      error || 'unknown error',
      nowIso(),
      'pending',
      nowIso(),
      nowIso()
    ).run();
  } catch (e) {
    console.error('Record failed action error:', e);
  }
}

async function enqueueTelegramFailure(db, actionType, method, payload, result, userId = null, groupId = null) {
  const error = result?.description || result?.error || 'telegram action failed';
  await recordFailedAction(db, actionType, method, payload, error, userId, groupId);
}

async function processFailedActions(telegram, db, env, limit = 5) {
  try {
    const result = await db.prepare(
      'SELECT * FROM failed_actions WHERE status = ? AND (next_retry_at IS NULL OR next_retry_at <= ?) ORDER BY id ASC LIMIT ?'
    ).bind('pending', nowIso(), limit).all();
    const items = getD1Rows(result);

    for (const item of items) {
      let payload = {};
      try {
        payload = JSON.parse(item.payload || '{}');
      } catch (e) {
        payload = {};
      }

      try {
        const response = await telegram.request(item.method, payload);
        if (response?.ok) {
          await db.prepare(
            'UPDATE failed_actions SET status = ?, attempts = attempts + 1, updated_at = ? WHERE id = ?'
          ).bind('done', nowIso(), item.id).run();
        } else {
          const attempts = (item.attempts || 0) + 1;
          const nextRetry = new Date(Date.now() + Math.min(300000, Math.pow(2, attempts) * 1000)).toISOString();
          await db.prepare(
            'UPDATE failed_actions SET attempts = ?, error = ?, next_retry_at = ?, updated_at = ? WHERE id = ?'
          ).bind(attempts, response?.description || 'telegram action failed', nextRetry, nowIso(), item.id).run();
        }
      } catch (e) {
        const attempts = (item.attempts || 0) + 1;
        const nextRetry = new Date(Date.now() + Math.min(300000, Math.pow(2, attempts) * 1000)).toISOString();
        await db.prepare(
          'UPDATE failed_actions SET attempts = ?, error = ?, next_retry_at = ?, updated_at = ? WHERE id = ?'
        ).bind(attempts, e.message || 'telegram action failed', nextRetry, nowIso(), item.id).run();
      }
    }
  } catch (e) {
    console.error('Process failed actions error:', e);
  }
}

// ==================== Telegram API ====================
class TelegramAPI {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async request(method, params = {}) {
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/${method}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
        const data = await response.json();

        if (response.ok && data.ok !== false) return data;

        const retryAfter = data?.parameters?.retry_after;
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt === 2) return data;

        await sleep(retryAfter ? retryAfter * 1000 : Math.pow(2, attempt) * 300);
      } catch (e) {
        lastError = e;
        if (attempt === 2) throw e;
        await sleep(Math.pow(2, attempt) * 300);
      }
    }
    throw lastError || new Error('Telegram request failed');
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
async function checkUser(telegram, db, env, user, groupId) {
  const reasons = [];
  
  const group = await db.prepare('SELECT * FROM groups WHERE id = ?').bind(groupId.toString()).first();
  if (!group) return { passed: true, reasons: [] };
  
  const exemption = await isExemptUser(db, env, user.id, groupId);
  if (exemption.exempt) return { passed: true, reasons: [], whitelisted: exemption.reason === 'whitelist' };
  
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
    const banWords = await getBanWords(db);
    
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`;
    const username = user.username || '';
    
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
    const bio = userBio;

    // 按scope分方向检测，命中即记录并退出
    let hitWord = null;
    let hitSource = null;

    outer: for (const item of banWords) {
      if (scopeApplies(item.scope, 'profile_name') && banWordMatches(fullName, item)) {
        hitWord = item.word; hitSource = '昵称'; break outer;
      }
      if (username && scopeApplies(item.scope, 'profile_username') && banWordMatches(username, item)) {
        hitWord = item.word; hitSource = '用户名'; break outer;
      }
      if (bio && scopeApplies(item.scope, 'profile_bio') && banWordMatches(bio, item)) {
        hitWord = item.word; hitSource = '简介'; break outer;
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
  const text = message.text || message.caption || '';

  // 忽略机器人的消息
  if (message.from.is_bot) return;

  // 获取群组设置
  const group = await db.prepare('SELECT * FROM groups WHERE id = ?').bind(chatId.toString()).first();
  if (!group) return;

  // 检查是否启用了消息检查
  if (!group.check_messages) return;

  const exemption = await isExemptUser(db, env, userId, chatId);
  if (exemption.exempt) return;

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
    const deletePayload = {
      chat_id: chatId,
      message_id: messageId
    };
    const deleteResult = await telegram.request('deleteMessage', deletePayload);
    if (!deleteResult.ok) {
      await enqueueTelegramFailure(db, 'delete_message', 'deleteMessage', deletePayload, deleteResult, userId.toString(), chatId.toString());
      await addLog(db, 'error', 'delete_message_failed', deleteResult.description || '删除消息失败', userId.toString(), chatId.toString());
    } else {
      await addLog(db, 'moderation', 'message_deleted', `删除违规消息: ${violationsText}`, userId.toString(), chatId.toString());
    }
    
    // 根据设置执行进一步操作
    switch (action) {
      case 'delete_ban':
        // 删除并封禁
        // 再次检查是否在白名单或是管理员（防止误封）
        const exemption = await isExemptUser(db, env, userId, chatId);
        if (exemption.exempt) {
          await addLog(db, 'moderation', 'skip_ban', `用户是白名单或管理员，跳过封禁`, userId.toString(), chatId.toString());
          break;
        }
        
        const banExpiry = calculateBanExpiry(group.ban_duration);
        const banPayload = { chat_id: chatId, user_id: userId };
        if (banExpiry) banPayload.until_date = banExpiry;
        const banResult = await telegram.request('banChatMember', banPayload);
        if (!banResult.ok) {
          await enqueueTelegramFailure(db, 'ban_user', 'banChatMember', banPayload, banResult, userId.toString(), chatId.toString());
          await notifySystemAdmins(telegram, db, env, `封禁失败: 用户 ${userId}，群组 ${chatId}，原因: ${banResult.description || '未知错误'}`);
          break;
        }
        
        const bannedAt = formatBeijingTime();
        const bannedAtIso = nowIso();
        const expiryText = banExpiry ? new Date(banExpiry * 1000).toISOString() : null;
        await db.prepare(
          'INSERT INTO bans (user_id, username, first_name, last_name, photo_base64, group_id, reason, banned_at, banned_at_iso, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          userId.toString(), message.from.username || '', message.from.first_name || '', 
          message.from.last_name || '', null, chatId.toString(), 
          violationsText, bannedAt, bannedAtIso, expiryText
        ).run();
        
        await notifyAdmins(telegram, db, env, chatId, message.from, [violationsText], null);
        break;
        
      case 'mute':
        // 禁言
        // 检查是否在白名单或是管理员
        const muteExemption = await isExemptUser(db, env, userId, chatId);
        if (muteExemption.exempt) {
          await addLog(db, 'moderation', 'skip_mute', `用户是白名单或管理员，跳过禁言`, userId.toString(), chatId.toString());
          break;
        }
        
        const muteUntil = Math.floor(Date.now() / 1000) + (group.mute_duration || 10) * 60;
        const mutePayload = {
          chat_id: chatId,
          user_id: userId,
          permissions: {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false
          },
          until_date: muteUntil
        };
        const muteResult = await telegram.request('restrictChatMember', mutePayload);
        if (!muteResult.ok) {
          await enqueueTelegramFailure(db, 'mute_user', 'restrictChatMember', mutePayload, muteResult, userId.toString(), chatId.toString());
          await notifySystemAdmins(telegram, db, env, `禁言失败: 用户 ${userId}，群组 ${chatId}，原因: ${muteResult.description || '未知错误'}`);
          break;
        }
        
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
  const exemption = await isExemptUser(db, env, message.from.id, message.chat.id);
  if (exemption.exempt) return;
  
  const userId = message.from.id.toString();
  const groupId = message.chat.id.toString();
  const cutoff60 = new Date(Date.now() - 60000).toISOString();
  const cutoff10 = new Date(Date.now() - 10000).toISOString();
  const text = (message.text || message.caption || '').trim();

  const recentMessages = await db.prepare(
    'SELECT COUNT(*) as count FROM logs WHERE user_id = ? AND group_id = ? AND type = ? AND created_at_iso > ?'
  ).bind(userId, groupId, 'message', cutoff60).first();

  const burstMessages = await db.prepare(
    'SELECT COUNT(*) as count FROM logs WHERE user_id = ? AND group_id = ? AND type = ? AND created_at_iso > ?'
  ).bind(userId, groupId, 'message', cutoff10).first();

  let repeatCount = 0;
  if (text) {
    const recent = await db.prepare(
      'SELECT details FROM logs WHERE user_id = ? AND group_id = ? AND type = ? AND created_at_iso > ? ORDER BY id DESC LIMIT 10'
    ).bind(userId, groupId, 'message', cutoff60).all();
    const signature = text.substring(0, 50);
    repeatCount = getD1Rows(recent).filter(row => (row.details || '').includes(signature)).length;
  }

  let reason = null;
  if (recentMessages && recentMessages.count > 15) reason = '1分钟内发送超过15条消息';
  if (!reason && burstMessages && burstMessages.count > 6) reason = '10秒内突发高频发送';
  if (!reason && repeatCount >= 4) reason = '短时间重复发送相同内容';
  
  if (reason) {
    const mutePayload = {
      chat_id: message.chat.id,
      user_id: message.from.id,
      permissions: {
        can_send_messages: false,
        can_send_media_messages: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false
      },
      until_date: Math.floor(Date.now() / 1000) + 300 // 禁言5分钟
    };
    const result = await telegram.request('restrictChatMember', mutePayload);
    if (!result.ok) {
      await enqueueTelegramFailure(db, 'anti_spam_mute', 'restrictChatMember', mutePayload, result, userId, groupId);
      await notifySystemAdmins(telegram, db, env, `防刷屏禁言失败: 用户 ${userId}，群组 ${groupId}，原因: ${result.description || '未知错误'}`);
      return;
    }
    
    await addLog(db, 'moderation', 'anti_spam', `用户因刷屏被禁言5分钟: ${reason}`, userId, groupId);
  }
}

// ==================== Webhook 处理 ====================
async function handleWebhook(request, env) {
  const telegram = new TelegramAPI(env.BOT_TOKEN);
  const db = env.DB;
  
  try {
    await ensureDatabase(db);
    await processFailedActions(telegram, db, env);
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
    return jsonResponse({ ok: false, error: 'Webhook processing failed' }, 500);
  }
}

async function handleJoinRequest(telegram, db, env, chat, user) {
  await addLog(db, 'join', 'request', `用户 ${user.first_name} (${user.id}) 申请加入 ${chat.title}`, user.id.toString(), chat.id.toString());
  
  const userInfo = await getUserInfoWithPhoto(telegram, db, user.id);
  
  const exemption = await isExemptUser(db, env, user.id, chat.id);
  if (exemption.exempt) {
    // 用户是管理员，直接批准入群申请
    await telegram.approveChatJoinRequest(chat.id, user.id);
    await addLog(db, 'join', 'approved', `${exemption.reason === 'admin' ? '管理员' : '白名单用户'} ${user.first_name} (${user.id}) 直接通过入群申请`, user.id.toString(), chat.id.toString());
    return;
  }
  
  const checkResult = await checkUser(telegram, db, env, user, chat.id);
  
  if (checkResult.passed) {
    await telegram.approveChatJoinRequest(chat.id, user.id);
    await addLog(db, 'join', 'approved', `已批准用户 ${user.first_name} (${user.id}) 加入`, user.id.toString(), chat.id.toString());
  } else {
    await telegram.declineChatJoinRequest(chat.id, user.id);
    
    const group = await db.prepare('SELECT ban_duration FROM groups WHERE id = ?').bind(chat.id.toString()).first();
    const banDuration = group?.ban_duration || '24h';
    const banExpiry = calculateBanExpiry(banDuration);
    
    const banPayload = { chat_id: chat.id, user_id: user.id };
    if (banExpiry) banPayload.until_date = banExpiry;
    const banResult = await telegram.request('banChatMember', banPayload);
    if (!banResult.ok) {
      await enqueueTelegramFailure(db, 'join_ban_user', 'banChatMember', banPayload, banResult, user.id.toString(), chat.id.toString());
      await notifySystemAdmins(telegram, db, env, `入群审核封禁失败: 用户 ${user.id}，群组 ${chat.id}，原因: ${banResult.description || '未知错误'}`);
    }
    
    const bannedAt = formatBeijingTime();
    const bannedAtIso = nowIso();
    const expiryText = banExpiry ? new Date(banExpiry * 1000).toISOString() : null;
    await db.prepare(
      'INSERT INTO bans (user_id, username, first_name, last_name, photo_base64, group_id, reason, banned_at, banned_at_iso, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(user.id.toString(), user.username || '', user.first_name || '', user.last_name || '', 
           userInfo.photo_base64, chat.id.toString(), checkResult.reasons.join('; '), bannedAt, bannedAtIso, expiryText).run();
    
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

    if (query.from.id.toString() !== userId.toString()) {
      await telegram.answerCallbackQuery(query.id, '❌ 只能重新检测自己的账号', true);
      return;
    }
    
    // 检查是否是管理员或白名单
    const adminUser = await getUserWithPermissions(db, env, userId);
    const whitelist = await isWhitelisted(db, userId, groupId);
    
    if ((adminUser && canAccessGroup(adminUser, groupId)) || whitelist) {
      await telegram.unbanChatMember(groupId, userId);
      await db.prepare('UPDATE bans SET is_active = 0 WHERE user_id = ? AND group_id = ?').bind(userId, groupId).run();
      await telegram.answerCallbackQuery(query.id, '✅ 您是管理员/白名单，已解封！请重新申请加入群组。', true);
      await telegram.sendMessage(userId, '✅ 您已解封，请重新申请加入群组。');
      await addLog(db, 'ban', 'unban_admin_whitelist', `管理员/白名单用户重新检测通过`, userId, groupId);
      return;
    }
    
    const checkResult = await checkUser(telegram, db, env, query.from, groupId);
    
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
    if (!operator || !hasScopedPermission(operator, CONFIG.PERMISSIONS.MANAGE_BANS, groupId)) {
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
    if (!operator || !hasScopedPermission(operator, CONFIG.PERMISSIONS.MANAGE_WHITELIST, groupId)) {
      await telegram.answerCallbackQuery(query.id, '❌ 权限不足', true);
      return;
    }
    
    await upsertWhitelist(db, { userId, groupId, createdAt: formatBeijingTime() });
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
  
  for (const { admin_id } of getD1Rows(notifications)) {
    try {
      const admin = await getUserWithPermissions(db, env, admin_id);
      // 检查管理员是否有查看封禁的权限
      if (!admin || !hasScopedPermission(admin, CONFIG.PERMISSIONS.VIEW_BANS, groupId)) {
        continue;
      }
      
      await telegram.sendMessage(admin_id, 
        `⚠️ <b>封禁通知</b>\n\n` +
        `群组: ${group?.title || groupId}\n` +
        `用户: ${user.first_name} ${user.last_name || ''}\n` +
        `ID: <a href="tg://user?id=${user.id}">${user.id}</a>\n` +
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
                  visible: hasScopedPermission(admin, CONFIG.PERMISSIONS.MANAGE_BANS, groupId)
                },
                { 
                  text: '📋 加入白名单', 
                  callback_data: `whitelist:${groupId}:${user.id}`,
                  visible: hasScopedPermission(admin, CONFIG.PERMISSIONS.MANAGE_WHITELIST, groupId)
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

async function notifySystemAdmins(telegram, db, env, message) {
  const recipients = new Set(getSuperAdmins(env));
  try {
    const admins = await db.prepare('SELECT DISTINCT user_id, permissions FROM admins').all();
    for (const admin of getD1Rows(admins)) {
      if (normalizePermissions(admin.permissions).includes(CONFIG.PERMISSIONS.VIEW_SYSTEM)) {
        recipients.add(admin.user_id);
      }
    }
  } catch (e) {
    console.error('Load system admins error:', e);
  }

  for (const adminId of recipients) {
    try {
      await telegram.sendMessage(adminId, `⚠️ <b>系统告警</b>\n\n${message}\n\n时间: ${formatBeijingTime()}`);
    } catch (e) {
      console.log('Cannot notify system admin:', e.message);
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
  await processFailedActions(telegram, db, env);
  
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
        user: { ...user, is_super: admin.is_super, group_ids: admin.group_ids, is_global_admin: admin.is_global_admin },
        permissions: admin.permissions,
        is_super: admin.is_super,
        group_ids: admin.group_ids,
        is_global_admin: admin.is_global_admin,
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
      const scopedGroupIds = getAccessibleGroupIds(user);
      let groupsQuery = 'SELECT COUNT(*) as count FROM groups WHERE 1 = 1';
      let bansQuery = 'SELECT COUNT(*) as count FROM bans WHERE is_active = 1';
      let whitelistQuery = 'SELECT COUNT(*) as count FROM whitelist WHERE 1 = 1';
      const groupParams = [];
      const banParams = [];
      const whitelistParams = [];
      groupsQuery = appendGroupScope(groupsQuery, groupParams, 'id', user);
      bansQuery = appendGroupScope(bansQuery, banParams, 'group_id', user);
      whitelistQuery = appendOptionalGroupScope(whitelistQuery, whitelistParams, 'group_id', user, true);

      const groupsStmt = db.prepare(groupsQuery);
      const bansStmt = db.prepare(bansQuery);
      const whitelistStmt = db.prepare(whitelistQuery);
      const groups = await (groupParams.length ? groupsStmt.bind(...groupParams) : groupsStmt).first();
      const bans = await (banParams.length ? bansStmt.bind(...banParams) : bansStmt).first();
      const whitelist = await (whitelistParams.length ? whitelistStmt.bind(...whitelistParams) : whitelistStmt).first();
      const dbAdmins = await db.prepare('SELECT COUNT(*) as count FROM admins').first();
      const superAdmins = getSuperAdmins(env);
      const banWords = await db.prepare('SELECT COUNT(*) as count FROM ban_words').first();
      let logsQuery = 'SELECT COUNT(*) as count FROM logs WHERE 1 = 1';
      const logsParams = [];
      logsQuery = appendOptionalGroupScope(logsQuery, logsParams, 'group_id', user, true);
      const logsStmt = db.prepare(logsQuery);
      const logs = await (logsParams.length ? logsStmt.bind(...logsParams) : logsStmt).first();
      
      // 超级管理员数量
      const totalAdmins = (dbAdmins?.count || 0) + superAdmins.length;
      
      // 获取webhook信息，但只对超级管理员或有view_system权限的管理员
      let webhookInfo = null;
      if (hasScopedPermission(user, CONFIG.PERMISSIONS.VIEW_SYSTEM)) {
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
          permissions: user.permissions,
          group_ids: scopedGroupIds,
          is_global_admin: user.is_global_admin
        }
      });
    }
    
    // ========== 获取当前用户信息 ==========
    if (path === '/api/me' && request.method === 'GET') {
      return jsonResponse({
        user_id: user.user_id,
        is_super: user.is_super,
        permissions: user.permissions,
        group_ids: user.group_ids,
        is_global_admin: user.is_global_admin,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        photo_base64: user.photo_base64
      });
    }
    
    // 获取用户信息（带头像）
    if (path.startsWith('/api/user/') && request.method === 'GET') {
      const userId = path.split('/')[3];
      if (!normalizeId(userId)) return jsonResponse({ error: '用户ID格式错误' }, 400);
      const userInfo = await getUserInfoWithPhoto(telegram, db, userId);
      return jsonResponse(userInfo);
    }
    
    // ========== 群组管理 ==========
    if (path === '/api/groups') {
      if (request.method === 'GET') {
        // 需要 view_groups 权限
        if (!hasScopedPermission(user, CONFIG.PERMISSIONS.VIEW_GROUPS)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        let query = 'SELECT * FROM groups WHERE 1 = 1';
        const params = [];
        query = appendGroupScope(query, params, 'id', user);
        query += ' ORDER BY updated_at DESC';
        const stmt = db.prepare(query);
        const groups = await (params.length ? stmt.bind(...params) : stmt).all();
        return jsonResponse(getD1Rows(groups));
      }
      if (request.method === 'POST') {
        // 需要 manage_groups 权限
        if (!hasScopedPermission(user, CONFIG.PERMISSIONS.MANAGE_GROUPS)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        const { groupId } = await request.json();
        const normalizedGroupId = normalizeId(groupId);
        if (!normalizedGroupId) return jsonResponse({ error: '群组ID格式错误' }, 400);
        if (!hasGlobalAdminScope(user) && !canAccessGroup(user, normalizedGroupId)) {
          return jsonResponse({ error: '不能添加未授权群组' }, 403);
        }
        await syncGroup(telegram, db, normalizedGroupId);
        await addLog(db, 'group', 'add', `手动添加群组 ${normalizedGroupId}`, user.user_id);
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/groups/') && path.split('/').length === 4) {
      const groupId = path.split('/')[3];
      
      if (request.method === 'PUT') {
        // 需要 manage_groups 权限
        if (!hasScopedPermission(user, CONFIG.PERMISSIONS.MANAGE_GROUPS, groupId)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        const data = await request.json();
        if (!ALLOWED_BAN_DURATIONS.has(data.ban_duration)) return jsonResponse({ error: '封禁时长无效' }, 400);
        if (!ALLOWED_MESSAGE_ACTIONS.has(data.action_on_message || 'delete')) return jsonResponse({ error: '消息处理方式无效' }, 400);
        const muteDuration = parseInt(data.mute_duration || 10, 10);
        if (!Number.isFinite(muteDuration) || muteDuration < 1 || muteDuration > 1440) {
          return jsonResponse({ error: '禁言时长必须在1-1440分钟之间' }, 400);
        }
        await db.prepare(`
          UPDATE groups SET 
            anti_ad = ?, check_messages = ?, require_chinese_name = ?, 
            require_avatar = ?, ban_duration = ?, action_on_message = ?, mute_duration = ?, updated_at = ?
          WHERE id = ?
        `).bind(
          data.anti_ad ? 1 : 0, data.check_messages ? 1 : 0, data.require_chinese_name ? 1 : 0, 
          data.require_avatar ? 1 : 0, data.ban_duration, data.action_on_message || 'delete',
          muteDuration, formatBeijingTime(), groupId
        ).run();
        await addLog(db, 'group', 'update', `更新群组设置 ${groupId}`, user.user_id);
        return jsonResponse({ success: true });
      }
      
      if (request.method === 'DELETE') {
        // 需要 manage_groups 权限
        if (!hasScopedPermission(user, CONFIG.PERMISSIONS.MANAGE_GROUPS, groupId)) {
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
      const groupId = path.split('/')[3];
      if (!hasScopedPermission(user, CONFIG.PERMISSIONS.MANAGE_GROUPS, groupId)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      
      await syncGroup(telegram, db, groupId);
      return jsonResponse({ success: true });
    }
    
    // ========== 封禁管理 ==========
    if (path === '/api/bans') {
      const search = url.searchParams.get('search') || '';
      const groupId = url.searchParams.get('group_id');
      const dateFrom = url.searchParams.get('date_from');
      const dateTo = url.searchParams.get('date_to');
      const limit = normalizeApiLimit(url.searchParams.get('limit'), 100);
      const paged = url.searchParams.get('paged') === '1';
      const cursor = url.searchParams.get('cursor');

      // 需要 view_bans 权限
      if (!hasScopedPermission(user, CONFIG.PERMISSIONS.VIEW_BANS, groupId || null)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }

      let query = 'SELECT b.*, g.title as group_title, g.photo_base64 as group_photo FROM bans b LEFT JOIN groups g ON b.group_id = g.id WHERE b.is_active = 1';
      const params = [];
      query = appendGroupScope(query, params, 'b.group_id', user);

      if (search) {
        query += ' AND (b.user_id LIKE ? OR b.username LIKE ? OR b.first_name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (groupId) {
        if (!canAccessGroup(user, groupId)) return jsonResponse({ error: '权限不足' }, 403);
        query += ' AND b.group_id = ?';
        params.push(groupId);
      }
      if (dateFrom) {
        const parsed = parseDateParam(dateFrom, '开始日期');
        if (parsed.error) return jsonResponse({ error: parsed.error }, 400);
        query += ' AND b.banned_at_iso >= ?';
        params.push(parsed.value);
      }
      if (dateTo) {
        const parsed = parseDateParam(dateTo, '结束日期', true);
        if (parsed.error) return jsonResponse({ error: parsed.error }, 400);
        query += ' AND b.banned_at_iso <= ?';
        params.push(parsed.value);
      }
      if (cursor) {
        const cursorId = parseInt(cursor, 10);
        if (!Number.isFinite(cursorId) || cursorId < 1) {
          return jsonResponse({ error: 'cursor格式错误' }, 400);
        }
        query += ' AND b.id < ?';
        params.push(cursorId);
      }

      query += ' ORDER BY b.id DESC LIMIT ?';
      params.push(paged ? limit + 1 : limit);

      const stmt = db.prepare(query);
      const bans = await (params.length ? stmt.bind(...params) : stmt).all();
      const rows = getD1Rows(bans);
      if (paged) {
        const items = rows.slice(0, limit);
        const nextCursor = rows.length > limit ? items[items.length - 1]?.id : null;
        return jsonResponse({ items, nextCursor });
      }
      return jsonResponse(rows);
    }
    
    if (path.startsWith('/api/bans/') && !path.includes('unban') && request.method === 'DELETE') {
      const banId = path.split('/')[3];
      
      // 需要 manage_bans 权限
      if (!normalizeId(banId)) return jsonResponse({ error: '封禁记录ID格式错误' }, 400);
      
      const ban = await db.prepare('SELECT * FROM bans WHERE id = ?').bind(banId).first();
      if (ban && !hasScopedPermission(user, CONFIG.PERMISSIONS.MANAGE_BANS, ban.group_id)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      if (ban) {
        await telegram.unbanChatMember(ban.group_id, ban.user_id);
        await db.prepare('DELETE FROM bans WHERE id = ?').bind(banId).run();
        await addLog(db, 'ban', 'delete', `删除封禁记录`, ban.user_id, ban.group_id);
      }
      return jsonResponse({ success: true });
    }
    
    if (path === '/api/bans/unban' && request.method === 'POST') {
      // 需要 manage_bans 权限
      const { groupId, userId } = await request.json();
      if (!normalizeId(groupId) || !normalizeId(userId)) return jsonResponse({ error: '参数格式错误' }, 400);
      if (!hasScopedPermission(user, CONFIG.PERMISSIONS.MANAGE_BANS, groupId)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      await telegram.unbanChatMember(groupId, userId);
      await db.prepare('UPDATE bans SET is_active = 0 WHERE user_id = ? AND group_id = ?').bind(userId, groupId).run();
      await addLog(db, 'ban', 'unban', `解封用户`, userId, groupId);
      return jsonResponse({ success: true });
    }
    
    // ========== 白名单管理 ==========
    if (path === '/api/whitelist') {
      if (request.method === 'GET') {
        // 需要 view_whitelist 权限
        if (!hasScopedPermission(user, CONFIG.PERMISSIONS.VIEW_WHITELIST)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        const search = url.searchParams.get('search') || '';
        let query = 'SELECT w.*, g.title as group_title FROM whitelist w LEFT JOIN groups g ON w.group_id = g.id';
        const params = [];
        const where = [];
        const groupIds = getAccessibleGroupIds(user);
        if (groupIds !== null) {
          if (groupIds.length === 0) {
            where.push('1 = 0');
          } else {
            where.push(`(w.group_id IN (${groupIds.map(() => '?').join(',')}) OR w.group_id IS NULL)`);
            params.push(...groupIds);
          }
        }
        
        if (search) {
          where.push('(w.user_id LIKE ? OR w.username LIKE ? OR w.first_name LIKE ?)');
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (where.length) query += ' WHERE ' + where.join(' AND ');
        
        query += ' ORDER BY w.created_at DESC';
        
        const stmt = db.prepare(query);
        const whitelist = await (params.length ? stmt.bind(...params) : stmt).all();
        return jsonResponse(getD1Rows(whitelist));
      }
      if (request.method === 'POST') {
        // 需要 manage_whitelist 权限
        const data = await request.json();
        const groupId = normalizeGroupId(data.groupId);
        if (!hasScopedPermission(user, CONFIG.PERMISSIONS.MANAGE_WHITELIST, groupId)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        if (!hasGlobalAdminScope(user) && !groupId) {
          return jsonResponse({ error: '群组管理员不能添加全局白名单' }, 403);
        }
        
        if (data.userIds) {
          const ids = data.userIds.split(/[\n,]/).map(id => id.trim()).filter(Boolean);
          for (const userId of ids) {
            if (!normalizeId(userId)) continue;
            const userInfo = await getUserInfoWithPhoto(telegram, db, userId);
            await upsertWhitelist(db, {
              userId,
              username: userInfo.username,
              first_name: userInfo.first_name,
              last_name: userInfo.last_name,
              photo_base64: userInfo.photo_base64,
              groupId,
              note: data.note || '',
              createdAt: formatBeijingTime()
            });
          }
          await addLog(db, 'whitelist', 'batch_add', `批量添加 ${ids.length} 个用户`, user.user_id);
        } else {
          if (!normalizeId(data.userId)) return jsonResponse({ error: '用户ID格式错误' }, 400);
          const userInfo = await getUserInfoWithPhoto(telegram, db, data.userId);
          await upsertWhitelist(db, {
            userId: data.userId,
            username: userInfo.username || data.username || '',
            first_name: userInfo.first_name || '',
            last_name: userInfo.last_name || '',
            photo_base64: userInfo.photo_base64,
            groupId,
            note: data.note || '',
            createdAt: formatBeijingTime()
          });
          await addLog(db, 'whitelist', 'add', `添加白名单用户 ${data.userId}`, user.user_id);
        }
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/whitelist/') && request.method === 'DELETE') {
      // 需要 manage_whitelist 权限
      const whitelistId = path.split('/')[3];
      if (!normalizeId(whitelistId)) return jsonResponse({ error: '白名单ID格式错误' }, 400);
      const whitelist = await db.prepare('SELECT * FROM whitelist WHERE id = ?').bind(whitelistId).first();
      if (whitelist && !hasScopedPermission(user, CONFIG.PERMISSIONS.MANAGE_WHITELIST, whitelist.group_id)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      if (whitelist && !hasGlobalAdminScope(user) && !whitelist.group_id) {
        return jsonResponse({ error: '群组管理员不能删除全局白名单' }, 403);
      }
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
          admins: getD1Rows(admins), 
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
        if (!normalizeId(data.userId)) return jsonResponse({ error: '用户ID格式错误' }, 400);
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
        
        await upsertAdmin(db, {
          userId: data.userId,
          username: userInfo.username,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          photo_base64: userInfo.photo_base64,
          groupId: data.groupId || null,
          permissions,
          note: data.note || ''
        });
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
      if (!normalizeId(adminId)) return jsonResponse({ error: '管理员记录ID格式错误' }, 400);
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
      if (!normalizeId(adminId)) return jsonResponse({ error: '管理员记录ID格式错误' }, 400);
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
      
      const permissions = normalizePermissions(data.permissions);
      await db.prepare('UPDATE admins SET permissions = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(permissions), formatBeijingTime(), adminId).run();
      
      await addLog(db, 'admin', 'update_permissions', `更新管理员权限: ${permissions.join(', ')}`, user.user_id);
      return jsonResponse({ success: true });
    }
    
    // ========== 通知设置 ==========
    if (path === '/api/notifications') {
      if (request.method === 'GET') {
        // 需要 view_notifications 权限
        if (!hasScopedPermission(user, CONFIG.PERMISSIONS.VIEW_NOTIFICATIONS)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        // 获取现有通知设置
        let notifQuery = 'SELECT n.*, g.title as group_title FROM notifications n LEFT JOIN groups g ON n.group_id = g.id WHERE 1 = 1';
        const notifParams = [];
        notifQuery = appendOptionalGroupScope(notifQuery, notifParams, 'n.group_id', user, true);
        notifQuery += ' ORDER BY n.created_at DESC';
        const notifStmt = db.prepare(notifQuery);
        const notifications = await (notifParams.length ? notifStmt.bind(...notifParams) : notifStmt).all();
        let notificationRows = getD1Rows(notifications);
        if (!hasGlobalAdminScope(user)) {
          notificationRows = notificationRows.filter(n =>
            n.admin_id === user.user_id || (n.group_id && canAccessGroup(user, n.group_id))
          );
        }
        
        // 获取所有管理员ID（包括超级管理员和普通管理员）
        const admins = await db.prepare('SELECT * FROM admins ORDER BY created_at DESC').all();
        const superAdminIds = getSuperAdmins(env);
        const adminRows = getD1Rows(admins);
        const allAdminIds = hasGlobalAdminScope(user)
          ? new Set([...superAdminIds, ...adminRows.map(a => a.user_id)])
          : new Set([user.user_id]);
        
        // 获取管理员信息
        const adminInfos = [];
        for (const adminId of allAdminIds) {
          const info = await getUserInfoWithPhoto(telegram, db, adminId);
          const notif = notificationRows.find(n => n.admin_id === adminId && !n.group_id);
          adminInfos.push({
            ...info,
            notification_id: notif?.id || null,
            enabled: notif ? notif.enabled : 0,
            is_super: superAdminIds.includes(adminId)
          });
        }
        
        return jsonResponse({ 
          admins: adminInfos,
          notifications: notificationRows,
          currentAdmin: {
            id: user.user_id,
            is_super: user.is_super,
            permissions: user.permissions
          }
        });
      }
      if (request.method === 'POST') {
        // 需要 manage_notifications 权限
        const data = await request.json();
        const groupId = normalizeGroupId(data.groupId);
        if (!hasScopedPermission(user, CONFIG.PERMISSIONS.MANAGE_NOTIFICATIONS, groupId)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        
        // 普通管理员只能管理自己的通知设置
        if (!user.is_super && data.adminId !== user.user_id) {
          return jsonResponse({ error: '只能管理自己的通知设置' }, 403);
        }
        if (!hasGlobalAdminScope(user) && !groupId) {
          return jsonResponse({ error: '群组管理员不能管理全局通知' }, 403);
        }
        
        await upsertNotification(db, { adminId: data.adminId, groupId, enabled: data.enabled });
        await addLog(db, 'notification', 'update', `更新通知设置`, user.user_id);
        return jsonResponse({ success: true });
      }
    }
    
    // 修复：添加通知更新接口（用于开关操作）
    if (path.startsWith('/api/notifications/') && request.method === 'PUT') {
      // 需要 manage_notifications 权限
      const notifId = path.split('/')[3];
      if (!normalizeId(notifId)) return jsonResponse({ error: '通知ID格式错误' }, 400);
      const data = await request.json();
      
      // 检查通知设置是否存在
      const notification = await db.prepare('SELECT * FROM notifications WHERE id = ?').bind(notifId).first();
      if (!notification) {
        return jsonResponse({ error: '通知设置不存在' }, 404);
      }
      if (!hasScopedPermission(user, CONFIG.PERMISSIONS.MANAGE_NOTIFICATIONS, notification.group_id)) {
        return jsonResponse({ error: '权限不足' }, 403);
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
      const notifId = path.split('/')[3];
      if (!normalizeId(notifId)) return jsonResponse({ error: '通知ID格式错误' }, 400);
      
      // 检查通知设置是否存在
      const notification = await db.prepare('SELECT * FROM notifications WHERE id = ?').bind(notifId).first();
      if (!notification) {
        return jsonResponse({ error: '通知设置不存在' }, 404);
      }
      if (!hasScopedPermission(user, CONFIG.PERMISSIONS.MANAGE_NOTIFICATIONS, notification.group_id)) {
        return jsonResponse({ error: '权限不足' }, 403);
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
        if (!hasScopedPermission(user, CONFIG.PERMISSIONS.VIEW_BANWORDS)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        const words = await db.prepare('SELECT * FROM ban_words ORDER BY created_at DESC').all();
        return jsonResponse(getD1Rows(words));
      }
      if (request.method === 'POST') {
        // 需要 manage_banwords 权限
        if (!hasScopedPermission(user, CONFIG.PERMISSIONS.MANAGE_BANWORDS)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        const data = await request.json();
        const scope = normalizeScope(data.scope || 'all');
        if (!scope) return jsonResponse({ error: '检测范围无效' }, 400);
        const matchType = normalizeMatchType(data.match_type || data.matchType || 'plain');
        if (!matchType) return jsonResponse({ error: '匹配类型无效' }, 400);

        if (data.words) {
          // 批量导入：格式支持 "word" 或 "word|scope"，每行一个
          const wordList = data.words.split(/\n/).map(w => w.trim()).filter(Boolean);
          let added = 0;
          for (const line of wordList) {
            const parts = line.split('|');
            const w = parts[0].trim();
            const s = normalizeScope(parts[1] ? parts[1].trim() : scope);
            const mt = normalizeMatchType(parts[2] ? parts[2].trim() : matchType);
            if (!s || !mt) continue;
            if (!w) continue;
            if (mt === 'regex' && !validateRegex(w)) continue;
            await db.prepare('INSERT OR IGNORE INTO ban_words (word, scope, match_type, created_at) VALUES (?, ?, ?, ?)')
              .bind(w, s, mt, formatBeijingTime()).run();
            added++;
          }
          await addLog(db, 'banword', 'batch_add', `批量添加 ${added} 个违禁词`, user.user_id);
        } else {
          const word = (data.word || '').toString().trim();
          if (!word) return jsonResponse({ error: '违禁词不能为空' }, 400);
          if (matchType === 'regex' && !validateRegex(word)) return jsonResponse({ error: '正则表达式无效' }, 400);
          await db.prepare('INSERT OR IGNORE INTO ban_words (word, scope, match_type, created_at) VALUES (?, ?, ?, ?)')
            .bind(word, scope, matchType, formatBeijingTime()).run();
          await addLog(db, 'banword', 'add', `添加违禁词: ${data.word} (scope: ${scope})`, user.user_id);
        }
        invalidateBanWordsCache();
        return jsonResponse({ success: true });
      }
      // PUT：修改单个词的scope
      if (request.method === 'PUT') {
        if (!hasScopedPermission(user, CONFIG.PERMISSIONS.MANAGE_BANWORDS)) {
          return jsonResponse({ error: '权限不足' }, 403);
        }
        const data = await request.json();
        const scope = normalizeScope(data.scope);
        const matchType = normalizeMatchType(data.match_type || data.matchType || 'plain');
        if (!normalizeId(data.id) || !scope || !matchType) return jsonResponse({ error: '参数错误' }, 400);
        const existing = await db.prepare('SELECT word FROM ban_words WHERE id = ?').bind(data.id).first();
        if (existing && matchType === 'regex' && !validateRegex(existing.word)) return jsonResponse({ error: '正则表达式无效' }, 400);
        await db.prepare('UPDATE ban_words SET scope = ?, match_type = ? WHERE id = ?').bind(scope, matchType, data.id).run();
        invalidateBanWordsCache();
        await addLog(db, 'banword', 'update_scope', `修改违禁词scope: id=${data.id} scope=${scope}`, user.user_id);
        return jsonResponse({ success: true });
      }
    }
    
    if (path.startsWith('/api/banwords/') && request.method === 'DELETE') {
      // 需要 manage_banwords 权限
      if (!hasScopedPermission(user, CONFIG.PERMISSIONS.MANAGE_BANWORDS)) {
        return jsonResponse({ error: '权限不足' }, 403);
      }
      
      const wordId = path.split('/')[3];
      if (!normalizeId(wordId)) return jsonResponse({ error: '违禁词ID格式错误' }, 400);
      await db.prepare('DELETE FROM ban_words WHERE id = ?').bind(wordId).run();
      invalidateBanWordsCache();
      await addLog(db, 'banword', 'delete', `删除违禁词`, user.user_id);
      return jsonResponse({ success: true });
    }
    
    // ========== 日志管理 ==========
    if (path === '/api/logs') {
      // 需要 view_logs 权限
      if (!hasScopedPermission(user, CONFIG.PERMISSIONS.VIEW_LOGS)) {
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
      const limit = normalizeApiLimit(url.searchParams.get('limit'), 100);
      const paged = url.searchParams.get('paged') === '1';
      const cursor = url.searchParams.get('cursor');
      const search = url.searchParams.get('search') || '';
      const userIdFilter = url.searchParams.get('user_id') || '';
      const groupIdFilter = url.searchParams.get('group_id') || '';
      const dateFrom = url.searchParams.get('date_from') || '';
      const dateTo = url.searchParams.get('date_to') || '';
      
      let query = 'SELECT * FROM logs WHERE 1 = 1';
      const params = [];
      
      if (type && type !== 'all') {
        query += ' AND type = ?';
        params.push(type);
      }
      if (search) {
        query += ' AND (details LIKE ? OR action LIKE ? OR user_id LIKE ? OR group_id LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (userIdFilter) {
        query += ' AND user_id = ?';
        params.push(userIdFilter);
      }
      if (groupIdFilter) {
        if (!canAccessGroup(user, groupIdFilter)) return jsonResponse({ error: '权限不足' }, 403);
        query += ' AND group_id = ?';
        params.push(groupIdFilter);
      } else {
        query = appendOptionalGroupScope(query, params, 'group_id', user, true);
      }
      if (dateFrom) {
        const parsed = parseDateParam(dateFrom, '开始日期');
        if (parsed.error) return jsonResponse({ error: parsed.error }, 400);
        query += ' AND created_at_iso >= ?';
        params.push(parsed.value);
      }
      if (dateTo) {
        const parsed = parseDateParam(dateTo, '结束日期', true);
        if (parsed.error) return jsonResponse({ error: parsed.error }, 400);
        query += ' AND created_at_iso <= ?';
        params.push(parsed.value);
      }
      if (cursor) {
        const cursorId = parseInt(cursor, 10);
        if (!Number.isFinite(cursorId) || cursorId < 1) {
          return jsonResponse({ error: 'cursor格式错误' }, 400);
        }
        query += ' AND id < ?';
        params.push(cursorId);
      }
      
      query += ' ORDER BY id DESC LIMIT ?';
      params.push(paged ? limit + 1 : limit);
      
      const stmt = db.prepare(query);
      const logs = await stmt.bind(...params).all();
      const rows = getD1Rows(logs);
      if (paged) {
        const items = rows.slice(0, limit);
        const nextCursor = rows.length > limit ? items[items.length - 1]?.id : null;
        return jsonResponse({ items, nextCursor });
      }
      return jsonResponse(rows);
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
    return jsonResponse({ error: '服务器处理失败' }, 500);
  }
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
    
    // 静态资源由 Static Assets 自动处理（ASSET_NAMESPACE）
    return env.ASSETS.fetch(request);
  }
};
