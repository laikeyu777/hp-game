(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ShareAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString('zh-CN') : '0';
  }

  function createResultText(result = {}) {
    const title = result.title || '一指登塔：灰烬回廊';
    const lines = [
      `《${title}》`,
      result.mode === 'daily' ? `每日挑战：${result.code || '今日挑战'}` : '普通冒险',
      `武器：${result.weaponName || result.weapon || '未知'}`,
      `层数：${Math.max(0, Number(result.completedFloors) || 0)}`,
    ];
    if (result.bossesDefeated != null) lines.push(`Boss：${Math.max(0, Number(result.bossesDefeated) || 0)}`);
    if (result.score != null) lines.push(`成绩：${formatNumber(result.score)}`);
    if (result.durationMs != null) {
      const seconds = Math.max(0, Math.floor((Number(result.durationMs) || 0) / 1000));
      lines.push(`用时：${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
    }
    lines.push('来虎扑和我一起挑战更高层。');
    return lines.join('\n');
  }

  async function copyWithClipboard(text, context) {
    const navigatorObject = context?.navigator || (typeof navigator !== 'undefined' ? navigator : null);
    if (!navigatorObject?.clipboard?.writeText) return false;
    await navigatorObject.clipboard.writeText(text);
    return true;
  }

  function copyWithTextarea(text, context) {
    const documentObject = context?.document || (typeof document !== 'undefined' ? document : null);
    if (!documentObject?.createElement || !documentObject.body) return false;
    const area = documentObject.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    documentObject.body.appendChild(area);
    area.select();
    let copied = false;
    try { copied = Boolean(documentObject.execCommand?.('copy')); } catch { copied = false; }
    area.remove();
    return copied;
  }

  function openHupu(context) {
    const windowObject = context?.window || (typeof window !== 'undefined' ? window : null);
    if (!windowObject?.open) return false;
    windowObject.open('https://bbs.hupu.com/', '_blank', 'noopener,noreferrer');
    return true;
  }

  async function share(text, context = {}) {
    const navigatorObject = context.navigator || (typeof navigator !== 'undefined' ? navigator : null);
    if (navigatorObject?.share) {
      try {
        await navigatorObject.share({ title: '一指登塔：灰烬回廊', text, url: context.url || (typeof location !== 'undefined' ? location.href : undefined) });
        return { ok: true, method: 'web-share' };
      } catch (error) {
        if (error?.name === 'AbortError') return { ok: false, method: 'cancelled' };
      }
    }
    try {
      if (await copyWithClipboard(text, context)) {
        openHupu(context);
        return { ok: true, method: 'clipboard' };
      }
    } catch { /* fall through to textarea copy */ }
    if (copyWithTextarea(text, context)) {
      openHupu(context);
      return { ok: true, method: 'textarea' };
    }
    return { ok: false, method: 'unavailable' };
  }

  return { createResultText, share };
});
