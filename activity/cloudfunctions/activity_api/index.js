const http = require('node:http');
const zlib = require('node:zlib');

const WEAPONS = new Set(['sword', 'staff', 'crossbow']);
const MAX_FLOOR = 50;
const MAX_LIMIT = 50;

function errorResult(code, message, statusCode = 400) {
  return { ok: false, error: { code, message }, statusCode };
}

function hash32(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function encodeBase36(value, length = 4) {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let current = value >>> 0;
  let output = '';
  for (let index = 0; index < length; index += 1) {
    output = alphabet[current % 36] + output;
    current = Math.floor(current / 36);
  }
  return output;
}

function dailyCodeForDate(date) {
  const digest = hash32(`ash-corridor:${date}:v1`);
  return `ASH-${date}-V1-${encodeBase36(digest & 0xfffff, 4)}`;
}

function todayShanghai() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}`;
}

function scoreFor(value) {
  const floors = Math.max(0, Number(value.completedFloors) || 0);
  const enemies = Math.max(0, Number(value.enemiesDefeated) || 0);
  const bosses = Math.max(0, Number(value.bossesDefeated) || 0);
  const hp = Math.min(1, Math.max(0, Number(value.hpRatio) || 0));
  const gold = Math.max(0, Number(value.gold) || 0);
  const duration = Math.max(0, Number(value.durationMs) || 0);
  const cleared = Boolean(value.cleared);
  return floors * 1000 + enemies * 40 + bosses * 600 + Math.round(hp * 500) + gold * 5
    + (cleared ? 10000 : 0)
    + (cleared ? Math.max(0, 6000 - Math.floor(duration / 1000) * 10) : 0);
}

function numberInRange(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function integerInRange(value, min, max) {
  const number = numberInRange(value, min, max);
  return number !== null && Number.isInteger(number) ? number : null;
}

function validateSubmission(input = {}, options = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return errorResult('INVALID_STATS', '提交数据格式错误');
  const mode = String(input.mode || '').trim().toLowerCase();
  const scope = String(input.scope || '').trim().toLowerCase();
  const weapon = String(input.weapon || '').trim().toLowerCase();
  const floors = integerInRange(input.completedFloors, 0, MAX_FLOOR);
  const enemies = integerInRange(input.enemiesDefeated ?? 0, 0, 100000);
  const bosses = integerInRange(input.bossesDefeated ?? 0, 0, 1000);
  const duration = numberInRange(input.durationMs, 0, 7 * 24 * 60 * 60 * 1000);
  const hpRatio = numberInRange(input.hpRatio, 0, 1);
  const gold = integerInRange(input.gold ?? 0, 0, 1000000);
  if (!['normal', 'daily'].includes(mode)) return errorResult('INVALID_SCOPE', '模式必须为 normal 或 daily');
  if ((mode === 'daily' && scope !== 'daily') || (mode === 'normal' && scope !== 'all')) return errorResult('INVALID_SCOPE', '模式与榜单范围不匹配');
  if (!WEAPONS.has(weapon)) return errorResult('INVALID_WEAPON', '武器无效');
  if ([floors, enemies, bosses, duration, hpRatio, gold].some(value => value === null)) return errorResult('INVALID_STATS', '统计数据超出允许范围');
  const code = input.code == null ? '' : String(input.code).trim().toUpperCase();
  if (mode === 'daily') {
    const expected = options.todayCode || dailyCodeForDate(todayShanghai());
    if (code !== expected) return errorResult('INVALID_CHALLENGE_CODE', '每日挑战码无效或已过期');
  }
  const submittedAt = input.submittedAt == null ? new Date().toISOString() : String(input.submittedAt);
  if (Number.isNaN(Date.parse(submittedAt))) return errorResult('INVALID_STATS', '提交时间无效');
  const value = {
    mode, scope, scopeKey: mode === 'daily' ? `daily:${code}` : 'all', code: code || null, weapon,
    completedFloors: floors, enemiesDefeated: enemies, bossesDefeated: bosses,
    durationMs: duration, hpRatio, gold, cleared: Boolean(input.cleared), submittedAt,
  };
  value.cleared = value.cleared && value.completedFloors === MAX_FLOOR;
  value.score = scoreFor(value);
  return { ok: true, value };
}

function readPuid(request) {
  const raw = request && request.headers && request.headers['x-cloudbase-context'];
  if (!raw) {
    const error = new Error('请先登录');
    error.statusCode = 401;
    error.code = 'NOT_LOGGED_IN';
    throw error;
  }
  let buffer = Buffer.from(String(raw).trim(), 'base64');
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) buffer = zlib.gunzipSync(buffer);
  const context = JSON.parse(buffer.toString('utf8'));
  const puid = context.customUserId || context.userId || context.uid;
  if (!puid) {
    const error = new Error('请先登录');
    error.statusCode = 401;
    error.code = 'NOT_LOGGED_IN';
    throw error;
  }
  return { puid: String(puid), nickname: String(context.nickname || context.nickName || context.user?.nickname || '虎扑玩家').trim() || '虎扑玩家' };
}

function compareEntries(left, right) {
  if (Number(left.score) !== Number(right.score)) return Number(right.score) - Number(left.score);
  if (Number(left.durationMs) !== Number(right.durationMs)) return Number(left.durationMs) - Number(right.durationMs);
  return Date.parse(left.submittedAt) - Date.parse(right.submittedAt);
}

function sortEntries(entries) {
  return (Array.isArray(entries) ? entries : []).slice().sort(compareEntries).map((entry, index) => ({
    rank: index + 1,
    nickname: entry.nickname || '虎扑玩家',
    score: Number(entry.score) || 0,
    completedFloors: Number(entry.completedFloors) || 0,
    durationMs: Number(entry.durationMs) || 0,
    weapon: entry.weapon,
    submittedAt: entry.submittedAt,
  }));
}

function publicEntry(entry, rank) {
  if (!entry) return null;
  return {
    rank: rank == null ? Number(entry.rank) || 0 : rank,
    nickname: String(entry.nickname || '虎扑玩家'),
    score: Number(entry.score) || 0,
    completedFloors: Number(entry.completedFloors) || 0,
    durationMs: Number(entry.durationMs) || 0,
    weapon: String(entry.weapon || 'sword'),
  };
}

function fromDbRow(row = {}) {
  return {
    ...row,
    id: row.id,
    puid: row.puid,
    nickname: row.nickname,
    scopeKey: row.scope_key,
    mode: row.mode,
    code: row.code,
    weapon: row.weapon,
    completedFloors: row.completed_floors,
    enemiesDefeated: row.enemies_defeated,
    bossesDefeated: row.bosses_defeated,
    durationMs: row.duration_ms,
    hpRatio: row.hp_ratio,
    gold: row.gold,
    cleared: row.cleared,
    score: row.score,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

function toDbRecord(value, identity) {
  return {
    puid: identity.puid,
    nickname: identity.nickname,
    scope_key: value.scopeKey,
    mode: value.mode,
    code: value.code,
    weapon: value.weapon,
    completed_floors: value.completedFloors,
    enemies_defeated: value.enemiesDefeated,
    bosses_defeated: value.bossesDefeated,
    duration_ms: value.durationMs,
    hp_ratio: value.hpRatio,
    gold: value.gold,
    cleared: value.cleared,
    score: value.score,
    submitted_at: value.submittedAt,
    updated_at: new Date().toISOString(),
  };
}

function apiPath(request) {
  return new URL(request.url || '/', 'http://localhost').pathname.replace(/^\/api(?=\/|$)/, '') || '/';
}

function parseBody(request) {
  return new Promise(resolve => {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
    });
  });
}

function createHandler({ rdb, now = () => new Date() } = {}) {
  if (!rdb || typeof rdb.from !== 'function') throw new Error('rdb is required');
  const table = rdb.from('leaderboard_entries');
  const readRows = async scopeKey => {
    const result = await table.select('*').eq('scope_key', scopeKey).order('score', { ascending: false }).order('duration_ms', { ascending: true }).limit(MAX_LIMIT);
    if (result && result.error) throw result.error;
    return result && Array.isArray(result.data) ? result.data.map(fromDbRow) : [];
  };

  return async function handle(request, response) {
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CloudBase-Context' };
    const send = (status, payload) => { response.writeHead(status, headers); response.end(JSON.stringify(payload)); };
    if (request.method === 'OPTIONS') return send(204, {});
    try {
      const path = apiPath(request);
      if (request.method === 'GET' && path === '/health') return send(200, { code: 0, message: 'ok' });
      if (request.method === 'GET' && path === '/leaderboard/list') {
        const query = new URL(request.url || '/', 'http://localhost').searchParams;
        const scope = String(query.get('scope') || 'all').toLowerCase();
        const code = String(query.get('code') || '').trim().toUpperCase();
        if (!['all', 'daily'].includes(scope) || (scope === 'daily' && !code)) return send(400, { error: { code: 'INVALID_SCOPE', message: '榜单范围无效' } });
        const entries = sortEntries(await readRows(scope === 'daily' ? `daily:${code}` : 'all')).slice(0, Math.min(MAX_LIMIT, Math.max(1, Number(query.get('limit')) || MAX_LIMIT)));
        return send(200, { entries: entries.map(publicEntry), nextCursor: null });
      }
      if (request.method === 'GET' && path === '/leaderboard/me') {
        const identity = readPuid(request);
        const query = new URL(request.url || '/', 'http://localhost').searchParams;
        const scope = String(query.get('scope') || 'all').toLowerCase();
        const code = String(query.get('code') || '').trim().toUpperCase();
        if (!['all', 'daily'].includes(scope) || (scope === 'daily' && !code)) return send(400, { error: { code: 'INVALID_SCOPE', message: '榜单范围无效' } });
        const rows = await table.select('*').eq('scope_key', scope === 'daily' ? `daily:${code}` : 'all').eq('puid', identity.puid).limit(1);
        if (rows && rows.error) throw rows.error;
        const entry = rows && rows.data && rows.data[0] ? fromDbRow(rows.data[0]) : null;
        if (!entry) return send(200, { entry: null });
        const all = sortEntries(await readRows(entry.scope_key));
        const rank = all.findIndex(item => item.id === entry.id) + 1;
        return send(200, { entry: publicEntry(entry, rank) });
      }
      if (request.method === 'POST' && path === '/leaderboard/submit') {
        const identity = readPuid(request);
        const body = await parseBody(request);
        const validated = validateSubmission(body);
        if (!validated.ok) return send(validated.statusCode, { error: validated.error });
        const value = validated.value;
        const existingResult = await table.select('*').eq('puid', identity.puid).eq('scope_key', value.scopeKey).limit(1);
        if (existingResult && existingResult.error) throw existingResult.error;
        const existing = existingResult && existingResult.data && existingResult.data[0] ? fromDbRow(existingResult.data[0]) : null;
        const candidate = toDbRecord(value, identity);
        if (existing && compareEntries(existing, candidate) <= 0) return send(200, { accepted: false, replaced: false, entry: publicEntry(existing) });
        const write = existing
          ? await table.update(candidate).eq('id', existing.id)
          : await table.insert([candidate]);
        if (write && write.error) throw write.error;
        const saved = existing ? { ...existing, ...value, puid: identity.puid, nickname: identity.nickname } : { ...value, puid: identity.puid, nickname: identity.nickname };
        return send(200, { accepted: true, replaced: Boolean(existing), entry: publicEntry(saved) });
      }
      return send(404, { error: { code: 'NOT_FOUND', message: '接口不存在' } });
    } catch (error) {
      const status = Number(error.statusCode) || 500;
      send(status, { error: { code: error.code || (status === 401 ? 'NOT_LOGGED_IN' : 'SERVICE_UNAVAILABLE'), message: status < 500 ? error.message : '服务暂不可用' } });
    }
  };
}

module.exports = { validateSubmission, readPuid, sortEntries, scoreFor, createHandler, dailyCodeForDate, toDbRecord, fromDbRow };

if (require.main === module) {
  const tcb = require('@cloudbase/node-sdk');
  const app = tcb.init({ env: process.env.CLOUDBASE_ENV_ID, accessKey: process.env.COLORBOX__ACCESS_KEY });
  const handler = createHandler({ rdb: app.rdb({ database: 'public' }) });
  http.createServer(handler).listen(Number(process.env.PORT) || 9000);
}
