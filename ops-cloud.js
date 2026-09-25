/**
 * OPS cloud save → Supabase table ops_saves
 * Ник = секретный код сейва (кто знает ник — может перезаписать).
 */
(function () {
  const SUPABASE_URL = "https://edetrdhgardsvhoomwto.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_MBvrcDFCQlIcHcWEk8RygQ_zwW2bJ4M";
  const NICK_KEY = "schet-ops-cloud-nick";
  const MIN_NICK = 3;
  const MAX_NICK = 32;

  let pushTimer = 0;
  let busy = false;

  function headers(extra) {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      ...(extra || {}),
    };
  }

  function normNick(n) {
    return String(n || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .slice(0, MAX_NICK);
  }

  function getNick() {
    try {
      return normNick(localStorage.getItem(NICK_KEY) || "");
    } catch {
      return "";
    }
  }

  function setNick(n) {
    const nick = normNick(n);
    try {
      if (nick) localStorage.setItem(NICK_KEY, nick);
      else localStorage.removeItem(NICK_KEY);
    } catch { /* ignore */ }
    const input = document.getElementById("opsCloudNick");
    if (input && input.value !== nick) input.value = nick;
    return nick;
  }

  function validNick(n) {
    const nick = normNick(n);
    return nick.length >= MIN_NICK && nick.length <= MAX_NICK && /^[a-z0-9._-]+$/.test(nick);
  }

  function setStatus(msg, ok) {
    const el = document.getElementById("opsCloudStatus");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("ok", !!ok);
    el.classList.toggle("bad", ok === false);
  }

  function collectPayload() {
    const story = window.OpsStory && typeof window.OpsStory.getState === "function"
      ? window.OpsStory.getState()
      : null;
    const drillPack = window.OpsTerminal && typeof window.OpsTerminal.getCloudState === "function"
      ? window.OpsTerminal.getCloudState()
      : null;
    return {
      story: story || {},
      drill: (drillPack && drillPack.drill) || {},
      unlocked: !!(drillPack && drillPack.unlocked),
    };
  }

  function applyPayload(row) {
    if (!row) return;
    if (window.OpsStory && typeof window.OpsStory.applyState === "function" && row.story) {
      window.OpsStory.applyState(row.story);
    }
    if (window.OpsTerminal && typeof window.OpsTerminal.applyCloudState === "function") {
      window.OpsTerminal.applyCloudState({
        drill: row.drill || {},
        unlocked: !!row.unlocked,
      });
    }
  }

  async function push() {
    const nick = getNick() || setNick(document.getElementById("opsCloudNick")?.value || "");
    if (!validNick(nick)) {
      setStatus("ник 3–32: a-z 0-9 ._-", false);
      return false;
    }
    setNick(nick);
    if (busy) return false;
    busy = true;
    setStatus("upload…");
    try {
      const body = collectPayload();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/ops_saves?on_conflict=nick`, {
        method: "POST",
        headers: headers({
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        }),
        body: JSON.stringify({
          nick,
          story: body.story,
          drill: body.drill,
          unlocked: body.unlocked,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        setStatus(`fail ${res.status}`, false);
        console.warn("ops cloud push", res.status, t);
        return false;
      }
      setStatus("saved ↑", true);
      return true;
    } catch (err) {
      setStatus("offline?", false);
      console.warn(err);
      return false;
    } finally {
      busy = false;
    }
  }

  async function pull() {
    const nick = getNick() || setNick(document.getElementById("opsCloudNick")?.value || "");
    if (!validNick(nick)) {
      setStatus("ник 3–32: a-z 0-9 ._-", false);
      return false;
    }
    setNick(nick);
    if (busy) return false;
    busy = true;
    setStatus("download…");
    try {
      const params = new URLSearchParams({
        select: "nick,story,drill,unlocked,updated_at",
        nick: `eq.${nick}`,
        limit: "1",
      });
      const res = await fetch(`${SUPABASE_URL}/rest/v1/ops_saves?${params}`, {
        headers: headers(),
      });
      if (!res.ok) {
        setStatus(`fail ${res.status}`, false);
        return false;
      }
      const rows = await res.json();
      if (!rows || !rows.length) {
        setStatus("empty · сначала ↑", false);
        return false;
      }
      applyPayload(rows[0]);
      const when = rows[0].updated_at ? String(rows[0].updated_at).slice(0, 19) : "";
      setStatus(`loaded ↓ ${when}`, true);
      return true;
    } catch (err) {
      setStatus("offline?", false);
      console.warn(err);
      return false;
    } finally {
      busy = false;
    }
  }

  function schedulePush() {
    if (!validNick(getNick())) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      push();
    }, 2500);
  }

  function bind() {
    const input = document.getElementById("opsCloudNick");
    if (input) {
      input.value = getNick();
      input.addEventListener("change", () => {
        setNick(input.value);
        setStatus(validNick(input.value) ? "nick ok" : "ник слабый", validNick(input.value));
      });
    }
    document.getElementById("opsCloudPush")?.addEventListener("click", () => {
      setNick(document.getElementById("opsCloudNick")?.value || getNick());
      push();
    });
    document.getElementById("opsCloudPull")?.addEventListener("click", () => {
      setNick(document.getElementById("opsCloudNick")?.value || getNick());
      pull();
    });
  }

  window.OpsCloud = {
    getNick,
    setNick,
    push,
    pull,
    schedulePush,
    validNick,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
