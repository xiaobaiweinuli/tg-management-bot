
const HTML = [
'<!DOCTYPE html>',
'<html lang="zh-CN">',
'<head>',
'  <meta charset="UTF-8">',
'  <title>星霜 Pro 群组管理系统</title>',
'  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">',
'  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">',
'  <meta http-equiv="Pragma" content="no-cache">',
'  <meta http-equiv="Expires" content="0">',
'  <script src="https://telegram.org/js/telegram-web-app.js"></script>',
'  <style>',
'    :root { --primary: #0088cc; --bg: #0f0f0f; --card: #181818; --text: #f5f5f5; --border: #2e2e2e; --danger: #ff4d4f; --success: #52c41a; --warning: #faad14; }',
'    body { font-family: -apple-system, system-ui, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 0; }',
'    header { background: #1a1a1ab3; backdrop-filter: blur(10px); padding: 12px 20px; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; }',
'    main { max-width: 1200px; margin: 0 auto; padding: 15px; padding-bottom: 80px; }',
'    .card { background: var(--card); border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid var(--border); }',
'    h2 { margin: 0 0 12px 0; font-size: 15px; color: var(--primary); display: flex; align-items: center; gap: 8px; text-transform: uppercase; }',
'    .search-box { width: 100%; padding: 12px; background: #222; border: 1px solid var(--border); border-radius: 8px; color: #fff; margin-bottom: 15px; box-sizing: border-box; outline: none; }',
'    .item-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }',
'    .avatar { width: 44px; height: 44px; border-radius: 50%; background: #333; object-fit: cover; flex-shrink: 0; border: 1px solid var(--border); }',
'    .info { flex: 1; overflow: hidden; }',
'    .title { font-weight: 600; font-size: 14px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
'    .subtitle { font-size: 11px; color: #888; margin-top: 2px; }',
'    .tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #333; color: #aaa; }',
'    .ctrl-group { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }',
'    label { display: flex; align-items: center; background: #262626; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; border: 1px solid var(--border); transition: all 0.2s; }',
'    label:hover { border-color: var(--primary); }',
'    input[type="checkbox"] { margin-right: 6px; }',
'    button { border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-size: 13px; font-weight: 500; transition: 0.2s; }',
'    .btn-p { background: var(--primary); color: white; }',
'    .btn-s { background: #333; color: #ccc; }',
'    .btn-d { background: #442222; color: var(--danger); }',
'    .btn-w { background: #443322; color: var(--warning); }',
'    table { width: 100%; border-collapse: collapse; font-size: 12px; }',
'    td { padding: 10px 4px; border-top: 1px solid var(--border); }',
'    .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; background: var(--success); }',
'    .empty { text-align: center; color: #666; padding: 40px 0; }',
'    #toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #333; color: white; padding: 10px 20px; border-radius: 8px; font-size: 13px; display: none; z-index: 1000; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid var(--primary); }',
'    .debug-info { background: #222; padding: 10px; border-radius: 6px; margin: 10px 0; font-size: 11px; color: #aaa; }',
'    .log-item { padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 12px; }',
'    .log-time { font-size: 10px; color: #888; }',
'    .log-type { display: inline-block; padding: 2px 6px; border-radius: 4px; margin-right: 6px; font-size: 10px; }',
'    .log-type-join { background: #2e4a2e; color: #8fcc8f; }',
'    .log-type-ban { background: #4a2e2e; color: #ff8a8a; }',
'    .log-type-unban { background: #2e3c4a; color: #8ac7ff; }',
'    .log-type-group { background: #3c2e4a; color: #c7a9ff; }',
'    .log-type-admin { background: #4a3c2e; color: #ffd28a; }',
'    .log-type-system { background: #2e4a3c; color: #8affc2; }',
'    .log-type-permission { background: #4a2e3c; color: #ff8ac7; }',
'    .log-type-request { background: #2e4a4a; color: #8affff; }',
'    .log-type-notify { background: #2e4a2e; color: #8aff8a; }',
'    .filter-buttons { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }',
'    .filter-btn { padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; border: 1px solid var(--border); background: #222; color: #aaa; }',
'    .filter-btn.active { background: var(--primary); color: white; border-color: var(--primary); }',
'    .ban-management { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }',
'    .ban-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }',
'    .ban-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }',
'    .ban-card-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }',
'    .ban-card-info { flex: 1; }',
'    .ban-card-title { font-weight: 600; font-size: 13px; }',
'    .ban-card-subtitle { font-size: 10px; color: #888; }',
'    .ban-card-details { font-size: 11px; color: #aaa; margin: 8px 0; }',
'    .ban-card-actions { display: flex; gap: 6px; }',
'    .ban-action-btn { flex: 1; padding: 6px 10px; font-size: 11px; }',
'    /* 白名单样式 */',
'    .whitelist-management { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }',
'    .whitelist-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }',
'    /* 管理员通知设置样式 */',
'    .notification-management { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }',
'    .notification-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }',
'    .notification-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }',
'    .notification-card-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }',
'    .notification-card-info { flex: 1; }',
'    .notification-card-title { font-weight: 600; font-size: 13px; }',
'    .notification-card-subtitle { font-size: 10px; color: #888; }',
'    .notification-card-details { font-size: 11px; color: #aaa; margin: 8px 0; }',
'    .notification-card-actions { display: flex; gap: 6px; }',
'    .notification-action-btn { flex: 1; padding: 6px 10px; font-size: 11px; }',
'    /* 违禁词样式 */',
'    .forbidden-words-management { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }',
'    .forbidden-words-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }',
'    .word-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); }',
'    .word-item:last-child { border-bottom: none; }',
'    .word-text { flex: 1; font-size: 13px; }',
'    .word-actions { display: flex; gap: 6px; }',
'    /* 管理员管理样式 */',
'    .admin-management { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }',
'    .admin-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }',
'    .admin-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }',
'    .admin-card-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }',
'    .admin-card-info { flex: 1; }',
'    .admin-card-title { font-weight: 600; font-size: 13px; }',
'    .admin-card-subtitle { font-size: 10px; color: #888; }',
'    .admin-card-details { font-size: 11px; color: #aaa; margin: 8px 0; }',
'    .admin-card-actions { display: flex; gap: 6px; }',
'    .admin-action-btn { flex: 1; padding: 6px 10px; font-size: 11px; }',
'    .modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000; }',
'    .modal-content { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; max-width: 400px; width: 90%; max-height: 80vh; overflow-y: auto; }',
'    .modal-header { margin-bottom: 15px; }',
'    .modal-body { margin-bottom: 20px; }',
'    .form-group { margin-bottom: 15px; }',
'    .form-label { display: block; margin-bottom: 5px; font-size: 12px; color: #aaa; }',
'    .form-input, .form-select { width: 100%; padding: 8px; background: #222; border: 1px solid var(--border); border-radius: 6px; color: #fff; box-sizing: border-box; }',
'    .modal-footer { display: flex; gap: 10px; }',
'    .form-hint { font-size: 10px; color: #888; margin-top: 4px; }',
'    .user-preview { display: flex; align-items: center; gap: 12px; padding: 12px; background: #222; border-radius: 8px; margin: 10px 0; }',
'    .user-preview-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }',
'    .user-preview-info { flex: 1; }',
'    .user-preview-name { font-weight: 600; font-size: 13px; }',
'    .user-preview-username { font-size: 11px; color: #888; }',
'    .group-badge { display: inline-block; padding: 2px 6px; background: #2e4a2e; color: #8fcc8f; border-radius: 4px; font-size: 10px; margin: 2px; }',
'    .super-admin-badge { display: inline-block; padding: 2px 6px; background: #4a3c2e; color: #ffd28a; border-radius: 4px; font-size: 10px; margin: 2px; }',
'    .admin-badge { display: inline-block; padding: 2px 6px; background: #2e3c4a; color: #8ac7ff; border-radius: 4px; font-size: 10px; margin: 2px; }',
'    /* 面包菜单样式 */',
'    .breadcrumb-menu { position: relative; }',
'    .menu-toggle { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; padding: 8px; border-radius: 6px; }',
'    .menu-toggle:hover { background: rgba(255,255,255,0.1); }',
'    .menu-dropdown { display: none; position: absolute; top: 100%; right: 0; background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 8px; min-width: 180px; z-index: 1000; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }',
'    .menu-item { padding: 10px 15px; cursor: pointer; border-radius: 6px; font-size: 13px; color: var(--text); }',
'    .menu-item:hover { background: var(--primary); color: white; }',
'    .menu-item.active { background: var(--primary); color: white; }',
'    /* 手动添加群组样式 */',
'    .add-group-btn {',
'      margin-left: 10px;',
'      padding: 6px 12px;',
'      font-size: 12px;',
'    }',
'    .group-avatar-small {',
'      width: 20px;',
'      height: 20px;',
'      border-radius: 50%;',
'      margin-right: 8px;',
'      vertical-align: middle;',
'    }',
'    /* 违禁词导出弹窗样式 */',
'    .words-export-content {',
'      max-width: 500px;',
'      width: 90%;',
'    }',
'    .words-textarea {',
'      width: 100%;',
'      height: 300px;',
'      background: #222;',
'      color: white;',
'      border: 1px solid var(--border);',
'      border-radius: 6px;',
'      padding: 10px;',
'      box-sizing: border-box;',
'      font-family: monospace;',
'      font-size: 12px;',
'      resize: none;',
'      margin-bottom: 15px;',
'    }',
'    .copy-btn {',
'      width: 100%;',
'      margin-bottom: 10px;',
'    }',
'  </style>',
'</head>',
'<body>',
'  <header>',
'    <div style="display:flex; align-items:center; gap:8px; flex:1;"><div class="status-dot"></div><b style="font-size:16px;">星霜 Pro</b></div>',
'    <span id="sync-status" style="font-size:11px; color:#666; margin-right:15px;">初始化同步中...</span>',
'    <div class="breadcrumb-menu">',
'      <button id="menuToggle" class="menu-toggle">☰</button>',
'      <div id="menuDropdown" class="menu-dropdown">',
'        <div class="menu-item active" data-tab="dashboard">📊 控制面板</div>',
'        <div class="menu-item" data-tab="bans">🚫 封禁管理</div>',
'        <div class="menu-item" data-tab="whitelist">✅ 用户白名单</div>',
'        <div class="menu-item" data-tab="admins">🛡️ 管理员管理</div>',
'        <div class="menu-item" data-tab="notifications">🔔 通知设置</div>',
'        <div class="menu-item" data-tab="forbidden-words">🚫 违禁词管理</div>',
'        <div class="menu-item" data-tab="logs">📋 系统日志</div>',
'      </div>',
'    </div>',
'  </header>',
'  <main id="app"><div class="empty">正在载入星霜管理平面...</div></main>',
'  <div id="toast"></div>',
'  <script>',
'    const api = ""; const tg = window.Telegram.WebApp; let searchKey = ""; let lastData = ""; let isUpdating = false; let logFilter = "all"; let currentTab = "dashboard"; let whitelistSearch = "";',
'    // 数据缓存对象',
'    let dataCache = {',
'      groups: null,',
'      bans: null,',
'      admins: null,',
'      webhook: null,',
'      logs: null,',
'      debugInfo: null,',
'      whitelist: null,',
'      forbiddenWords: null,',
'      adminList: null,',
'      notificationSettings: null,',
'      lastFetchTime: {},',
'      cacheDuration: 30000 // 30秒缓存',
'    };',
'    ',
'    // 面包菜单事件处理',
'    function initMenu() {',
'      const menuToggle = document.getElementById("menuToggle");',
'      const menuDropdown = document.getElementById("menuDropdown");',
'      ',
'      if (menuToggle && menuDropdown) {',
'        menuToggle.addEventListener("click", function(e) {',
'          e.stopPropagation();',
'          menuDropdown.style.display = menuDropdown.style.display === "block" ? "none" : "block";',
'        });',
'        ',
'        // 点击外部关闭菜单',
'        document.addEventListener("click", function(e) {',
'          if (menuDropdown && !menuDropdown.contains(e.target) && e.target !== menuToggle) {',
'            menuDropdown.style.display = "none";',
'          }',
'        });',
'        ',
'        // 菜单项点击事件',
'        const menuItems = document.querySelectorAll(".menu-item");',
'        menuItems.forEach(item => {',
'          item.addEventListener("click", function() {',
'            const tab = this.getAttribute("data-tab");',
'            switchTab(tab);',
'            if (menuDropdown) menuDropdown.style.display = "none";',
'            // 更新菜单项激活状态',
'            menuItems.forEach(i => i.classList.remove("active"));',
'            this.classList.add("active");',
'          });',
'        });',
'      }',
'    }',
'    ',
'    function showToast(msg) { const t = document.getElementById("toast"); t.innerText = msg; t.style.display = "block"; setTimeout(() => t.style.display = "none", 2500); }',
'    // 修正后的时间格式化函数 - 正确处理各种时间格式为北京时间',
'    function formatBeijingTime(timestamp) {',
'      if (!timestamp) return "";',
'      ',
'      let date;',
'      ',
'      // 处理不同的时间格式',
'      if (typeof timestamp === "number") {',
'        // 数字时间戳：检查是秒还是毫秒',
'        if (timestamp < 10000000000) {',
'          // 秒级时间戳',
'          date = new Date(timestamp * 1000);',
'        } else {',
'          // 毫秒级时间戳',
'          date = new Date(timestamp);',
'        }',
'      } else if (typeof timestamp === "string") {',
'        // 字符串：尝试解析',
'        // 检查是否包含T（ISO格式）',
'        if (timestamp.includes("T")) {',
'          date = new Date(timestamp);',
'        } else if (!isNaN(timestamp)) {',
'          // 纯数字字符串',
'          const num = parseInt(timestamp);',
'          date = new Date(num < 10000000000 ? num * 1000 : num);',
'        } else {',
'          // 其他字符串格式',
'          date = new Date(timestamp);',
'        }',
'      } else {',
'        // 其他情况（如Date对象）',
'        date = new Date(timestamp);',
'      }',
'      ',
'      // 如果日期无效，返回空字符串',
'      if (isNaN(date.getTime())) return "";',
'      ',
'      // 转换为北京时间（UTC+8）',
'      const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);',
'      ',
'      // 格式化为北京时间字符串',
'      return beijingTime.toLocaleString("zh-CN", {',
'        year: "numeric",',
'        month: "2-digit",',
'        day: "2-digit",',
'        hour: "2-digit",',
'        minute: "2-digit",',
'        second: "2-digit",',
'        hour12: false',
'      });',
'    }',
'    ',
'    async function init() {',
'      try {',
'        tg.ready(); tg.expand();',
'        const user = tg.initDataUnsafe?.user;',
'        if (!user) { document.getElementById("app").innerHTML = "<div class=\'empty\'>❌ 请在 Telegram 客户端打开</div>"; return; }',
'        ',
'        console.log("Telegram用户信息:", user);',
'        ',
'        // 直接使用Telegram Web App提供的用户信息进行验证',
'        const res = await fetch(api + "/api/verify", {',
'          method: "POST",',
'          headers: {"Content-Type":"application/json"},',
'          body: JSON.stringify({ ',
'            userId: user.id,',
'            firstName: user.first_name,',
'            lastName: user.last_name,',
'            username: user.username',
'          })',
'        });',
'        ',
'        console.log("验证响应状态:", res.status);',
'        ',
'        if (res.ok) {',
'          const data = await res.json();',
'          console.log("验证响应数据:", data);',
'          if (data.success) {',
'            // 保存会话令牌',
'            localStorage.sessionToken = data.token;',
'            localStorage.sessionExpires = data.expires;',
'            localStorage.tgId = user.id;',
'            startSync();',
'          } else {',
'            document.getElementById("app").innerHTML = "<div class=\'empty\'>🚫 认证失败: " + (data.error || "未知错误") + "</div>";',
'          }',
'        } else {',
'          const errorText = await res.text();',
'          document.getElementById("app").innerHTML = "<div class=\'empty\'>🚫 认证失败: 服务器错误 (" + res.status + " - " + errorText + ")</div>";',
'        }',
'      } catch (error) {',
'        console.error("初始化错误:", error);',
'        document.getElementById("app").innerHTML = "<div class=\'empty\'>🚫 初始化失败: " + error.message + "</div>";',
'      }',
'      ',
'      // 初始化面包菜单',
'      initMenu();',
'      ',
'      // 添加刷新按钮',
'      addRefreshButton();',
'    }',
'    ',
'    // 添加刷新按钮',
'    function addRefreshButton() {',
'      const header = document.querySelector(\'header\');',
'      const refreshBtn = document.createElement(\'button\');',
'      refreshBtn.innerHTML = \'🔄\';',
'      refreshBtn.style.background = \'none\';',
'      refreshBtn.style.border = \'none\';',
'      refreshBtn.style.color = \'var(--text)\';',
'      refreshBtn.style.fontSize = \'16px\';',
'      refreshBtn.style.cursor = \'pointer\';',
'      refreshBtn.style.padding = \'8px\';',
'      refreshBtn.style.borderRadius = \'6px\';',
'      refreshBtn.title = \'刷新当前页面\';',
'      refreshBtn.onclick = function() {',
'        clearCache(); // 清除所有缓存',
'        render();',
'      };',
'      ',
'      // 插入到同步状态旁边',
'      const syncStatus = document.getElementById(\'sync-status\');',
'      syncStatus.parentNode.insertBefore(refreshBtn, syncStatus.nextSibling);',
'    }',
'    ',
'    function startSync() { render(); setInterval(render, 5000); }',
'    ',
'    // 优化后的fetchAPI函数，支持缓存',
'    async function fetchAPI(path, opts={}, useCache=true) {',
'      const now = Date.now();',
'      const cacheKey = path;',
'      ',
'      // 检查会话是否过期',
'      const sessionExpires = localStorage.sessionExpires;',
'      if (sessionExpires && now > parseInt(sessionExpires)) {',
'        // 会话过期，清除本地存储并重新加载',
'        localStorage.removeItem(\'sessionToken\');',
'        localStorage.removeItem(\'sessionExpires\');',
'        localStorage.removeItem(\'tgId\');',
'        location.reload();',
'        return null;',
'      }',
'      ',
'      // 检查缓存',
'      if (useCache && dataCache[cacheKey] && ',
'          dataCache.lastFetchTime[cacheKey] && ',
'          now - dataCache.lastFetchTime[cacheKey] < dataCache.cacheDuration) {',
'        return dataCache[cacheKey];',
'      }',
'      ',
'      try {',
'        const headers = {',
'          "X-Session-Token": localStorage.sessionToken || ""',
'        };',
'        ',
'        // 向后兼容：如果没有会话令牌，使用旧的X-TG-ID',
'        if (!localStorage.sessionToken && localStorage.tgId) {',
'          headers["X-TG-ID"] = localStorage.tgId;',
'        }',
'        ',
'        const res = await fetch(api + path, { ',
'          headers: headers, ',
'          ...opts ',
'        });',
'        ',
'        if (res.status === 401 || res.status === 403) {',
'          // 认证失败，清除本地存储并重新加载',
'          localStorage.removeItem(\'sessionToken\');',
'          localStorage.removeItem(\'sessionExpires\');',
'          localStorage.removeItem(\'tgId\');',
'          location.reload();',
'          return null;',
'        }',
'        ',
'        const data = await res.json();',
'        ',
'        // 缓存数据',
'        if (useCache) {',
'          dataCache[cacheKey] = data;',
'          dataCache.lastFetchTime[cacheKey] = now;',
'        }',
'        ',
'        return data;',
'      } catch(e) { ',
'        console.error(\'API请求失败:\', e);',
'        return null; ',
'      }',
'    }',
'    ',
'    // 清除缓存的方法',
'    function clearCache(path) {',
'      if (path) {',
'        delete dataCache[path];',
'        delete dataCache.lastFetchTime[path];',
'      } else {',
'        // 清除所有缓存',
'        dataCache = {',
'          groups: null,',
'          bans: null,',
'          admins: null,',
'          webhook: null,',
'          logs: null,',
'          debugInfo: null,',
'          whitelist: null,',
'          forbiddenWords: null,',
'          adminList: null,',
'          notificationSettings: null,',
'          lastFetchTime: {},',
'          cacheDuration: 30000',
'        };',
'      }',
'    }',
'    ',
'    // 优化的渲染函数，按需加载数据',
'    async function render() {',
'      if (isUpdating) return;',
'      isUpdating = true;',
'      ',
'      try {',
'        document.getElementById("sync-status").innerText = "同步中...";',
'        ',
'        let data = null;',
'        ',
'        switch(currentTab) {',
'          case "dashboard":',
'            // 仪表板需要所有数据',
'            data = await Promise.all([',
'              fetchAPI("/api/groups"),',
'              fetchAPI("/api/bans"),',
'              fetchAPI("/api/admins"),',
'              fetchAPI("/api/webhook-info"),',
'              fetchAPI("/api/logs"),',
'              fetchAPI("/api/debug"),',
'              fetchAPI("/api/whitelist"),',
'              fetchAPI("/api/forbidden-words"),',
'              fetchAPI("/api/admin-list"),',
'              fetchAPI("/api/notification-settings")',
'            ]);',
'            break;',
'            ',
'          case "bans":',
'            // 封禁管理只需要封禁记录和群组',
'            data = await Promise.all([',
'              fetchAPI("/api/bans"),',
'              fetchAPI("/api/groups")',
'            ]);',
'            // 填充其他数据为空',
'            data = [data[1], data[0], null, null, null, null, null, null, null, null];',
'            break;',
'            ',
'          case "whitelist":',
'            // 白名单只需要白名单和群组',
'            data = await Promise.all([',
'              fetchAPI("/api/whitelist"),',
'              fetchAPI("/api/groups")',
'            ]);',
'            data = [data[1], null, null, null, null, null, data[0], null, null, null];',
'            break;',
'            ',
'          case "admins":',
'            // 管理员管理只需要管理员和群组',
'            data = await Promise.all([',
'              fetchAPI("/api/admin-list"),',
'              fetchAPI("/api/groups")',
'            ]);',
'            data = [data[1], null, null, null, null, null, null, null, data[0], null];',
'            break;',
'            ',
'          case "notifications":',
'            // 通知设置只需要通知设置和管理员',
'            data = await Promise.all([',
'              fetchAPI("/api/notification-settings"),',
'              fetchAPI("/api/admin-list")',
'            ]);',
'            data = [null, null, null, null, null, null, null, null, data[1], data[0]];',
'            break;',
'            ',
'          case "forbidden-words":',
'            // 违禁词只需要违禁词',
'            data = [null, null, null, null, null, null, null, await fetchAPI("/api/forbidden-words"), null, null];',
'            break;',
'            ',
'          case "logs":',
'            // 日志只需要日志',
'            data = [null, null, null, null, await fetchAPI("/api/logs"), null, null, null, null, null];',
'            break;',
'        }',
'        ',
'        if (!data) {',
'          document.getElementById("app").innerHTML = \'<div class="empty">加载数据失败</div>\';',
'          return;',
'        }',
'        ',
'        const [groups, bans, admins, webhook, logs, debugInfo, whitelist, forbiddenWords, adminList, notificationSettings] = data;',
'        const filteredGroups = (groups || []).filter(g => ',
'          g && (g.title || \'\').toLowerCase().includes((searchKey || \'\').toLowerCase()) || ',
'          (g.chat_id || \'\').toString().includes(searchKey || \'\') || ',
'          (g.username || \'\').toLowerCase().includes((searchKey || \'\').toLowerCase())',
'        );',
'        ',
'        // 根据筛选条件过滤日志',
'        const filteredLogs = (logs || []).filter(log => {',
'          if (logFilter === "all") return true;',
'          if (logFilter === "join") return log.type === "join";',
'          if (logFilter === "ban") return log.type === "ban";',
'          if (logFilter === "permission") return log.type === "permission";',
'          if (logFilter === "request") return log.type === "request";',
'          if (logFilter === "notify") return log.type === "notify";',
'          if (logFilter === "system") return log.type === "system";',
'          return true;',
'        });',
'        ',
'        // 过滤白名单',
'        const filteredWhitelist = (whitelist || []).filter(w => {',
'          if (!whitelistSearch) return true;',
'          return (w.username && w.username.toLowerCase().includes(whitelistSearch.toLowerCase())) ||',
'                 w.user_id.toString().includes(whitelistSearch) ||',
'                 (w.remark && w.remark.toLowerCase().includes(whitelistSearch.toLowerCase())) ||',
'                 (w.display_name && w.display_name.toLowerCase().includes(whitelistSearch.toLowerCase()));',
'        });',
'        ',
'        document.getElementById("sync-status").innerText = "已同步 " + new Date().toLocaleTimeString();',
'        ',
'        if (currentTab === "dashboard") {',
'          document.getElementById("app").innerHTML = `',
'            <div class="card">',
'              <h2>📡 系统状态</h2>',
'              <div class="debug-info">',
'                <strong>调试信息：</strong><br>',
'                Webhook: ${webhook?.url ? "🛡️ 已连接" : "⚠️ 未连接"}<br>',
'                数据库连接: ${debugInfo?.db_status || "未知"}<br>',
'                Bans表记录: ${debugInfo?.bans_count || 0}<br>',
'                Logs表记录: ${debugInfo?.logs_count || 0}<br>',
'                Groups表记录: ${debugInfo?.groups_count || 0}<br>',
'                Whitelist表记录: ${debugInfo?.whitelist_count || 0}<br>',
'                违禁词数量: ${debugInfo?.forbidden_words_count || 0}<br>',
'                管理员数量: ${debugInfo?.admin_count || 0}<br>',
'                最近更新: ${new Date().toLocaleTimeString()}',
'              </div>',
'              <div style="display:flex; gap:10px; margin-top:15px; flex-wrap:wrap;">',
'                <button class="btn-p" onclick="setWebhook()">同步配置</button>',
'                <button class="btn-s" onclick="initDB()">初始化 D1 数据库</button>',
'              </div>',
'            </div>',
'            <div class="card">',
'              <h2>👥 群组规则编辑器 (${groups?.length || 0})</h2>',
'              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">',
'                <div style="flex: 1;">',
'                  <input type="text" class="search-box" placeholder="搜索群组、ID或用户名..." onfocus="isUpdating=true" onblur="isUpdating=false" oninput="searchKey=this.value; render();" value="${searchKey}" style="margin-bottom: 0;">',
'                </div>',
'                <button class="btn-p add-group-btn" onclick="showAddGroupModal()">➕ 手动添加群组</button>',
'              </div>',
'              ${filteredGroups.length === 0 ? \'<div class="empty">暂无受控群组</div>\' : filteredGroups.map(g => `',
'                <div class="item-row" style="flex-direction:column; align-items:flex-start;">',
'                  <div style="display:flex; align-items:center; gap:12px; width:100%;">',
'                    <img class="avatar" src="${api}/api/group-avatar?chat_id=${g.chat_id}" onerror="this.src=\'https://ui-avatars.com/api/?name=G&background=333&color=fff\'">',
'                    <div class="info">',
'                      <span class="title">${g.title}</span>',
'                      <span class="subtitle">${g.chat_id} ${g.username ? \'| @\' + g.username : \'\'}</span>',
'                    </div>',
'                  </div>',
'                  <div class="ctrl-group">',
'                    <label><input type="checkbox" ${g.block_ads?"checked":""} onchange="updGroup(\'${g.chat_id}\',\'ads\',this.checked)"> 防广告</label>',
'                    <label><input type="checkbox" ${g.allow_chinese?"checked":""} onchange="updGroup(\'${g.chat_id}\',\'chinese\',this.checked)"> 中文名</label>',
'                    <label><input type="checkbox" ${g.require_avatar?"checked":""} onchange="updGroup(\'${g.chat_id}\',\'avatar\',this.checked)"> 有头像</label>',
'                    <select style="background:#333;color:#fff;border:none;border-radius:4px;padding:4px;font-size:11px;" onchange="updGroup(\'${g.chat_id}\',\'duration\',this.value)">',
'                      <option value="3600" ${g.ban_duration==3600?"selected":""}>封禁 1h</option>',
'                      <option value="86400" ${g.ban_duration==86400?"selected":""}>封禁 24h</option>',
'                      <option value="0" ${g.ban_duration==0?"selected":""}>永久封禁</option>',
'                    </select>',
'                    <button class="btn-d" style="padding: 4px 8px; font-size: 11px;" onclick="deleteGroup(${g.chat_id}, \'${g.title.replace(/\'/g, "\\\\\'")}\')">删除</button>',
'                  </div>',
'                </div>`).join("")}',
'            </div>`;',
'        } else if (currentTab === "bans") {',
'          // 按群组分组封禁记录',
'          const bansByGroup = {};',
'          (bans || []).forEach(ban => {',
'            const key = ban.chat_id + "|" + ban.chat_title;',
'            if (!bansByGroup[key]) {',
'              bansByGroup[key] = {',
'                chat_id: ban.chat_id,',
'                chat_title: ban.chat_title,',
'                bans: []',
'              };',
'            }',
'            bansByGroup[key].bans.push(ban);',
'          });',
'          ',
'          document.getElementById("app").innerHTML = `',
'            <div class="card">',
'              <h2>🚫 封禁管理 (${bans?.length || 0})</h2>',
'              <div style="margin-bottom: 15px;">',
'                <input type="text" class="search-box" placeholder="搜索用户名或ID..." onfocus="isUpdating=true" onblur="isUpdating=false" oninput="searchBans(this.value)" value="">',
'              </div>',
'              <div class="ban-management">',
'                ${Object.values(bansByGroup).map(group => `',
'                  <div class="ban-card">',
'                    <div class="ban-card-header">',
'                      <img class="ban-card-avatar" src="${api}/api/group-avatar?chat_id=${group.chat_id}" onerror="this.src=\'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHJ4PSIxOCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjE4IiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjYWFhYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCI+RzwvdGV4dD48L3N2Zz4=\'">',
'                      <div class="ban-card-info">',
'                        <div class="ban-card-title">${group.chat_title}</div>',
'                        <div class="ban-card-subtitle">ID: ${group.chat_id} | 封禁: ${group.bans.length}</div>',
'                      </div>',
'                    </div>',
'                    ${group.bans.map(ban => {',
'                      // 使用新的时间格式化函数',
'                      const timeStr = formatBeijingTime(ban.timestamp * 1000);',
'                      const displayName = ban.username || `用户${ban.user_id}`;',
'                      ',
'                      return `<div style="margin-bottom: 10px; padding: 8px; background: #222; border-radius: 6px;">',
'                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">',
'                          <img style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" src="${api}/api/user-avatar?user_id=${ban.user_id}">',
'                          <div style="flex: 1;">',
'                            <div style="font-size: 12px; font-weight: 600;">${displayName}</div>',
'                            <div style="font-size: 9px; color: #666;">ID: ${ban.user_id}</div>',
'                          </div>',
'                        </div>',
'                        <div style="font-size: 10px; color: #aaa; margin-bottom: 4px;">',
'                          <span class="tag">${ban.reason}</span>',
'                        </div>',
'                        <div style="font-size: 9px; color: #777;">${timeStr}</div>',
'                        <div class="ban-card-actions">',
'                          <button class="btn-s ban-action-btn" onclick="unban(${ban.user_id},${ban.chat_id})">解封</button>',
'                          <button class="btn-d ban-action-btn" onclick="deleteBan(${ban.id})">删除记录</button>',
'                          <button class="btn-s ban-action-btn" onclick="addToWhitelist(${ban.user_id})">加入白名单</button>',
'                        </div>',
'                      </div>`;',
'                    }).join("")}',
'                    ${group.bans.length === 0 ? \'<div class="empty" style="padding: 20px 0;">该群组无封禁记录</div>\' : ""}',
'                  </div>',
'                `).join("")}',
'                ${Object.keys(bansByGroup).length === 0 ? \'<div class="empty">无封禁记录</div>\' : ""}',
'              </div>',
'            </div>`;',
'        } else if (currentTab === "whitelist") {',
'          // 按群组分组白名单记录',
'          const whitelistByGroup = {};',
'          const globalWhitelist = [];',
'          ',
'          // 初始化所有群组',
'          (groups || []).forEach(g => {',
'            const key = g.chat_id + "|" + g.title;',
'            whitelistByGroup[key] = {',
'              chat_id: g.chat_id,',
'              chat_title: g.title,',
'              whitelists: []',
'            };',
'          });',
'          ',
'          // 处理白名单用户',
'          (filteredWhitelist || []).forEach(w => {',
'            const chatIds = w.chat_ids ? JSON.parse(w.chat_ids) : [];',
'            ',
'            if (chatIds.length === 0) {',
'              // 全局白名单',
'              globalWhitelist.push(w);',
'            } else {',
'              // 特定群组白名单',
'              chatIds.forEach(chatId => {',
'                // 查找对应的群组',
'                const groupKey = Object.keys(whitelistByGroup).find(key => {',
'                  const groupChatId = key.split("|")[0];',
'                  return groupChatId === chatId.toString();',
'                });',
'                ',
'                if (groupKey) {',
'                  whitelistByGroup[groupKey].whitelists.push(w);',
'                }',
'              });',
'            }',
'          });',
'          ',
'          document.getElementById("app").innerHTML = `',
'            <div class="card">',
'              <h2>✅ 用户白名单管理 (${filteredWhitelist?.length || 0})</h2>',
'              <div style="margin-bottom: 15px;">',
'                <input type="text" class="search-box" placeholder="搜索用户ID、昵称、用户名或备注..." onfocus="isUpdating=true" onblur="isUpdating=false" oninput="whitelistSearch=this.value; render();" value="${whitelistSearch}">',
'              </div>',
'              <div style="margin-bottom: 15px;">',
'                <button class="btn-p" onclick="showAddWhitelistModal()">➕ 添加白名单用户</button>',
'                <button class="btn-s" onclick="batchAddWhitelist()">📝 批量导入</button>',
'              </div>',
'              ',
'              <div class="whitelist-management">',
'                ${globalWhitelist.length > 0 ? `',
'                  <div class="whitelist-card">',
'                    <div class="ban-card-header">',
'                      <img class="ban-card-avatar" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzYiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHJ4PSIxOCIgZmlsbD0iIzJlNGEyZSIvPjx0ZXh0IHg9IjE4IiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOGZjYzlmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCI+4piM8L3RleHQ+PC9zdmc+">',
'                      <div class="ban-card-info">',
'                        <div class="ban-card-title">全局白名单</div>',
'                        <div class="ban-card-subtitle">适用于所有群组 | 用户: ${globalWhitelist.length}</div>',
'                      </div>',
'                    </div>',
'                    ${globalWhitelist.map(w => {',
'                      const displayName = w.display_name || `用户${w.user_id}`;',
'                      const username = w.username ? `@${w.username}` : "";',
'                      // 使用新的时间格式化函数',
'                      const createdTime = formatBeijingTime(w.created_at);',
'                      ',
'                      return `<div style="margin-bottom: 10px; padding: 8px; background: #222; border-radius: 6px;">',
'                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">',
'                          <img style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" src="${api}/api/user-avatar?user_id=${w.user_id}">',
'                          <div style="flex: 1;">',
'                            <div style="font-size: 12px; font-weight: 600;">${displayName}</div>',
'                            <div style="font-size: 9px; color: #666;">ID: ${w.user_id} ${username ? \'| \' + username : ""}</div>',
'                          </div>',
'                        </div>',
'                        <div style="font-size: 10px; color: #aaa; margin-bottom: 4px;">',
'                          <span class="tag">${w.remark || "无备注"}</span>',
'                        </div>',
'                        <div style="font-size: 9px; color: #777;">添加: ${createdTime}</div>',
'                        <div class="ban-card-actions">',
'                          <button class="btn-s ban-action-btn" onclick="editWhitelist(${w.id})">编辑</button>',
'                          <button class="btn-d ban-action-btn" onclick="removeWhitelist(${w.id}, ${w.user_id})">移除</button>',
'                        </div>',
'                      </div>`;',
'                    }).join("")}',
'                  </div>',
'                ` : ""}',
'                ',
'                ${Object.values(whitelistByGroup).filter(group => group.whitelists.length > 0).map(group => `',
'                  <div class="whitelist-card">',
'                    <div class="ban-card-header">',
'                      <img class="ban-card-avatar" src="${api}/api/group-avatar?chat_id=${group.chat_id}" onerror="this.src=\'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHJ4PSIxOCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjE4IiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjYWFhYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCI+RzwvdGV4dD48L3N2Zz4=\'">',
'                      <div class="ban-card-info">',
'                        <div class="ban-card-title">${group.chat_title}</div>',
'                        <div class="ban-card-subtitle">ID: ${group.chat_id} | 白名单: ${group.whitelists.length}</div>',
'                      </div>',
'                    </div>',
'                    ${group.whitelists.map(w => {',
'                      const displayName = w.display_name || `用户${w.user_id}`;',
'                      const username = w.username ? `@${w.username}` : "";',
'                      // 使用新的时间格式化函数',
'                      const createdTime = formatBeijingTime(w.created_at);',
'                      ',
'                      return `<div style="margin-bottom: 10px; padding: 8px; background: #222; border-radius: 6px;">',
'                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">',
'                          <img style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" src="${api}/api/user-avatar?user_id=${w.user_id}">',
'                          <div style="flex: 1;">',
'                            <div style="font-size: 12px; font-weight: 600;">${displayName}</div>',
'                            <div style="font-size: 9px; color: #666;">ID: ${w.user_id} ${username ? \'| \' + username : ""}</div>',
'                          </div>',
'                        </div>',
'                        <div style="font-size: 10px; color: #aaa; margin-bottom: 4px;">',
'                          <span class="tag">${w.remark || "无备注"}</span>',
'                        </div>',
'                        <div style="font-size: 9px; color: #777;">添加: ${createdTime}</div>',
'                        <div class="ban-card-actions">',
'                          <button class="btn-s ban-action-btn" onclick="editWhitelist(${w.id})">编辑</button>',
'                          <button class="btn-d ban-action-btn" onclick="removeWhitelist(${w.id}, ${w.user_id})">移除</button>',
'                        </div>',
'                      </div>`;',
'                    }).join("")}',
'                  </div>',
'                `).join("")}',
'                ${globalWhitelist.length === 0 && Object.values(whitelistByGroup).filter(g => g.whitelists.length > 0).length === 0 ? \'<div class="empty">暂无白名单用户</div>\' : ""}',
'              </div>',
'            </div>`;',
'        } else if (currentTab === "admins") {',
'          // 分组显示管理员（按群组）',
'          const adminsByGroup = {};',
'          const globalAdmins = [];',
'          ',
'          // 初始化所有群组',
'          (groups || []).forEach(g => {',
'            const key = g.chat_id + "|" + g.title;',
'            adminsByGroup[key] = {',
'              chat_id: g.chat_id,',
'              chat_title: g.title,',
'              admins: []',
'            };',
'          });',
'          ',
'          // 处理管理员',
'          (adminList || []).forEach(admin => {',
'            const chatIds = admin.chat_ids ? JSON.parse(admin.chat_ids) : [];',
'            ',
'            if (chatIds.length === 0) {',
'              // 全局管理员',
'              globalAdmins.push(admin);',
'            } else {',
'              // 特定群组管理员',
'              chatIds.forEach(chatId => {',
'                const groupKey = Object.keys(adminsByGroup).find(key => {',
'                  const groupChatId = key.split("|")[0];',
'                  return groupChatId === chatId.toString();',
'                });',
'                ',
'                if (groupKey) {',
'                  // 确保不重复添加',
'                  if (!adminsByGroup[groupKey].admins.find(a => a.id === admin.id)) {',
'                    adminsByGroup[groupKey].admins.push(admin);',
'                  }',
'                }',
'              });',
'            }',
'          });',
'          ',
'          document.getElementById("app").innerHTML = `',
'            <div class="card">',
'              <h2>🛡️ 管理员管理 (${adminList?.length || 0})</h2>',
'              <div style="margin-bottom: 15px;">',
'                <button class="btn-p" onclick="showAddAdminModal()">➕ 添加管理员</button>',
'              </div>',
'              ',
'              <div class="admin-management">',
'                ${globalAdmins.length > 0 ? `',
'                  <div class="admin-card">',
'                    <div class="admin-card-header">',
'                      <img class="admin-card-avatar" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzYiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHJ4PSIxOCIgZmlsbD0iIzRjM2MyZSIvPjx0ZXh0IHg9IjE4IiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZkMjhhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCI+4piM8L3RleHQ+PC9zdmc+">',
'                      <div class="admin-card-info">',
'                        <div class="admin-card-title">全局管理员</div>',
'                        <div class="ban-card-subtitle">适用于所有群组 | 管理员: ${globalAdmins.length}</div>',
'                      </div>',
'                    </div>',
'                    ${globalAdmins.map(admin => {',
'                      const displayName = admin.display_name || `用户${admin.user_id}`;',
'                      const username = admin.username ? `@${admin.username}` : "";',
'                      const isSuper = admin.is_super == 1;',
'                      // 使用新的时间格式化函数',
'                      const createdTime = formatBeijingTime(admin.created_at);',
'                      ',
'                      return `<div style="margin-bottom: 10px; padding: 8px; background: #222; border-radius: 6px;">',
'                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">',
'                          <img style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" src="${api}/api/user-avatar?user_id=${admin.user_id}">',
'                          <div style="flex: 1;">',
'                            <div style="font-size: 12px; font-weight: 600;">${displayName}</div>',
'                            <div style="font-size: 9px; color: #666;">ID: ${admin.user_id} ${username ? \'| \' + username : ""}</div>',
'                            <div style="margin-top: 2px;">',
'                              ${isSuper ? \'<span class="super-admin-badge">超级管理员</span>\' : \'<span class="admin-badge">普通管理员</span>\'}',
'                            </div>',
'                          </div>',
'                        </div>',
'                        <div style="font-size: 9px; color: #777;">添加: ${createdTime}</div>',
'                        <div class="admin-card-actions">',
'                          <button class="btn-s admin-action-btn" onclick="editAdmin(${admin.id})">编辑</button>',
'                          <button class="btn-d admin-action-btn" onclick="removeAdmin(${admin.id}, ${admin.user_id})" ${isSuper ? "disabled" : ""}>移除</button>',
'                        </div>',
'                      </div>`;',
'                    }).join("")}',
'                  </div>',
'                ` : ""}',
'                ',
'                ${Object.values(adminsByGroup).filter(group => group.admins.length > 0).map(group => `',
'                  <div class="admin-card">',
'                    <div class="admin-card-header">',
'                      <img class="admin-card-avatar" src="${api}/api/group-avatar?chat_id=${group.chat_id}" onerror="this.src=\'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHJ4PSIxOCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjE4IiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjYWFhYWFhIiB0ZXh0LWFuY2hvcj0ibWtkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCI+RzwvdGV4dD48L3N2Zz4=\'">',
'                      <div class="admin-card-info">',
'                        <div class="admin-card-title">${group.chat_title}</div>',
'                        <div class="ban-card-subtitle">ID: ${group.chat_id} | 管理员: ${group.admins.length}</div>',
'                      </div>',
'                    </div>',
'                    ${group.admins.map(admin => {',
'                      const displayName = admin.display_name || `用户${admin.user_id}`;',
'                      const username = admin.username ? `@${admin.username}` : "";',
'                      const isSuper = admin.is_super == 1;',
'                      // 使用新的时间格式化函数',
'                      const createdTime = formatBeijingTime(admin.created_at);',
'                      ',
'                      return `<div style="margin-bottom: 10px; padding: 8px; background: #222; border-radius: 6px;">',
'                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">',
'                          <img style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" src="${api}/api/user-avatar?user_id=${admin.user_id}">',
'                          <div style="flex: 1;">',
'                            <div style="font-size: 12px; font-weight: 600;">${displayName}</div>',
'                            <div style="font-size: 9px; color: #666;">ID: ${admin.user_id} ${username ? \'| \' + username : ""}</div>',
'                            <div style="margin-top: 2px;">',
'                              ${isSuper ? \'<span class="super-admin-badge">超级管理员</span>\' : \'<span class="admin-badge">普通管理员</span>\'}',
'                            </div>',
'                          </div>',
'                        </div>',
'                        <div style="font-size: 9px; color: #777;">添加: ${createdTime}</div>',
'                        <div class="admin-card-actions">',
'                          <button class="btn-s admin-action-btn" onclick="editAdmin(${admin.id})">编辑</button>',
'                          <button class="btn-d admin-action-btn" onclick="removeAdmin(${admin.id}, ${admin.user_id})" ${isSuper ? "disabled" : ""}>移除</button>',
'                        </div>',
'                      </div>`;',
'                    }).join("")}',
'                  </div>',
'                `).join("")}',
'                ${globalAdmins.length === 0 && Object.values(adminsByGroup).filter(g => g.admins.length > 0).length === 0 ? \'<div class="empty">暂无管理员</div>\' : ""}',
'              </div>',
'            </div>`;',
'        } else if (currentTab === "notifications") {',
'          document.getElementById("app").innerHTML = `',
'            <div class="card">',
'              <h2>🔔 通知设置管理 (${notificationSettings?.length || 0})</h2>',
'              <div style="margin-bottom: 15px;">',
'                <button class="btn-p" onclick="showAddNotificationModal()">➕ 添加通知设置</button>',
'              </div>',
'              ',
'              <div class="notification-management">',
'                ${notificationSettings?.length > 0 ? notificationSettings.map(notify => {',
'                  const adminId = notify.admin_id;',
'                  const id = notify.id;',
'                  const displayName = notify.display_name || (notify.is_super ? `超级管理员${adminId}` : `用户${adminId}`);',
'                  const username = notify.username ? `@${notify.username}` : "";',
'                  const isSuper = notify.is_super === true;',
'                  const chatIds = notify.chat_ids ? JSON.parse(notify.chat_ids) : [];',
'                  const isGlobal = chatIds.length === 0;',
'                  const notifyValue = notify.notify; // 直接使用数据库的值',
'                  // 使用新的时间格式化函数',
'                  const createdTime = formatBeijingTime(notify.created_at);',
'                  const updatedTime = notify.updated_at ? formatBeijingTime(notify.updated_at) : null;',
'                  ',
'                  return `<div class="notification-card">',
'                    <div class="notification-card-header">',
'                      <img class="notification-card-avatar" src="${api}/api/user-avatar?user_id=${adminId}" onerror="this.src=\'https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=333&color=fff\'">',
'                      <div class="notification-card-info">',
'                        <div class="notification-card-title">${notify.username || displayName}</div>',
'                        <div class="notification-card-subtitle">ID: ${adminId} ${notify.username ? \'| @\' + notify.username : \'\'} ${isSuper ? \'| 超级管理员\' : \'| 普通管理员\'}</div>',
'                        <div class="notification-card-subtitle">${isGlobal ? \'全局所有群组\' : \'特定群组: \' + chatIds.length + \'个\'}</div>',
'                      </div>',
'                    </div>',
'                    <div style="margin: 10px 0; padding: 10px; background: #222; border-radius: 6px;">',
'                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">',
'                        <span style="font-size: 11px; color: #aaa;">通知开关:</span>',
'                        <label style="margin: 0;">',
'                          <input type="checkbox" ${notifyValue == 1 ? "checked" : ""} onchange="updateNotification(${id}, ${adminId}, this.checked)">',
'                          <span style="font-size: 11px; margin-left: 5px;">${notifyValue == 1 ? "已开启" : "已关闭"}</span>',
'                        </label>',
'                      </div>',
'                      <div style="font-size: 10px; color: #777;">',
'                        ${updatedTime ? \'更新: \' + updatedTime : \'\'}',
'                        ${!updatedTime && createdTime ? \'创建: \' + createdTime : \'\'}',
'                      </div>',
'                    </div>',
'                    <div class="notification-card-actions">',
'                      <button class="btn-s notification-action-btn" onclick="editNotification(${id}, ${adminId})">编辑</button>',
'                      <button class="btn-d notification-action-btn" onclick="removeNotification(${id}, ${adminId})" ${isSuper ? "disabled" : ""}>移除</button>',
'                    </div>',
'                  </div>`;',
'                }).join("") : \'<div class="empty">暂无通知设置</div>\'}',
'              </div>',
'            </div>`;',
'        } else if (currentTab === "forbidden-words") {',
'          document.getElementById("app").innerHTML = `',
'            <div class="card">',
'              <h2>🚫 违禁词管理 (${forbiddenWords?.length || 0})</h2>',
'              <div style="margin-bottom: 15px;">',
'                <button class="btn-p" onclick="showAddForbiddenWordModal()">➕ 添加违禁词</button>',
'                <button class="btn-w" onclick="batchAddForbiddenWords()">📝 批量导入</button>',
'                <button class="btn-s" onclick="exportForbiddenWords()">📤 查看违禁词列表</button>',
'              </div>',
'              <div class="forbidden-words-management">',
'                <div class="forbidden-words-card">',
'                  <div style="margin-bottom: 10px; font-size: 11px; color: #aaa;">',
'                    当前系统已配置 ${forbiddenWords?.length || 0} 个违禁词，用于检测用户昵称、用户名中的广告和违规内容。',
'                  </div>',
'                  ${(forbiddenWords || []).map(word => `',
'                    <div class="word-item">',
'                      <div class="word-text">${word.word}</div>',
'                      <div class="word-actions">',
'                        <button class="btn-s" style="padding: 4px 8px; font-size: 10px;" onclick="editForbiddenWord(${word.id}, \'${word.word.replace(/\'/g, "\\\'")}\')">编辑</button>',
'                        <button class="btn-d" style="padding: 4px 8px; font-size: 10px;" onclick="removeForbiddenWord(${word.id}, \'${word.word.replace(/\'/g, "\\\'")}\')">删除</button>',
'                      </div>',
'                    </div>',
'                  `).join("")}',
'                  ${!forbiddenWords || forbiddenWords.length === 0 ? \'<div class="empty">暂无违禁词</div>\' : ""}',
'              </div>',
'            </div>',
'          </div>`;',
'        } else if (currentTab === "logs") {',
'          document.getElementById("app").innerHTML = `',
'            <div class="card">',
'              <h2>📋 系统完整日志 (${filteredLogs.length}/${logs?.length || 0})</h2>',
'              <div class="filter-buttons">',
'                <button class="filter-btn ${logFilter==="all"?"active":""}" onclick="setLogFilter(\'all\')">全部</button>',
'                <button class="filter-btn ${logFilter==="join"?"active":""}" onclick="setLogFilter(\'join\')">入群</button>',
'                <button class="filter-btn ${logFilter==="ban"?"active":""}" onclick="setLogFilter(\'ban\')">封禁</button>',
'                <button class="filter-btn ${logFilter==="permission"?"active":""}" onclick="setLogFilter(\'permission\')">权限</button>',
'                <button class="filter-btn ${logFilter==="request"?"active":""}" onclick="setLogFilter(\'request\')">请求</button>',
'                <button class="filter-btn ${logFilter==="notify"?"active":""}" onclick="setLogFilter(\'notify\')">通知</button>',
'                <button class="filter-btn ${logFilter==="system"?"active":""}" onclick="setLogFilter(\'system\')">系统</button>',
'              </div>',
'              <div style="max-height: 500px; overflow-y: auto;">',
'                ${filteredLogs.length === 0 ? \'<div class="empty">暂无日志记录</div>\' : filteredLogs.map(log => {',
'                  // 使用新的时间格式化函数',
'                  const timeStr = formatBeijingTime(log.timestamp);',
'                  const typeClass = \'log-type-\' + (log.type || \'system\');',
'                  return `<div class="log-item">',
'                    <div>',
'                      <span class="log-type ${typeClass}">${log.type || "system"}</span>',
'                      <span style="font-weight:600;">${log.action}</span>',
'                    </div>',
'                    <div style="margin: 4px 0; font-size: 11px;">${log.details || ""}</div>',
'                    <div style="font-size: 9px; color: #666;">AdminID: ${log.admin_id} | LogID: ${log.id}</div>',
'                    <div class="log-time">${timeStr}</div>',
'                  </div>`',
'                }).join("")}',
'              </div>',
'            </div>`;',
'        }',
'      } catch (error) {',
'        console.error(\'渲染失败:\', error);',
'        document.getElementById("app").innerHTML = `<div class="empty">加载失败: ${error.message}</div>`;',
'      } finally {',
'        isUpdating = false;',
'      }',
'    }',
'    ',
'    function switchTab(tab) { ',
'      currentTab = tab; ',
'      ',
'      // 清除当前标签页不关心的缓存',
'      switch(tab) {',
'        case "dashboard":',
'          // 保留所有缓存',
'          break;',
'        case "bans":',
'          clearCache("/api/whitelist");',
'          clearCache("/api/forbidden-words");',
'          clearCache("/api/admin-list");',
'          clearCache("/api/notification-settings");',
'          break;',
'        case "whitelist":',
'          clearCache("/api/bans");',
'          clearCache("/api/forbidden-words");',
'          clearCache("/api/admin-list");',
'          clearCache("/api/notification-settings");',
'          break;',
'        case "admins":',
'          clearCache("/api/bans");',
'          clearCache("/api/whitelist");',
'          clearCache("/api/forbidden-words");',
'          clearCache("/api/notification-settings");',
'          break;',
'        case "notifications":',
'          clearCache("/api/bans");',
'          clearCache("/api/whitelist");',
'          clearCache("/api/forbidden-words");',
'          clearCache("/api/admin-list");',
'          break;',
'        case "forbidden-words":',
'          clearCache("/api/bans");',
'          clearCache("/api/whitelist");',
'          clearCache("/api/admin-list");',
'          clearCache("/api/notification-settings");',
'          break;',
'        case "logs":',
'          clearCache("/api/groups");',
'          clearCache("/api/bans");',
'          clearCache("/api/whitelist");',
'          clearCache("/api/forbidden-words");',
'          clearCache("/api/admin-list");',
'          clearCache("/api/notification-settings");',
'          break;',
'      }',
'      ',
'      render(); ',
'      // 更新菜单项激活状态',
'      const menuItems = document.querySelectorAll(".menu-item");',
'      menuItems.forEach(item => {',
'        item.classList.remove("active");',
'        if (item.getAttribute("data-tab") === tab) {',
'          item.classList.add("active");',
'        }',
'      });',
'    }',
'    ',
'    function setLogFilter(filter) { logFilter = filter; render(); }',
'    ',
'    async function searchBans(keyword) {',
'      const res = await fetch(api + "/api/search-bans?q=" + encodeURIComponent(keyword), { headers: {"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""} });',
'      const bans = await res.json();',
'      if (bans && bans.length > 0) {',
'        alert(`找到 ${bans.length} 条封禁记录`);',
'      } else {',
'        alert("未找到相关封禁记录");',
'      }',
'    }',
'    ',
'    async function updGroup(id, type, val) { ',
'      isUpdating = true;',
'      const res = await fetch(api + "/api/groups/update", { method:"POST", headers:{"Content-Type":"application/json","X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}, body:JSON.stringify({id, type, val}) }); ',
'      if (res.ok) { ',
'        showToast("配置同步成功"); ',
'        clearCache("/api/groups");',
'        render(); ',
'      }',
'      isUpdating = false;',
'    }',
'    ',
'    async function updAdmin(id, val) { ',
'      await fetch(api + "/api/admins/update", { method:"POST", headers:{"Content-Type":"application/json","X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}, body:JSON.stringify({id, val}) }); ',
'      showToast("权限已更新"); ',
'      clearCache("/api/admins");',
'      clearCache("/api/admin-list");',
'      clearCache("/api/notification-settings");',
'      render(); ',
'    }',
'    ',
'    async function unban(uid, cid) { ',
'      if(confirm(`确定要解封用户 ${uid} 吗？`)) {',
'        await fetch(api + "/api/unban", { method:"POST", headers:{"Content-Type":"application/json","X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}, body:JSON.stringify({user_id:uid, chat_id:cid}) }); ',
'        showToast("已下发解封指令"); ',
'        clearCache("/api/bans");',
'        render();',
'      }',
'    }',
'    ',
'    async function deleteBan(banId) { ',
'      if(confirm("确定要删除这条封禁记录吗？")) {',
'        await fetch(api + "/api/delete-ban", { method:"POST", headers:{"Content-Type":"application/json","X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}, body:JSON.stringify({ban_id:banId}) }); ',
'        showToast("封禁记录已删除"); ',
'        clearCache("/api/bans");',
'        render();',
'      }',
'    }',
'    ',
'    async function initDB() { ',
'      if(confirm("该操作将初始化数据库表结构。继续？")){ ',
'        const res = await fetch(api + "/api/init-db", {method:"POST", headers:{"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}}); ',
'        alert(await res.text()); ',
'        clearCache();',
'        render(); ',
'      } ',
'    }',
'    ',
'    async function setWebhook() { ',
'      const res = await fetch(api + "/api/set-webhook", {method:"POST", headers:{"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}}); ',
'      alert(await res.text()); ',
'      clearCache("/api/webhook-info");',
'      render(); ',
'    }',
'    ',
'    // 白名单相关函数',
'    async function editWhitelist(id) {',
'      try {',
'        const res = await fetch(api + "/api/whitelist-details?id=" + id, {',
'          headers: {"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}',
'        });',
'        ',
'        if (!res.ok) {',
'          const errorText = await res.text();',
'          alert("获取白名单信息失败: " + (errorText || res.status));',
'          return;',
'        }',
'        ',
'        const result = await res.json();',
'        ',
'        if (result.success === false) {',
'          alert("获取失败: " + result.error);',
'          return;',
'        }',
'        ',
'        showAddWhitelistModal(result.data || result);',
'      } catch (error) {',
'        console.error("编辑白名单失败:", error);',
'        alert("编辑失败: " + error.message);',
'      }',
'    }',
'    ',
'    function showAddWhitelistModal(entry = null) {',
'      const isEdit = entry !== null;',
'      const userId = isEdit ? entry.user_id : "";',
'      const id = isEdit ? entry.id : null;',
'      const remark = isEdit ? entry.remark || "" : "";',
'      const chatIds = isEdit ? (entry.chat_ids ? JSON.parse(entry.chat_ids) : []) : [];',
'      ',
'      document.body.innerHTML += `',
'        <div class="modal" id="whitelistModal">',
'          <div class="modal-content">',
'            <div class="modal-header">',
'              <h2>${isEdit ? "编辑白名单用户" : "添加白名单用户"}</h2>',
'            </div>',
'            <div class="modal-body">',
'              <div class="user-preview" id="userPreview">',
'                <img class="user-preview-avatar" id="userPreviewAvatar" src="">',
'                <div class="user-preview-info">',
'                  <div class="user-preview-name" id="userPreviewName">正在获取用户信息...</div>',
'                  <div class="user-preview-username" id="userPreviewUsername"></div>',
'                </div>',
'              </div>',
'              <div class="form-group">',
'                <label class="form-label">用户ID *</label>',
'                <input type="number" id="whitelistUserId" class="form-input" value="${userId}" ${isEdit ? "readonly" : ""} onchange="fetchUserInfo(this.value)">',
'                <div class="form-hint">请输入用户的Telegram数字ID</div>',
'              </div>',
'              <div class="form-group">',
'                <label class="form-label">适用群组 (留空表示所有群组)</label>',
'                <select id="whitelistChatIds" class="form-select" multiple style="height: 100px;">',
'                  <option value="">所有群组</option>',
'                </select>',
'                <div class="form-hint">按住Ctrl键多选，不选表示所有群组</div>',
'              </div>',
'              <div class="form-group">',
'                <label class="form-label">备注 (可选)</label>',
'                <input type="text" id="whitelistRemark" class="form-input" value="${remark}">',
'                <div class="form-hint">用于标记此用户的信息，如"管理员朋友"、"重要成员"等</div>',
'              </div>',
'            </div>',
'            <div class="modal-footer">',
'              <button class="btn-p" onclick="saveWhitelist(${id ? id : "null"})">保存</button>',
'              <button class="btn-s" onclick="closeModal()">取消</button>',
'            </div>',
'          </div>',
'        </div>',
'      `;',
'      ',
'      // 加载群组列表并设置选中的群组',
'      setTimeout(async () => {',
'        const groups = await fetchAPI("/api/groups");',
'        const select = document.getElementById("whitelistChatIds");',
'        ',
'        // 清空选项（除了第一个"所有群组"选项）',
'        while (select.options.length > 1) {',
'          select.remove(1);',
'        }',
'        ',
'        // 添加群组选项',
'        if (groups && groups.length > 0) {',
'          groups.forEach(g => {',
'            const option = document.createElement("option");',
'            option.value = g.chat_id;',
'            option.textContent = `${g.title} (${g.chat_id}) ${g.username ? "@" + g.username : ""}`;',
'            select.appendChild(option);',
'          });',
'        }',
'        ',
'        // 设置已选中的群组',
'        if (chatIds && chatIds.length > 0) {',
'          for (let option of select.options) {',
'            option.selected = chatIds.includes(option.value.toString());',
'          }',
'        } else {',
'          // 如果没有选中任何群组，选中"所有群组"',
'          select.options[0].selected = true;',
'        }',
'        ',
'        // 自动获取用户信息',
'        if (userId) {',
'          await fetchUserInfo(userId);',
'        } else {',
'          document.getElementById("userPreview").style.display = "none";',
'        }',
'      }, 100);',
'    }',
'    ',
'    async function fetchUserInfo(userId) {',
'      if (!userId) {',
'        document.getElementById("userPreview").style.display = "none";',
'        return;',
'      }',
'      ',
'      try {',
'        document.getElementById("userPreview").style.display = "flex";',
'        document.getElementById("userPreviewName").innerText = "正在获取用户信息...";',
'        document.getElementById("userPreviewUsername").innerText = "";',
'        ',
'        const res = await fetch(api + "/api/get-user-info?user_id=" + userId, {',
'          headers: {"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}',
'        });',
'        ',
'        if (res.ok) {',
'          const userInfo = await res.json();',
'          if (userInfo.success) {',
'            document.getElementById("userPreviewName").innerText = userInfo.display_name || "用户" + userId;',
'            document.getElementById("userPreviewUsername").innerText = userInfo.username ? "@" + userInfo.username : "";',
'            if (userInfo.avatar_url) {',
'              document.getElementById("userPreviewAvatar").src = userInfo.avatar_url;',
'            } else {',
'              document.getElementById("userPreviewAvatar").src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(userInfo.display_name || "U") + "&background=333&color=fff";',
'            }',
'          } else {',
'            document.getElementById("userPreviewName").innerText = "用户" + userId;',
'            document.getElementById("userPreviewUsername").innerText = "无法获取用户信息";',
'            document.getElementById("userPreviewAvatar").src = "https://ui-avatars.com/api/?name=U&background=333&color=fff";',
'          }',
'        } else {',
'          document.getElementById("userPreviewName").innerText = "用户" + userId;',
'          document.getElementById("userPreviewUsername").innerText = "获取用户信息失败";',
'          document.getElementById("userPreviewAvatar").src = "https://ui-avatars.com/api/?name=U&background=333&color=fff";',
'        }',
'      } catch (error) {',
'        document.getElementById("userPreviewName").innerText = "用户" + userId;',
'        document.getElementById("userPreviewUsername").innerText = "获取用户信息失败";',
'        document.getElementById("userPreviewAvatar").src = "https://ui-avatars.com/api/?name=U&background=333&color=fff";',
'      }',
'    }',
'    ',
'    function closeModal() {',
'      const modal = document.getElementById("whitelistModal") || document.getElementById("adminModal") || document.getElementById("notificationModal") || document.getElementById("forbiddenWordModal") || document.getElementById("addGroupModal") || document.getElementById("exportForbiddenWordsModal");',
'      if (modal) modal.remove();',
'    }',
'    ',
'    async function saveWhitelist(id) {',
'      const userId = document.getElementById("whitelistUserId").value;',
'      const remark = document.getElementById("whitelistRemark").value;',
'      const select = document.getElementById("whitelistChatIds");',
'      const selectedOptions = Array.from(select.selectedOptions);',
'      ',
'      let chatIds = [];',
'      // 检查是否选择了"所有群组"',
'      if (selectedOptions.length > 0 && selectedOptions[0].value === "") {',
'        // 选择所有群组，chatIds为空数组',
'        chatIds = [];',
'      } else {',
'        chatIds = selectedOptions.map(option => option.value).filter(v => v);',
'      }',
'      ',
'      if (!userId) {',
'        alert("请输入用户ID");',
'        return;',
'      }',
'      ',
'      const data = {',
'        user_id: parseInt(userId),',
'        remark: remark || null,',
'        chat_ids: chatIds',
'      };',
'      ',
'      if (id) data.id = id;',
'      ',
'      const url = id ? api + "/api/whitelist/" + id : api + "/api/whitelist";',
'      const method = id ? "PUT" : "POST";',
'      ',
'      const res = await fetch(url, {',
'        method: method,',
'        headers: {',
'          "Content-Type": "application/json",',
'          "X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""',
'        },',
'        body: JSON.stringify(data)',
'      });',
'      ',
'      if (res.ok) {',
'        showToast(id ? "白名单已更新" : "白名单已添加");',
'        closeModal();',
'        clearCache("/api/whitelist");',
'        render();',
'      } else {',
'        const errorText = await res.text();',
'        alert("操作失败: " + errorText);',
'      }',
'    }',
'    ',
'    async function removeWhitelist(id, userId) {',
'      if(confirm(`确定要移除用户 ${userId} 的白名单吗？`)) {',
'        const res = await fetch(api + "/api/whitelist/" + id, {',
'          method: "DELETE",',
'          headers: {"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}',
'        });',
'        if (res.ok) {',
'          showToast("白名单已移除");',
'          clearCache("/api/whitelist");',
'          render();',
'        } else {',
'          alert("移除失败: " + (await res.text()));',
'        }',
'      }',
'    }',
'    ',
'    function addToWhitelist(userId) {',
'      showAddWhitelistModal({ user_id: userId });',
'    }',
'    ',
'    async function batchAddWhitelist() {',
'      const text = prompt("批量导入白名单用户（每行一个用户ID，可加备注）\\n格式1: 用户ID\\n格式2: 用户ID,备注\\n示例：\\n123456789\\n987654321,管理员朋友");',
'      if (!text) return;',
'      ',
'      const lines = text.split("\\n").filter(line => line.trim());',
'      const entries = [];',
'      ',
'      for (const line of lines) {',
'        const parts = line.split(",");',
'        if (parts.length < 1) continue;',
'        ',
'        const userId = parseInt(parts[0].trim());',
'        if (isNaN(userId)) continue;',
'        ',
'        const remark = parts.length > 1 ? parts[1].trim() : null;',
'        ',
'        entries.push({',
'          user_id: userId,',
'          remark,',
'          chat_ids: []  // 批量导入默认适用所有群组',
'        });',
'      }',
'      ',
'      if (entries.length === 0) {',
'        alert("没有有效的用户数据");',
'        return;',
'      }',
'      ',
'      if(confirm(`确定要批量添加 ${entries.length} 个用户到白名单吗？`)) {',
'        const res = await fetch(api + "/api/whitelist/batch", {',
'          method: "POST",',
'          headers: {',
'            "Content-Type": "application/json",',
'            "X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""',
'          },',
'          body: JSON.stringify({ entries })',
'        });',
'        ',
'        if (res.ok) {',
'          const result = await res.json();',
'          showToast(`成功添加 ${result.success} 个用户到白名单，失败 ${result.fail} 个`);',
'          clearCache("/api/whitelist");',
'          render();',
'        } else {',
'          alert("批量添加失败: " + (await res.text()));',
'        }',
'      }',
'    }',
'    ',
'    // 管理员管理相关函数',
'    function showAddAdminModal(entry = null) {',
'      const isEdit = entry !== null;',
'      const userId = isEdit ? entry.user_id : "";',
'      const id = isEdit ? entry.id : null;',
'      const isSuper = isEdit ? (entry.is_super == 1) : false;',
'      const chatIds = isEdit ? (entry.chat_ids ? JSON.parse(entry.chat_ids) : []) : [];',
'      ',
'      document.body.innerHTML += `',
'        <div class="modal" id="adminModal">',
'          <div class="modal-content">',
'            <div class="modal-header">',
'              <h2>${isEdit ? "编辑管理员" : "添加管理员"}</h2>',
'            </div>',
'            <div class="modal-body">',
'              <div class="user-preview" id="adminUserPreview">',
'                <img class="user-preview-avatar" id="adminUserPreviewAvatar" src="">',
'                <div class="user-preview-info">',
'                  <div class="user-preview-name" id="adminUserPreviewName">正在获取用户信息...</div>',
'                  <div class="user-preview-username" id="adminUserPreviewUsername"></div>',
'                </div>',
'              </div>',
'              <div class="form-group">',
'                <label class="form-label">用户ID *</label>',
'                <input type="number" id="adminUserId" class="form-input" value="${userId}" ${isEdit ? "readonly" : ""} onchange="fetchAdminUserInfo(this.value)">',
'                <div class="form-hint">请输入管理员的Telegram数字ID</div>',
'              </div>',
'              <div class="form-group">',
'                <label class="form-label">适用群组 (留空表示所有群组)</label>',
'                <select id="adminChatIds" class="form-select" multiple style="height: 100px;">',
'                  <option value="">所有群组</option>',
'                </select>',
'                <div class="form-hint">按住Ctrl键多选，不选表示所有群组</div>',
'              </div>',
'              <div class="form-group">',
'                <label class="form-label">管理员类型</label>',
'                <div>',
'                  <label style="display: block; margin-bottom: 5px;">',
'                    <input type="radio" name="adminType" value="normal" ${!isSuper ? "checked" : ""} ${isEdit && isSuper ? "disabled" : ""}>',
'                    <span style="font-size: 12px; margin-left: 5px;">普通管理员</span>',
'                  </label>',
'                  <label style="display: block;">',
'                    <input type="radio" name="adminType" value="super" ${isSuper ? "checked" : ""} disabled>',
'                    <span style="font-size: 12px; margin-left: 5px;">超级管理员（仅限环境变量配置）</span>',
'                  </label>',
'                </div>',
'              </div>',
'            </div>',
'            <div class="modal-footer">',
'              <button class="btn-p" onclick="saveAdmin(${id ? id : "null"})">保存</button>',
'              <button class="btn-s" onclick="closeModal()">取消</button>',
'            </div>',
'          </div>',
'        </div>',
'      `;',
'      ',
'      // 加载群组列表并设置选中的群组',
'      setTimeout(async () => {',
'        const groups = await fetchAPI("/api/groups");',
'        const select = document.getElementById("adminChatIds");',
'        ',
'        // 清空选项（除了第一个"所有群组"选项）',
'        while (select.options.length > 1) {',
'          select.remove(1);',
'        }',
'        ',
'        // 添加群组选项',
'        if (groups && groups.length > 0) {',
'          groups.forEach(g => {',
'            const option = document.createElement("option");',
'            option.value = g.chat_id;',
'            option.textContent = `${g.title} (${g.chat_id}) ${g.username ? "@" + g.username : ""}`;',
'            select.appendChild(option);',
'          });',
'        }',
'        ',
'        // 设置已选中的群组',
'        if (chatIds && chatIds.length > 0) {',
'          for (let option of select.options) {',
'            option.selected = chatIds.includes(option.value.toString());',
'          }',
'        } else {',
'          // 如果没有选中任何群组，选中"所有群组"',
'          select.options[0].selected = true;',
'        }',
'        ',
'        // 自动获取用户信息',
'        if (userId) {',
'          await fetchAdminUserInfo(userId);',
'        } else {',
'          document.getElementById("adminUserPreview").style.display = "none";',
'        }',
'      }, 100);',
'    }',
'    ',
'    async function fetchAdminUserInfo(userId) {',
'      if (!userId) {',
'        document.getElementById("adminUserPreview").style.display = "none";',
'        return;',
'      }',
'      ',
'      try {',
'        document.getElementById("adminUserPreview").style.display = "flex";',
'        document.getElementById("adminUserPreviewName").innerText = "正在获取用户信息...";',
'        document.getElementById("adminUserPreviewUsername").innerText = "";',
'        ',
'        const res = await fetch(api + "/api/get-user-info?user_id=" + userId, {',
'          headers: {"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}',
'        });',
'        ',
'        if (res.ok) {',
'          const userInfo = await res.json();',
'          if (userInfo.success) {',
'            document.getElementById("adminUserPreviewName").innerText = userInfo.display_name || "用户" + userId;',
'            document.getElementById("adminUserPreviewUsername").innerText = userInfo.username ? "@" + userInfo.username : "";',
'            if (userInfo.avatar_url) {',
'              document.getElementById("adminUserPreviewAvatar").src = userInfo.avatar_url;',
'            } else {',
'              document.getElementById("adminUserPreviewAvatar").src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(userInfo.display_name || "U") + "&background=333&color=fff";',
'            }',
'          } else {',
'            document.getElementById("adminUserPreviewName").innerText = "用户" + userId;',
'            document.getElementById("adminUserPreviewUsername").innerText = "无法获取用户信息";',
'            document.getElementById("adminUserPreviewAvatar").src = "https://ui-avatars.com/api/?name=U&background=333&color=fff";',
'          }',
'        } else {',
'          document.getElementById("adminUserPreviewName").innerText = "用户" + userId;',
'          document.getElementById("adminUserPreviewUsername").innerText = "获取用户信息失败";',
'          document.getElementById("adminUserPreviewAvatar").src = "https://ui-avatars.com/api/?name=U&background=333&color=fff";',
'        }',
'      } catch (error) {',
'        document.getElementById("adminUserPreviewName").innerText = "用户" + userId;',
'        document.getElementById("adminUserPreviewUsername").innerText = "获取用户信息失败";',
'        document.getElementById("adminUserPreviewAvatar").src = "https://ui-avatars.com/api/?name=U&background=333&color=fff";',
'      }',
'    }',
'    ',
'    async function saveAdmin(id) {',
'      const userId = document.getElementById("adminUserId").value;',
'      const select = document.getElementById("adminChatIds");',
'      const selectedOptions = Array.from(select.selectedOptions);',
'      const adminType = document.querySelector(\'input[name="adminType"]:checked\').value;',
'      ',
'      let chatIds = [];',
'      // 检查是否选择了"所有群组"',
'      if (selectedOptions.length > 0 && selectedOptions[0].value === "") {',
'        // 选择所有群组，chatIds为空数组',
'        chatIds = [];',
'      } else {',
'        chatIds = selectedOptions.map(option => option.value).filter(v => v);',
'      }',
'      ',
'      if (!userId) {',
'        alert("请输入用户ID");',
'        return;',
'      }',
'      ',
'      const data = {',
'        user_id: parseInt(userId),',
'        chat_ids: chatIds,',
'        is_super: adminType === "super" ? 1 : 0',
'      };',
'      ',
'      if (id) data.id = id;',
'      ',
'      const url = id ? api + "/api/admin/" + id : api + "/api/admin";',
'      const method = id ? "PUT" : "POST";',
'      ',
'      const res = await fetch(url, {',
'        method: method,',
'        headers: {',
'          "Content-Type": "application/json",',
'          "X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""',
'        },',
'        body: JSON.stringify(data)',
'      });',
'      ',
'      if (res.ok) {',
'        showToast(id ? "管理员已更新" : "管理员已添加");',
'        closeModal();',
'        clearCache("/api/admin-list");',
'        clearCache("/api/notification-settings");',
'        clearCache("/api/admins");',
'        render();',
'      } else {',
'        const errorText = await res.text();',
'        alert("操作失败: " + errorText);',
'      }',
'    }',
'    ',
'    async function editAdmin(id) {',
'      try {',
'        const res = await fetch(api + "/api/admin-details?id=" + id, {',
'          headers: {"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}',
'        });',
'        ',
'        if (!res.ok) {',
'          const errorText = await res.text();',
'          alert("获取管理员信息失败: " + (errorText || res.status));',
'          return;',
'        }',
'        ',
'        const result = await res.json();',
'        ',
'        if (result.success === false) {',
'          alert("获取失败: " + result.error);',
'          return;',
'        }',
'        ',
'        showAddAdminModal(result.data || result);',
'      } catch (error) {',
'        console.error("编辑管理员失败:", error);',
'        alert("编辑失败: " + error.message);',
'      }',
'    }',
'    ',
'    async function removeAdmin(id, userId) {',
'      if(confirm(`确定要移除管理员 ${userId} 吗？`)) {',
'        const res = await fetch(api + "/api/admin/" + id, {',
'          method: "DELETE",',
'          headers: {"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}',
'        });',
'        if (res.ok) {',
'          showToast("管理员已移除");',
'          clearCache("/api/admin-list");',
'          clearCache("/api/notification-settings");',
'          clearCache("/api/admins");',
'          render();',
'        } else {',
'          alert("移除失败: " + (await res.text()));',
'        }',
'      }',
'    }',
'    ',
'    // 通知设置相关函数',
'    async function showAddNotificationModal(entry = null) {',
'      const isEdit = entry !== null;',
'      const adminId = isEdit ? entry.admin_id : "";',
'      const id = isEdit ? entry.id : null;',
'      const notify = isEdit ? (entry.notify == 1) : true;',
'      const chatIds = isEdit ? (entry.chat_ids ? JSON.parse(entry.chat_ids) : []) : [];',
'      ',
'      document.body.innerHTML += `',
'        <div class="modal" id="notificationModal">',
'          <div class="modal-content">',
'            <div class="modal-header">',
'              <h2>${isEdit ? "编辑通知设置" : "添加通知设置"}</h2>',
'            </div>',
'            <div class="modal-body">',
'              <div class="user-preview" id="notificationUserPreview">',
'                <img class="user-preview-avatar" id="notificationUserPreviewAvatar" src="">',
'                <div class="user-preview-info">',
'                  <div class="user-preview-name" id="notificationUserPreviewName">正在获取用户信息...</div>',
'                  <div class="user-preview-username" id="notificationUserPreviewUsername"></div>',
'                </div>',
'              </div>',
'              <div class="form-group">',
'                <label class="form-label">管理员ID *</label>',
'                <input type="number" id="notificationAdminId" class="form-input" value="${adminId}" ${isEdit ? "readonly" : ""} onchange="fetchNotificationUserInfo(this.value)">',
'                <div class="form-hint">请输入管理员的Telegram数字ID</div>',
'              </div>',
'              <div class="form-group">',
'                <label class="form-label">适用群组 (留空表示所有群组)</label>',
'                <select id="notificationChatIds" class="form-select" multiple style="height: 100px;">',
'                  <option value="">所有群组</option>',
'                </select>',
'                <div class="form-hint">按住Ctrl键多选，不选表示所有群组</div>',
'              </div>',
'              <div class="form-group">',
'                <label class="form-label">通知开关</label>',
'                <div>',
'                  <label style="display: block;">',
'                    <input type="checkbox" id="notificationToggle" ${notify ? "checked" : ""}>',
'                    <span style="font-size: 12px; margin-left: 5px;">启用通知</span>',
'                  </label>',
'                </div>',
'              </div>',
'            </div>',
'            <div class="modal-footer">',
'              <button class="btn-p" onclick="saveNotification(${id ? id : "null"})">保存</button>',
'              <button class="btn-s" onclick="closeModal()">取消</button>',
'            </div>',
'          </div>',
'        </div>',
'      `;',
'      ',
'      // 加载群组列表并设置选中的群组',
'      setTimeout(async () => {',
'        const groups = await fetchAPI("/api/groups");',
'        const select = document.getElementById("notificationChatIds");',
'        ',
'        // 清空选项（除了第一个"所有群组"选项）',
'        while (select.options.length > 1) {',
'          select.remove(1);',
'        }',
'        ',
'        // 添加群组选项',
'        if (groups && groups.length > 0) {',
'          groups.forEach(g => {',
'            const option = document.createElement("option");',
'            option.value = g.chat_id;',
'            option.textContent = `${g.title} (${g.chat_id}) ${g.username ? "@" + g.username : ""}`;',
'            select.appendChild(option);',
'          });',
'        }',
'        ',
'        // 设置已选中的群组',
'        if (chatIds && chatIds.length > 0) {',
'          for (let option of select.options) {',
'            option.selected = chatIds.includes(option.value.toString());',
'          }',
'        } else {',
'          // 如果没有选中任何群组，选中"所有群组"',
'          select.options[0].selected = true;',
'        }',
'        ',
'        // 自动获取用户信息',
'        if (adminId) {',
'          await fetchNotificationUserInfo(adminId);',
'        } else {',
'          document.getElementById("notificationUserPreview").style.display = "none";',
'        }',
'      }, 100);',
'    }',
'    ',
'    async function fetchNotificationUserInfo(userId) {',
'      if (!userId) {',
'        document.getElementById("notificationUserPreview").style.display = "none";',
'        return;',
'      }',
'      ',
'      try {',
'        document.getElementById("notificationUserPreview").style.display = "flex";',
'        document.getElementById("notificationUserPreviewName").innerText = "正在获取用户信息...";',
'        document.getElementById("notificationUserPreviewUsername").innerText = "";',
'        ',
'        const res = await fetch(api + "/api/get-user-info?user_id=" + userId, {',
'          headers: {"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}',
'        });',
'        ',
'        if (res.ok) {',
'          const userInfo = await res.json();',
'          if (userInfo.success) {',
'            document.getElementById("notificationUserPreviewName").innerText = userInfo.display_name || "用户" + userId;',
'            document.getElementById("notificationUserPreviewUsername").innerText = userInfo.username ? "@" + userInfo.username : "";',
'            if (userInfo.avatar_url) {',
'              document.getElementById("notificationUserPreviewAvatar").src = userInfo.avatar_url;',
'            } else {',
'              document.getElementById("notificationUserPreviewAvatar").src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(userInfo.display_name || "U") + "&background=333&color=fff";',
'            }',
'          } else {',
'            document.getElementById("notificationUserPreviewName").innerText = "用户" + userId;',
'            document.getElementById("notificationUserPreviewUsername").innerText = "无法获取用户信息";',
'            document.getElementById("notificationUserPreviewAvatar").src = "https://ui-avatars.com/api/?name=U&background=333&color=fff";',
'          }',
'        } else {',
'          document.getElementById("notificationUserPreviewName").innerText = "用户" + userId;',
'          document.getElementById("notificationUserPreviewUsername").innerText = "获取用户信息失败";',
'          document.getElementById("notificationUserPreviewAvatar").src = "https://ui-avatars.com/api/?name=U&background=333&color=fff";',
'        }',
'      } catch (error) {',
'        document.getElementById("notificationUserPreviewName").innerText = "用户" + userId;',
'        document.getElementById("notificationUserPreviewUsername").innerText = "获取用户信息失败";',
'        document.getElementById("notificationUserPreviewAvatar").src = "https://ui-avatars.com/api/?name=U&background=333&color=fff";',
'      }',
'    }',
'    ',
'    async function saveNotification(id) {',
'      const adminId = document.getElementById("notificationAdminId").value;',
'      const select = document.getElementById("notificationChatIds");',
'      const selectedOptions = Array.from(select.selectedOptions);',
'      const notify = document.getElementById("notificationToggle").checked;',
'      ',
'      let chatIds = [];',
'      // 检查是否选择了"所有群组"',
'      if (selectedOptions.length > 0 && selectedOptions[0].value === "") {',
'        // 选择所有群组，chatIds为空数组',
'        chatIds = [];',
'      } else {',
'        chatIds = selectedOptions.map(option => option.value).filter(v => v);',
'      }',
'      ',
'      if (!adminId) {',
'        alert("请输入管理员ID");',
'        return;',
'      }',
'      ',
'      const data = {',
'        admin_id: parseInt(adminId),',
'        chat_ids: chatIds,',
'        notify: notify ? 1 : 0',
'      };',
'      ',
'      if (id) data.id = id;',
'      ',
'      const url = api + "/api/notification/" + (id ? id : "");',
'      const method = id ? "PUT" : "POST";',
'      ',
'      const res = await fetch(url, {',
'        method: method,',
'        headers: {',
'          "Content-Type": "application/json",',
'          "X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""',
'        },',
'        body: JSON.stringify(data)',
'      });',
'      ',
'      if (res.ok) {',
'        showToast(id ? "通知设置已更新" : "通知设置已添加");',
'        closeModal();',
'        clearCache("/api/notification-settings");',
'        render();',
'      } else {',
'        const errorText = await res.text();',
'        alert("操作失败: " + errorText);',
'      }',
'    }',
'    ',
'    // 修复通知设置开关按钮实时更新数据库的问题',
'    async function updateNotification(id, adminId, notify) {',
'      if (!id || id === "null") {',
'        alert("通知设置ID无效，请先保存设置");',
'        return;',
'      }',
'      ',
'      try {',
'        // 先获取当前通知设置的详细信息，包括 chat_ids',
'        const resGet = await fetch(api + "/api/notification-details?id=" + id, {',
'          headers: {"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}',
'        });',
'        ',
'        if (!resGet.ok) {',
'          alert("无法获取当前设置");',
'          return;',
'        }',
'        ',
'        const result = await resGet.json();',
'        if (!result.success) {',
'          alert("获取当前设置失败: " + result.error);',
'          return;',
'        }',
'        ',
'        const currentData = result.data;',
'        ',
'        // 获取当前的 chat_ids',
'        const chatIds = currentData.chat_ids ? JSON.parse(currentData.chat_ids) : [];',
'        ',
'        // 发送更新请求，包含所有必要字段',
'        const res = await fetch(api + "/api/notification/" + id, {',
'          method: "PUT",',
'          headers: {',
'            "Content-Type": "application/json",',
'            "X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""',
'          },',
'          body: JSON.stringify({ ',
'            admin_id: adminId,',
'            chat_ids: chatIds,',
'            notify: notify ? 1 : 0  // 这里 notify 是新状态（this.checked）',
'          })',
'        });',
'        ',
'        if (res.ok) {',
'          showToast("通知设置已更新");',
'          clearCache("/api/notification-settings");',
'          render();',
'        } else {',
'          const errorText = await res.text();',
'          alert("更新失败: " + errorText);',
'        }',
'      } catch (error) {',
'        console.error("更新通知设置失败:", error);',
'        alert("更新失败: " + error.message);',
'      }',
'    }',
'    ',
'    async function editNotification(id, adminId) {',
'      try {',
'        const res = await fetch(api + "/api/notification-details?id=" + id, {',
'          headers: {"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}',
'        });',
'        ',
'        if (!res.ok) {',
'          const errorText = await res.text();',
'          alert("获取通知设置失败: " + (errorText || res.status));',
'          return;',
'        }',
'        ',
'        const result = await res.json();',
'        ',
'        if (result.success === false) {',
'          alert("获取失败: " + result.error);',
'          return;',
'        }',
'        ',
'        showAddNotificationModal(result.data || result);',
'      } catch (error) {',
'        console.error("编辑通知设置失败:", error);',
'        alert("编辑失败: " + error.message);',
'      }',
'    }',
'    ',
'    async function removeNotification(id, adminId) {',
'      if(confirm(`确定要移除管理员 ${adminId} 的通知设置吗？`)) {',
'        const res = await fetch(api + "/api/notification/" + id, {',
'          method: "DELETE",',
'          headers: {"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}',
'        });',
'        if (res.ok) {',
'          showToast("通知设置已移除");',
'          clearCache("/api/notification-settings");',
'          render();',
'        } else {',
'          alert("移除失败: " + (await res.text()));',
'        }',
'      }',
'    }',
'    ',
'    // 违禁词相关函数',
'    function showAddForbiddenWordModal(word = "", id = null) {',
'      const isEdit = word !== "";',
'      ',
'      document.body.innerHTML += `',
'        <div class="modal" id="forbiddenWordModal">',
'          <div class="modal-content">',
'            <div class="modal-header">',
'              <h2>${isEdit ? "编辑违禁词" : "添加违禁词"}</h2>',
'            </div>',
'            <div class="modal-body">',
'              <div class="form-group">',
'                <label class="form-label">违禁词 *</label>',
'                <input type="text" id="forbiddenWord" class="form-input" value="${word}" placeholder="请输入违禁词，如：广告、赌博">',
'                <div class="form-hint">违禁词用于检测用户昵称和用户名中的违规内容</div>',
'              </div>',
'            </div>',
'            <div class="modal-footer">',
'              <button class="btn-p" onclick="saveForbiddenWord(${id ? id : "null"})">保存</button>',
'              <button class="btn-s" onclick="closeModal()">取消</button>',
'            </div>',
'          </div>',
'        </div>',
'      `;',
'    }',
'    ',
'    async function saveForbiddenWord(id) {',
'      const word = document.getElementById("forbiddenWord").value.trim();',
'      ',
'      if (!word) {',
'        alert("请输入违禁词");',
'        return;',
'      }',
'      ',
'      const data = { word };',
'      ',
'      if (id) data.id = id;',
'      ',
'      const url = id ? api + "/api/forbidden-word/" + id : api + "/api/forbidden-word";',
'      const method = id ? "PUT" : "POST";',
'      ',
'      const res = await fetch(url, {',
'        method: method,',
'        headers: {',
'          "Content-Type": "application/json",',
'          "X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""',
'        },',
'        body: JSON.stringify(data)',
'      });',
'      ',
'      if (res.ok) {',
'        showToast(id ? "违禁词已更新" : "违禁词已添加");',
'        closeModal();',
'        clearCache("/api/forbidden-words");',
'        render();',
'      } else {',
'        const errorText = await res.text();',
'        alert("操作失败: " + errorText);',
'      }',
'    }',
'    ',
'    async function editForbiddenWord(id, word) {',
'      showAddForbiddenWordModal(word, id);',
'    }',
'    ',
'    async function removeForbiddenWord(id, word) {',
'      if(confirm(`确定要删除违禁词 "${word}" 吗？`)) {',
'        const res = await fetch(api + "/api/forbidden-word/" + id, {',
'          method: "DELETE",',
'          headers: {"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}',
'        });',
'        if (res.ok) {',
'          showToast("违禁词已删除");',
'          clearCache("/api/forbidden-words");',
'          render();',
'        } else {',
'          alert("删除失败: " + (await res.text()));',
'        }',
'      }',
'    }',
'    ',
'    async function batchAddForbiddenWords() {',
'      const text = prompt("批量导入违禁词（每行一个）\\n示例：\\n广告\\n赌博\\n诈骗\\n色情");',
'      if (!text) return;',
'      ',
'      const words = text.split("\\n").filter(word => word.trim()).map(word => word.trim());',
'      ',
'      if (words.length === 0) {',
'        alert("没有有效的违禁词");',
'        return;',
'      }',
'      ',
'      if(confirm(`确定要批量添加 ${words.length} 个违禁词吗？`)) {',
'        const res = await fetch(api + "/api/forbidden-words/batch", {',
'          method: "POST",',
'          headers: {',
'            "Content-Type": "application/json",',
'            "X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""',
'          },',
'          body: JSON.stringify({ words })',
'        });',
'        ',
'        if (res.ok) {',
'          const result = await res.json();',
'          showToast(`成功添加 ${result.success} 个违禁词，失败 ${result.fail} 个`);',
'          clearCache("/api/forbidden-words");',
'          render();',
'        } else {',
'          alert("批量添加失败: " + (await res.text()));',
'        }',
'      }',
'    }',
'    ',
'    // 优化后的违禁词导出函数 - 显示弹窗而不是下载',
'    async function exportForbiddenWords() {',
'      try {',
'        const res = await fetch(api + "/api/forbidden-words", {',
'          headers: { "X-Session-Token": localStorage.sessionToken || localStorage.tgId || "" }',
'        });',
'        ',
'        if (res.ok) {',
'          const words = await res.json();',
'          const wordsText = words.map(w => w.word).join(\'\\n\');',
'          ',
'          document.body.innerHTML += `',
'            <div class="modal" id="exportForbiddenWordsModal">',
'              <div class="modal-content words-export-content">',
'                <div class="modal-header">',
'                  <h2>📋 违禁词列表 (${words.length}个)</h2>',
'                </div>',
'                <div class="modal-body">',
'                  <textarea class="words-textarea" id="forbiddenWordsTextarea" readonly>${wordsText}</textarea>',
'                  <button class="btn-p copy-btn" onclick="copyForbiddenWords()">📋 复制全部违禁词</button>',
'                  <div class="form-hint" style="text-align: center;">点击上方按钮复制所有违禁词到剪贴板</div>',
'                </div>',
'                <div class="modal-footer">',
'                  <button class="btn-s" onclick="closeModal()">关闭</button>',
'                </div>',
'              </div>',
'            </div>',
'          `;',
'        } else {',
'          const errorText = await res.text();',
'          alert("获取违禁词列表失败: " + errorText);',
'        }',
'      } catch (error) {',
'        console.error(\'获取违禁词列表失败:\', error);',
'        alert("获取违禁词列表失败: " + error.message);',
'      }',
'    }',
'    ',
'    function copyForbiddenWords() {',
'      const textarea = document.getElementById(\'forbiddenWordsTextarea\');',
'      if (!textarea) return;',
'      ',
'      textarea.select();',
'      textarea.setSelectionRange(0, 99999); // 兼容移动设备',
'      ',
'      try {',
'        const successful = document.execCommand(\'copy\');',
'        if (successful) {',
'          showToast(\'违禁词列表已复制到剪贴板\');',
'        } else {',
'          alert("复制失败，请手动选择并复制");',
'        }',
'      } catch (err) {',
'        console.error(\'复制失败:\', err);',
'        alert("复制失败，请手动选择并复制");',
'      }',
'    }',
'    ',
'    // 显示添加群组的模态窗口',
'    function showAddGroupModal() {',
'      document.body.innerHTML += `',
'        <div class="modal" id="addGroupModal">',
'          <div class="modal-content">',
'            <div class="modal-header">',
'              <h2>➕ 手动添加群组</h2>',
'            </div>',
'            <div class="modal-body">',
'              <div class="form-group">',
'                <label class="form-label">群组ID *</label>',
'                <input type="number" id="groupChatId" class="form-input" placeholder="-123456789 (负数表示群组)">',
'                <div class="form-hint">请输入群组的数字ID（必须是负数，如 -1001234567890）</div>',
'              </div>',
'              <div class="form-group">',
'                <label class="form-label">群组标题 (可选)</label>',
'                <input type="text" id="groupTitle" class="form-input" placeholder="我的群组名称">',
'                <div class="form-hint">如果留空，将自动从Telegram获取群组信息</div>',
'              </div>',
'              <div id="groupPreview" class="user-preview" style="display: none;">',
'                <img class="user-preview-avatar" id="groupPreviewAvatar" src="">',
'                <div class="user-preview-info">',
'                  <div class="user-preview-name" id="groupPreviewName">正在获取群组信息...</div>',
'                  <div class="user-preview-username" id="groupPreviewUsername"></div>',
'                </div>',
'              </div>',
'            </div>',
'            <div class="modal-footer">',
'              <button class="btn-p" onclick="validateAndAddGroup()">验证并添加</button>',
'              <button class="btn-s" onclick="closeModal()">取消</button>',
'            </div>',
'          </div>',
'        </div>',
'      `;',
'      ',
'      // 监听群组ID输入变化，自动获取群组信息',
'      const chatIdInput = document.getElementById("groupChatId");',
'      chatIdInput.addEventListener("input", function() {',
'        const chatId = this.value.trim();',
'        if (chatId && parseInt(chatId) < 0) {',
'          fetchGroupInfo(chatId);',
'        } else {',
'          document.getElementById("groupPreview").style.display = "none";',
'        }',
'      });',
'    }',
'    ',
'    // 获取群组信息',
'    async function fetchGroupInfo(chatId) {',
'      try {',
'        document.getElementById("groupPreview").style.display = "flex";',
'        document.getElementById("groupPreviewName").innerText = "正在获取群组信息...";',
'        document.getElementById("groupPreviewUsername").innerText = "";',
'        ',
'        const res = await fetch(api + "/api/get-group-info?chat_id=" + chatId, {',
'          headers: {"X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""}',
'        });',
'        ',
'        if (res.ok) {',
'          const groupInfo = await res.json();',
'          if (groupInfo.success) {',
'            document.getElementById("groupPreviewName").innerText = groupInfo.title || `群组${chatId}`;',
'            document.getElementById("groupPreviewUsername").innerText = `ID: ${chatId} | 用户名: ${groupInfo.username || "无"} | Bot权限: ${groupInfo.bot_status}`;',
'            if (groupInfo.avatar_url) {',
'              document.getElementById("groupPreviewAvatar").src = groupInfo.avatar_url;',
'            } else {',
'              document.getElementById("groupPreviewAvatar").src = "https://ui-avatars.com/api/?name=G&background=333&color=fff";',
'            }',
'            ',
'            // 更新标题输入框',
'            if (groupInfo.title && !document.getElementById("groupTitle").value) {',
'              document.getElementById("groupTitle").value = groupInfo.title;',
'            }',
'          } else {',
'            document.getElementById("groupPreviewName").innerText = `群组${chatId}`;',
'            document.getElementById("groupPreviewUsername").innerText = `获取群组信息失败: ${groupInfo.error || "未知错误"}`;',
'            document.getElementById("groupPreviewAvatar").src = "https://ui-avatars.com/api/?name=G&background=333&color=fff";',
'          }',
'        } else {',
'          document.getElementById("groupPreviewName").innerText = `群组${chatId}`;',
'          document.getElementById("groupPreviewUsername").innerText = "获取群组信息失败";',
'          document.getElementById("groupPreviewAvatar").src = "https://ui-avatars.com/api/?name=G&background=333&color=fff";',
'        }',
'      } catch (error) {',
'        document.getElementById("groupPreviewName").innerText = `群组${chatId}`;',
'        document.getElementById("groupPreviewUsername").innerText = "获取群组信息失败";',
'        document.getElementById("groupPreviewAvatar").src = "https://ui-avatars.com/api/?name=G&background=333&color=fff";',
'      }',
'    }',
'    ',
'    // 验证并添加群组',
'    async function validateAndAddGroup() {',
'      const chatId = document.getElementById("groupChatId").value.trim();',
'      const title = document.getElementById("groupTitle").value.trim();',
'      ',
'      if (!chatId) {',
'        alert("请输入群组ID");',
'        return;',
'      }',
'      ',
'      if (parseInt(chatId) >= 0) {',
'        alert("群组ID必须是负数");',
'        return;',
'      }',
'      ',
'      const data = {',
'        chat_id: chatId,',
'        title: title || null',
'      };',
'      ',
'      const res = await fetch(api + "/api/add-group", {',
'        method: "POST",',
'        headers: {',
'          "Content-Type": "application/json",',
'          "X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""',
'        },',
'        body: JSON.stringify(data)',
'      });',
'      ',
'      if (res.ok) {',
'        const result = await res.text();',
'        showToast(result);',
'        closeModal();',
'        clearCache("/api/groups");',
'        render();',
'      } else {',
'        const errorText = await res.text();',
'        alert("添加失败: " + errorText);',
'      }',
'    }',
'    ',
'    // 删除群组',
'    async function deleteGroup(chatId, title) {',
'      if(confirm(`确定要删除群组 "${title}" (ID: ${chatId}) 吗？\\n\\n注意：这只会从数据库中删除群组配置，不会将bot从群组中移除。`)) {',
'        const res = await fetch(api + "/api/delete-group", {',
'          method: "POST",',
'          headers: {',
'            "Content-Type": "application/json",',
'            "X-Session-Token": localStorage.sessionToken || localStorage.tgId || ""',
'          },',
'          body: JSON.stringify({ chat_id: chatId })',
'        });',
'        ',
'        if (res.ok) {',
'          showToast("群组已删除");',
'          clearCache("/api/groups");',
'          clearCache("/api/bans");',
'          render();',
'        } else {',
'          alert("删除失败: " + (await res.text()));',
'        }',
'      }',
'    }',
'    ',
'    window.onload = init;',
'  </script>',
'</body>',
'</html>'
].join("\n");

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 添加缓存控制头
    const cacheHeaders = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    
    // Webhook 入口
    if (url.pathname === '/' && request.method === 'POST') {
      const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (env.WEBHOOK_SECRET && secretToken !== env.WEBHOOK_SECRET) return new Response('Forbidden', { status: 403 });
      
      try {
        const update = await request.json();
        console.log('Webhook 收到更新:', JSON.stringify(update).substring(0, 500));
        
        await handleUpdate(update, env, url.origin);
        
        return new Response('OK');
      } catch (error) {
        console.error('Webhook 处理错误:', error);
        return new Response('Server Error', { status: 500 });
      }
    }

    // 头像获取接口 - 使用后端网络环境
    if (url.pathname === '/api/user-avatar') {
      const userId = url.searchParams.get('user_id');
      if (!userId) {
        return new Response('Missing user_id', { status: 400 });
      }
      
      try {
        // 尝试获取用户信息
        const userInfo = await telegramApi(env, 'getChat', { chat_id: parseInt(userId) });
        
        if (userInfo.ok && userInfo.result.photo) {
          // 获取头像文件
          const file = await telegramApi(env, 'getFile', { file_id: userInfo.result.photo.small_file_id });
          if (file.ok && file.result.file_path) {
            // 使用Telegram文件链接
            const telegramFileUrl = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`;
            
            // 使用后端代理下载头像
            const avatarResponse = await fetch(telegramFileUrl);
            if (avatarResponse.ok) {
              const avatarData = await avatarResponse.arrayBuffer();
              return new Response(avatarData, {
                headers: {
                  'Content-Type': avatarResponse.headers.get('Content-Type') || 'image/jpeg',
                  'Cache-Control': 'public, max-age=3600',
                  ...cacheHeaders
                }
              });
            }
          }
        }
        
        // 如果无法获取头像，返回默认头像
        const defaultAvatar = await fetch(`https://ui-avatars.com/api/?name=U&background=333&color=fff&size=64`);
        return new Response(await defaultAvatar.arrayBuffer(), {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600',
            ...cacheHeaders
          }
        });
      } catch (error) {
        console.error('获取用户头像失败:', error);
        const defaultAvatar = await fetch(`https://ui-avatars.com/api/?name=U&background=333&color=fff&size=64`);
        return new Response(await defaultAvatar.arrayBuffer(), {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600',
            ...cacheHeaders
          }
        });
      }
    }

    // 群组头像获取接口
    if (url.pathname === '/api/group-avatar') {
      const chatId = url.searchParams.get('chat_id');
      if (!chatId) {
        return new Response('Missing chat_id', { status: 400 });
      }
      
      try {
        // 先从数据库获取群组头像URL
        const group = await env.TGBOT_DB.prepare('SELECT photo_url FROM groups WHERE chat_id = ?').bind(chatId).first();
        
        if (group && group.photo_url) {
          // 使用后端代理下载头像
          const avatarResponse = await fetch(group.photo_url);
          if (avatarResponse.ok) {
            const avatarData = await avatarResponse.arrayBuffer();
            return new Response(avatarData, {
              headers: {
                'Content-Type': avatarResponse.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=3600',
                ...cacheHeaders
              }
            });
          }
        }
        
        // 如果数据库中没有，尝试从Telegram API获取
        const chat = await telegramApi(env, 'getChat', { chat_id: parseInt(chatId) });
        
        if (chat.ok && chat.result.photo) {
          const file = await telegramApi(env, 'getFile', { file_id: chat.result.photo.small_file_id });
          if (file.ok && file.result.file_path) {
            const telegramFileUrl = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`;
            
            // 更新数据库，包含用户名
            await env.TGBOT_DB.prepare('UPDATE groups SET photo_url = ?, username = ?, updated_at = CURRENT_TIMESTAMP WHERE chat_id = ?')
              .bind(telegramFileUrl, chat.result.username || null, chatId).run();
            
            // 使用后端代理下载头像
            const avatarResponse = await fetch(telegramFileUrl);
            if (avatarResponse.ok) {
              const avatarData = await avatarResponse.arrayBuffer();
              return new Response(avatarData, {
                headers: {
                  'Content-Type': avatarResponse.headers.get('Content-Type') || 'image/jpeg',
                  'Cache-Control': 'public, max-age=3600',
                  ...cacheHeaders
                }
              });
            }
          }
        }
        
        // 如果无法获取头像，返回默认群组头像
        const defaultAvatar = await fetch(`https://ui-avatars.com/api/?name=G&background=333&color=fff&size=64`);
        return new Response(await defaultAvatar.arrayBuffer(), {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600',
            ...cacheHeaders
          }
        });
      } catch (error) {
        console.error('获取群组头像失败:', error);
        const defaultAvatar = await fetch(`https://ui-avatars.com/api/?name=G&background=333&color=fff&size=64`);
        return new Response(await defaultAvatar.arrayBuffer(), {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600',
            ...cacheHeaders
          }
        });
      }
    }

    if (url.pathname === '/' || url.pathname === '/admin') {
      return new Response(HTML.replace('const api = "";', `const api = '${url.origin}';`), { 
        headers: {
          'Content-Type': 'text/html',
          ...cacheHeaders
        } 
      });
    }

    if (url.pathname.startsWith('/api/')) {
      // 验证会话令牌
      const sessionToken = request.headers.get('X-Session-Token');
      const tgId = request.headers.get('X-TG-ID');
      
      let isAuthenticated = false;
      let authenticatedUserId = null;
      
      // 优先使用会话令牌验证
      if (sessionToken) {
        isAuthenticated = await validateSessionToken(sessionToken, env);
        if (isAuthenticated) {
          // 从令牌中获取用户ID
          const tokenData = JSON.parse(atob(sessionToken));
          authenticatedUserId = tokenData.data.userId;
        }
      } else if (tgId) {
        // 向后兼容：检查是否是管理员
        isAuthenticated = checkAdmin(tgId, env);
        authenticatedUserId = tgId;
      }
      
      if (!isAuthenticated && !url.pathname.includes('/api/verify')) {
        return new Response('Unauthorized', {status: 401, headers: cacheHeaders});
      }

      // 验证接口 - 简化验证逻辑
      if (url.pathname === '/api/verify' && request.method === 'POST') {
        try {
          const { userId, firstName, lastName, username } = await request.json();
          
          if (!userId) {
            return Response.json({ success: false, error: "缺少用户ID" }, { status: 400, headers: cacheHeaders });
          }
          
          // 检查用户是否是管理员（简化验证）
          if (!checkAdmin(userId.toString(), env)) {
            return Response.json({ success: false, error: "不是管理员" }, { status: 403, headers: cacheHeaders });
          }
          
          console.log(`验证用户ID: ${userId}, 用户名: ${username}`);
          
          // 生成简单的会话令牌（不使用复杂的加密）
          const sessionToken = btoa(JSON.stringify({
            data: {
              userId: userId.toString(),
              timestamp: Date.now(),
              username: username || `${firstName || ''} ${lastName || ''}`.trim()
            }
          }));
          
          return Response.json({
            success: true,
            token: sessionToken,
            expires: Date.now() + 24 * 60 * 60 * 1000 // 24小时
          }, { headers: cacheHeaders });
        } catch (error) {
          console.error('验证接口错误:', error);
          return Response.json({ success: false, error: error.message }, { status: 500, headers: cacheHeaders });
        }
      }

      // 获取群组信息接口（验证bot权限）
      if (url.pathname === '/api/get-group-info') {
        const chatId = url.searchParams.get('chat_id');
        
        if (!chatId) {
          return Response.json({ success: false, error: "缺少群组ID" }, { headers: cacheHeaders });
        }
        
        try {
          // 验证chat_id是否为负数（群组）
          const chatIdNum = parseInt(chatId);
          if (chatIdNum >= 0) {
            return Response.json({ 
              success: false, 
              error: "群组ID必须是负数（如 -1001234567890）" 
            }, { headers: cacheHeaders });
          }
          
          // 1. 获取群组信息
          const chatInfo = await telegramApi(env, 'getChat', { chat_id: chatId });
          
          if (!chatInfo.ok) {
            return Response.json({ 
              success: false, 
              error: chatInfo.description || "无法获取群组信息，请检查群组ID是否正确" 
            }, { headers: cacheHeaders });
          }
          
          // 2. 获取bot信息
          const botInfo = await telegramApi(env, 'getMe');
          if (!botInfo.ok) {
            return Response.json({ 
              success: false, 
              error: "无法获取bot信息" 
            }, { headers: cacheHeaders });
          }
          
          const botId = botInfo.result.id;
          
          // 3. 检查bot在该群组中的权限
          const chatMember = await telegramApi(env, 'getChatMember', {
            chat_id: chatId,
            user_id: botId
          });
          
          let botStatus = "未知";
          if (chatMember.ok) {
            const status = chatMember.result.status;
            if (status === 'administrator' || status === 'creator') {
              botStatus = "管理员";
            } else if (status === 'member') {
              botStatus = "普通成员";
            } else if (status === 'restricted') {
              botStatus = "受限成员";
            } else if (status === 'left') {
              botStatus = "未加入";
            } else if (status === 'kicked') {
              botStatus = "已被踢出";
            }
          } else {
            botStatus = "无法获取权限";
          }
          
          // 4. 获取群组头像
          let avatar_url = null;
          if (chatInfo.result.photo) {
            try {
              const file = await telegramApi(env, 'getFile', { file_id: chatInfo.result.photo.small_file_id });
              if (file.ok && file.result.file_path) {
                avatar_url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`;
              }
            } catch (photoError) {
              console.log('获取群组头像失败:', photoError.message);
            }
          }
          
          // 5. 更新数据库中的群组信息（包含用户名）
          const chatUsername = chatInfo.result.username || null;
          const chatTitle = chatInfo.result.title || `群组${chatId}`;
          
          // 检查是否已存在
          const existing = await env.TGBOT_DB.prepare('SELECT * FROM groups WHERE chat_id = ?').bind(chatId).first();
          
          if (existing) {
            // 更新现有记录
            await env.TGBOT_DB.prepare(
              'UPDATE groups SET title = ?, username = ?, photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE chat_id = ?'
            ).bind(chatTitle, chatUsername, avatar_url, chatId).run();
          } else {
            // 插入新记录
            await env.TGBOT_DB.prepare(
              'INSERT INTO groups (chat_id, title, username, photo_url, block_ads, allow_chinese, require_avatar, ban_duration) VALUES (?, ?, ?, ?, 1, 1, 1, 86400)'
            ).bind(chatId, chatTitle, chatUsername, avatar_url).run();
          }
          
          return Response.json({
            success: true,
            chat_id: chatId,
            title: chatTitle,
            username: chatUsername,
            type: chatInfo.result.type,
            avatar_url: avatar_url,
            bot_status: botStatus,
            can_manage: chatMember.ok && (chatMember.result.status === 'administrator' || chatMember.result.status === 'creator')
          }, { headers: cacheHeaders });
          
        } catch (error) {
          console.error('获取群组信息失败:', error);
          return Response.json({ 
            success: false, 
            error: error.message 
          }, { headers: cacheHeaders });
        }
      }

      // 添加群组接口
      if (url.pathname === '/api/add-group' && request.method === 'POST') {
        try {
          const { chat_id, title } = await request.json();
          
          if (!chat_id) {
            return new Response('群组ID不能为空', { status: 400, headers: cacheHeaders });
          }
          
          // 验证chat_id是否为负数（群组）
          const chatIdNum = parseInt(chat_id);
          if (chatIdNum >= 0) {
            return new Response('群组ID必须是负数（如 -1001234567890）', { status: 400, headers: cacheHeaders });
          }
          
          // 检查是否已存在
          const existing = await env.TGBOT_DB.prepare('SELECT * FROM groups WHERE chat_id = ?').bind(chat_id).first();
          
          if (existing) {
            return new Response('该群组已在数据库中', { status: 400, headers: cacheHeaders });
          }
          
          // 验证bot在群组中的权限
          const botInfo = await telegramApi(env, 'getMe');
          if (!botInfo.ok) {
            return new Response('无法获取bot信息', { status: 500, headers: cacheHeaders });
          }
          
          const botId = botInfo.result.id;
          const chatMember = await telegramApi(env, 'getChatMember', {
            chat_id: chat_id,
            user_id: botId
          });
          
          if (!chatMember.ok) {
            return new Response('bot未加入该群组或群组ID错误', { status: 400, headers: cacheHeaders });
          }
          
          const status = chatMember.result.status;
          if (status !== 'administrator' && status !== 'creator') {
            return new Response('bot不是该群组的管理员，无法管理此群组', { status: 400, headers: cacheHeaders });
          }
          
          // 获取群组信息（包含用户名）
          let groupTitle = title;
          let groupUsername = null;
          let avatar_url = null;
          
          const chatInfo = await telegramApi(env, 'getChat', { chat_id: chat_id });
          if (chatInfo.ok) {
            groupTitle = groupTitle || chatInfo.result.title;
            groupUsername = chatInfo.result.username || null;
            
            // 获取群组头像
            if (chatInfo.result.photo) {
              try {
                const file = await telegramApi(env, 'getFile', { file_id: chatInfo.result.photo.small_file_id });
                if (file.ok && file.result.file_path) {
                  avatar_url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`;
                }
              } catch (photoError) {
                console.log('获取群组头像失败:', photoError.message);
              }
            }
          } else {
            groupTitle = groupTitle || `群组${chat_id}`;
          }
          
          // 插入群组信息，包含用户名
          await env.TGBOT_DB.prepare(
            'INSERT INTO groups (chat_id, title, username, block_ads, allow_chinese, require_avatar, ban_duration, photo_url) VALUES (?, ?, ?, 1, 1, 1, 86400, ?)'
          ).bind(chat_id, groupTitle, groupUsername, avatar_url).run();
          
          await addLog(env, authenticatedUserId || 0, '手动添加群组', `群组: ${groupTitle} (ID: ${chat_id}), 用户名: ${groupUsername || '无'}`, "group");
          
          return new Response(`✅ 群组 "${groupTitle}" 添加成功！`, { headers: cacheHeaders });
        } catch (error) {
          console.error('添加群组失败:', error);
          return new Response(`添加失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }

      // 删除群组接口
      if (url.pathname === '/api/delete-group' && request.method === 'POST') {
        try {
          const { chat_id } = await request.json();
          
          if (!chat_id) {
            return new Response('群组ID不能为空', { status: 400, headers: cacheHeaders });
          }
          
          // 检查是否存在
          const existing = await env.TGBOT_DB.prepare('SELECT * FROM groups WHERE chat_id = ?').bind(chat_id).first();
          
          if (!existing) {
            return new Response('该群组不存在于数据库中', { status: 404, headers: cacheHeaders });
          }
          
          // 删除群组
          await env.TGBOT_DB.prepare('DELETE FROM groups WHERE chat_id = ?').bind(chat_id).run();
          
          // 可选：删除该群组相关的封禁记录
          await env.TGBOT_DB.prepare('DELETE FROM bans WHERE chat_id = ?').bind(chat_id).run();
          
          await addLog(env, authenticatedUserId || 0, '删除群组', `群组: ${existing.title} (ID: ${chat_id})`, "group");
          
          return new Response('✅ 群组已从数据库中删除', { headers: cacheHeaders });
        } catch (error) {
          console.error('删除群组失败:', error);
          return new Response(`删除失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }

      // 获取超级管理员ID列表
      if (url.pathname === '/api/super-admins') {
        const superAdminIds = (env.SUPER_ADMIN_ID || "").split(',').map(id => id.trim()).filter(id => id);
        return Response.json({ superAdminIds }, { headers: cacheHeaders });
      }

      // 添加调试接口
      if (url.pathname === '/api/debug') {
        try {
          const bansCount = await env.TGBOT_DB.prepare('SELECT COUNT(*) as count FROM bans').first();
          const logsCount = await env.TGBOT_DB.prepare('SELECT COUNT(*) as count FROM logs').first();
          const groupsCount = await env.TGBOT_DB.prepare('SELECT COUNT(*) as count FROM groups').first();
          const whitelistCount = await env.TGBOT_DB.prepare('SELECT COUNT(*) as count FROM whitelist').first();
          const forbiddenWordsCount = await env.TGBOT_DB.prepare('SELECT COUNT(*) as count FROM forbidden_words').first();
          const adminCount = await env.TGBOT_DB.prepare('SELECT COUNT(*) as count FROM bot_admins').first();
          
          return Response.json({
            db_status: "已连接",
            bans_count: bansCount?.count || 0,
            logs_count: logsCount?.count || 0,
            groups_count: groupsCount?.count || 0,
            whitelist_count: whitelistCount?.count || 0,
            forbidden_words_count: forbiddenWordsCount?.count || 0,
            admin_count: adminCount?.count || 0,
            timestamp: new Date().toISOString()
          }, { headers: cacheHeaders });
        } catch (error) {
          return Response.json({
            db_status: "连接失败",
            error: error.message,
            timestamp: new Date().toISOString()
          }, { headers: cacheHeaders });
        }
      }

      // 获取用户信息接口
      if (url.pathname === '/api/get-user-info') {
        const userId = url.searchParams.get('user_id');
        
        if (!userId) {
          return Response.json({ success: false, error: "缺少用户ID" }, { headers: cacheHeaders });
        }
        
        try {
          // 先尝试从数据库获取已有的用户信息
          const existingAdmin = await env.TGBOT_DB.prepare('SELECT * FROM bot_admins WHERE user_id = ?').bind(userId).first();
          const existingWhitelist = await env.TGBOT_DB.prepare('SELECT * FROM whitelist WHERE user_id = ?').bind(userId).first();
          
          if (existingAdmin && existingAdmin.avatar_url) {
            return Response.json({
              success: true,
              user_id: parseInt(userId),
              username: existingAdmin.username || null,
              display_name: existingAdmin.display_name || `用户${userId}`,
              avatar_url: existingAdmin.avatar_url
            }, { headers: cacheHeaders });
          }
          
          if (existingWhitelist && existingWhitelist.avatar_url) {
            return Response.json({
              success: true,
              user_id: parseInt(userId),
              username: existingWhitelist.username || null,
              display_name: existingWhitelist.display_name || `用户${userId}`,
              avatar_url: existingWhitelist.avatar_url
            }, { headers: cacheHeaders });
          }
          
          // 否则从Telegram API获取
          const userInfo = await telegramApi(env, 'getChat', { chat_id: parseInt(userId) });
          
          if (userInfo.ok) {
            const result = userInfo.result;
            let display_name = "";
            let avatar_url = "";
            
            // 构建显示名称
            if (result.first_name || result.last_name) {
              display_name = `${result.first_name || ''} ${result.last_name || ''}`.trim();
            } else if (result.title) {
              display_name = result.title;
            } else {
              display_name = `用户${userId}`;
            }
            
            // 尝试获取头像
            if (result.photo) {
              try {
                const file = await telegramApi(env, 'getFile', { file_id: result.photo.small_file_id });
                if (file.ok && file.result.file_path) {
                  avatar_url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`;
                }
              } catch (error) {
                console.log('获取头像失败:', error.message);
              }
            } else if (result.type === 'private') {
              // 私人用户，尝试获取用户头像
              try {
                const photos = await telegramApi(env, 'getUserProfilePhotos', { user_id: parseInt(userId), limit: 1 });
                if (photos.ok && photos.result.total_count > 0 && photos.result.photos[0] && photos.result.photos[0][0]) {
                  const file = await telegramApi(env, 'getFile', { file_id: photos.result.photos[0][0].file_id });
                  if (file.ok && file.result.file_path) {
                    avatar_url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`;
                  }
                }
              } catch (photoError) {
                console.log(`无法获取用户 ${userId} 的头像:`, photoError.message);
              }
            }
            
            return Response.json({
              success: true,
              user_id: parseInt(userId),
              username: result.username || null,
              display_name: display_name,
              avatar_url: avatar_url || null
            }, { headers: cacheHeaders });
          } else {
            // 如果API调用失败，返回默认信息
            return Response.json({
              success: true,
              user_id: parseInt(userId),
              username: null,
              display_name: `用户${userId}`,
              avatar_url: null
            }, { headers: cacheHeaders });
          }
        } catch (error) {
          console.error('获取用户信息失败:', error);
          // 出错时返回默认信息
          return Response.json({
            success: true,
            user_id: parseInt(userId),
            username: null,
            display_name: `用户${userId}`,
            avatar_url: null
          }, { headers: cacheHeaders });
        }
      }

      // 获取白名单详情接口
      if (url.pathname === '/api/whitelist-details') {
        const id = url.searchParams.get('id');
        
        if (!id) {
          return Response.json({ success: false, error: "缺少ID参数" }, { status: 400, headers: cacheHeaders });
        }
        
        try {
          const entry = await env.TGBOT_DB.prepare('SELECT * FROM whitelist WHERE id = ?').bind(id).first();
          
          if (!entry) {
            return Response.json({ success: false, error: "白名单记录不存在" }, { status: 404, headers: cacheHeaders });
          }
          
          return Response.json({
            success: true,
            data: entry
          }, { headers: cacheHeaders });
        } catch (error) {
          console.error('获取白名单详情失败:', error);
          return Response.json({ success: false, error: error.message }, { status: 500, headers: cacheHeaders });
        }
      }

      // 获取管理员详情接口
      if (url.pathname === '/api/admin-details') {
        const id = url.searchParams.get('id');
        
        if (!id) {
          return Response.json({ success: false, error: "缺少ID参数" }, { status: 400, headers: cacheHeaders });
        }
        
        try {
          const entry = await env.TGBOT_DB.prepare('SELECT * FROM bot_admins WHERE id = ?').bind(id).first();
          
          if (!entry) {
            return Response.json({ success: false, error: "管理员记录不存在" }, { status: 404, headers: cacheHeaders });
          }
          
          return Response.json({
            success: true,
            data: entry
          }, { headers: cacheHeaders });
        } catch (error) {
          console.error('获取管理员详情失败:', error);
          return Response.json({ success: false, error: error.message }, { status: 500, headers: cacheHeaders });
        }
      }

      // 获取通知设置详情接口 - 现在从bot_admins表获取
      if (url.pathname === '/api/notification-details') {
        const id = url.searchParams.get('id');
        
        if (!id) {
          return Response.json({ success: false, error: "缺少ID参数" }, { status: 400, headers: cacheHeaders });
        }
        
        try {
          const entry = await env.TGBOT_DB.prepare('SELECT * FROM bot_admins WHERE id = ?').bind(id).first();
          
          if (!entry) {
            return Response.json({ success: false, error: "管理员记录不存在" }, { status: 404, headers: cacheHeaders });
          }
          
          // 格式化返回数据
          const result = {
            id: entry.id,
            admin_id: entry.user_id,
            username: entry.username,
            display_name: entry.display_name,
            is_super: entry.is_super == 1,
            chat_ids: entry.notify_chat_ids || '[]',
            notify: entry.notify,  // 直接返回数据库的值
            created_at: entry.created_at,
            updated_at: entry.updated_at
          };
          
          return Response.json({
            success: true,
            data: result
          }, { headers: cacheHeaders });
        } catch (error) {
          console.error('获取通知设置详情失败:', error);
          return Response.json({ success: false, error: error.message }, { status: 500, headers: cacheHeaders });
        }
      }

      if (url.pathname === '/api/groups') {
        try {
          const {results} = await env.TGBOT_DB.prepare('SELECT * FROM groups ORDER BY title').all();
          return Response.json(results || [], { headers: cacheHeaders });
        } catch (error) {
          console.error('获取群组列表失败:', error);
          return Response.json([], { headers: cacheHeaders });
        }
      }

      // 初始化数据库
      if (url.pathname === '/api/init-db') {
        return await initDatabase(env, authenticatedUserId || 0);
      }

      if (url.pathname === '/api/groups/update') {
        const { id, type, val } = await request.json();
        const fieldMap = {ads: 'block_ads', chinese: 'allow_chinese', avatar: 'require_avatar', duration: 'ban_duration'};
        const field = fieldMap[type];
        if (!field) return new Response('Invalid Type', {status: 400, headers: cacheHeaders});
        
        const numericVal = (val === true) ? 1 : (val === false ? 0 : parseInt(val));
        
        await env.TGBOT_DB.prepare(`UPDATE groups SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE chat_id = ?`)
          .bind(numericVal, id).run();
          
        return new Response('OK', { headers: cacheHeaders });
      }

      // 获取管理员列表接口 - 现在包含通知设置
      if (url.pathname === '/api/admin-list') {
        try {
          const {results} = await env.TGBOT_DB.prepare('SELECT * FROM bot_admins ORDER BY created_at DESC').all();
          return Response.json(results || [], { headers: cacheHeaders });
        } catch (error) {
          console.error('获取管理员列表失败:', error);
          return Response.json([], { headers: cacheHeaders });
        }
      }

      // 管理员管理接口
      if (url.pathname === '/api/admin' && request.method === 'GET') {
        try {
          const {results} = await env.TGBOT_DB.prepare('SELECT * FROM bot_admins ORDER BY created_at DESC').all();
          return Response.json(results || [], { headers: cacheHeaders });
        } catch (error) {
          console.error('获取管理员列表失败:', error);
          return Response.json([], { headers: cacheHeaders });
        }
      }
      
      // 添加管理员
      if (url.pathname === '/api/admin' && request.method === 'POST') {
        try {
          const { user_id, chat_ids, is_super } = await request.json();
          
          if (!user_id) {
            return new Response('用户ID不能为空', { status: 400, headers: cacheHeaders });
          }
          
          // 检查当前用户是否有权限添加管理员
          const superAdminIds = (env.SUPER_ADMIN_ID || "").split(',').map(id => id.trim()).filter(id => id);
          if (!superAdminIds.includes(authenticatedUserId)) {
            return new Response('只有超级管理员可以添加管理员', { status: 403, headers: cacheHeaders });
          }
          
          // 检查是否已存在
          const existing = await env.TGBOT_DB.prepare('SELECT * FROM bot_admins WHERE user_id = ?').bind(user_id).first();
          
          if (existing) {
            return new Response('用户已是管理员', { status: 400, headers: cacheHeaders });
          }
          
          // 尝试获取用户信息
          let display_name = `用户${user_id}`;
          let username = null;
          let avatar_url = null;
          
          try {
            const userInfo = await telegramApi(env, 'getChat', { chat_id: parseInt(user_id) });
            if (userInfo.ok) {
              const result = userInfo.result;
              
              // 构建显示名称
              if (result.first_name || result.last_name) {
                display_name = `${result.first_name || ''} ${result.last_name || ''}`.trim();
              } else if (result.title) {
                display_name = result.title;
              }
              
              username = result.username || null;
              
              // 获取头像
              if (result.photo) {
                try {
                  const file = await telegramApi(env, 'getFile', { file_id: result.photo.small_file_id });
                  if (file.ok && file.result.file_path) {
                    avatar_url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`;
                  }
                } catch (photoError) {
                  console.log('获取用户头像失败:', photoError.message);
                }
              } else if (result.type === 'private') {
                // 私人用户，尝试获取用户头像
                try {
                  const photos = await telegramApi(env, 'getUserProfilePhotos', { user_id: parseInt(user_id), limit: 1 });
                  if (photos.ok && photos.result.total_count > 0 && photos.result.photos[0] && photos.result.photos[0][0]) {
                    const file = await telegramApi(env, 'getFile', { file_id: photos.result.photos[0][0].file_id });
                    if (file.ok && file.result.file_path) {
                      avatar_url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`;
                    }
                  }
                } catch (photoError) {
                  console.log(`无法获取用户 ${user_id} 的头像:`, photoError.message);
                }
              }
            }
          } catch (userError) {
            console.log('获取用户信息失败，使用默认值:', userError.message);
          }
          
          const chatIdsJson = JSON.stringify(chat_ids || []);
          const isSuperValue = is_super || 0;
          
          // 插入管理员记录，包含通知设置字段
          await env.TGBOT_DB.prepare(
            'INSERT INTO bot_admins (user_id, username, chat_ids, display_name, avatar_url, is_super, notify, notify_chat_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(user_id, username, chatIdsJson, display_name, avatar_url, isSuperValue, 1, '[]').run();
          
          await addLog(env, authenticatedUserId, '添加管理员', `用户ID: ${user_id}, 类型: ${isSuperValue ? '超级管理员' : '普通管理员'}`, "permission");
          
          return new Response('OK', { headers: cacheHeaders });
        } catch (error) {
          console.error('添加管理员失败:', error);
          return new Response(`添加失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }
      
      // 编辑管理员
      if (url.pathname.startsWith('/api/admin/') && request.method === 'PUT') {
        try {
          const id = url.pathname.split('/').pop();
          const { user_id, chat_ids, is_super } = await request.json();
          
          if (!id) {
            return new Response('缺少ID参数', { status: 400, headers: cacheHeaders });
          }
          
          // 检查当前用户是否有权限编辑管理员
          const superAdminIds = (env.SUPER_ADMIN_ID || "").split(',').map(id => id.trim()).filter(id => id);
          if (!superAdminIds.includes(authenticatedUserId)) {
            return new Response('只有超级管理员可以编辑管理员', { status: 403, headers: cacheHeaders });
          }
          
          // 检查记录是否存在
          const existing = await env.TGBOT_DB.prepare('SELECT * FROM bot_admins WHERE id = ?').bind(id).first();
          if (!existing) {
            return new Response('管理员记录不存在', { status: 404, headers: cacheHeaders });
          }
          
          const chatIdsJson = JSON.stringify(chat_ids || []);
          
          // 更新记录
          await env.TGBOT_DB.prepare(
            'UPDATE bot_admins SET chat_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          ).bind(chatIdsJson, id).run();
          
          await addLog(env, authenticatedUserId, '更新管理员', `用户ID: ${user_id}`, "permission");
          
          return new Response('OK', { headers: cacheHeaders });
        } catch (error) {
          console.error('更新管理员失败:', error);
          return new Response(`更新失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }
      
      // 删除管理员
      if (url.pathname.startsWith('/api/admin/') && request.method === 'DELETE') {
        const id = url.pathname.split('/').pop();
        
        try {
          // 检查当前用户是否有权限删除管理员
          const superAdminIds = (env.SUPER_ADMIN_ID || "").split(',').map(id => id.trim()).filter(id => id);
          if (!superAdminIds.includes(authenticatedUserId)) {
            return new Response('只有超级管理员可以删除管理员', { status: 403, headers: cacheHeaders });
          }
          
          const entry = await env.TGBOT_DB.prepare('SELECT * FROM bot_admins WHERE id = ?').bind(id).first();
          
          if (!entry) {
            return new Response('管理员记录不存在', { status: 404, headers: cacheHeaders });
          }
          
          // 不能删除超级管理员
          if (entry.is_super == 1) {
            return new Response('不能删除超级管理员', { status: 400, headers: cacheHeaders });
          }
          
          await env.TGBOT_DB.prepare('DELETE FROM bot_admins WHERE id = ?').bind(id).run();
          
          await addLog(env, authenticatedUserId, '移除管理员', `用户ID: ${entry.user_id}`, "permission");
          
          return new Response('OK', { headers: cacheHeaders });
        } catch (error) {
          console.error('删除管理员失败:', error);
          return new Response(`删除失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }

      // 获取通知设置列表接口 - 从bot_admins表获取（修复版）
      if (url.pathname === '/api/notification-settings') {
        try {
          // 直接从bot_admins表获取所有管理员的通知设置
          const {results: allAdmins} = await env.TGBOT_DB.prepare(`
            SELECT 
              id, 
              user_id as admin_id, 
              username, 
              display_name, 
              is_super, 
              notify,
              notify_chat_ids as chat_ids,
              created_at,
              updated_at
            FROM bot_admins 
            ORDER BY updated_at DESC
          `).all();
          
          // 确保每个管理员都有通知设置（现在都在同一个表中）
          const allNotificationSettings = (allAdmins || []).map(admin => ({
            id: admin.id,
            admin_id: admin.admin_id,
            username: admin.username,
            display_name: admin.display_name || (admin.is_super ? `超级管理员${admin.admin_id}` : `用户${admin.admin_id}`),
            is_super: admin.is_super == 1,
            chat_ids: admin.chat_ids || '[]',
            notify: admin.notify,  // 直接使用数据库的值，不要用 || 1
            created_at: admin.created_at,
            updated_at: admin.updated_at
          }));
          
          return Response.json(allNotificationSettings, { headers: cacheHeaders });
        } catch (error) {
          console.error('获取通知设置列表失败:', error);
          return Response.json([], { headers: cacheHeaders });
        }
      }

      // 通知设置管理接口 - 现在操作bot_admins表
      if (url.pathname === '/api/notification' && request.method === 'GET') {
        try {
          const {results} = await env.TGBOT_DB.prepare(`
            SELECT 
              id, 
              user_id as admin_id, 
              username, 
              display_name, 
              is_super, 
              notify,
              notify_chat_ids as chat_ids,
              created_at,
              updated_at
            FROM bot_admins 
            ORDER BY updated_at DESC
          `).all();
          return Response.json(results || [], { headers: cacheHeaders });
        } catch (error) {
          console.error('获取通知设置列表失败:', error);
          return Response.json([], { headers: cacheHeaders });
        }
      }
      
      // 添加通知设置 - 现在更新bot_admins表
      if (url.pathname === '/api/notification' && request.method === 'POST') {
        try {
          const { admin_id, chat_ids, notify } = await request.json();
          
          if (!admin_id) {
            return new Response('管理员ID不能为空', { status: 400, headers: cacheHeaders });
          }
          
          // 检查管理员是否存在
          const admin = await env.TGBOT_DB.prepare('SELECT * FROM bot_admins WHERE user_id = ?').bind(admin_id).first();
          
          if (!admin) {
            return new Response('管理员不存在', { status: 404, headers: cacheHeaders });
          }
          
          const notifyValue = notify || 1;
          const chatIdsJson = JSON.stringify(chat_ids || []);
          
          // 更新bot_admins表中的通知设置
          await env.TGBOT_DB.prepare(
            'UPDATE bot_admins SET notify = ?, notify_chat_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
          ).bind(notifyValue, chatIdsJson, admin_id).run();
          
          await addLog(env, authenticatedUserId, '添加通知设置', `管理员ID: ${admin_id}, 通知: ${notifyValue ? '开启' : '关闭'}`, "permission");
          
          return new Response('OK', { headers: cacheHeaders });
        } catch (error) {
          console.error('添加通知设置失败:', error);
          return new Response(`添加失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }
      
      // 编辑通知设置 - 现在更新bot_admins表（修复版）
      if (url.pathname.startsWith('/api/notification/') && request.method === 'PUT') {
        try {
          const id = url.pathname.split('/').pop();
          const { admin_id, chat_ids, notify } = await request.json();
          
          if (!id) {
            return new Response('缺少ID参数', { status: 400, headers: cacheHeaders });
          }
          
          // 检查记录是否存在
          const existing = await env.TGBOT_DB.prepare('SELECT * FROM bot_admins WHERE id = ?').bind(id).first();
          if (!existing) {
            return new Response('管理员记录不存在', { status: 404, headers: cacheHeaders });
          }
          
          // 如果有提供 chat_ids 则使用，否则保持原值
          const chatIdsJson = chat_ids !== undefined ? JSON.stringify(chat_ids || []) : existing.notify_chat_ids || '[]';
          const notifyValue = notify !== undefined ? (notify ? 1 : 0) : existing.notify;
          
          // 更新bot_admins表中的通知设置
          await env.TGBOT_DB.prepare(
            'UPDATE bot_admins SET notify = ?, notify_chat_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          ).bind(notifyValue, chatIdsJson, id).run();
          
          await addLog(env, authenticatedUserId, '更新通知设置', `管理员ID: ${admin_id || existing.user_id}, 通知: ${notifyValue ? '开启' : '关闭'}`, "permission");
          
          return new Response('OK', { headers: cacheHeaders });
        } catch (error) {
          console.error('更新通知设置失败:', error);
          return new Response(`更新失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }
      
      // 删除通知设置 - 实际上只是重置为默认值，因为现在通知设置是bot_admins表的一部分
      if (url.pathname.startsWith('/api/notification/') && request.method === 'DELETE') {
        const id = url.pathname.split('/').pop();
        
        try {
          const entry = await env.TGBOT_DB.prepare('SELECT * FROM bot_admins WHERE id = ?').bind(id).first();
          
          if (entry) {
            // 重置通知设置为默认值（开启，所有群组）
            await env.TGBOT_DB.prepare(
              'UPDATE bot_admins SET notify = 1, notify_chat_ids = "[]", updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            ).bind(id).run();
            
            await addLog(env, authenticatedUserId, '重置通知设置', `管理员ID: ${entry.user_id}`, "permission");
          }
          
          return new Response('OK', { headers: cacheHeaders });
        } catch (error) {
          console.error('删除通知设置失败:', error);
          return new Response(`删除失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }

      // 获取违禁词列表接口
      if (url.pathname === '/api/forbidden-words') {
        try {
          const {results} = await env.TGBOT_DB.prepare('SELECT * FROM forbidden_words ORDER BY created_at DESC').all();
          return Response.json(results || [], { headers: cacheHeaders });
        } catch (error) {
          console.error('获取违禁词列表失败:', error);
          return Response.json([], { headers: cacheHeaders });
        }
      }

      // 违禁词管理接口
      if (url.pathname === '/api/forbidden-word' && request.method === 'POST') {
        try {
          const { word } = await request.json();
          
          if (!word) {
            return new Response('违禁词不能为空', { status: 400, headers: cacheHeaders });
          }
          
          // 检查是否已存在
          const existing = await env.TGBOT_DB.prepare('SELECT * FROM forbidden_words WHERE word = ?').bind(word).first();
          
          if (existing) {
            return new Response('违禁词已存在', { status: 400, headers: cacheHeaders });
          }
          
          await env.TGBOT_DB.prepare(
            'INSERT INTO forbidden_words (word) VALUES (?)'
          ).bind(word).run();
          
          await addLog(env, authenticatedUserId || 0, '添加违禁词', `违禁词: ${word}`, "system");
          
          return new Response('OK', { headers: cacheHeaders });
        } catch (error) {
          console.error('添加违禁词失败:', error);
          return new Response(`添加失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }
      
      // 编辑违禁词
      if (url.pathname.startsWith('/api/forbidden-word/') && request.method === 'PUT') {
        try {
          const id = url.pathname.split('/').pop();
          const { word } = await request.json();
          
          if (!id || !word) {
            return new Response('缺少参数', { status: 400, headers: cacheHeaders });
          }
          
          // 检查记录是否存在
          const existing = await env.TGBOT_DB.prepare('SELECT * FROM forbidden_words WHERE id = ?').bind(id).first();
          if (!existing) {
            return new Response('违禁词记录不存在', { status: 404, headers: cacheHeaders });
          }
          
          // 检查新词是否已存在
          const wordExists = await env.TGBOT_DB.prepare('SELECT * FROM forbidden_words WHERE word = ? AND id != ?').bind(word, id).first();
          if (wordExists) {
            return new Response('违禁词已存在', { status: 400, headers: cacheHeaders });
          }
          
          // 更新记录
          await env.TGBOT_DB.prepare(
            'UPDATE forbidden_words SET word = ? WHERE id = ?'
          ).bind(word, id).run();
          
          await addLog(env, authenticatedUserId || 0, '更新违禁词', `原词: ${existing.word}, 新词: ${word}`, "system");
          
          return new Response('OK', { headers: cacheHeaders });
        } catch (error) {
          console.error('更新违禁词失败:', error);
          return new Response(`更新失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }
      
      // 删除违禁词
      if (url.pathname.startsWith('/api/forbidden-word/') && request.method === 'DELETE') {
        const id = url.pathname.split('/').pop();
        
        try {
          const entry = await env.TGBOT_DB.prepare('SELECT * FROM forbidden_words WHERE id = ?').bind(id).first();
          
          await env.TGBOT_DB.prepare('DELETE FROM forbidden_words WHERE id = ?').bind(id).run();
          
          if (entry) {
            await addLog(env, authenticatedUserId || 0, '删除违禁词', `违禁词: ${entry.word}`, "system");
          }
          
          return new Response('OK', { headers: cacheHeaders });
        } catch (error) {
          console.error('删除违禁词失败:', error);
          return new Response(`删除失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }
      
      // 批量添加违禁词
      if (url.pathname === '/api/forbidden-words/batch' && request.method === 'POST') {
        try {
          const { words } = await request.json();
          let successCount = 0;
          let failCount = 0;
          
          for (const word of words) {
            try {
              // 检查是否已存在
              const existing = await env.TGBOT_DB.prepare('SELECT * FROM forbidden_words WHERE word = ?').bind(word).first();
              
              if (!existing) {
                await env.TGBOT_DB.prepare(
                  'INSERT INTO forbidden_words (word) VALUES (?)'
                ).bind(word).run();
                
                successCount++;
              } else {
                failCount++;
              }
            } catch (error) {
              console.error('处理单个违禁词失败:', error);
              failCount++;
            }
          }
          
          await addLog(env, authenticatedUserId || 0, '批量添加违禁词', `成功: ${successCount}, 失败: ${failCount}`, "system");
          
          return Response.json({ success: successCount, fail: failCount }, { headers: cacheHeaders });
        } catch (error) {
          console.error('批量添加违禁词失败:', error);
          return new Response(`批量添加失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }

      if (url.pathname === '/api/admins') {
        const superAdminIds = (env.SUPER_ADMIN_ID || "").split(',').map(id => id.trim()).filter(id => id);
        const {results} = await env.TGBOT_DB.prepare('SELECT * FROM bot_admins').all();
        
        const adminList = await Promise.all(superAdminIds.map(async id => {
          let name = "超级管理员";
          let photo = "";
          
          try {
            const chat = await telegramApi(env, 'getChat', {chat_id: id});
            
            if (chat.ok) {
              name = chat.result.first_name || chat.result.title || "超级管理员";
              
              // 获取头像 - 使用与管理员相同的方法
              if (chat.result.photo) {
                const file = await telegramApi(env, 'getFile', {file_id: chat.result.photo.small_file_id});
                if (file.ok && file.result.file_path) {
                  photo = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`;
                }
              } else if (chat.result.type === 'private') {
                // 私人用户，尝试获取用户头像
                try {
                  const photos = await telegramApi(env, 'getUserProfilePhotos', {user_id: id, limit: 1});
                  if (photos.ok && photos.result.total_count > 0 && photos.result.photos[0] && photos.result.photos[0][0]) {
                    const file = await telegramApi(env, 'getFile', {file_id: photos.result.photos[0][0].file_id});
                    if (file.ok && file.result.file_path) {
                      photo = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`;
                    }
                  }
                } catch (photoError) {
                  console.log(`无法获取用户 ${id} 的头像:`, photoError.message);
                }
              }
            }
          } catch (error) {
            console.error(`获取管理员 ${id} 信息失败:`, error.message);
          }
          
          return { 
            id, 
            name, 
            photo, 
            notify: (results || []).find(s => s.user_id == id)?.notify !== 0,
            is_super: true
          };
        }));
        
        return Response.json(adminList, { headers: cacheHeaders });
      }

      if (url.pathname === '/api/admins/update') {
        const { id, val } = await request.json();
        await env.TGBOT_DB.prepare('UPDATE bot_admins SET notify = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').bind(val ? 1 : 0, id).run();
        return new Response('OK', { headers: cacheHeaders });
      }

      if (url.pathname === '/api/bans') {
        try {
          // 使用 LEFT JOIN 获取封禁记录和群组头像
          const {results} = await env.TGBOT_DB.prepare(`
            SELECT 
              bans.*, 
              groups.title as chat_title,
              groups.username as chat_username
            FROM bans 
            LEFT JOIN groups ON bans.chat_id = groups.chat_id 
            ORDER BY bans.timestamp DESC LIMIT 100
          `).all();
          
          // 如果没有获取到群组标题，使用封禁记录中的标题
          const bansWithGroupInfo = (results || []).map(ban => {
            if (!ban.chat_title && ban.chat_title_from_bans) {
              ban.chat_title = ban.chat_title_from_bans;
            }
            return ban;
          });
          
          return Response.json(bansWithGroupInfo, { headers: cacheHeaders });
        } catch (error) {
          console.error('获取封禁列表失败:', error);
          return Response.json([], { headers: cacheHeaders });
        }
      }

      // 搜索封禁记录
      if (url.pathname === '/api/search-bans') {
        const query = url.searchParams.get('q') || '';
        let results = [];
        
        if (query) {
          const search = `%${query}%`;
          results = await env.TGBOT_DB.prepare(
            'SELECT * FROM bans WHERE username LIKE ? OR user_id LIKE ? OR chat_title LIKE ? ORDER BY timestamp DESC LIMIT 50'
          ).bind(search, search, search).all();
        } else {
          results = await env.TGBOT_DB.prepare('SELECT * FROM bans ORDER BY timestamp DESC LIMIT 50').all();
        }
        
        return Response.json(results.results || [], { headers: cacheHeaders });
      }

      // 删除封禁记录
      if (url.pathname === '/api/delete-ban') {
        const { ban_id } = await request.json();
        await env.TGBOT_DB.prepare('DELETE FROM bans WHERE id = ?').bind(ban_id).run();
        return new Response('OK', { headers: cacheHeaders });
      }

      if (url.pathname === '/api/logs') {
        try {
          const logsResult = await env.TGBOT_DB.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100').all();
          
          let allLogs = [];
          
          if (logsResult.results) {
            allLogs = allLogs.concat(logsResult.results.map(log => ({
              id: log.id,
              admin_id: log.admin_id || 0,
              action: log.action,
              details: log.details,
              type: log.type || 'system',
              timestamp: log.timestamp
            })));
          }
          
          return Response.json(allLogs, { headers: cacheHeaders });
        } catch (error) {
          console.error('获取日志失败:', error);
          return Response.json([], { headers: cacheHeaders });
        }
      }

      // 白名单管理接口
      if (url.pathname === '/api/whitelist' && request.method === 'GET') {
        try {
          const {results} = await env.TGBOT_DB.prepare('SELECT * FROM whitelist ORDER BY created_at DESC').all();
          return Response.json(results || [], { headers: cacheHeaders });
        } catch (error) {
          console.error('获取白名单失败:', error);
          return Response.json([], { headers: cacheHeaders });
        }
      }
      
      // 添加白名单
      if (url.pathname === '/api/whitelist' && request.method === 'POST') {
        try {
          const { user_id, remark, chat_ids } = await request.json();
          
          if (!user_id) {
            return new Response('用户ID不能为空', { status: 400, headers: cacheHeaders });
          }
          
          // 检查是否已存在
          const existing = await env.TGBOT_DB.prepare('SELECT * FROM whitelist WHERE user_id = ?').bind(user_id).first();
          
          if (existing) {
            return new Response('用户已在白名单中', { status: 400, headers: cacheHeaders });
          }
          
          // 尝试获取用户信息（包含头像）
          let display_name = `用户${user_id}`;
          let username = null;
          let avatar_url = null;
          
          try {
            const userInfo = await telegramApi(env, 'getChat', { chat_id: parseInt(user_id) });
            if (userInfo.ok) {
              const result = userInfo.result;
              
              // 构建显示名称
              if (result.first_name || result.last_name) {
                display_name = `${result.first_name || ''} ${result.last_name || ''}`.trim();
              } else if (result.title) {
                display_name = result.title;
              }
              
              username = result.username || null;
              
              // 获取头像
              if (result.photo) {
                try {
                  const file = await telegramApi(env, 'getFile', { file_id: result.photo.small_file_id });
                  if (file.ok && file.result.file_path) {
                    avatar_url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`;
                  }
                } catch (photoError) {
                  console.log('获取用户头像失败:', photoError.message);
                }
              } else if (result.type === 'private') {
                // 私人用户，尝试获取用户头像
                try {
                  const photos = await telegramApi(env, 'getUserProfilePhotos', { user_id: parseInt(user_id), limit: 1 });
                  if (photos.ok && photos.result.total_count > 0 && photos.result.photos[0] && photos.result.photos[0][0]) {
                    const file = await telegramApi(env, 'getFile', { file_id: photos.result.photos[0][0].file_id });
                    if (file.ok && file.result.file_path) {
                      avatar_url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`;
                    }
                  }
                } catch (photoError) {
                  console.log(`无法获取用户 ${user_id} 的头像:`, photoError.message);
                }
              }
            }
          } catch (userError) {
            console.log('获取用户信息失败，使用默认值:', userError.message);
          }
          
          const chatIdsJson = JSON.stringify(chat_ids || []);
          
          await env.TGBOT_DB.prepare(
            'INSERT INTO whitelist (user_id, username, remark, chat_ids, display_name, avatar_url) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(user_id, username, remark, chatIdsJson, display_name, avatar_url).run();
          
          await addLog(env, authenticatedUserId || 0, '添加白名单用户', `用户ID: ${user_id}, 显示名: ${display_name}`, "permission");
          
          return new Response('OK', { headers: cacheHeaders });
        } catch (error) {
          console.error('添加白名单失败:', error);
          return new Response(`添加失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }
      
      // 编辑白名单 (PUT /api/whitelist/:id)
      if (url.pathname.startsWith('/api/whitelist/') && request.method === 'PUT') {
        try {
          const id = url.pathname.split('/').pop();
          const { user_id, remark, chat_ids } = await request.json();
          
          if (!id) {
            return new Response('缺少ID参数', { status: 400, headers: cacheHeaders });
          }
          
          // 检查记录是否存在
          const existing = await env.TGBOT_DB.prepare('SELECT * FROM whitelist WHERE id = ?').bind(id).first();
          if (!existing) {
            return new Response('白名单记录不存在', { status: 404, headers: cacheHeaders });
          }
          
          const chatIdsJson = JSON.stringify(chat_ids || []);
          
          // 更新记录
          await env.TGBOT_DB.prepare(
            'UPDATE whitelist SET remark = ?, chat_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          ).bind(remark, chatIdsJson, id).run();
          
          await addLog(env, authenticatedUserId || 0, '更新白名单用户', `用户ID: ${user_id}, 备注: ${remark || "无"}`, "permission");
          
          return new Response('OK', { headers: cacheHeaders });
        } catch (error) {
          console.error('更新白名单失败:', error);
          return new Response(`更新失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }
      
      // 批量添加白名单
      if (url.pathname === '/api/whitelist/batch' && request.method === 'POST') {
        try {
          const { entries } = await request.json();
          let successCount = 0;
          let failCount = 0;
          
          for (const entry of entries) {
            try {
              const { user_id, remark, chat_ids } = entry;
              const chatIdsJson = JSON.stringify(chat_ids || []);
              
              // 检查是否已存在
              const existing = await env.TGBOT_DB.prepare('SELECT * FROM whitelist WHERE user_id = ?').bind(user_id).first();
              
              if (!existing) {
                // 直接插入，不获取用户信息
                await env.TGBOT_DB.prepare(
                  'INSERT INTO whitelist (user_id, remark, chat_ids, display_name) VALUES (?, ?, ?, ?)'
                ).bind(user_id, remark, chatIdsJson, `用户${user_id}`).run();
                
                successCount++;
              } else {
                failCount++;
              }
            } catch (error) {
              console.error('处理单个用户失败:', error);
              failCount++;
            }
          }
          
          await addLog(env, authenticatedUserId || 0, '批量添加白名单', `成功: ${successCount}, 失败: ${failCount}`, "permission");
          
          return Response.json({ success: successCount, fail: failCount }, { headers: cacheHeaders });
        } catch (error) {
          console.error('批量添加白名单失败:', error);
          return new Response(`批量添加失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }
      
      // 删除白名单
      if (url.pathname.startsWith('/api/whitelist/') && request.method === 'DELETE') {
        const id = url.pathname.split('/').pop();
        
        try {
          const entry = await env.TGBOT_DB.prepare('SELECT * FROM whitelist WHERE id = ?').bind(id).first();
          
          await env.TGBOT_DB.prepare('DELETE FROM whitelist WHERE id = ?').bind(id).run();
          
          if (entry) {
            await addLog(env, authenticatedUserId || 0, '移除白名单用户', `用户ID: ${entry.user_id}, 备注: ${entry.remark || "无"}`, "permission");
          }
          
          return new Response('OK', { headers: cacheHeaders });
        } catch (error) {
          console.error('删除白名单失败:', error);
          return new Response(`删除失败: ${error.message}`, { status: 500, headers: cacheHeaders });
        }
      }

      if (url.pathname === '/api/unban') {
        const {user_id, chat_id} = await request.json();
        await telegramApi(env, 'unbanChatMember', {chat_id, user_id, only_if_banned: true});
        await env.TGBOT_DB.prepare('DELETE FROM bans WHERE user_id=? AND chat_id=?').bind(user_id, chat_id).run();
        await addLog(env, authenticatedUserId || 0, '手动解封用户', `用户ID: ${user_id}, 群组ID: ${chat_id}`, 'unban');
        return new Response('OK', { headers: cacheHeaders });
      }

      if (url.pathname === '/api/set-webhook') {
        const res = await telegramApi(env, 'setWebhook', { 
          url: url.origin + '/', 
          secret_token: env.WEBHOOK_SECRET,
          allowed_updates: ["message", "chat_join_request", "my_chat_member", "callback_query"]
        });
        await addLog(env, authenticatedUserId || 0, '设置Webhook', `URL: ${url.origin}/, 结果: ${res.ok ? '成功' : '失败'}`, 'system');
        return new Response(res.ok ? '✅ Webhook 同步成功' : '❌ 同步失败', { headers: cacheHeaders });
      }

      if (url.pathname === '/api/webhook-info') {
        const info = await telegramApi(env, 'getWebhookInfo');
        return Response.json(info.result || {}, { headers: cacheHeaders });
      }
    }
    return new Response('Not Found', {status: 404, headers: cacheHeaders});
  }
};

// 简化的会话令牌验证函数
async function validateSessionToken(token, env) {
  try {
    const tokenData = JSON.parse(atob(token));
    const { data } = tokenData;
    
    // 检查令牌是否过期（24小时）
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      return false;
    }
    
    // 验证用户是否仍然是管理员
    return checkAdmin(data.userId, env);
  } catch (error) {
    console.error('验证会话令牌失败:', error);
    return false;
  }
}

// 增强的数据库初始化函数
async function initDatabase(env, adminId) {
  try {
    console.log('开始初始化数据库...');
    
    // 1. 创建 groups 表 - 添加 username 字段
    await env.TGBOT_DB.prepare(`
      CREATE TABLE IF NOT EXISTS groups (
        chat_id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        username TEXT,                     -- 群组用户名
        block_ads INTEGER DEFAULT 1,
        allow_chinese INTEGER DEFAULT 1,
        require_avatar INTEGER DEFAULT 1,
        ban_duration INTEGER DEFAULT 86400,
        photo_url TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // 2. 创建 bans 表
    await env.TGBOT_DB.prepare(`
      CREATE TABLE IF NOT EXISTS bans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        chat_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        chat_title TEXT NOT NULL,
        reason TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // 3. 创建 logs 表
    await env.TGBOT_DB.prepare(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER DEFAULT 0,
        action TEXT NOT NULL,
        details TEXT,
        type TEXT DEFAULT "system",
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // 4. 创建 whitelist 表
    await env.TGBOT_DB.prepare(`
      CREATE TABLE IF NOT EXISTS whitelist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT,
        remark TEXT,
        chat_ids TEXT DEFAULT "[]",
        display_name TEXT,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `).run();
    
    // 5. 创建 forbidden_words 表
    await env.TGBOT_DB.prepare(`
      CREATE TABLE IF NOT EXISTS forbidden_words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // 6. 创建 bot_admins 表（包含通知设置字段）
    await env.TGBOT_DB.prepare(`
      CREATE TABLE IF NOT EXISTS bot_admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT,
        chat_ids TEXT DEFAULT "[]",          -- 适用群组
        display_name TEXT,
        avatar_url TEXT,
        is_super INTEGER DEFAULT 0,
        notify INTEGER DEFAULT 1,            -- 通知开关
        notify_chat_ids TEXT DEFAULT "[]",   -- 通知适用群组
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `).run();
    
    // 将环境变量中的超级管理员插入到bot_admins表中
    const superAdminIds = (env.SUPER_ADMIN_ID || "").split(',').map(id => id.trim()).filter(id => id);
    console.log('插入超级管理员:', superAdminIds);
    
    for (const adminId of superAdminIds) {
      try {
        // 获取管理员信息
        let display_name = `超级管理员${adminId}`;
        let username = null;
        let avatar_url = null;
        
        try {
          const userInfo = await telegramApi(env, 'getChat', { chat_id: parseInt(adminId) });
          if (userInfo.ok) {
            const result = userInfo.result;
            
            if (result.first_name || result.last_name) {
              display_name = `${result.first_name || ''} ${result.last_name || ''}`.trim();
            } else if (result.title) {
              display_name = result.title;
            }
            
            username = result.username || null;
            
            // 获取头像
            if (result.photo) {
              try {
                const file = await telegramApi(env, 'getFile', { file_id: result.photo.small_file_id });
                if (file.ok && file.result.file_path) {
                  avatar_url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.result.file_path}`;
                }
              } catch (photoError) {
                console.log('获取管理员头像失败:', photoError.message);
              }
            }
          }
        } catch (userError) {
          console.log('获取管理员信息失败，使用默认值:', userError.message);
        }
        
        await env.TGBOT_DB.prepare('INSERT OR REPLACE INTO bot_admins (user_id, username, display_name, avatar_url, is_super, notify, notify_chat_ids) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(adminId, username, display_name, avatar_url, 1, 1, '[]').run();
          
      } catch (e) {
        console.error(`插入超级管理员 ${adminId} 失败:`, e);
      }
    }
    
    // 初始化默认违禁词
    const defaultWords = ['t.me', 'dc5', 'dc4', 'poker', '赌', '币', '点我', '加群', '优惠', '私聊', '代理', '推广', '赚钱', '刷', '代', '带', '广告', '赌博', '诈骗', '色情'];
    for (const word of defaultWords) {
      try {
        await env.TGBOT_DB.prepare('INSERT OR IGNORE INTO forbidden_words (word) VALUES (?)').bind(word).run();
      } catch (e) {
        console.error(`插入违禁词 ${word} 失败:`, e);
      }
    }
    
    await addLog(env, adminId || 0, '数据库初始化完成', `管理员ID: ${adminId}, 初始化时间: ${new Date().toISOString()}`, 'system');
    
    console.log('数据库初始化完成');
    return new Response('✅ 星霜数据库已成功初始化');
    
  } catch (error) {
    console.error('初始化数据库失败:', error);
    return new Response(`❌ 初始化失败: ${error.message}`, { status: 500 });
  }
}

// 检查用户是否是管理员
function checkAdmin(userId, env) {
  // 检查是否是超级管理员（环境变量）
  const superAdminIds = (env.SUPER_ADMIN_ID || "").split(',').map(id => id.trim());
  return superAdminIds.includes(userId.toString());
}

// 检查用户是否是管理员（异步版本，用于API处理）
async function checkAdminAsync(userId, env) {
  // 首先检查是否是超级管理员（环境变量）
  const superAdminIds = (env.SUPER_ADMIN_ID || "").split(',').map(id => id.trim());
  if (superAdminIds.includes(userId.toString())) {
    return true;
  }
  
  // 然后检查是否是数据库中的管理员
  try {
    const admin = await env.TGBOT_DB.prepare('SELECT * FROM bot_admins WHERE user_id = ?').bind(userId).first();
    return !!admin;
  } catch (error) {
    console.error('检查管理员失败:', error);
    return false;
  }
}

// 获取违禁词列表
async function getForbiddenWords(env) {
  try {
    const {results} = await env.TGBOT_DB.prepare('SELECT * FROM forbidden_words').all();
    return results?.map(row => row.word) || [];
  } catch (error) {
    console.error('获取违禁词列表失败:', error);
    return [];
  }
}

// 增强的日志记录函数
async function addLog(env, adminId, action, details, type = "system") {
  try {
    console.log(`记录系统日志: ${type} - ${action}`, details);
    
    const result = await env.TGBOT_DB.prepare(
      'INSERT INTO logs (admin_id, action, details, type, timestamp) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
    ).bind(
      adminId || 0,
      action,
      details,
      type
    ).run();
    
    console.log(`系统日志记录成功: ID=${result.meta?.last_row_id}`);
    return result.meta?.last_row_id;
  } catch (error) {
    console.error('记录系统日志失败:', error);
    return null;
  }
}

async function handleUpdate(update, env, baseUrl) {
  console.log('开始处理更新:', update?.chat_join_request ? '入群请求' : update?.my_chat_member ? '群组成员变更' : update?.callback_query ? '回调查询' : '其他更新');
  
  await addLog(env, 0, '收到Webhook更新', `类型: ${Object.keys(update).join(', ')}`, "request");
  
  // 1. 生命周期管理 (进群/退群)
  if (update.my_chat_member) {
    try {
      const { chat, new_chat_member, from } = update.my_chat_member;
      console.log(`群组成员变更: ${chat.title} (${chat.id}), 新状态: ${new_chat_member.status}`);
      
      if (['administrator', 'creator'].includes(new_chat_member.status)) {
        // 获取群组用户名
        const chatUsername = chat.username || null;
        
        await env.TGBOT_DB.prepare(
          'INSERT OR IGNORE INTO groups (chat_id, title, username) VALUES (?, ?, ?)'
        ).bind(chat.id, chat.title, chatUsername).run();
        
        // 如果已存在，更新用户名
        if (chatUsername) {
          await env.TGBOT_DB.prepare(
            'UPDATE groups SET username = ?, title = ?, updated_at = CURRENT_TIMESTAMP WHERE chat_id = ?'
          ).bind(chatUsername, chat.title, chat.id).run();
        }
        
        await addLog(env, from?.id, "添加群组", `群组: ${chat.title} (ID: ${chat.id}), 用户名: ${chatUsername || '无'}`, "group");
        console.log(`已添加群组: ${chat.title}, 用户名: ${chatUsername || '无'}`);
      } else {
        await env.TGBOT_DB.prepare('DELETE FROM groups WHERE chat_id = ?').bind(chat.id).run();
        await addLog(env, from?.id, "移除群组", `群组: ${chat.title} (ID: ${chat.id})`, "group");
        console.log(`已移除群组: ${chat.title}`);
      }
    } catch (error) {
      console.error('处理群组变更失败:', error);
      await addLog(env, 0, "处理群组变更失败", `错误: ${error.message}`, "system");
    }
    return;
  }

  // 2. 指令
  if (update.message?.text === '/admin') {
    try {
      const isAdmin = await checkAdminAsync(update.message.from.id, env);
      await telegramApi(env, 'sendMessage', {
        chat_id: update.message.chat.id,
        text: isAdmin ? "🛡️ **星霜 Pro 核心控制台**\n系统处于实时防御状态。" : "🚫 无权访问。",
        parse_mode: 'Markdown',
        reply_markup: isAdmin ? { inline_keyboard: [[{ text: "点击进入", web_app: { url: baseUrl + "/" } }]] } : null
      });
      await addLog(env, update.message.from.id, "访问管理面板", `用户: ${update.message.from.first_name} (ID: ${update.message.from.id})`, "admin");
      console.log(`管理员访问: ${update.message.from.first_name}`);
    } catch (error) {
      console.error('处理/admin命令失败:', error);
    }
    return;
  }

  // 3. 入群请求审核 - 修正后的逻辑（支持白名单和管理员）
  if (update.chat_join_request) {
    const req = update.chat_join_request;
    const user = req.from;
    console.log(`入群请求: ${user.first_name} (ID: ${user.id}) 申请加入 ${req.chat.title} (${req.chat.id})`);
    
    try {
      const group = await env.TGBOT_DB.prepare('SELECT * FROM groups WHERE chat_id=?').bind(req.chat.id).first();
      if (!group) {
        console.log(`群组 ${req.chat.id} 未在数据库中，跳过处理`);
        return;
      }
      
      // 检查用户是否是管理员
      const isAdmin = await checkAdminAsync(user.id, env);
      
      if (isAdmin) {
        // 管理员直接通过
        console.log(`用户 ${user.id} 是管理员，直接通过`);
        await telegramApi(env, 'approveChatJoinRequest', {chat_id: req.chat.id, user_id: user.id});
        await addLog(env, 0, "管理员入群通过", `用户: ${user.first_name} (ID: ${user.id}) | 群组: ${req.chat.title}`, "join");
        return;
      }
      
      // 检查用户是否在白名单中
      const isWhitelisted = await checkWhitelist(env, user.id, req.chat.id);
      
      if (isWhitelisted) {
        // 白名单用户直接通过
        console.log(`用户 ${user.id} 在白名单中，直接通过`);
        await telegramApi(env, 'approveChatJoinRequest', {chat_id: req.chat.id, user_id: user.id});
        await addLog(env, 0, "白名单用户入群通过", `用户: ${user.first_name} (ID: ${user.id}) | 群组: ${req.chat.title}`, "join");
        return;
      }
      
      // 检测用户是否符合要求
      const { passed, reasons } = await checkUserRequirements(env, user, group);
      
      if (passed) {
        // 用户符合要求，通过申请
        console.log(`批准用户 ${user.id} 加入群组 ${req.chat.id}`);
        await telegramApi(env, 'approveChatJoinRequest', {chat_id: req.chat.id, user_id: user.id});
        await addLog(env, 0, "批准入群请求", `用户: ${user.first_name} (ID: ${user.id}) | 群组: ${req.chat.title}`, "join");
      } else {
        // 用户不符合要求，拒绝并封禁
        console.log(`用户 ${user.id} 不符合要求，原因: ${reasons.join(', ')}，执行封禁`);
        
        // 拒绝入群请求
        await telegramApi(env, 'declineChatJoinRequest', {chat_id: req.chat.id, user_id: user.id});
        
        // 封禁用户
        const banResult = await banUser(env, user, req.chat, group, reasons);
        if (banResult) {
          // 通知管理员 - 使用修正后的时间格式化函数
          await notifyAdmins(env, user, req.chat, reasons, banResult.timestamp);
        }
        
        // 私聊用户，提供重新检测按钮
        await sendRejectionNotice(env, user, req.chat, reasons);
        
        await addLog(env, 0, "拒绝入群请求并封禁", `用户: ${user.first_name} (ID: ${user.id}) | 群组: ${req.chat.title} | 原因: ${reasons.join(' & ')}`, "ban");
      }
    } catch (error) {
      console.error('处理入群请求失败:', error);
      await addLog(env, 0, "处理入群请求失败", `错误: ${error.message}`, "system");
    }
  }

  // 4. 回调查询 - 重新检测和解封
  if (update.callback_query) {
    const { data, message, from } = update.callback_query;
    console.log(`回调查询: ${data}, 来自用户 ${from.id}`);
    
    // 重新检测请求
    if (data.startsWith('recheck:')) {
      const [_, userId, chatId] = data.split(':');
      
      // 验证是否是用户本人操作
      if (from.id.toString() !== userId) {
        console.log(`用户 ${from.id} 尝试操作他人请求`);
        await telegramApi(env, 'answerCallbackQuery', {
          callback_query_id: update.callback_query.id,
          text: "这不是你的请求"
        });
        return;
      }
      
      try {
        console.log(`用户 ${userId} 请求重新检测`);
        
        // 获取群组配置
        const group = await env.TGBOT_DB.prepare('SELECT * FROM groups WHERE chat_id=?').bind(chatId).first();
        if (!group) {
          await telegramApi(env, 'answerCallbackQuery', {
            callback_query_id: update.callback_query.id,
            text: "群组配置已失效"
          });
          return;
        }
        
        // 获取用户最新信息
        let userInfo;
        try {
          userInfo = await telegramApi(env, 'getChat', {chat_id: userId});
        } catch (error) {
          console.error('获取用户信息失败:', error);
          userInfo = { ok: false };
        }
        
        if (!userInfo.ok) {
          await telegramApi(env, 'answerCallbackQuery', {
            callback_query_id: update.callback_query.id,
            text: "无法获取用户信息"
          });
          return;
        }
        
        const user = {
          id: userId,
          first_name: userInfo.result.first_name || '',
          last_name: userInfo.result.last_name || '',
          username: userInfo.result.username || ''
        };
        
        // 重新检测用户资料
        const { passed, reasons } = await checkUserRequirements(env, user, group);
        
        if (passed) {
          // 用户已符合要求，检查是否需要解封
          const banRecord = await env.TGBOT_DB.prepare('SELECT * FROM bans WHERE user_id=? AND chat_id=?').bind(userId, chatId).first();
          
          if (banRecord) {
            // 解封用户
            await telegramApi(env, 'unbanChatMember', {chat_id: chatId, user_id: userId, only_if_banned: true});
            await env.TGBOT_DB.prepare('DELETE FROM bans WHERE user_id=? AND chat_id=?').bind(userId, chatId).run();
            
            console.log(`用户 ${userId} 已解封`);
            await addLog(env, 0, "自动解封用户", `用户: ${user.first_name} (ID: ${userId}) | 群组: ${group.title}`, "unban");
          }
          
          // 获取群组用户名（如果存在）
          let groupInviteMessage = "你的资料已符合要求，请重新提交入群申请。";
          
          if (group.username) {
            groupInviteMessage = `你的资料已符合要求，请重新提交入群申请：\nhttps://t.me/${group.username}`;
          }
          
          // 更新私聊消息 - 只显示文本，没有按钮
          await telegramApi(env, 'editMessageText', {
            chat_id: from.id,
            message_id: message.message_id,
            text: `✅ **资料审核通过！**\n\n${groupInviteMessage}`,
            parse_mode: 'Markdown'
          });
          
          await telegramApi(env, 'answerCallbackQuery', {
            callback_query_id: update.callback_query.id,
            text: "审核通过，请重新申请入群"
          });
          
        } else {
          // 仍然不符合要求
          const reasonStr = reasons.join('、');
          
          await telegramApi(env, 'editMessageText', {
            chat_id: from.id,
            message_id: message.message_id,
            text: `❌ **资料仍然不符合要求**\n\n原因：${reasonStr}\n\n请修改后再次点击按钮检测：`,
            parse_mode: 'Markdown',
            reply_markup: { 
              inline_keyboard: [[{ 
                text: "🔄 重新检测资料", 
                callback_data: `recheck:${userId}:${chatId}` 
              }]] 
            }
          });
          
          await telegramApi(env, 'answerCallbackQuery', {
            callback_query_id: update.callback_query.id,
            text: "仍然不符合要求，请修改后重试"
          });
        }
        
      } catch (error) {
        console.error('处理重新检测失败:', error);
        await telegramApi(env, 'answerCallbackQuery', {
          callback_query_id: update.callback_query.id,
          text: "检测失败，请稍后重试"
        });
      }
    }
    // 管理员手动解封
    else if (data.startsWith('unban:')) {
      const [_, uid, cid, timestamp] = data.split(':');
      
      if (!await checkAdminAsync(from.id, env)) {
        console.log(`用户 ${from.id} 尝试解封但无权限`);
        await telegramApi(env, 'answerCallbackQuery', {
          callback_query_id: update.callback_query.id,
          text: "您不是管理员，无法执行此操作"
        });
        await addLog(env, from.id, "非法解封尝试", `用户ID: ${from.id} 尝试解封用户 ${uid}`, "system");
        return;
      }
      
      try {
        console.log(`管理员 ${from.id} 正在解封用户 ${uid}`);
        await telegramApi(env, 'unbanChatMember', {chat_id: cid, user_id: uid, only_if_banned: true});
        await env.TGBOT_DB.prepare('DELETE FROM bans WHERE user_id=? AND chat_id=?').bind(uid, cid).run();
        
        await telegramApi(env, 'editMessageText', {
          chat_id: message.chat.id, 
          message_id: message.message_id,
          text: message.text + "\n\n✅ **操作：管理员手动解封**",
          parse_mode: 'Markdown'
        });
        
        await telegramApi(env, 'answerCallbackQuery', {
          callback_query_id: update.callback_query.id,
          text: "用户已解封"
        });
        
        await addLog(env, from.id, "手动解封用户", `管理员: ${from.first_name} (ID: ${from.id}) 解封用户: ${uid}`, "unban");
        console.log(`解封成功: 用户 ${uid}`);
        
      } catch (error) {
        console.error('解封操作失败:', error);
        await addLog(env, from.id, "解封操作失败", `错误: ${error.message}`, "system");
        await telegramApi(env, 'answerCallbackQuery', {
          callback_query_id: update.callback_query.id,
          text: "操作失败"
        });
      }
    }
  }
}

// 检查用户是否在白名单中
async function checkWhitelist(env, userId, chatId) {
  try {
    // 查找用户的白名单记录
    const whitelistRecord = await env.TGBOT_DB.prepare('SELECT * FROM whitelist WHERE user_id = ?').bind(userId).first();
    
    if (!whitelistRecord) {
      return false;
    }
    
    const chatIds = JSON.parse(whitelistRecord.chat_ids || '[]');
    
    // 如果chat_ids为空数组，表示适用于所有群组
    if (chatIds.length === 0) {
      return true;
    }
    
    // 检查是否包含当前群组
    return chatIds.includes(chatId.toString());
  } catch (error) {
    console.error('检查白名单失败:', error);
    return false;
  }
}

// 用户检测函数 - 所有不符合要求都返回false
async function checkUserRequirements(env, user, group) {
  const reasons = [];
  
  // 1. 头像检测
  if (group.require_avatar) {
    try {
      const photos = await telegramApi(env, 'getUserProfilePhotos', {
        user_id: user.id,
        limit: 1
      });
      if (!photos.ok || photos.result.total_count === 0) {
        reasons.push("无个人头像");
      }
    } catch (error) {
      console.log('头像检测失败:', error.message);
      reasons.push("无法检测头像");
    }
  }

  // 2. 中文名检测
  if (group.allow_chinese) {
    const name = (user.first_name || '') + (user.last_name || '');
    const chineseRegex = /[\u4e00-\u9fa5\u3400-\u4dbf\u2e80-\u2eff\u3000-\u303f\uff00-\uffef]/;
    if (!chineseRegex.test(name)) {
      reasons.push("昵称无中文");
    }
  }

  // 3. 防广告关键词（从数据库获取违禁词）
  if (group.block_ads) {
    try {
      const forbiddenWords = await getForbiddenWords(env);
      const textToScan = (user.first_name + (user.last_name || '') + (user.username || '')).toLowerCase();
      const foundAds = forbiddenWords.filter(word => textToScan.includes(word.toLowerCase()));
      if (foundAds.length > 0) {
        reasons.push("包含广告/违规内容: " + foundAds.join(', '));
      }
    } catch (error) {
      console.log('获取违禁词失败，使用默认列表:', error.message);
      // 如果获取失败，使用默认列表
      const adsList = ['t.me', 'dc5', 'dc4', 'poker', '赌', '币', '点我', '加群', '优惠', '私聊', '代理', '推广', '赚钱', '刷', '代', '带'];
      const textToScan = (user.first_name + (user.last_name || '') + (user.username || '')).toLowerCase();
      const foundAds = adsList.filter(ad => textToScan.includes(ad));
      if (foundAds.length > 0) {
        reasons.push("包含广告/违规内容: " + foundAds.join(', '));
      }
    }
  }
  
  return {
    passed: reasons.length === 0,
    reasons
  };
}

// 封禁用户
async function banUser(env, user, chat, group, reasons) {
  try {
    const banDuration = group.ban_duration || 86400;
    const timestamp = Math.floor(Date.now() / 1000);
    
    // 调用Telegram API封禁用户
    const banParams = {
      chat_id: chat.id,
      user_id: user.id
    };
    
    if (banDuration > 0) {
      banParams.until_date = timestamp + banDuration;
    }
    
    const banResult = await telegramApi(env, 'banChatMember', banParams);
    
    if (banResult.ok) {
      // 记录到数据库
      await env.TGBOT_DB.prepare(
        'INSERT INTO bans (user_id, chat_id, username, chat_title, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        user.id,
        chat.id,
        user.username || user.first_name || `用户${user.id}`,
        chat.title,
        reasons.join(' & '),
        timestamp
      ).run();
      
      return { success: true, timestamp };
    }
    
    return { success: false };
  } catch (error) {
    console.error('封禁用户失败:', error);
    return { success: false, error: error.message };
  }
}

// 通知管理员 - 修改：显示用户昵称、用户名和ID，使用修正的时间格式化
async function notifyAdmins(env, user, chat, reasons, timestamp) {
  try {
    // 获取需要通知的管理员（根据群组）
    const { results } = await env.TGBOT_DB.prepare(`
      SELECT * FROM bot_admins 
      WHERE notify = 1 
      AND (notify_chat_ids = '[]' OR notify_chat_ids LIKE ?)
    `).bind(`%"${chat.id}"%`).all();
    
    if (!results || results.length === 0) return;
    
    const adminIds = results.map(r => r.user_id);
    
    if (adminIds.length === 0) return;
    
    const reasonStr = reasons.join('、');
    const userDisplayName = user.first_name || "用户";
    const userName = user.username ? `@${user.username}` : "无用户名";
    const userId = user.id;
    
    // 构建更详细的用户信息
    const userInfo = `👤 用户: ${userDisplayName}\n📱 用户名: ${userName}\n🆔 用户ID: ${userId}`;
    
    // 使用修正后的时间格式化函数
    const formatBeijingTime = (timestamp) => {
      if (!timestamp) return "";
      let date;
      if (typeof timestamp === 'number') {
        date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
      } else {
        date = new Date(timestamp);
      }
      if (isNaN(date.getTime())) return "";
      const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
      return beijingTime.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
    };
    
    const timeStr = formatBeijingTime(timestamp * 1000);
    
    const messageText = `🚨 **用户封禁通知**\n\n` +
      `${userInfo}\n\n` +
      `👥 群组: ${chat.title}\n` +
      `❌ 原因: ${reasonStr}\n` +
      `⏰ 时间: ${timeStr}\n\n` +
      `点击下方按钮手动解封：`;
    
    for (const adminId of adminIds) {
      try {
        await telegramApi(env, 'sendMessage', {
          chat_id: adminId,
          text: messageText,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { 
                text: "✅ 手动解封", 
                callback_data: `unban:${userId}:${chat.id}:${timestamp}` 
              },
              {
                text: "✅ 加入白名单",
                callback_data: `add_to_whitelist:${userId}:${chat.id}`
              }
            ]]
          }
        });
      } catch (error) {
        console.log(`无法通知管理员 ${adminId}:`, error.message);
      }
    }
  } catch (error) {
    console.error('通知管理员失败:', error);
  }
}

// 发送拒绝通知给用户
async function sendRejectionNotice(env, user, chat, reasons) {
  try {
    const username = user.username ? `@${user.username}` : user.first_name;
    const reasonStr = reasons.join('、');
    
    const messageText = `👋 你好 ${username}！\n\n` +
      `❌ **你的入群申请已被拒绝并封禁**\n\n` +
      `原因：\n${reasonStr}\n\n` +
      `请修改以下内容后点击重新检测：\n` +
      `1. 确保头像真实且非默认\n` +
      `2. 昵称包含中文\n` +
      `3. 移除广告、赌博等违规内容\n\n` +
      `修改完成后，点击下方按钮重新检测：`;
    
    const message = await telegramApi(env, 'sendMessage', {
      chat_id: user.id,
      text: messageText,
      parse_mode: 'Markdown',
      reply_markup: { 
        inline_keyboard: [[{ 
          text: "🔄 重新检测资料", 
          callback_data: `recheck:${user.id}:${chat.id}` 
        }]] 
      }
    });
    
    if (message.ok) {
      console.log(`已发送拒绝通知给用户 ${user.id}`);
      await addLog(env, 0, "发送拒绝通知", `用户: ${username} (ID: ${user.id}) | 原因: ${reasonStr}`, "notify");
    } else {
      console.log(`无法私聊用户 ${user.id}:`, message.description);
    }
  } catch (error) {
    console.error(`发送私聊消息失败:`, error.message);
  }
}

async function telegramApi(env, method, params = {}) {
  try {
    const resp = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(params)
    });
    const result = await resp.json();
    if (!result.ok) {
      console.error(`Telegram API 错误: ${method}`, result.description);
    }
    return result;
  } catch (error) {
    console.error(`Telegram API 请求失败: ${method}`, error);
    return { ok: false, description: error.message };
  }
}