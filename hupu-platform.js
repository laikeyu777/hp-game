(function (root, factory) {
  const logic = typeof require === 'function' ? require('./leaderboard-logic.js') : root.LeaderboardLogic;
  const store = typeof require === 'function' ? require('./leaderboard-store.js') : root.LeaderboardStore;
  const api = factory(root, logic, store);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HupuPlatform = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root, LeaderboardLogic, LeaderboardStore) {
  const DEFAULT_TIMEOUT_MS = 3500;
  const attemptedThisSession = new Set();
  const failedThisSession = new Set();

  function getColorbox() {
    return root && root.ColorboxAI && typeof root.ColorboxAI === 'object' ? root.ColorboxAI : null;
  }

  function guest() {
    return { loggedIn: false, nickname: '' };
  }

  function normalizeNickname(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  async function getUser() {
    const colorbox = getColorbox();
    const getUserInfo = colorbox && colorbox.auth && colorbox.auth.getUserInfo;
    if (typeof getUserInfo !== 'function') return guest();
    try {
      const response = await getUserInfo.call(colorbox.auth);
      if (!response || Number(response.code) !== 200 || !response.data) return guest();
      const data = response.data;
      const loggedIn = data.islogin === 1 || data.islogin === '1';
      const nickname = normalizeNickname(data.nickname);
      return loggedIn && nickname ? { loggedIn: true, nickname } : guest();
    } catch {
      return guest();
    }
  }

  function normalizePath(path) {
    const value = String(path == null ? '' : path).trim();
    if (!value) return '/';
    return value.startsWith('/') ? value : `/${value}`;
  }

  function resolveUrl(path) {
    const normalized = normalizePath(path);
    if (/^https?:\/\//i.test(normalized)) return normalized;
    const base = root && (root.ACTIVITY_API_BASE || root.HUPU_ACTIVITY_API_BASE || root.ACTIVITY_API_URL);
    if (!base) return normalized;
    return `${String(base).replace(/\/+$/, '')}${normalized}`;
  }

  function failure(reason, extra = {}) {
    return { ok: false, reason: String(reason || 'request_failed'), ...extra };
  }

  function timeoutPromise(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('request_timeout')), ms);
    });
  }

  function cleanOptions(options) {
    const source = options && typeof options === 'object' ? options : {};
    const result = {
      method: String(source.method || 'GET').toUpperCase(),
      auth: source.auth === true,
    };
    if (source.data !== undefined) result.data = source.data;
    if (source.envId) result.envId = String(source.envId);
    if (source.headers && typeof source.headers === 'object') result.headers = { ...source.headers };
    return result;
  }

  async function request(path, options = {}) {
    const colorbox = getColorbox();
    const cloud = colorbox && colorbox.cloud;
    if (!cloud || typeof cloud.request !== 'function') return failure('host_unavailable');

    const params = { url: resolveUrl(path), ...cleanOptions(options) };
    const timeoutMs = Number.isFinite(Number(options.timeout)) ? Math.max(100, Number(options.timeout)) : DEFAULT_TIMEOUT_MS;
    try {
      const pending = Promise.resolve().then(() => cloud.request.call(cloud, params));
      const response = await Promise.race([pending, timeoutPromise(timeoutMs)]);
      const statusCode = Number(response && (response.statusCode ?? response.status));
      const businessCode = response && response.code == null ? null : Number(response.code);
      if ((Number.isFinite(statusCode) && statusCode >= 400) || (businessCode != null && Number.isFinite(businessCode) && businessCode !== 200)) {
        return failure(response && (response.message || `api_${businessCode || statusCode}`), { statusCode, raw: response });
      }
      return {
        ok: true,
        data: response && response.data !== undefined ? response.data : response,
        statusCode: Number.isFinite(statusCode) ? statusCode : 200,
        raw: response,
      };
    } catch (error) {
      return failure(error && error.message === 'request_timeout' ? 'timeout' : 'request_failed');
    }
  }

  function safePayload(payload) {
    const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    const blocked = /^(puid|userId|accountId|authToken|token|phone|phoneNumber)$/i;
    return Object.fromEntries(Object.entries(source).filter(([key]) => !blocked.test(key)));
  }

  function normalizeRemoteEntry(value) {
    const candidate = value && typeof value === 'object' ? (value.entry || value.result || value) : null;
    if (!candidate || !LeaderboardLogic || typeof LeaderboardLogic.sanitizeEntries !== 'function') return null;
    return LeaderboardLogic.sanitizeEntries([candidate], { limit: 1 })[0] || null;
  }

  async function submitLeaderboard(payload) {
    const response = await request('/api/leaderboard/submit', {
      method: 'POST',
      data: safePayload(payload),
      auth: true,
    });
    if (!response.ok) return response;
    const entry = normalizeRemoteEntry(response.data);
    return entry ? { ok: true, entry, statusCode: response.statusCode } : failure('invalid_response');
  }

  function scopeQuery(scope, code) {
    const source = scope && typeof scope === 'object' ? scope : { scope };
    const type = String(source.scope || source.mode || 'all').trim().toLowerCase() === 'daily' ? 'daily' : 'all';
    const normalizedCode = String(source.code || code || '').trim().toUpperCase();
    const query = new URLSearchParams({ scope: type });
    if (type === 'daily' && normalizedCode) query.set('code', normalizedCode);
    return { type, code: normalizedCode, query: query.toString() };
  }

  function responseEntries(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    return Array.isArray(data.entries) ? data.entries : Array.isArray(data.list) ? data.list : Array.isArray(data.rows) ? data.rows : [];
  }

  async function fetchLeaderboard(scope, code) {
    const target = scopeQuery(scope, code);
    const query = target.query;
    const [list, me] = await Promise.all([
      request(`/api/leaderboard/list?${query}`, { method: 'GET', auth: false }),
      request(`/api/leaderboard/me?${query}`, { method: 'GET', auth: true }),
    ]);
    if (!list.ok) return { ...list, entries: [], me: null, scope: target.type, code: target.code };
    if (!me.ok) return { ...me, entries: [], me: null, scope: target.type, code: target.code };
    const entries = LeaderboardLogic && typeof LeaderboardLogic.sanitizeEntries === 'function'
      ? LeaderboardLogic.sanitizeEntries(responseEntries(list.data), { limit: 50 })
      : responseEntries(list.data).slice(0, 50);
    const meData = me.data && typeof me.data === 'object' ? (me.data.me || me.data.entry || me.data) : null;
    return { ok: true, entries, me: meData, scope: target.type, code: target.code };
  }

  async function flushPending(submissions, state) {
    if (submissions && !Array.isArray(submissions) && submissions.pending && state === undefined) {
      state = submissions;
      submissions = state.pending;
    }
    const pending = Array.isArray(submissions) ? submissions : [];
    let current = LeaderboardStore && typeof LeaderboardStore.createState === 'function'
      ? LeaderboardStore.createState(state || { pending })
      : state || { pending: pending.slice() };
    const synced = [];
    const failed = [];

    for (const submission of pending) {
      const key = String(submission && submission.submissionKey || '').trim();
      if (!key) continue;
      if (attemptedThisSession.has(key)) {
        if (failedThisSession.has(key)) failed.push(key);
        continue;
      }
      attemptedThisSession.add(key);
      const result = await submitLeaderboard(submission);
      if (result.ok) {
        synced.push(key);
        if (LeaderboardStore && typeof LeaderboardStore.markSynced === 'function') {
          current = LeaderboardStore.markSynced(current, key, result.entry);
        }
      } else {
        failedThisSession.add(key);
        failed.push(key);
      }
    }
    return { ok: failed.length === 0, synced, failed, state: current };
  }

  return {
    DEFAULT_TIMEOUT_MS,
    getUser,
    request,
    submitLeaderboard,
    fetchLeaderboard,
    flushPending,
  };
});
