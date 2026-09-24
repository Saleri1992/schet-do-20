const STORAGE_KEY = "schet-do-20";
const NICK_KEY = "schet-do-20-nick";
const SCORE_QUEUE_KEY = "schet-do-20-score-queue";
const DATA_VERSION = 12;
const TOTAL = 10;
const HARD_LIMIT_MS = 60 * 1000;
const SECRET_SPEED_MS = 40 * 1000;
const UNITS_INTRO_MS = 10 * 1000;
const ARCHMAGE_MIN = 850;
const MODE_BASIC = "basic";
const MODE_CHAIN = "chain";
const MODE_UNITS = "units";
const MODE_MUL = "mul";
const MODE_DIV = "div";
const MODE_ENG = "eng";
const MODE_CODE = "code";
const MODE_SAFE = "safe";
const THEME_MATH = "math";
const THEME_ENG = "eng";
const THEME_CODE = "code";
const THEME_SAFE = "safe";
const SECRET_LEVEL = 6;
const BATTLE_LEVEL = 7;
const BATTLE_LEVELS = [7, 8, 9];
const EXTRA_MAX_PER_RUN = 2;
const BATTLE_HERO_HP = 5;
const BATTLE_BOSS_HP = 10;
const ACCESSORY_MAX = 2;
const BATTLE_CFG = {
  7: {
    id: 7, name: "Бой 1", theme: "boss", coin: 12,
    heroHp: 5, bossHp: 8, rewardMul: 1, roundFrac: 0.6,
    foe: "slime", foeName: "Слизень",
    balloons: ["🟢", "⚔️", "🟢"],
    subtitle: "Первый бой: короче раунды, 5 HP у тебя, 8 у Задания.",
  },
  8: {
    id: 8, name: "Бой 2", theme: "boss", coin: 16,
    heroHp: 5, bossHp: 12, rewardMul: 1.4, roundFrac: 1,
    foe: "rock", foeName: "Камень",
    balloons: ["🪨", "⚔️", "🪨"],
    subtitle: "Второй бой: все уровни, 5 HP у тебя, 12 у Задания.",
  },
  9: {
    id: 9, name: "Бой 3", theme: "boss", coin: 22,
    heroHp: 6, bossHp: 15, rewardMul: 1.8, roundFrac: 1,
    foe: "storm", foeName: "Гроза",
    balloons: ["⛈️", "⚔️", "⛈️"],
    subtitle: "Финал: 6 HP у тебя, 15 у Задания. Будь осторожен!",
  },
};
const HOME_ACH_PREVIEW = 8;

const SUPABASE_URL = "https://edetrdhgardsvhoomwto.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MBvrcDFCQlIcHcWEk8RygQ_zwW2bJ4M";
const SCORES_CACHE_MS = 25000;
const BOARD_FETCH_LIMIT = 120;

let supabaseHasMode = null; // null = неизвестно, true/false после первой проверки
let scoresCache = { key: "", at: 0, rows: [] };

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra,
  };
}

async function fetchScores(levelFilter, modeFilter = "all", { limit = BOARD_FETCH_LIMIT } = {}) {
  const makeParams = (withLook, withMode = true) => {
    const params = new URLSearchParams({
      select: withLook
        ? `nick,level,correct,ms,grade,timed_out,created_at,skin,hat${withMode ? ",mode" : ""}`
        : `nick,level,correct,ms,grade,timed_out,created_at${withMode ? ",mode" : ""}`,
      correct: "eq.10",
      timed_out: "eq.false",
      order: "ms.asc,created_at.asc",
      limit: String(limit),
    });
    if (levelFilter !== "all") params.set("level", `eq.${Number(levelFilter)}`);
    if (withMode && modeFilter === MODE_CHAIN) params.set("mode", `eq.${MODE_CHAIN}`);
    if (withMode && modeFilter === MODE_BASIC) params.set("or", "(mode.eq.basic,mode.is.null)");
    if (withMode && modeFilter === MODE_UNITS) params.set("mode", `eq.${MODE_UNITS}`);
    if (withMode && modeFilter === MODE_MUL) params.set("mode", `eq.${MODE_MUL}`);
    if (withMode && modeFilter === MODE_DIV) params.set("mode", `eq.${MODE_DIV}`);
    if (withMode && modeFilter === MODE_ENG) params.set("mode", `eq.${MODE_ENG}`);
    if (withMode && modeFilter === MODE_CODE) params.set("mode", `eq.${MODE_CODE}`);
    return params;
  };

  const tryFetch = async (withLook, withMode) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores?${makeParams(withLook, withMode)}`, {
      headers: supabaseHeaders(),
    });
    return res;
  };

  const wantMode = supabaseHasMode !== false;
  let res = await tryFetch(true, wantMode);
  if (!res.ok) {
    const text = await res.text();
    if (wantMode && /mode|column/i.test(text)) {
      supabaseHasMode = false;
      res = await tryFetch(true, false);
      if (!res.ok) {
        res = await tryFetch(false, false);
      }
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
    } else if (/skin|hat|column/i.test(text)) {
      res = await tryFetch(false, wantMode && supabaseHasMode !== false);
      if (!res.ok) {
        const t2 = await res.text();
        if (wantMode && /mode|column/i.test(t2)) {
          supabaseHasMode = false;
          res = await tryFetch(false, false);
        }
        if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      }
    } else {
      throw new Error(text || `HTTP ${res.status}`);
    }
  } else if (wantMode) {
    supabaseHasMode = true;
  }

  const rows = await res.json();
  const list = (Array.isArray(rows) ? rows : []).filter(isBoardScore);
  if (modeFilter === MODE_CHAIN) return list.filter((r) => r.mode === MODE_CHAIN);
  if (modeFilter === MODE_UNITS) return list.filter((r) => r.mode === MODE_UNITS);
  if (modeFilter === MODE_MUL) return list.filter((r) => r.mode === MODE_MUL);
  if (modeFilter === MODE_DIV) return list.filter((r) => r.mode === MODE_DIV);
  if (modeFilter === MODE_ENG) return list.filter((r) => r.mode === MODE_ENG);
  if (modeFilter === MODE_CODE) return list.filter((r) => r.mode === MODE_CODE);
  if (modeFilter === MODE_BASIC) return list.filter((r) => !r.mode || r.mode === MODE_BASIC);
  return list;
}

/** В общий топ только идеальные 10/10 без срыва по времени. */
function isBoardScore(row) {
  if (!row) return false;
  const correct = Number(row.correct);
  const timedOut = row.timed_out === true || row.timedOut === true;
  return correct === TOTAL && !timedOut;
}

async function insertScore(row) {
  const payload = {
    nick: row.nick,
    level: Number(row.level),
    correct: Number(row.correct),
    ms: Math.max(0, Math.round(row.ms)),
    grade: row.grade == null ? null : Number(row.grade),
    timed_out: Boolean(row.timed_out),
    skin: row.skin || null,
    hat: row.hat || null,
    mode: row.mode || MODE_BASIC,
  };
  let res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
    method: "POST",
    headers: supabaseHeaders({
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    // Только если колонки нет в схеме — убираем поля. RLS/политику не маскируем.
    if (/column .* does not exist|Could not find the/i.test(text) && /skin|hat|mode/i.test(text)) {
      if (/skin/i.test(text)) delete payload.skin;
      if (/hat/i.test(text)) delete payload.hat;
      if (/mode/i.test(text)) delete payload.mode;
      res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
        method: "POST",
        headers: supabaseHeaders({
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      return;
    }
    throw new Error(text || `HTTP ${res.status}`);
  }
}

function loadScoreQueue() {
  try {
    const raw = JSON.parse(localStorage.getItem(SCORE_QUEUE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveScoreQueue(queue) {
  try {
    localStorage.setItem(SCORE_QUEUE_KEY, JSON.stringify(queue.slice(-80)));
  } catch {
    /* ignore quota */
  }
}

function scoreQueueId(row) {
  return row.id || `${row.nick}|${row.mode || MODE_BASIC}|${row.level}|${row.correct}|${row.ms}|${row.local_at || ""}`;
}

function enqueueScore(row) {
  if (!isBoardScore(row)) return loadScoreQueue().length;
  const queue = loadScoreQueue();
  const id = scoreQueueId(row);
  if (queue.some((item) => scoreQueueId(item) === id)) return queue.length;
  queue.push({
    id,
    nick: row.nick,
    level: Number(row.level),
    correct: Number(row.correct),
    ms: Math.max(0, Math.round(row.ms)),
    grade: row.grade == null ? null : Number(row.grade),
    timed_out: false,
    skin: row.skin || null,
    hat: row.hat || null,
    mode: row.mode || MODE_BASIC,
    local_at: row.local_at || new Date().toISOString(),
    tries: 0,
  });
  saveScoreQueue(queue);
  return queue.length;
}

function markRunSynced(localId) {
  if (!localId || !state.runs) return;
  let changed = false;
  state.runs.forEach((r) => {
    const rid = r.startedAt || r.date;
    if (rid === localId && !r.synced) {
      r.synced = true;
      changed = true;
    }
  });
  if (changed) saveState();
}

function queueLocalUnsyncedRuns() {
  const nick = normalizeNick(playerNick);
  if (!isNickOk(nick)) return 0;
  let added = 0;
  let changed = false;
  (state.runs || []).forEach((r) => {
    if (r.synced) return;
    if (!isBoardScore({ correct: r.correct, timedOut: r.timedOut, mode: r.mode })) {
      r.synced = true;
      changed = true;
      return;
    }
    const before = loadScoreQueue().length;
    enqueueScore({
      id: `run:${r.startedAt || r.date || `${r.level}-${r.ms}-${r.correct}`}`,
      nick,
      level: r.level || 1,
      correct: r.correct,
      ms: r.ms || 0,
      grade: r.grade == null ? null : r.grade,
      timed_out: false,
      skin: (state.shop && state.shop.skin) || "honey",
      hat: (state.shop && state.shop.hat) || "none",
      mode: r.mode || MODE_BASIC,
      local_at: r.date || r.startedAt || new Date().toISOString(),
    });
    if (loadScoreQueue().length > before) added += 1;
  });
  if (changed) saveState();
  return added;
}

let syncInFlight = null;

async function syncScoreQueue({ quiet = true } = {}) {
  if (syncInFlight) return syncInFlight;
  queueLocalUnsyncedRuns();
  const pruned = loadScoreQueue().filter(isBoardScore);
  saveScoreQueue(pruned);
  const queue = pruned;
  if (!queue.length) {
    updateSyncHint();
    return { sent: 0, left: 0 };
  }

  syncInFlight = (async () => {
    let sent = 0;
    const left = [];
    for (const item of queue) {
      try {
        await insertScore(item);
        sent += 1;
        if (String(item.id).startsWith("run:")) {
          markRunSynced(String(item.id).slice(4));
        }
      } catch (err) {
        item.tries = (item.tries || 0) + 1;
        left.push(item);
        console.warn("score sync item", err);
      }
    }
    saveScoreQueue(left);
    if (!quiet) {
      if (sent > 0) {
        showToasts([{ plain: true, icon: "🏆", name: "Топ обновлён", desc: `Отправлено идеальных: ${sent}` }]);
      } else if (left.length) {
        showToasts([{ plain: true, icon: "☁️", name: "Сеть слабая", desc: `В очереди ещё ${left.length}. Попробуем снова.` }]);
      } else {
        showToasts([{ plain: true, icon: "☁️", name: "Очередь пуста", desc: "В топ идут только 10/10 без срыва по времени." }]);
      }
    }
    updateSyncHint();
    return { sent, left: left.length };
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

function pendingScoreCount() {
  return loadScoreQueue().length;
}

function updateSyncHint() {
  const n = pendingScoreCount();
  if (els.syncHint) {
    if (n > 0) {
      els.syncHint.textContent = `В очереди на топ: ${n}. Отправим при нормальном интернете.`;
      els.syncHint.classList.remove("hidden");
    } else {
      els.syncHint.textContent = "";
      els.syncHint.classList.add("hidden");
    }
  }
  if (els.syncNowBtn) {
    els.syncNowBtn.classList.toggle("hidden", n < 1);
  }
  if (els.openBoardBtn) {
    els.openBoardBtn.textContent = n > 0 ? `Лидеры (${n})` : "Лидеры";
  }
}

const LEVELS = {
  1: {
    id: 1,
    name: "Лёгкий",
    theme: "easy",
    coin: 1,
    limit: null,
    balloons: ["🎈", "⭐", "🎈"],
    subtitle: "Простые примеры. Ответ принимается любой — итог в конце.",
  },
  2: {
    id: 2,
    name: "Средний",
    theme: "medium",
    coin: 2,
    limit: null,
    balloons: ["⭐", "🌟", "⭐"],
    subtitle: "Суммы 10–20 и вычитание из двузначного числа.",
  },
  3: {
    id: 3,
    name: "Сложный",
    theme: "sharp",
    coin: 3,
    limit: null,
    balloons: ["⚡", "🌟", "⚡"],
    subtitle: "Переход через десяток: 7+8 и 15−8. Плюс 3 примера как на среднем.",
  },
  4: {
    id: 4,
    name: "Хард",
    theme: "hard",
    coin: 4,
    limit: HARD_LIMIT_MS,
    balloons: ["🔥", "⚡", "🔥"],
    subtitle: "Как сложный, но на весь тест только 1 минута!",
  },
  5: {
    id: 5,
    name: "Реальный хард",
    theme: "exam",
    coin: 5,
    limit: HARD_LIMIT_MS,
    school: true,
    balloons: ["📕", "✏️", "📕"],
    subtitle: "Минута + школьная оценка. Буст «Читер» прощает ошибки (до 4).",
  },
    6: {
    id: 6,
    name: "Секрет",
    theme: "secret",
    coin: 8,
    limit: null,
    secret: true,
    balloons: ["🗝️", "✨", "🗝️"],
    subtitle: "Секрет: числа до 30. Без таймера. Открывается за скорость во всех режимах.",
  },
  7: {
    id: 7, name: "Бой 1", theme: "boss", coin: 12, limit: null, battle: true, battleTier: 1,
    balloons: ["🟢", "⚔️", "🟢"],
    subtitle: "Первый бой: короче раунды, 5 HP у тебя, 8 у Задания.",
  },
  8: {
    id: 8, name: "Бой 2", theme: "boss", coin: 16, limit: null, battle: true, battleTier: 2,
    balloons: ["🪨", "⚔️", "🪨"],
    subtitle: "Второй бой: все уровни, 5 HP у тебя, 12 у Задания.",
  },
  9: {
    id: 9, name: "Бой 3", theme: "boss", coin: 22, limit: null, battle: true, battleTier: 3,
    balloons: ["⛈️", "⚔️", "⛈️"],
    subtitle: "Финал: 6 HP у тебя, 15 у Задания.",
  },
};

const UNIT_LEVELS = {
  1: {
    id: 1,
    name: "Конвертация",
    theme: "units",
    coin: 3,
    limit: null,
    units: "convert",
    balloons: ["📏", "📐", "📏"],
    subtitle: "Переведи длину: см↔мм, дм↔см, м↔дм и составные (4 дм 1 см = ? см). Без дробей.",
  },
  2: {
    id: 2,
    name: "Сравнение",
    theme: "unitsCmp",
    coin: 4,
    limit: null,
    units: "compare",
    balloons: ["⚖️", "📏", "⚖️"],
    subtitle: "Что больше по длине? Ответ: 1, 2 или 0 если равно. Сначала таблица 10 сек.",
  },
};

/** Умножение — своя лестница, не как База/Хард. */
const MUL_LEVELS = {
  1: {
    id: 1,
    name: "Суть",
    theme: "easy",
    coin: 2,
    limit: null,
    mul: "intro",
    intro: true,
    balloons: ["💡", "✖️", "💡"],
    subtitle: "Умножение — это сложение одинаковых чисел. Сначала учимся понимать.",
  },
  2: {
    id: 2,
    name: "×2 и ×3",
    theme: "medium",
    coin: 2,
    limit: null,
    mul: "t23",
    balloons: ["2️⃣", "3️⃣", "⭐"],
    subtitle: "Только таблица на 2 и на 3.",
  },
  3: {
    id: 3,
    name: "×4 и ×5",
    theme: "sharp",
    coin: 3,
    limit: null,
    mul: "t45",
    balloons: ["4️⃣", "5️⃣", "⚡"],
    subtitle: "Таблица на 4 и на 5.",
  },
  4: {
    id: 4,
    name: "×6–×9",
    theme: "hard",
    coin: 4,
    limit: null,
    mul: "t69",
    balloons: ["6️⃣", "9️⃣", "🔥"],
    subtitle: "Таблица на 6, 7, 8 и 9.",
  },
  5: {
    id: 5,
    name: "Смешанно",
    theme: "exam",
    coin: 5,
    limit: null,
    mul: "mixed",
    balloons: ["🎲", "✖️", "🎲"],
    subtitle: "Вперемешку вся таблица 2–9 и примеры «? × 4 = 12».",
  },
};

const MUL_INTRO_MS = 12 * 1000;

const DIV_LEVELS = {
  1: {
    id: 1,
    name: "Суть",
    theme: "easy",
    coin: 2,
    limit: null,
    div: "intro",
    intro: true,
    balloons: ["💡", "➗", "💡"],
    subtitle: "Деление — обратное умножению. Учимся делить поровну.",
  },
  2: {
    id: 2,
    name: "÷2 и ÷3",
    theme: "medium",
    coin: 2,
    limit: null,
    div: "t23",
    balloons: ["2️⃣", "3️⃣", "⭐"],
    subtitle: "Деление на 2 и на 3 без остатка.",
  },
  3: {
    id: 3,
    name: "÷4 и ÷5",
    theme: "sharp",
    coin: 3,
    limit: null,
    div: "t45",
    balloons: ["4️⃣", "5️⃣", "⚡"],
    subtitle: "Деление на 4 и на 5 без остатка.",
  },
  4: {
    id: 4,
    name: "÷6–÷9",
    theme: "hard",
    coin: 4,
    limit: null,
    div: "t69",
    balloons: ["6️⃣", "9️⃣", "🔥"],
    subtitle: "Деление на 6, 7, 8 и 9 без остатка.",
  },
  5: {
    id: 5,
    name: "Смешанно",
    theme: "exam",
    coin: 5,
    limit: null,
    div: "mixed",
    balloons: ["🎲", "➗", "🎲"],
    subtitle: "Вперемешку вся таблица и примеры «12 ÷ ? = 3».",
  },
};

const DIV_INTRO_MS = 12 * 1000;

const MODE_META = {
  [MODE_BASIC]: {
    id: MODE_BASIC,
    name: "База",
    unlockText: "Базовые уровни",
    maxLevel: SECRET_LEVEL,
    levelNames: ["Лёгкий", "Средний", "Сложный", "Хард", "Реальный хард", "Секрет"],
    levelDescs: [
      "Простые + и − до 20",
      "Двузначные суммы и вычитание из 10–20",
      "7+8 и 15−8, плюс 3 примера как на среднем",
      "Как сложный, но только 1 минута",
      "1 минута + школьная оценка: 1 ошибка — 4, 2 — 3, 3+ — 2",
      "Секрет: +/− до 30, без таймера",
    ],
    themes: ["easy", "medium", "sharp", "hard", "exam", "secret"],
  },
  [MODE_CHAIN]: {
    id: MODE_CHAIN,
    name: "2 действия",
    unlockText: "Цепочки в 2 действия",
    maxLevel: SECRET_LEVEL,
    levelNames: ["Лёгкий", "Средний", "Сложный", "Хард", "Реальный хард", "Секрет"],
    levelDescs: [
      "Примеры в 2 шага до 20. Тут можно и с нулём.",
      "2 шага: +/− без нулей и без отрицательных",
      "Больше смешанных вариантов +/− в 2 шага",
      "Как сложный, но на весь тест 1 минута",
      "Минута + школьная оценка в режиме 2 шага",
      "Секрет: 2 шага до 30, без таймера",
    ],
    themes: ["easy", "medium", "sharp", "hard", "exam", "secret"],
  },
  [MODE_UNITS]: {
    id: MODE_UNITS,
    name: "Меры",
    unlockText: "Единицы измерения",
    maxLevel: 2,
    levelNames: ["Конвертация", "Сравнение"],
    levelDescs: [
      "см↔мм, дм↔см, м↔дм, м↔см + составные: 4 дм 1 см = ? см (без дробей)",
      "Сравни длины: 1 / 2 / 0=равно",
    ],
    themes: ["units", "unitsCmp"],
  },
  [MODE_MUL]: {
    id: MODE_MUL,
    name: "Умножение",
    unlockText: "Лестница умножения",
    maxLevel: 5,
    levelNames: ["Суть", "×2 и ×3", "×4 и ×5", "×6–×9", "Смешанно"],
    levelDescs: [
      "Что значит умножить: сумма одинаковых слагаемых",
      "Только ×2 и ×3",
      "Только ×4 и ×5",
      "Таблица ×6, ×7, ×8, ×9",
      "Всё вместе + найти множитель",
    ],
    themes: ["easy", "medium", "sharp", "hard", "exam"],
  },
  [MODE_DIV]: {
    id: MODE_DIV,
    name: "Деление",
    unlockText: "Лестница деления",
    maxLevel: 5,
    levelNames: ["Суть", "÷2 и ÷3", "÷4 и ÷5", "÷6–÷9", "Смешанно"],
    levelDescs: [
      "Что значит разделить: обратное умножению",
      "Только ÷2 и ÷3",
      "Только ÷4 и ÷5",
      "Деление на 6, 7, 8, 9",
      "Всё вместе + найти делитель",
    ],
    themes: ["easy", "medium", "sharp", "hard", "exam"],
  },
  [MODE_ENG]: {
    id: MODE_ENG,
    name: "Английский",
    unlockText: "Лестница английского",
    maxLevel: 5,
    levelNames: ["Слова", "Цвета", "Школа", "Фразы", "Смешанно"],
    levelDescs: [
      "Животные и вещи: выбери перевод (1/2/3)",
      "Цвета и числа на английском",
      "Школьные слова",
      "Простые фразы",
      "Всё вместе",
    ],
    themes: ["easy", "medium", "sharp", "hard", "exam"],
  },
  [MODE_CODE]: {
    id: MODE_CODE,
    name: "ПК",
    unlockText: "Лестница ПК для игр",
    maxLevel: 5,
    levelNames: ["Папки", "Копии", "Память", "Сеть", "Смешанно"],
    levelDescs: [
      "Папки — как сундуки: куда класть игры и сохранения",
      "Копирование и установка игры",
      "Память и свободное место на диске",
      "Сеть и IP — как найти друга в онлайне",
      "Всё вместе: викторина про игровой ПК",
    ],
    themes: ["easy", "medium", "sharp", "hard", "exam"],
  },
};

const THEME_META = {
  [THEME_MATH]: {
    id: THEME_MATH,
    name: "Математика",
    icon: "🔢",
    modes: [MODE_BASIC, MODE_CHAIN, MODE_MUL, MODE_DIV, MODE_UNITS],
    blurb: "Счёт, меры, × и ÷",
  },
  [THEME_ENG]: {
    id: THEME_ENG,
    name: "Английский",
    icon: "🇬🇧",
    modes: [MODE_ENG],
    blurb: "Слова и фразы для начальной школы",
  },
  [THEME_CODE]: {
    id: THEME_CODE,
    name: "ПК",
    icon: "💻",
    modes: [MODE_CODE],
    blurb: "Папки, память, сеть — чтобы ставить и играть",
  },
  [THEME_SAFE]: {
    id: THEME_SAFE,
    name: "Безопасность",
    icon: "🛡️",
    modes: [MODE_SAFE],
    blurb: "Обязательные квесты: не качай всё подряд",
  },
};

const MODE_META_SAFE = {
  id: MODE_SAFE,
  name: "Безопасность",
  unlockText: "Квесты безопасности",
  maxLevel: 1,
  levelNames: ["Квест"],
  levelDescs: ["Мини-игры: защити себя в сети"],
  themes: ["exam"],
};
MODE_META[MODE_SAFE] = MODE_META_SAFE;

/** Профессии по успехам в каждой обучалке (кол-во 10/10 на уровнях 1–5 темы). */
const PROFESSIONS = {
  [THEME_MATH]: [
    { id: "math_pupil", name: "Ученик счёта", icon: "🧮", need: 3, desc: "3 десятки в математике" },
    { id: "math_master", name: "Мастер чисел", icon: "📐", need: 10, desc: "10 десяток в математике" },
    { id: "math_arch", name: "Архимаг математики", icon: "🧙", need: 18, desc: "18 десяток в математике" },
  ],
  [THEME_ENG]: [
    { id: "eng_reader", name: "Читатель", icon: "📖", need: 1, desc: "Первая 10/10 по английскому" },
    { id: "eng_talker", name: "Говорун", icon: "🗣️", need: 3, desc: "3 этапа английского на 10/10" },
    { id: "eng_poly", name: "Полиглот", icon: "🌍", need: 5, desc: "Вся лестница английского" },
  ],
  [THEME_CODE]: [
    { id: "code_hatch", name: "Юный геймер-ПК", icon: "🎮", need: 1, desc: "Первая 10/10 по ПК" },
    { id: "code_dev", name: "Мастер установки", icon: "📦", need: 3, desc: "3 этапа ПК на 10/10" },
    { id: "code_arch", name: "Админ игрового ПК", icon: "🖥️", need: 5, desc: "Вся лестница ПК" },
  ],
  [THEME_SAFE]: [
    { id: "safe_scout", name: "Юный защитник", icon: "🛡️", need: 3, desc: "3 квеста безопасности" },
    { id: "safe_guard", name: "Страж сети", icon: "🔐", need: 7, desc: "7 квестов безопасности" },
    { id: "safe_hero", name: "Кибер-герой", icon: "🦸", need: 11, desc: "Все квесты безопасности" },
  ],
};

/** Обязательные сценарии ИБ: 8-битные мини-игры (не 10/10, а «защитился / ошибка»). */
const SAFE_SCENARIOS = [
  {
    id: "call_bank",
    ico: "📞",
    title: "Звонок «из банка»",
    tag: "Телефон",
    scene: "Звонит «дядя из банка»: «Скажи код из смс, иначе карту родителей заблокируют!» Он торопит и чуть-чуть троллит.",
    choices: [
      { text: "Положить трубку и сказать родителям", ok: true },
      { text: "Назвать код из смс — вдруг правда банк", ok: false },
      { text: "Продиктовать пароль от Wi‑Fi «для проверки»", ok: false },
    ],
    win: "Ты защитился! Незнакомцам по телефону коды и пароли не дают.",
    failTitle: "КРАСНЫЙ ЭКРАН",
    failStory: "Код ушёл мошеннику. В этой истории злоумышленник мог бы списать деньги с карты родителей.",
    explain: "Это НЕ случилось по-настоящему — только учебный пример. Правильно: положить трубку и позвать взрослых. Банк сам никогда не просит код из смс.",
  },
  {
    id: "weird_link",
    ico: "🔗",
    title: "Ссылка на «крутую игру»",
    tag: "Скачивание",
    scene: "В чате незнакомец кинул ссылку: «Скачай новую игру БЕСПЛАТНО!!! 999 скинов». Сайт странный, не Steam и не официальный магазин.",
    choices: [
      { text: "Скачать и установить — вдруг реально круто", ok: false },
      { text: "Не качать. Спросить взрослых / брать только из магазина приложений", ok: true },
      { text: "Переслать ссылку всем одноклассникам", ok: false },
    ],
    win: "Молодец! Игры ставят из проверенных магазинов, не из случайных ссылок.",
    failTitle: "ТЕЛЕФОН ЗАРАЖЁН?!",
    failStory: "В учебной истории после такой установки «игра» могла бы украсть пароли и даже доступы, из‑за чего у семьи пропали бы деньги в банке.",
    explain: "Это НЕ реально сейчас — только «что бывает». Правильно: не качать с неизвестных ссылок. Бери игры из Google Play / App Store / официального лаунчера.",
  },
  {
    id: "chat_apk",
    ico: "📦",
    title: "Файл из переписки",
    tag: "Установка",
    scene: "Друг друга (или «друг») прислал файл game_free.exe / .apk: «Поставь, там читы». Телефон/ПК просит «разрешить установку из неизвестных источников».",
    choices: [
      { text: "Разрешить и поставить файл из чата", ok: false },
      { text: "Не ставить. Читы и файлы из чатов — опасны", ok: true },
      { text: "Отключить антивирус «чтобы быстрее встало»", ok: false },
    ],
    win: "Верно! Неизвестные установщики — частый способ подсунуть вредную программу.",
    failTitle: "ВСЁ СЛОМАЛОСЬ",
    failStory: "В примере вредонос мог бы открыть доступ к аккаунтам игр и даже к платежам родителей.",
    explain: "Учебный ужастик, не факт. Правильный ход: не ставить файлы из чатов и не отключать защиту. Нужна игра — официальный магазин + взрослые.",
  },
  {
    id: "free_robux",
    ico: "🎁",
    title: "«Бесплатные Robux / V‑Bucks»",
    tag: "Обман",
    scene: "Сайт мигает: «Введи логин и пароль от игры — получим 99999 монет!» Рядом кнопка «ВОЙТИ ЧЕРЕЗ АККАУНТ».",
    choices: [
      { text: "Ввести логин и пароль — халява же", ok: false },
      { text: "Закрыть. Халявы нет: так воруют аккаунты", ok: true },
      { text: "Ввести пароль от почты родителей «для подтверждения»", ok: false },
    ],
    win: "Защита сработала! Бесплатных горы монет за пароль не бывает.",
    failTitle: "АККАУНТ УГНАН",
    failStory: "В сценарии злоумышленник забрал бы скин, друзей и мог бы пытаться просить деньги у родителей от твоего имени.",
    explain: "Не по‑настоящему — урок. Правильно: никогда не вводить пароль на «халявных» сайтах. Скажи взрослым.",
  },
  {
    id: "fake_virus",
    ico: "⚠️",
    title: "Всплывашка «ПК заражён»",
    tag: "Обман",
    scene: "На весь экран красное окно: «ВИРУС!!! Позвони по номеру / скачай очиститель СЕЙЧАС». Кнопки мигают, страшно.",
    choices: [
      { text: "Позвонить по номеру с экрана", ok: false },
      { text: "Скачать «очиститель» с этой же страницы", ok: false },
      { text: "Закрыть вкладку / позвать взрослого, ничего не качать", ok: true },
    ],
    win: "Правильно! Страшные окна часто сами и есть обман.",
    failTitle: "ЛОЖНАЯ ТРЕВОГА ПОБЕДИЛА",
    failStory: "В истории «очиститель» мог бы сам оказаться вредоносом, а «техподдержка» — выманить деньги.",
    explain: "Это учебный красный экран. Правильный ответ: закрыть, не звонить, не качать, позвать родителей или учителя.",
  },
  {
    id: "usb_find",
    ico: "💾",
    title: "Чужая флешка",
    tag: "Носители",
    scene: "У школы / в парке нашли флешку с наклейкой «ИГРЫ SUPER». Хочется воткнуть в ПК и посмотреть.",
    choices: [
      { text: "Вставить в домашний ПК и открыть всё", ok: false },
      { text: "Отдать взрослым / в бюро находок, не подключать", ok: true },
      { text: "Подключить, но «только быстро глянуть»", ok: false },
    ],
    win: "Супер! Неизвестные флешки не подключают — так иногда разносят вредоносы.",
    failTitle: "ФЛЕШКА-ЛОВУШКА",
    failStory: "В примере с флешки могла бы запуститься вредная программа и испортить файлы или вытащить пароли.",
    explain: "Не случилось по‑настоящему. Правильно: не подключать чужие носители, отдать взрослым.",
  },
  {
    id: "hacked_friend",
    ico: "👾",
    title: "Сообщение «от друга»",
    tag: "Взлом",
    scene: "В мессенджере пишет «друг» странно: «Срочно кинь код из смс / перейди по ссылке, мне нужна помощь, молчи родителям». Друг в школе обычно пишет иначе, с эмодзи и без паники.",
    choices: [
      { text: "Сразу кинуть код и открыть ссылку — это же друг", ok: false },
      { text: "Проверить лично/звонком/у взрослых: аккаунт могли взломать", ok: true },
      { text: "Переслать «помощь» всем в классе", ok: false },
    ],
    win: "Верно! Даже «друг» в чате может быть взломанным аккаунтом. Сначала проверка офлайн.",
    failTitle: "ДРУГ БЫЛ НЕ ДРУГ",
    failStory: "В учебной истории это был взломщик в аккаунте друга: код открыл бы твой аккаунт, а ссылка могла увести пароли.",
    explain: "Это НЕ по‑настоящему. Правильно: не слать коды и не кликать странные ссылки «от друга». Спроси живьём или через родителей/учителя. Предупреди друга сменить пароль.",
  },
  {
    id: "password_2fa",
    ico: "🔑",
    title: "Пароль и 2FA",
    tag: "Пароли",
    scene: "Нужен пароль к игре/почте. Варианты: «123456», кличка собаки, или длинный пароль + код из приложения/смс (двухфакторка). Друг говорит: «2FA бесит, отключи».",
    choices: [
      { text: "Поставить 123456 и отключить двухфакторку — так проще", ok: false },
      { text: "Сложный уникальный пароль + включить 2FA вместе со взрослыми", ok: true },
      { text: "Один пароль на все сайты и написать его в заметках класса", ok: false },
    ],
    win: "Отлично! Сложный пароль + второй шаг (код) = как два замка на сундуке со скинами.",
    failTitle: "ДВЕРЬ БЕЗ ЗАМКА",
    failStory: "В примере слабый пароль без 2FA мог бы подобрать бот за минуты — аккаунт игр и переписки ушли бы чужим.",
    explain: "Учебный пример. Правильно: длинный свой пароль (не день рождения), разный для важных сайтов, двухфакторка с родителями. Пароль — секрет, не для чата класса.",
  },
  {
    id: "ignore_dm",
    ico: "🙈",
    title: "Чужие лички",
    tag: "Анонимность",
    scene: "Незнакомец в игре/соцсети пишет: «Ты круто строишь! Скинь школу, адрес, фото дома, давай в личку без родителей». Или просит «секретный» голосовой чат.",
    choices: [
      { text: "Ответить и рассказать про школу и улицу — он же хвалит", ok: false },
      { text: "Игнорировать / заблокировать, личное не светить, сказать взрослым", ok: true },
      { text: "Позвать его домой «поиграть» без спроса", ok: false },
    ],
    win: "Правильно! Незнакомцам в сети не обязаны отвечать. Адрес, школа, маршруты — только для семьи.",
    failTitle: "СЛИШКОМ МНОГО ЛИЧНОГО",
    failStory: "В сценарии добрый «фанат» мог бы оказаться взрослым с плохими намерениями и узнать, где тебя искать.",
    explain: "Не реально сейчас — урок. Правильно: игнор/блок, не делись адресом, школой, телефоном, фото дома. Анонимность = не светить, кто ты в реале. Расскажи родителям о странных личках.",
  },
  {
    id: "safe_blog",
    ico: "📝",
    title: "Хочу вести блог",
    tag: "Блог",
    scene: "Ты хочешь канал/блог про игры и поделки. Друзья советуют: «Пиши ФИО, школу, где гуляешь, стримь комнату с окном на улицу, отвечай всем в личке».",
    choices: [
      { text: "Выложить ФИО, школу и стрим комнаты — так больше лайков", ok: false },
      { text: "Блог можно: ник, без адреса/школы, с родителями, лички — осторожно", ok: true },
      { text: "Попросить подписчиков прислать деньги «на донат-секрет»", ok: false },
    ],
    win: "Да! Блог — ок, если безопасно: ник вместо фамилии, без адреса и школы, родители рядом, странные лички — блок.",
    failTitle: "БЛОГ БЕЗ ЩИТА",
    failStory: "В учебной истории по ролику с окном и школьной формой могли бы найти район и класс — это уже риск в реальной жизни.",
    explain: "Не случилось по‑настоящему. Как вести блог безопаснее: 1) ник, не полное ФИО; 2) не школа, не адрес, не маршруты; 3) не стримь номер дома/окно на улицу; 4) комментарии ок, лички от незнакомцев — с родителями или игнор; 5) включи приватность, 2FA; 6) договор с родителями, что можно показывать. Творчество — да, свет личной жизни — нет.",
  },
  {
    id: "open_wifi",
    ico: "📡",
    title: "Открытый Wi‑Fi",
    tag: "Сеть",
    scene: "В кафе/парке сеть «Free_WiFi_HACKER_NO» без пароля. Хочется зайти в игру, почту и «банк родителей посмотреть баланс». Друг орёт: «Давай, бесплатный интернет!»",
    choices: [
      { text: "Подключиться и сразу логиниться везде — Wi‑Fi же бесплатный", ok: false },
      { text: "Не входить в важные аккаунты на чужом открытом Wi‑Fi; спросить взрослых / свой мобильный интернет", ok: true },
      { text: "Ввести пароли игр и почты, «потом сменю»", ok: false },
    ],
    win: "Умно! Открытый Wi‑Fi — как громкий разговор в автобусе: рядом могут подслушать. Важное — через свой интернет или с родителями.",
    failTitle: "КТО-ТО СЛУШАЛ СЕТЬ",
    failStory: "В учебной истории на открытом Wi‑Fi могли бы перехватить вход в аккаунт — и забрать игру, почту или даже данные карты.",
    explain: "Это НЕ случилось по‑настоящему. Правильно: на открытом Wi‑Fi не входить в почту, банк, магазины и важные игры. Лучше мобильный интернет родителей или подождать домашнюю сеть. Если очень надо — только с взрослыми и без ввода паролей «на всякий».",
  },
];



const KINGDOM_SLOTS = 12;
const KINGDOM_COLLECT_CAP_MS = 8 * 60 * 60 * 1000;
const KINGDOM_CASTLE_SLOT = 5;
const KINGDOM_GATHER_CD_MS = 3 * 60 * 1000; // 3 мин между рубкой/копанием одной клетки
const KINGDOM_GATHER_FAIL_CD_MS = 45 * 1000; // даже при ошибке/отмене — короткая пауза
const KINGDOM_COLLECT_MIN_MS = 90 * 1000; // нельзя жать «Собрать» чаще чем раз в 1.5 мин

/** Природа на карте: клик = добыть дерево/камень (кулдаун). */
const KINGDOM_NATURE = {
  tree: { id: "tree", name: "Дерево", ico: "🌳", kind: "nature", gather: "wood", amount: 2, desc: "Руби → дерево в склад." },
  rock: { id: "rock", name: "Камни", ico: "🪨", kind: "nature", gather: "stone", amount: 2, desc: "Копай → камень в склад." },
  bush: { id: "bush", name: "Куст", ico: "🌿", kind: "nature", gather: "wood", amount: 1, desc: "Мало веток, но тоже дерево." },
};

/**
 * Баланс: школьный прогон ≈ 10–40 монет.
 * Королевство не должно обгонять учёбу — доход/час скромный, стройка через задачи.
 */
const KINGDOM_BUILDINGS = {
  castle: {
    id: "castle", name: "Замок", ico: "🏰", cost: { coins: 0, wood: 0, stone: 0 }, rate: 1, fixed: true,
    desc: "Дом маскота. Чуть монет.",
  },
  farm: {
    id: "farm", name: "Ферма", ico: "🌾", cost: { coins: 40, wood: 5, stone: 0 }, rate: 6,
    desc: "Урожай → монеты.",
  },
  garden: {
    id: "garden", name: "Сад", ico: "🌸", cost: { coins: 28, wood: 3, stone: 0 }, rate: 3,
    desc: "Красиво и чуть монет.",
  },
  well: {
    id: "well", name: "Колодец", ico: "⛲", cost: { coins: 45, wood: 0, stone: 7 }, rate: 4,
    desc: "Нужен камень.",
  },
  lumber: {
    id: "lumber", name: "Лесопилка", ico: "🪓", cost: { coins: 55, wood: 4, stone: 3 }, rate: 2, woodRate: 5,
    desc: "Дерево/час + чуть монет.",
  },
  quarry: {
    id: "quarry", name: "Каменоломня", ico: "⛏️", cost: { coins: 60, wood: 3, stone: 4 }, rate: 2, stoneRate: 4,
    desc: "Камень/час.",
  },
  mill: {
    id: "mill", name: "Мельница", ico: "🌬️", cost: { coins: 85, wood: 10, stone: 3 }, rate: 10,
    desc: "Больше монет.",
  },
  bakery: {
    id: "bakery", name: "Пекарня", ico: "🍞", cost: { coins: 110, wood: 8, stone: 5 }, rate: 14,
    desc: "Пирожки на продажу.",
  },
  market: {
    id: "market", name: "Рынок", ico: "🏪", cost: { coins: 140, wood: 6, stone: 10 }, rate: 17,
    desc: "Торговля на площади.",
  },
  tower: {
    id: "tower", name: "Башня", ico: "🗼", cost: { coins: 180, wood: 5, stone: 16 }, rate: 20,
    desc: "Много камня на стены.",
  },
  school: {
    id: "school", name: "Школа", ico: "🏫", cost: { coins: 150, wood: 12, stone: 7 }, rate: 8, starRate: 1,
    desc: "Монеты + ★/час.",
  },
  forge: {
    id: "forge", name: "Кузница", ico: "🔥", cost: { coins: 70, wood: 4, stone: 8 }, rate: 1, stoneRate: 1,
    desc: "Открывает ковку кирпичей и самоцветов.",
  },
  flag: {
    id: "flag", name: "Флаг", ico: "🚩", cost: { coins: 18, wood: 2, stone: 0 }, rate: 0,
    desc: "Украшение.",
  },
};

const KINGDOM_SHOP_ORDER = ["farm", "garden", "well", "lumber", "quarry", "forge", "mill", "bakery", "market", "school", "tower", "flag"];

function kingdomCostOf(b, mult = 1) {
  const c = (b && b.cost) || { coins: b?.price || 0, wood: 0, stone: 0 };
  return {
    coins: Math.round((c.coins || 0) * mult),
    wood: Math.round((c.wood || 0) * mult),
    stone: Math.round((c.stone || 0) * mult),
  };
}

function kingdomCanAfford(cost) {
  const k = ensureKingdom();
  return state.coins >= cost.coins
    && (k.wood || 0) >= cost.wood
    && (k.stone || 0) >= cost.stone;
}

function kingdomPay(cost) {
  const k = ensureKingdom();
  state.coins -= cost.coins;
  k.wood = Math.max(0, (k.wood || 0) - cost.wood);
  k.stone = Math.max(0, (k.stone || 0) - cost.stone);
}

function kingdomFormatCost(cost) {
  const bits = [];
  if (cost.coins) bits.push(`🪙${cost.coins}`);
  if (cost.wood) bits.push(`🪵${cost.wood}`);
  if (cost.stone) bits.push(`🪨${cost.stone}`);
  return bits.join(" ") || "бесплатно";
}

const ENG_LEVELS = {
  1: { id: 1, name: "Слова", theme: "easy", coin: 2, eng: "animals", balloons: ["🐱", "🇬🇧", "🐶"], subtitle: "Животные и вещи: выбери верный перевод." },
  2: { id: 2, name: "Цвета", theme: "medium", coin: 2, eng: "colors", balloons: ["🔴", "🇬🇧", "🔵"], subtitle: "Цвета и простые числа." },
  3: { id: 3, name: "Школа", theme: "sharp", coin: 3, eng: "school", balloons: ["📚", "🇬🇧", "✏️"], subtitle: "Школьные слова." },
  4: { id: 4, name: "Фразы", theme: "hard", coin: 4, eng: "phrases", balloons: ["💬", "🇬🇧", "👋"], subtitle: "Короткие фразы." },
  5: { id: 5, name: "Смешанно", theme: "exam", coin: 5, eng: "mixed", balloons: ["🎲", "🇬🇧", "🎲"], subtitle: "Всё вместе." },
};

const CODE_LEVELS = {
  1: { id: 1, name: "Папки", theme: "easy", coin: 2, code: "folders", intro: true, balloons: ["📁", "🎮", "📂"], subtitle: "Папки — сундуки для игр и сохранений." },
  2: { id: 2, name: "Копии", theme: "medium", coin: 2, code: "copy", intro: true, balloons: ["📋", "💿", "📦"], subtitle: "Копирование и установка игры." },
  3: { id: 3, name: "Память", theme: "sharp", coin: 3, code: "memory", intro: true, balloons: ["🧠", "💾", "📊"], subtitle: "Память и место на диске." },
  4: { id: 4, name: "Сеть", theme: "hard", coin: 4, code: "net", intro: true, balloons: ["🌐", "🏠", "🔢"], subtitle: "Сеть и IP — как найти друга в игре." },
  5: { id: 5, name: "Смешанно", theme: "exam", coin: 5, code: "mixed", intro: true, balloons: ["🎲", "💻", "🎮"], subtitle: "Вся викторина про игровой ПК." },
};

const CODE_INTRO_MS = 18 * 1000;

/** Мини-уроки перед викториной: всё на примерах игр. */
const CODE_LESSONS = {
  folders: {
    title: "Папки = сундуки",
    lead: "На ПК папки нужны, чтобы не потерять игру и сохранения.",
    points: [
      { ico: "📁", text: "Папка — как сундук в Minecraft: внутри лежат файлы (карта, моды, сейвы)." },
      { ico: "🎮", text: "Игру часто кладут в папку Games или в папку с именем игры." },
      { ico: "💾", text: "Сохранения (сейвы) — отдельные файлы. Их удобно держать в своей папке." },
      { ico: "🆕", text: "Новая папка = новый сундук. Так легче найти «где моя игра»." },
    ],
    tip: "Хаос на рабочем столе = куча лута без сундуков. Папки наводят порядок.",
  },
  copy: {
    title: "Копия и установка",
    lead: "Поставить игру — это скопировать её файлы в нужное место.",
    points: [
      { ico: "📋", text: "Копировать = сделать вторую копию файла. Оригинал остаётся." },
      { ico: "📦", text: "Установка игры: файлы копируются с диска/Steam в папку на твоём ПК." },
      { ico: "USB", text: "Флешка — как переносной сундук: скопировал игру другу — у него тоже есть." },
      { ico: "⚠️", text: "Вырезать (переместить) убирает файл из старого места. Копия — безопаснее." },
    ],
    tip: "Перед удалением «лишнего» проверь: это не сейвы любимой игры?",
  },
  memory: {
    title: "Память и место",
    lead: "Игре нужно и «место в шкафу», и «быстрая память» во время игры.",
    points: [
      { ico: "💾", text: "Диск (SSD/HDD) — большой шкаф: сюда ставят игры. Мало места → «не хватает места»." },
      { ico: "🧠", text: "ОЗУ (RAM) — быстрая память «сейчас»: миры, текстуры, открытые вкладки." },
      { ico: "📉", text: "Мало ОЗУ → лаги и долгая загрузка, даже если места на диске много." },
      { ico: "📊", text: "Игра 20 ГБ не встанет на диск, где свободно 5 ГБ. Как рюкзак: не влезет." },
    ],
    tip: "Место на диске ≠ ОЗУ. Шкаф и «руки за столом» — разные вещи.",
  },
  net: {
    title: "Сеть и IP",
    lead: "Онлайн-игра = твой ПК говорит с ПК друга по сети.",
    points: [
      { ico: "🌐", text: "Сеть — дороги между компьютерами (Wi‑Fi дома, интернет)." },
      { ico: "🏠", text: "IP — как адрес дома: «куда стучать», чтобы подключиться к миру." },
      { ico: "🔢", text: "Дома часто бывает адрес вроде 192.168.0.10 — это твой ПК в домашней сети." },
      { ico: "🤝", text: "В Minecraft/других играх «войти к другу» как раз использует адрес/код комнаты." },
    ],
    tip: "IP не секретный пароль от аккаунта — это адрес. Пароль не показывай никому.",
  },
  mixed: {
    title: "Всё вместе",
    lead: "Папки + копии + память + сеть = умеешь ставить игры и играть с друзьями.",
    points: [
      { ico: "📁", text: "Папка — сундук для файлов игры." },
      { ico: "📦", text: "Установка — копирование файлов на диск." },
      { ico: "💾", text: "Место на диске — влезет ли игра; ОЗУ — хватит ли «сейчас»." },
      { ico: "🌐", text: "IP/сеть — как найти друга в онлайне." },
    ],
    tip: "Сейчас викторина по всем темам. Вспоминай игровые примеры!",
  },
};

/** Банк вопросов викторины ПК (правильный ответ — строка из choices). */
const CODE_QUIZ = {
  folders: [
    {
      q: "Папка на ПК больше всего похожа на…",
      choices: ["сундук в игре, куда кладут вещи", "кнопку «прыжок»", "звук музыки"],
      ok: "сундук в игре, куда кладут вещи",
      hint: "В сундуке хранят лут — в папке файлы.",
    },
    {
      q: "Зачем создавать папку «Мои игры»?",
      choices: ["чтобы легко найти установленные игры", "чтобы ускорить Wi‑Fi", "чтобы сменить обои"],
      ok: "чтобы легко найти установленные игры",
      hint: "Порядок = быстрее найти нужную игру.",
    },
    {
      q: "Сохранение (сейв) Minecraft обычно лежит…",
      choices: ["в файле/папке на диске", "только в облаке магии", "в кнопке Esc"],
      ok: "в файле/папке на диске",
      hint: "Сейв — обычный файл в папке мира.",
    },
    {
      q: "На рабочем столе 30 ярлыков игр без папок. Это…",
      choices: ["хаос — лучше разложить по папкам", "обязательно для скорости", "увеличивает ОЗУ"],
      ok: "хаос — лучше разложить по папкам",
      hint: "Сундуки помогают не потерять лут.",
    },
    {
      q: "Новая папка — это…",
      choices: ["пустой «сундук» для файлов", "новая видеокарта", "новый IP"],
      ok: "пустой «сундук» для файлов",
      hint: "Сначала пусто — потом кладёшь файлы.",
    },
    {
      q: "Моды к игре удобно держать…",
      choices: ["в отдельной папке модов", "в корзине", "в пароле от Wi‑Fi"],
      ok: "в отдельной папке модов",
      hint: "Своя полка = проще включать/выключать моды.",
    },
  ],
  copy: [
    {
      q: "Скопировать файл игры значит…",
      choices: ["сделать вторую копию, оригинал остаётся", "навсегда стереть оригинал", "выключить ПК"],
      ok: "сделать вторую копию, оригинал остаётся",
      hint: "Copy ≠ Cut.",
    },
    {
      q: "Установка игры чаще всего…",
      choices: ["копирует файлы игры в папку на диске", "рисует новый монитор", "меняет IP друга"],
      ok: "копирует файлы игры в папку на диске",
      hint: "Installer кладёт файлы «на полку» диска.",
    },
    {
      q: "Скопировал сейв на флешку другу. У тебя сейв…",
      choices: ["остаётся на твоём ПК", "исчезает навсегда", "превращается в мод"],
      ok: "остаётся на твоём ПК",
      hint: "Копия — у обоих есть свой файл.",
    },
    {
      q: "«Вырезать» файл и вставить в другую папку…",
      choices: ["перемещает файл (в старом месте его нет)", "создаёт бесконечные копии", "чинит лаги"],
      ok: "перемещает файл (в старом месте его нет)",
      hint: "Move убирает из старого сундука.",
    },
    {
      q: "Перед удалением папки с игрой проверь…",
      choices: ["нет ли там нужных сохранений", "какого цвета обои", "номер школы"],
      ok: "нет ли там нужных сохранений",
      hint: "Сейвы часто рядом с игрой.",
    },
    {
      q: "Зачем копировать мир Minecraft на другой ПК?",
      choices: ["чтобы продолжить строить там же", "чтобы увеличить ОЗУ", "чтобы сменить IP роутера"],
      ok: "чтобы продолжить строить там же",
      hint: "Мир = файлы. Скопировал файлы — мир с тобой.",
    },
  ],
  memory: [
    {
      q: "Игра весит 40 ГБ, свободно 10 ГБ. Что будет?",
      choices: ["не хватит места — не установится", "установится быстрее обычного", "само удалит школьные файлы"],
      ok: "не хватит места — не установится",
      hint: "Рюкзак меньше лута — не влезет.",
    },
    {
      q: "ОЗУ (оперативная память) больше похожа на…",
      choices: ["рабочий стол для дел «прямо сейчас»", "огромный склад в подвале", "цвет курсора"],
      ok: "рабочий стол для дел «прямо сейчас»",
      hint: "RAM — быстрая память во время игры.",
    },
    {
      q: "Место на диске нужно, чтобы…",
      choices: ["хранить установленные игры и сейвы", "прыгать выше в игре", "менять ник в чате"],
      ok: "хранить установленные игры и сейвы",
      hint: "Диск = шкаф для игр.",
    },
    {
      q: "Мало ОЗУ во время тяжёлой игры часто даёт…",
      choices: ["лаги и долгие загрузки", "бесплатные скины", "новый IP"],
      ok: "лаги и долгие загрузки",
      hint: "«Рукам за столом» не хватает места.",
    },
    {
      q: "Удалил старые игры — стало больше…",
      choices: ["свободного места на диске", "скорости света", "паролей Wi‑Fi"],
      ok: "свободного места на диске",
      hint: "Освободили шкаф.",
    },
    {
      q: "Диск и ОЗУ — это…",
      choices: ["разные виды памяти (шкаф и «сейчас»)", "одно и то же", "только для принтеров"],
      ok: "разные виды памяти (шкаф и «сейчас»)",
      hint: "Шкаф ≠ стол.",
    },
  ],
  net: [
    {
      q: "Зачем нужна сеть / интернет для онлайн-игры?",
      choices: ["чтобы ПК мог связаться с ПК друга", "чтобы папки стали цветными", "чтобы увеличить вес игры"],
      ok: "чтобы ПК мог связаться с ПК друга",
      hint: "Онлайн = разговор по «дорогам» сети.",
    },
    {
      q: "IP-адрес проще понять как…",
      choices: ["адрес дома, куда стучаться", "пароль от аккаунта Steam", "название папки"],
      ok: "адрес дома, куда стучаться",
      hint: "Адрес ≠ пароль.",
    },
    {
      q: "192.168.0.5 чаще всего…",
      choices: ["адрес устройства в домашней сети", "код читов", "размер игры в ГБ"],
      ok: "адрес устройства в домашней сети",
      hint: "192.168… — типичный домашний адрес.",
    },
    {
      q: "Wi‑Fi дома — это…",
      choices: ["беспроводная сеть между роутером и устройствами", "вид оперативной памяти", "папка с модами"],
      ok: "беспроводная сеть между роутером и устройствами",
      hint: "Воздушная «дорога» к роутеру.",
    },
    {
      q: "Друг дал «код комнаты» / адрес сервера. Это чтобы…",
      choices: ["твой клиент нашёл нужный мир/сервер", "увеличить ОЗУ", "создать папку"],
      ok: "твой клиент нашёл нужный мир/сервер",
      hint: "Как номер квартиры для встречи.",
    },
    {
      q: "Можно ли светить пароль от аккаунта как «IP»?",
      choices: ["нет, пароль — секрет, IP — адрес", "да, это одно и то же", "только по понедельникам"],
      ok: "нет, пароль — секрет, IP — адрес",
      hint: "Пароль никому. IP — просто адрес.",
    },
  ],
};


const ENG_WORDS = {
  animals: [
    { en: "cat", ru: "кот", ico: "🐱" },
    { en: "dog", ru: "собака", ico: "🐶" },
    { en: "bird", ru: "птица", ico: "🐦" },
    { en: "fish", ru: "рыба", ico: "🐟" },
    { en: "apple", ru: "яблоко", ico: "🍎" },
    { en: "ball", ru: "мяч", ico: "⚽" },
    { en: "sun", ru: "солнце", ico: "☀️" },
    { en: "moon", ru: "луна", ico: "🌙" },
  ],
  colors: [
    { en: "red", ru: "красный", ico: "🔴" },
    { en: "blue", ru: "синий", ico: "🔵" },
    { en: "green", ru: "зелёный", ico: "🟢" },
    { en: "yellow", ru: "жёлтый", ico: "🟡" },
    { en: "one", ru: "один", ico: "1️⃣" },
    { en: "two", ru: "два", ico: "2️⃣" },
    { en: "three", ru: "три", ico: "3️⃣" },
    { en: "five", ru: "пять", ico: "5️⃣" },
  ],
  school: [
    { en: "book", ru: "книга", ico: "📘" },
    { en: "pen", ru: "ручка", ico: "🖊️" },
    { en: "school", ru: "школа", ico: "🏫" },
    { en: "teacher", ru: "учитель", ico: "👩‍🏫" },
    { en: "friend", ru: "друг", ico: "🤝" },
    { en: "home", ru: "дом", ico: "🏠" },
    { en: "water", ru: "вода", ico: "💧" },
    { en: "milk", ru: "молоко", ico: "🥛" },
  ],
  phrases: [
    { en: "Hello!", ru: "Привет!", ico: "👋" },
    { en: "Bye!", ru: "Пока!", ico: "👋" },
    { en: "Thank you", ru: "Спасибо", ico: "🙏" },
    { en: "Please", ru: "Пожалуйста", ico: "🤲" },
    { en: "Yes", ru: "Да", ico: "✅" },
    { en: "No", ru: "Нет", ico: "❌" },
    { en: "I am fine", ru: "У меня всё хорошо", ico: "😊" },
    { en: "Good morning", ru: "Доброе утро", ico: "🌅" },
  ],
};


const RANKS = [
  { min: 0, name: "Новичок", icon: "🌱" },
  { min: 18, name: "Ученик", icon: "✏️" },
  { min: 42, name: "Считальщик", icon: "📘" },
  { min: 72, name: "Знаток", icon: "★" },
  { min: 110, name: "Отличник", icon: "🌟" },
  { min: 160, name: "Мастер", icon: "✦" },
  { min: 220, name: "Мудрец", icon: "🔮" },
  { min: 300, name: "Чемпион", icon: "🏆" },
  { min: 400, name: "Рыцарь счёта", icon: "🛡️" },
  { min: 520, name: "Герой", icon: "🔥" },
  { min: 660, name: "Легенда", icon: "💎" },
  { min: 850, name: "Архимаг", icon: "👑" },
];

const SKINS = {
  honey: { id: "honey", name: "Медовый", price: 0, body: "#FFD166", inner: "#F07167", form: "blob" },
  sky: { id: "sky", name: "Небесный", price: 120, body: "#7EB6FF", inner: "#4ECDC4", form: "blob" },
  berry: { id: "berry", name: "Ягодка", price: 120, body: "#FF8FAB", inner: "#C084FC", form: "blob" },
  mint: { id: "mint", name: "Мятный", price: 150, body: "#6BCB77", inner: "#2D8A4A", form: "blob" },
  night: { id: "night", name: "Ночной", price: 180, body: "#6D5A8A", inner: "#C084FC", form: "blob" },
  lava: { id: "lava", name: "Лавовый", price: 220, body: "#FF7A59", inner: "#FFD166", form: "blob" },
  ice: { id: "ice", name: "Ледышка", price: 200, body: "#B8F0FF", inner: "#3D8A9A", form: "blob" },
  kitty: { id: "kitty", name: "Котик", price: 180, body: "#FFB4A2", inner: "#E76F51", form: "cat" },
  hedgehog: { id: "hedgehog", name: "Ёжик", price: 190, body: "#C4A484", inner: "#8D6E63", form: "hedgehog" },
};

const HATS = {
  none: { id: "none", name: "Без шляпы", price: 0, icon: "🙂", slot: "head" },
  party: { id: "party", name: "Праздник", price: 100, icon: "🎉", slot: "head" },
  crown: { id: "crown", name: "Корона", price: 250, icon: "👑", slot: "head" },
  wizard: { id: "wizard", name: "Волшебник", price: 180, icon: "🧙", slot: "head" },
  hero: { id: "hero", name: "Шлем", price: 160, icon: "🛡️", slot: "head" },
  knightHelm: { id: "knightHelm", name: "Шлем рыцаря", price: 220, icon: "⛑️", slot: "head" },
  gnomeCap: { id: "gnomeCap", name: "Шапка гнома", price: 140, icon: "🎩", slot: "head" },
  mapleLeaf: { id: "mapleLeaf", name: "Кленовый лист", price: 110, icon: "🍁", slot: "head" },
  beanie: { id: "beanie", name: "Шапочка", price: 70, icon: "🧢", slot: "head", desc: "Уютная кепка." },
  bunny: { id: "bunny", name: "Ушки зайчика", price: 95, icon: "🐰", slot: "head", desc: "Милые ушки." },
  flower: { id: "flower", name: "Венок", price: 120, icon: "🌼", slot: "head", desc: "Цветы на голове." },
  headphones: { id: "headphones", name: "Наушники", price: 130, icon: "🎧", slot: "head", desc: "Музыка в ушах." },
  beret: { id: "beret", name: "Берет", price: 115, icon: "🎨", slot: "head", desc: "Как у художника." },
  cowboy: { id: "cowboy", name: "Ковбойская", price: 150, icon: "🤠", slot: "head", desc: "Йии-ха!" },
  santa: { id: "santa", name: "Колпак Санты", price: 160, icon: "🎅", slot: "head", desc: "Новогодний вайб." },
  catEars: { id: "catEars", name: "Кошачьи ушки", price: 105, icon: "🐱", slot: "head", desc: "Мяу." },
  bandana: { id: "bandana", name: "Бандана", price: 85, icon: "🧧", slot: "head", desc: "Стильно и просто." },
  chef: { id: "chef", name: "Колпак повара", price: 125, icon: "👨‍🍳", slot: "head", desc: "Для юного шефа." },
  engCap: { id: "engCap", name: "Шапка ABC", price: 160, icon: "🅰️", slot: "head", theme: THEME_ENG, desc: "Для любителей английского." },
  codeCap: { id: "codeCap", name: "Капюшон кода", price: 160, icon: "🧑‍💻", slot: "head", theme: THEME_CODE, desc: "Для юных программистов." },
};

const BODIES = {
  none: { id: "none", name: "Без брони", price: 0, icon: "👕", slot: "body", desc: "Обычная одёжка." },
  clothVest: { id: "clothVest", name: "Тканевый жилет", price: 150, icon: "🧥", slot: "body", desc: "Лёгкая защита для новичка." },
  hoodie: { id: "hoodie", name: "Худи", price: 120, icon: "🧥", slot: "body", desc: "Мягкое и тёплое." },
  sweater: { id: "sweater", name: "Свитер", price: 110, icon: "🧶", slot: "body", desc: "Бабушкин уют." },
  raincoat: { id: "raincoat", name: "Дождевик", price: 135, icon: "☔", slot: "body", desc: "Не боится луж." },
  pajamas: { id: "pajamas", name: "Пижама", price: 100, icon: "🩳", slot: "body", desc: "Спать и учиться." },
  dress: { id: "dress", name: "Платье", price: 145, icon: "👗", slot: "body", desc: "Нарядный вид." },
  tuxedo: { id: "tuxedo", name: "Смокинг", price: 200, icon: "🤵", slot: "body", desc: "На праздник." },
  apron: { id: "apron", name: "Фартук", price: 90, icon: "🧑‍🍳", slot: "body", desc: "Для готовки и опыта." },
  overalls: { id: "overalls", name: "Комбинезон", price: 155, icon: "👷", slot: "body", desc: "Как у исследователя." },
  kimono: { id: "kimono", name: "Кимоно", price: 180, icon: "🥋", slot: "body", desc: "Стиль воина знаний." },
  tshirt: { id: "tshirt", name: "Футболка ★", price: 80, icon: "👕", slot: "body", desc: "Простая и яркая." },
  cape: { id: "cape", name: "Плащ героя", price: 170, icon: "🦸", slot: "body", desc: "Развевается на ветру." },
  leatherVest: {
    id: "leatherVest", name: "Кожаный жилет", price: 280, icon: "🦺", slot: "body",
    rankMin: 42, rank: "Считальщик", battle: { maxHpBonus: 1 },
    desc: "Для боёв: +1 HP в старте.",
  },
  mageCloak: {
    id: "mageCloak", name: "Плащ мага", price: 420, icon: "🧙‍♂️", slot: "body",
    rankMin: 110, rank: "Отличник", battle: { firstHitFree: true },
    desc: "Для боёв: первый удар по тебе не считается.",
  },
  scaleMail: {
    id: "scaleMail", name: "Чешуя", price: 360, icon: "🐉", slot: "body",
    rankMin: 72, rank: "Знаток", battle: { maxHpBonus: 1 },
    desc: "Для боёв: +1 HP, блестит как дракон.",
  },
};

const WEAPONS = {
  none: { id: "none", name: "Без оружия", price: 0, icon: "✋", slot: "weapon", desc: "Бьёшь кулачками знаний." },
  pencil: { id: "pencil", name: "Карандаш", price: 60, icon: "✏️", slot: "weapon", desc: "Пишет правильные ответы." },
  ruler: { id: "ruler", name: "Линейка", price: 75, icon: "📏", slot: "weapon", desc: "Мерит примеры." },
  balloon: { id: "balloon", name: "Шарик", price: 55, icon: "🎈", slot: "weapon", desc: "Лёгкий и весёлый." },
  umbrella: { id: "umbrella", name: "Зонтик", price: 90, icon: "☂️", slot: "weapon", desc: "От дождя ошибок." },
  book: { id: "book", name: "Учебник", price: 110, icon: "📖", slot: "weapon", desc: "Знания в руках." },
  candyCane: { id: "candyCane", name: "Леденец", price: 70, icon: "🍭", slot: "weapon", desc: "Сладкая сила." },
  flag: { id: "flag", name: "Флажок", price: 85, icon: "🚩", slot: "weapon", desc: "Вперёд к пятёрке!" },
  woodSword: {
    id: "woodSword", name: "Деревянный меч", price: 280, icon: "⚔️", slot: "weapon",
    rankMin: 72, rank: "Знаток", battle: { dmgBonus: 1 },
    desc: "Для боёв: верный ответ бьёт на 2 HP.",
  },
  sparkWand: {
    id: "sparkWand", name: "Палочка искры", price: 360, icon: "🪄", slot: "weapon",
    rankMin: 110, rank: "Отличник", battle: { dmgBonus: 1 },
    desc: "Для боёв: +1 урон. Красивые искры.",
  },
  mathHammer: {
    id: "mathHammer", name: "Молот счёта", price: 520, icon: "🔨", slot: "weapon",
    rankMin: 160, rank: "Мастер", battle: { dmgBonus: 2 },
    desc: "Для боёв: верный ответ бьёт на 3 HP.",
  },
};

const TOYS = {
  bow: { id: "bow", name: "Бантик", price: 80, icon: "🎀", svg: true },
  glasses: { id: "glasses", name: "Умные очки", price: 100, icon: "👓", svg: true },
  shades: { id: "shades", name: "Чёрные очки", price: 280, icon: "🕶️", svg: true },
  clover: { id: "clover", name: "Клевер", price: 60, icon: "🍀" },
  duck: { id: "duck", name: "Уточка", price: 90, icon: "🦆" },
  wand: { id: "wand", name: "Палочка", price: 160, icon: "🪄", custom: true },
  crystal: { id: "crystal", name: "Кристалл", price: 140, icon: "💎" },
  rainbow: { id: "rainbow", name: "Радуга", price: 200, icon: "🌈" },
  mathbook: { id: "mathbook", name: "Книга по математике", price: 1200, icon: "📘", custom: true },
  fiveplus: { id: "fiveplus", name: "5+", price: 1500, icon: "5️⃣", custom: true },
  starpin: { id: "starpin", name: "Звёздная булавка", price: 260, icon: "⭐" },
  rocket: { id: "rocket", name: "Мини-ракета", price: 340, icon: "🚀" },
  donut: { id: "donut", name: "Пончик", price: 180, icon: "🍩" },
  badgeStar: { id: "badgeStar", name: "Значок ★", price: 90, icon: "🌟" },
  bell: { id: "bell", name: "Колокольчик", price: 130, icon: "🔔" },
  scarf: { id: "scarf", name: "Шарфик", price: 170, icon: "🧣" },
  secretKey: { id: "secretKey", name: "Ключ тайны", price: 0, icon: "🗝️", secret: true },
  kdCharm: { id: "kdCharm", name: "Амулет двора", price: 0, icon: "🔮", secret: true },
  engBook: { id: "engBook", name: "English book", price: 220, icon: "📗", theme: THEME_ENG },
  engFlag: { id: "engFlag", name: "Флажок EN", price: 180, icon: "🇬🇧", theme: THEME_ENG },
  codeBug: { id: "codeBug", name: "Жучик-баг", price: 200, icon: "🐛", theme: THEME_CODE },
  codeChip: { id: "codeChip", name: "Чип", price: 240, icon: "💾", theme: THEME_CODE },
};

/* Артефакты персонажа: нужны и звание, и монеты (по одному на каждое звание). */
const RELICS = {
  sproutBadge: { id: "sproutBadge", name: "Росток силы", icon: "🌱", rank: "Новичок", rankMin: 0, price: 40, desc: "Маленький значок первого шага." },
  pencilPin: { id: "pencilPin", name: "Карандаш удачи", icon: "✏️", rank: "Ученик", rankMin: 18, price: 90, desc: "Пишет правильные ответы." },
  bookCharm: { id: "bookCharm", name: "Книжный амулет", icon: "📘", rank: "Считальщик", rankMin: 42, price: 160, desc: "Страницы шепчут подсказки." },
  starMedallion: { id: "starMedallion", name: "Звёздный медальон", icon: "★", rank: "Знаток", rankMin: 72, price: 240, desc: "Сияет на груди у умников." },
  shineOrb: { id: "shineOrb", name: "Шар отличника", icon: "🌟", rank: "Отличник", rankMin: 110, price: 340, desc: "Тёплый свет вокруг маскота." },
  masterRing: { id: "masterRing", name: "Кольцо мастера", icon: "✦", rank: "Мастер", rankMin: 160, price: 460, desc: "Кольцо точных ответов." },
  sageOrb: { id: "sageOrb", name: "Сфера мудреца", icon: "🔮", rank: "Мудрец", rankMin: 220, price: 600, desc: "Магический шар счёта." },
  champCup: { id: "champCup", name: "Кубок чемпиона", icon: "🏆", rank: "Чемпион", rankMin: 300, price: 780, desc: "Золотой кубок за скорость." },
  knightShield: { id: "knightShield", name: "Щит рыцаря", icon: "🛡️", rank: "Рыцарь счёта", rankMin: 400, price: 980, desc: "Защищает от глупых ошибок." },
  heroFlame: { id: "heroFlame", name: "Пламя героя", icon: "🔥", rank: "Герой", rankMin: 520, price: 1200, desc: "Огонёк смелости за спиной." },
  legendSeal: { id: "legendSeal", name: "Печать легенды", icon: "💎", rank: "Легенда", rankMin: 660, price: 1500, desc: "Редкая печать легендарных." },
  archCrown: { id: "archCrown", name: "Корона архимага", icon: "👑", rank: "Архимаг", rankMin: 850, price: 2000, desc: "Самый крутой артефакт." },
  luckyAmulet: {
    id: "luckyAmulet",
    name: "Амулет удачи",
    icon: "🧿",
    rank: "Мастер",
    rankMin: 160,
    price: 420,
    slot: "relic",
    battle: { firstHitFree: true },
    desc: "Для боёв: первый удар по тебе не считается.",
  },
  bossBadge: {
    id: "bossBadge",
    name: "Знак победителя",
    icon: "🏅",
    rank: "Чемпион",
    rankMin: 300,
    price: 520,
    slot: "relic",
    battle: { rewardBonus: 0.2 },
    desc: "Для боёв: +20% монет за победу.",
  },
  ironShield: {
    id: "ironShield",
    name: "Железный щит",
    icon: "🛡️",
    rank: "Отличник",
    rankMin: 110,
    price: 360,
    slot: "body",
    battle: { maxHpBonus: 1 },
    desc: "Для боёв: старт с +1 сердцем. Надевается в слот тела.",
  },
  polyglotPin: {
    id: "polyglotPin",
    name: "Значок полиглота",
    icon: "🌍",
    rank: "Знаток",
    rankMin: 72,
    price: 380,
    slot: "relic",
    theme: THEME_ENG,
    desc: "Награда за успехи в английском. Красивый значок.",
  },
  coderBadge: {
    id: "coderBadge",
    name: "Бейдж кодера",
    icon: "💻",
    rank: "Знаток",
    rankMin: 72,
    price: 380,
    slot: "relic",
    theme: THEME_CODE,
    desc: "Награда за успехи в программировании.",
  },
};

/* Небо / декор фона: только за звание, монеты не нужны. */
const SKIES = {
  none: { id: "none", name: "Обычное небо", icon: "🌤️", rank: "Новичок", rankMin: 0, price: 0, desc: "Привычные облака и шарики." },
  softClouds: { id: "softClouds", name: "Пушистые облачка", icon: "☁️", rank: "Ученик", rankMin: 18, price: 0, desc: "Мягкие облачка плывут по небу." },
  floatingStars: { id: "floatingStars", name: "Парящие звёзды", icon: "✨", rank: "Считальщик", rankMin: 42, price: 0, desc: "Звёздочки мягко мерцают." },
  softMoon: { id: "softMoon", name: "Лунный диск", icon: "🌙", rank: "Знаток", rankMin: 72, price: 0, desc: "Луна медленно качается." },
  nightSky: { id: "nightSky", name: "Ночное небо", icon: "🌃", rank: "Отличник", rankMin: 110, price: 0, desc: "Луна и россыпь звёзд." },
  auroraClouds: { id: "auroraClouds", name: "Сияющие облака", icon: "🌌", rank: "Мастер", rankMin: 160, price: 0, desc: "Облака с цветным сиянием." },
  goldenStars: { id: "goldenStars", name: "Золотые звёзды", icon: "⭐", rank: "Мудрец", rankMin: 220, price: 0, desc: "Золотые звёзды кружатся." },
  twinMoons: { id: "twinMoons", name: "Две луны", icon: "🌕", rank: "Чемпион", rankMin: 300, price: 0, desc: "Две луны пляшут в небе." },
  nebula: { id: "nebula", name: "Туманность", icon: "💫", rank: "Рыцарь счёта", rankMin: 400, price: 0, desc: "Цветная космическая дымка." },
  meteorShowers: { id: "meteorShowers", name: "Метеоры", icon: "☄️", rank: "Герой", rankMin: 520, price: 0, desc: "Падающие звёзды-метеоры." },
  crystalSky: { id: "crystalSky", name: "Кристальное небо", icon: "💎", rank: "Легенда", rankMin: 660, price: 0, desc: "Кристаллы и искры в воздухе." },
  archmageSky: { id: "archmageSky", name: "Небо архимага", icon: "🪄", rank: "Архимаг", rankMin: 850, price: 0, desc: "Луна, звёзды, облака и магия сразу." },
  secretNight: { id: "secretNight", name: "Тайная ночь", icon: "🗝️", rank: "Секрет", rankMin: 99999, price: 0, desc: "Награда за секретный уровень. Не купить." },
};

/* Скиллы: часть — для боёв/профессий, часть — после секретов. */
const SKILLS = {
  focusBreath: {
    id: "focusBreath",
    name: "Спокойствие",
    icon: "🧘",
    price: 180,
    rankMin: 18,
    rank: "Ученик",
    durationMs: 0,
    cooldownMs: 45 * 1000,
    desc: "Лёгкая подсказка: показывает верный ответ. КД 45 сек. Доступен рано.",
  },
  luckyTick: {
    id: "luckyTick",
    name: "Удачный тик",
    icon: "✨",
    price: 260,
    rankMin: 42,
    rank: "Считальщик",
    durationMs: 8 * 1000,
    cooldownMs: 35 * 1000,
    desc: "Замедляет время на 8 сек. КД 35 сек.",
  },
  timeLord: {
    id: "timeLord",
    name: "Владыка времени",
    icon: "⌛",
    price: 2800,
    rankMin: ARCHMAGE_MIN,
    rank: "Архимаг",
    secretMode: MODE_BASIC,
    durationMs: 10 * 1000,
    cooldownMs: 20 * 1000,
    desc: "Замедляет время на 10 сек. Перезарядка 20 сек. Кнопка в любой игре, вместе с бустами.",
  },
  sageHint: {
    id: "sageHint",
    name: "Мудрец",
    icon: "💡",
    price: 3200,
    rankMin: ARCHMAGE_MIN,
    rank: "Архимаг",
    secretMode: MODE_CHAIN,
    durationMs: 0,
    cooldownMs: 30 * 1000,
    desc: "Подсказка: один правильный ответ. Раз в 30 сек. Кнопка в любой игре.",
  },
  fireBolt: {
    id: "fireBolt",
    name: "Огненный удар",
    icon: "🔥",
    price: 900,
    rankMin: 72,
    rank: "Знаток",
    battleOnly: true,
    durationMs: 0,
    cooldownMs: 25 * 1000,
    desc: "Только босс: следующий верный ответ +1 урон. КД 25 сек.",
  },
  mend: {
    id: "mend",
    name: "Исцеление",
    icon: "💚",
    price: 1100,
    rankMin: 110,
    rank: "Отличник",
    battleOnly: true,
    durationMs: 0,
    cooldownMs: 40 * 1000,
    oncePerBattle: true,
    desc: "Только босс: +1 HP. Один раз за бой, КД 40 сек.",
  },
  frostWard: {
    id: "frostWard",
    name: "Ледяной щит",
    icon: "❄️",
    price: 1000,
    rankMin: 72,
    rank: "Знаток",
    battleOnly: true,
    durationMs: 0,
    cooldownMs: 35 * 1000,
    desc: "Только босс: блок одной ошибки. КД 35 сек.",
  },
  wordSense: {
    id: "wordSense",
    name: "Чутьё слова",
    icon: "🔤",
    price: 900,
    rankMin: 42,
    rank: "Считальщик",
    theme: THEME_ENG,
    needProfession: "eng_talker",
    durationMs: 0,
    cooldownMs: 28 * 1000,
    desc: "Подсказка-ответ. Открывается профессией «Говорун». КД 28 сек.",
  },
  debugTrace: {
    id: "debugTrace",
    name: "Отладка",
    icon: "🐞",
    price: 900,
    rankMin: 42,
    rank: "Считальщик",
    theme: THEME_CODE,
    needProfession: "code_dev",
    durationMs: 0,
    cooldownMs: 28 * 1000,
    desc: "Подсказка-ответ. Открывается профессией «Мастер установки». КД 28 сек.",
  },
};

const FX = {
  classic: {
    id: "classic",
    name: "Классика",
    price: 0,
    icon: "🎆",
    desc: "Лёгкий салют при хорошем результате",
  },
  rainbow: {
    id: "rainbow",
    name: "Радужный дождь",
    price: 800,
    icon: "🌈",
    desc: "Цветные ленты падают с неба при успехе",
  },
  galaxy: {
    id: "galaxy",
    name: "Звёздный вихрь",
    price: 140,
    icon: "🌌",
    desc: "Галактика крутится вокруг экрана",
  },
  phoenix: {
    id: "phoenix",
    name: "Огненный феникс",
    price: 200,
    icon: "🔥",
    desc: "Огненные кольца и искры победы",
  },
  aurora: {
    id: "aurora",
    name: "Северное сияние",
    price: 280,
    icon: "✨",
    desc: "Мягкое переливающееся небо",
  },
  golden: {
    id: "golden",
    name: "Золотой шторм",
    price: 360,
    icon: "👑",
    desc: "Золотой дождь при победе",
  },
};

const BOOSTS = [
  { id: "slow", icon: "🐌", name: "Улитка-время", desc: "Учётные секунды ползут в 2 раза медленнее (для топа). Лимит харда идёт как обычно. Один забег.", price: 800 },
  { id: "extra", icon: "⏳", name: "−15 секунд", desc: "Вычитает 15 сек из учётного времени (для топа). До 2 раз за забег. Лимит не растёт.", price: 100 },
  { id: "cheat", icon: "🕵️", name: "Читер", desc: "Только реальный хард: 1 ошибка не считается для оценки. Можно до 4 за забег. Один заряд = одна ошибка.", price: 1000 },
  { id: "potion", icon: "🧪", name: "Малое зелье", desc: "Только босс: +1 HP. До 2 раз за бой.", price: 120, battle: true },
  { id: "megaPotion", icon: "🧴", name: "Большое зелье", desc: "Только босс: +2 HP. 1 раз за бой.", price: 220, battle: true },
  { id: "shieldScroll", icon: "📜", name: "Свиток щита", desc: "Только босс: блок следующей ошибки. 1 раз за бой.", price: 180, battle: true },
];

const CHEAT_MAX_PER_RUN = 4;

let coopStats = {
  players: 0,
  runs: 0,
  perfects: 0,
  hardPlayers: 0,
  sumCorrect: 0,
  looks: {},
};

function bestOn(s, level, extra = () => true) {
  const scores = s.runs.filter((r) => (r.level || 1) === level && extra(r)).map((r) => r.correct);
  return scores.length ? Math.max(...scores) : 0;
}

function bestGradeOn(s, level, extra = () => true) {
  const marks = s.runs.filter((r) => r.level === level && r.grade != null && extra(r)).map((r) => r.grade);
  return marks.length ? Math.max(...marks) : 0;
}

function levelPerfected(s, level) {
  return s.runs.some((r) => {
    if ((r.level || 1) !== level || r.correct !== 10) return false;
    if (level >= 4 && r.timedOut) return false;
    return true;
  });
}

function perfectedLevelsCount(s) {
  return [1, 2, 3, 4, 5].filter((l) => levelPerfected(s, l)).length;
}

const ACHIEVEMENTS = [
  { id: "first_step", icon: "👣", name: "Первый шаг", desc: "Заверши любой прогон", check: (s) => s.runs.length >= 1, progress: (s) => ({ current: s.runs.length, target: 1 }) },
  { id: "coins_10", icon: "🪙", name: "Копилка", desc: "Собери 10 монет", check: (s) => s.coins >= 10, progress: (s) => ({ current: s.coins, target: 10 }) },
  { id: "coins_50", icon: "💰", name: "Богач", desc: "Собери 50 монет", check: (s) => s.coins >= 50, progress: (s) => ({ current: s.coins, target: 50 }) },
  { id: "coins_100", icon: "🏦", name: "Сундук", desc: "Собери 100 монет", check: (s) => s.coins >= 100, progress: (s) => ({ current: s.coins, target: 100 }) },
  { id: "coins_200", icon: "💎", name: "Казна", desc: "Собери 200 монет", check: (s) => s.coins >= 200, progress: (s) => ({ current: s.coins, target: 200 }) },
  { id: "coins_500", icon: "🏰", name: "Капитал", desc: "Собери 500 монет", check: (s) => s.coins >= 500, progress: (s) => ({ current: s.coins, target: 500 }) },
  { id: "easy_perfect", icon: "🌱", name: "Лёгкий герой", desc: "10/10 на лёгком", check: (s) => s.runs.some((r) => (r.level || 1) === 1 && r.correct === 10), progress: (s) => ({ current: bestOn(s, 1), target: 10 }) },
  { id: "medium_go", icon: "⭐", name: "Смелее", desc: "Пройди средний уровень", check: (s) => s.runs.some((r) => r.level === 2), progress: (s) => ({ current: s.runs.filter((r) => r.level === 2).length, target: 1 }) },
  { id: "medium_perfect", icon: "🌟", name: "Двузначный", desc: "10/10 на среднем", check: (s) => s.runs.some((r) => r.level === 2 && r.correct === 10), progress: (s) => ({ current: bestOn(s, 2), target: 10 }) },
  { id: "sharp_go", icon: "⚡", name: "Через десяток", desc: "Пройди сложный уровень", check: (s) => s.runs.some((r) => r.level === 3), progress: (s) => ({ current: s.runs.filter((r) => r.level === 3).length, target: 1 }) },
  { id: "sharp_perfect", icon: "💥", name: "Ловкий счёт", desc: "10/10 на сложном", check: (s) => s.runs.some((r) => r.level === 3 && r.correct === 10), progress: (s) => ({ current: bestOn(s, 3), target: 10 }) },
  { id: "hard_go", icon: "🔥", name: "Огонёк", desc: "Пройди хард", check: (s) => s.runs.some((r) => r.level === 4), progress: (s) => ({ current: s.runs.filter((r) => r.level === 4).length, target: 1 }) },
  { id: "hard_time", icon: "⏱️", name: "Успел!", desc: "Хард до конца минуты", check: (s) => s.runs.some((r) => r.level === 4 && !r.timedOut), progress: (s) => ({ current: s.runs.filter((r) => r.level === 4 && !r.timedOut).length, target: 1 }) },
  { id: "hard_perfect", icon: "🏆", name: "Молния", desc: "10/10 на харде вовремя", check: (s) => s.runs.some((r) => r.level === 4 && r.correct === 10 && !r.timedOut), progress: (s) => ({ current: bestOn(s, 4, (r) => !r.timedOut), target: 10 }) },
  { id: "exam_go", icon: "📕", name: "К контрольной", desc: "Пройди реальный хард", check: (s) => s.runs.some((r) => r.level === 5), progress: (s) => ({ current: s.runs.filter((r) => r.level === 5).length, target: 1 }) },
  { id: "exam_pass", icon: "📗", name: "Сдал", desc: "Именно оценка 3 на реальном харде", check: (s) => s.runs.some((r) => r.level === 5 && r.grade === 3 && !r.failed), progress: (s) => ({ current: s.runs.some((r) => r.level === 5 && r.grade === 3 && !r.failed) ? 1 : 0, target: 1 }) },
  { id: "exam_four", icon: "📘", name: "Хорошист", desc: "Именно оценка 4 на реальном харде", check: (s) => s.runs.some((r) => r.level === 5 && r.grade === 4), progress: (s) => ({ current: s.runs.some((r) => r.level === 5 && r.grade === 4) ? 1 : 0, target: 1 }) },
  { id: "exam_five", icon: "🏅", name: "Отличник школы", desc: "Оценка 5 на реальном харде вовремя", check: (s) => s.runs.some((r) => r.level === 5 && r.grade === 5 && !r.timedOut), progress: (s) => ({ current: bestGradeOn(s, 5, (r) => !r.timedOut), target: 5 }) },
  { id: "six_seven", icon: "67", name: "6 7", desc: "Пасхалка: 10/10 на всех 5 уровнях — Six Seven!", gold: true, check: (s) => perfectedLevelsCount(s) >= 5, progress: (s) => ({ current: perfectedLevelsCount(s), target: 5 }) },
  { id: "five_runs", icon: "🎯", name: "Тренировка", desc: "5 прогонов", check: (s) => s.runs.length >= 5, progress: (s) => ({ current: s.runs.length, target: 5 }) },
  { id: "ten_runs", icon: "🏃", name: "Разгон", desc: "10 прогонов", check: (s) => s.runs.length >= 10, progress: (s) => ({ current: s.runs.length, target: 10 }) },
  { id: "twenty_runs", icon: "🏋️", name: "Спортсмен счёта", desc: "20 прогонов", check: (s) => s.runs.length >= 20, progress: (s) => ({ current: s.runs.length, target: 20 }) },
  { id: "fifty_runs", icon: "📅", name: "Марафонец", desc: "50 прогонов", check: (s) => s.runs.length >= 50, progress: (s) => ({ current: s.runs.length, target: 50 }) },
  { id: "stars_25", icon: "✨", name: "Звёздный", desc: "25 звёзд", check: (s) => s.stars >= 25, progress: (s) => ({ current: s.stars, target: 25 }) },
  { id: "stars_50", icon: "🌠", name: "Созвездие", desc: "50 звёзд", check: (s) => s.stars >= 50, progress: (s) => ({ current: s.stars, target: 50 }) },
  { id: "stars_100", icon: "🌌", name: "Галактика", desc: "100 звёзд", check: (s) => s.stars >= 100, progress: (s) => ({ current: s.stars, target: 100 }) },
  { id: "stars_200", icon: "🚀", name: "Космолёт", desc: "200 звёзд", check: (s) => s.stars >= 200, progress: (s) => ({ current: s.stars, target: 200 }) },
  { id: "perfects_3", icon: "3️⃣", name: "Три десятки", desc: "3 идеальных 10/10", check: (s) => s.runs.filter((r) => r.correct === 10).length >= 3, progress: (s) => ({ current: s.runs.filter((r) => r.correct === 10).length, target: 3 }) },
  { id: "perfects_8", icon: "8️⃣", name: "Восемь десяток", desc: "8 идеальных 10/10", check: (s) => s.runs.filter((r) => r.correct === 10).length >= 8, progress: (s) => ({ current: s.runs.filter((r) => r.correct === 10).length, target: 8 }) },
  { id: "rank_uchenik", icon: "✏️", name: "Звание: Ученик", desc: "Достигни звания Ученик", check: (s) => s.stars >= 18, progress: (s) => ({ current: Math.min(s.stars, 18), target: 18 }) },
  { id: "rank_znatok", icon: "★", name: "Звание: Знаток", desc: "Достигни звания Знаток", check: (s) => s.stars >= 72, progress: (s) => ({ current: Math.min(s.stars, 72), target: 72 }) },
  { id: "rank_master", icon: "✦", name: "Звание: Мастер", desc: "Достигни звания Мастер", check: (s) => s.stars >= 160, progress: (s) => ({ current: Math.min(s.stars, 160), target: 160 }) },
  { id: "rank_champion", icon: "🏆", name: "Звание: Чемпион", desc: "Достигни звания Чемпион", check: (s) => s.stars >= 300, progress: (s) => ({ current: Math.min(s.stars, 300), target: 300 }) },
  { id: "rank_legend", icon: "💎", name: "Звание: Легенда", desc: "Достигни звания Легенда", check: (s) => s.stars >= 660, progress: (s) => ({ current: Math.min(s.stars, 660), target: 660 }) },
  { id: "shop_skin", icon: "🎨", name: "Новый окрас", desc: "Купи любой скин в магазине", check: (s) => (s.shop?.skins || []).length > 1, progress: (s) => ({ current: Math.max(0, (s.shop?.skins || []).length - 1), target: 1 }) },
  { id: "shop_hat", icon: "🎩", name: "Шляпник", desc: "Купи любую шляпу", check: (s) => (s.shop?.hats || []).some((h) => h !== "none"), progress: (s) => ({ current: (s.shop?.hats || []).filter((h) => h !== "none").length ? 1 : 0, target: 1 }) },
  { id: "shop_toy", icon: "🎀", name: "Коллекционер штучек", desc: "Купи любую штучку", check: (s) => (s.shop?.toys || []).length >= 1, progress: (s) => ({ current: (s.shop?.toys || []).length, target: 1 }) },
  { id: "relic_first", icon: "🏺", name: "Первый артефакт", desc: "Купи любой артефакт", check: (s) => (s.shop?.relics || []).length >= 1, progress: (s) => ({ current: (s.shop?.relics || []).length, target: 1 }) },
  { id: "relic_three", icon: "🔮", name: "Три артефакта", desc: "Собери 3 артефакта", check: (s) => (s.shop?.relics || []).length >= 3, progress: (s) => ({ current: (s.shop?.relics || []).length, target: 3 }) },
  { id: "sky_first", icon: "☁️", name: "Небо открыто", desc: "Открой любой фон неба (кроме обычного)", check: (s) => (s.shop?.skies || []).some((id) => id !== "none"), progress: (s) => ({ current: (s.shop?.skies || []).filter((id) => id !== "none").length ? 1 : 0, target: 1 }) },
  { id: "sky_three", icon: "🌙", name: "Небосвод", desc: "Открой 3 фона неба", check: (s) => (s.shop?.skies || []).filter((id) => id !== "none").length >= 3, progress: (s) => ({ current: (s.shop?.skies || []).filter((id) => id !== "none").length, target: 3 }) },
  { id: "coop_party", icon: "🤝", name: "Класс в сборе", desc: "Кооп ×3: 15 разных ников в общем топе", coop: true, check: () => coopStats.players >= 15, progress: () => ({ current: coopStats.players, target: 15 }) },
  { id: "coop_runs", icon: "🌍", name: "Общий зачёт", desc: "Кооп ×3: всего 120 прогонов у всех", coop: true, check: () => coopStats.runs >= 120, progress: () => ({ current: coopStats.runs, target: 120 }) },
  { id: "coop_perfects", icon: "🌟", name: "Россыпь десяток", desc: "Кооп ×3: 75 идеальных 10/10 у всех", coop: true, check: () => coopStats.perfects >= 75, progress: () => ({ current: coopStats.perfects, target: 75 }) },
  { id: "coop_hard", icon: "🔥", name: "Огненная банда", desc: "Кооп ×3: 24 ника с 10/10 на хард/реальном", coop: true, check: () => coopStats.hardPlayers >= 24, progress: () => ({ current: coopStats.hardPlayers, target: 24 }) },
  { id: "coop_sum", icon: "🧮", name: "Сумма класса", desc: "Кооп ×3: сумма верных из всех прогонов ≥ 900", coop: true, check: () => coopStats.sumCorrect >= 900, progress: () => ({ current: coopStats.sumCorrect, target: 900 }) },
  { id: "boost_slow_3", icon: "🐌", name: "Медленный гений", desc: "Используй «Улитку» 3 раза", check: (s) => (s.shop?.boostUsed?.slow || 0) >= 3, progress: (s) => ({ current: s.shop?.boostUsed?.slow || 0, target: 3 }) },
  { id: "boost_extra_5", icon: "⏳", name: "Запас времени", desc: "Используй +15 сек 5 раз", check: (s) => (s.shop?.boostUsed?.extra || 0) >= 5, progress: (s) => ({ current: s.shop?.boostUsed?.extra || 0, target: 5 }) },
  { id: "boost_cheat_5", icon: "🕵️", name: "Хитрый план", desc: "Используй читер 5 раз", check: (s) => (s.shop?.boostUsed?.cheat || 0) >= 5, progress: (s) => ({ current: s.shop?.boostUsed?.cheat || 0, target: 5 }) },
  { id: "boost_any_10", icon: "⚡", name: "Буст-мастер", desc: "Используй любые бусты суммарно 10 раз", check: (s) => ((s.shop?.boostUsed?.slow || 0) + (s.shop?.boostUsed?.extra || 0) + (s.shop?.boostUsed?.cheat || 0)) >= 10, progress: (s) => ({ current: (s.shop?.boostUsed?.slow || 0) + (s.shop?.boostUsed?.extra || 0) + (s.shop?.boostUsed?.cheat || 0), target: 10 }) },
  { id: "units_convert", icon: "📏", name: "Переводчик", desc: "10/10 на конвертации мер", check: (s) => s.runs.some((r) => (r.mode || MODE_BASIC) === MODE_UNITS && (r.level || 1) === 1 && r.correct === 10), progress: (s) => ({ current: s.runs.filter((r) => (r.mode || MODE_BASIC) === MODE_UNITS && (r.level || 1) === 1).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }) },
  { id: "units_compare", icon: "⚖️", name: "Весы", desc: "10/10 на сравнении мер", check: (s) => s.runs.some((r) => (r.mode || MODE_BASIC) === MODE_UNITS && r.level === 2 && r.correct === 10), progress: (s) => ({ current: s.runs.filter((r) => (r.mode || MODE_BASIC) === MODE_UNITS && r.level === 2).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }) },
  { id: "mul_easy", icon: "💡", name: "Понял суть", desc: "10/10 на этапе «Суть» умножения", check: (s) => s.runs.some((r) => r.mode === MODE_MUL && (r.level || 1) === 1 && r.correct === 10), progress: (s) => ({ current: s.runs.filter((r) => r.mode === MODE_MUL && (r.level || 1) === 1).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }) },
  { id: "mul_table", icon: "2️⃣", name: "Двойки и тройки", desc: "10/10 на этапе «×2 и ×3»", check: (s) => s.runs.some((r) => r.mode === MODE_MUL && r.level === 2 && r.correct === 10), progress: (s) => ({ current: s.runs.filter((r) => r.mode === MODE_MUL && r.level === 2).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }) },
  { id: "mul_hard", icon: "🎲", name: "Смешанный мастер", desc: "10/10 на этапе «Смешанно»", check: (s) => s.runs.some((r) => r.mode === MODE_MUL && r.level === 5 && r.correct === 10), progress: (s) => ({ current: s.runs.filter((r) => r.mode === MODE_MUL && r.level === 5).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }) },
  { id: "mul_secret", icon: "✖️", name: "Вся лестница ×", desc: "Пройди все 5 этапов умножения на 10/10", check: (s) => [1, 2, 3, 4, 5].every((lvl) => s.runs.some((r) => r.mode === MODE_MUL && (r.level || 1) === lvl && r.correct === 10)), progress: (s) => ({ current: [1, 2, 3, 4, 5].filter((lvl) => s.runs.some((r) => r.mode === MODE_MUL && (r.level || 1) === lvl && r.correct === 10)).length, target: 5 }) },
  { id: "div_easy", icon: "🧩", name: "Понял деление", desc: "10/10 на этапе «Суть» деления", check: (s) => s.runs.some((r) => r.mode === MODE_DIV && (r.level || 1) === 1 && r.correct === 10), progress: (s) => ({ current: s.runs.filter((r) => r.mode === MODE_DIV && (r.level || 1) === 1).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }) },
  { id: "div_table", icon: "3️⃣", name: "Делю на 2 и 3", desc: "10/10 на этапе «÷2 и ÷3»", check: (s) => s.runs.some((r) => r.mode === MODE_DIV && r.level === 2 && r.correct === 10), progress: (s) => ({ current: s.runs.filter((r) => r.mode === MODE_DIV && r.level === 2).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }) },
  { id: "div_hard", icon: "🎯", name: "Мастер деления", desc: "10/10 на этапе «Смешанно» деления", check: (s) => s.runs.some((r) => r.mode === MODE_DIV && r.level === 5 && r.correct === 10), progress: (s) => ({ current: s.runs.filter((r) => r.mode === MODE_DIV && r.level === 5).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }) },
  { id: "div_secret", icon: "➗", name: "Вся лестница ÷", desc: "Пройди все 5 этапов деления на 10/10", check: (s) => [1, 2, 3, 4, 5].every((lvl) => s.runs.some((r) => r.mode === MODE_DIV && (r.level || 1) === lvl && r.correct === 10)), progress: (s) => ({ current: [1, 2, 3, 4, 5].filter((lvl) => s.runs.some((r) => r.mode === MODE_DIV && (r.level || 1) === lvl && r.correct === 10)).length, target: 5 }) },
  { id: "speed_gate", icon: "⏱️", name: "Спринтер режимов", desc: "Все обычные уровни Базы, 2 действий, Умножения, Деления и Мер — 10/10 быстрее 40 сек", check: () => isSecretGateReady(), progress: () => ({ current: secretGateProgress().current, target: secretGateProgress().target }) },
  { id: "secret_open", icon: "🔓", name: "Дверь приоткрыта", desc: "Открой секретный уровень", check: () => isSecretUnlocked(), progress: () => ({ current: isSecretUnlocked() ? 1 : 0, target: 1 }) },
  { id: "secret_basic", icon: "🗝️", name: "Секрет базы", desc: "10/10 на секретном уровне Базы", check: (s) => s.runs.some((r) => (r.mode || MODE_BASIC) === MODE_BASIC && r.level === SECRET_LEVEL && r.correct === 10), progress: (s) => ({ current: s.runs.filter((r) => (r.mode || MODE_BASIC) === MODE_BASIC && r.level === SECRET_LEVEL).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }) },
  { id: "secret_chain", icon: "🔐", name: "Секрет цепочки", desc: "10/10 на секретном уровне 2 действий", check: (s) => s.runs.some((r) => (r.mode || MODE_BASIC) === MODE_CHAIN && r.level === SECRET_LEVEL && r.correct === 10), progress: (s) => ({ current: s.runs.filter((r) => (r.mode || MODE_BASIC) === MODE_CHAIN && r.level === SECRET_LEVEL).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }) },
  { id: "secret_both", icon: "🏆", name: "Хранитель тайн", desc: "Пройди оба секретных уровня на 10/10 — получи ключ и небо", gold: true, check: (s) => s.runs.some((r) => (r.mode || MODE_BASIC) === MODE_BASIC && r.level === SECRET_LEVEL && r.correct === 10) && s.runs.some((r) => r.mode === MODE_CHAIN && r.level === SECRET_LEVEL && r.correct === 10), progress: (s) => ({ current: [MODE_BASIC, MODE_CHAIN].filter((m) => s.runs.some((r) => (r.mode || MODE_BASIC) === m && r.level === SECRET_LEVEL && r.correct === 10)).length, target: 2 }) },
];

async function refreshCoopStats() {
  try {
    const rows = await fetchScores("all", "all", { limit: 200 });
    const list = Array.isArray(rows) ? rows : [];
    const nicks = new Set();
    const hardNicks = new Set();
    const looks = {};
    let perfects = 0;
    let sumCorrect = 0;
    list.forEach((r) => {
      const nick = normalizeNick(r.nick);
      if (!isNickOk(nick)) return;
      nicks.add(nick);
      if (r.level >= 4 && r.correct === 10) hardNicks.add(nick);
      if (r.correct === 10) perfects += 1;
      sumCorrect += Number(r.correct) || 0;
      const prev = looks[nick];
      if (!prev || new Date(r.created_at || 0) > new Date(prev.at || 0)) {
        looks[nick] = { skin: r.skin || "honey", hat: r.hat || "none", at: r.created_at };
      }
    });
    coopStats = {
      players: nicks.size,
      runs: list.length,
      perfects,
      hardPlayers: hardNicks.size,
      sumCorrect,
      looks,
    };
    const fresh = unlockAchievements();
    if (fresh.length) {
      saveState();
      showToasts(fresh);
      renderHome();
    }
  } catch (err) {
    console.warn("coop stats", err);
  }
}

const screens = {
  home: document.getElementById("home"),
  game: document.getElementById("game"),
  result: document.getElementById("result"),
  gallery: document.getElementById("gallery"),
  sessions: document.getElementById("sessions"),
  board: document.getElementById("board"),
  shop: document.getElementById("shop"),
  safe: document.getElementById("safe"),
  kingdom: document.getElementById("kingdom"),
};

const els = {
  startBtn: document.getElementById("startBtn"),
  nextBtn: document.getElementById("nextBtn"),
  againBtn: document.getElementById("againBtn"),
  homeBtn: document.getElementById("homeBtn"),
  problem: document.getElementById("problem"),
  problemCard: document.getElementById("problemCard"),
  answerBox: document.getElementById("answerBox"),
  answerText: document.getElementById("answerText"),
  timer: document.getElementById("timer"),
  stepNow: document.getElementById("stepNow"),
  progressFill: document.getElementById("progressFill"),
  totalStars: document.getElementById("totalStars"),
  totalCoins: document.getElementById("totalCoins"),
  rankName: document.getElementById("rankName"),
  historyList: document.getElementById("historyList"),
  resultTitle: document.getElementById("resultTitle"),
  rewardLine: document.getElementById("rewardLine"),
  correctCount: document.getElementById("correctCount"),
  resultTime: document.getElementById("resultTime"),
  coinsGain: document.getElementById("coinsGain"),
  starsGain: document.getElementById("starsGain"),
  rankRow: document.getElementById("rankRow"),
  xpLabel: document.getElementById("xpLabel"),
  xpFill: document.getElementById("xpFill"),
  unlockHint: document.getElementById("unlockHint"),
  dailyBoxBtn: document.getElementById("dailyBoxBtn"),
  dailyBoxTitle: document.getElementById("dailyBoxTitle"),
  dailyBoxHint: document.getElementById("dailyBoxHint"),
  dailyBoxBadge: document.getElementById("dailyBoxBadge"),
  dailyModal: document.getElementById("dailyModal"),
  dailyModalLead: document.getElementById("dailyModalLead"),
  dailyModalReward: document.getElementById("dailyModalReward"),
  dailyClaimBtn: document.getElementById("dailyClaimBtn"),
  dailyCloseBtn: document.getElementById("dailyCloseBtn"),
  dailyChest: document.getElementById("dailyChest"),
  startTimePill: document.getElementById("startTimePill"),
  gradeRow: document.getElementById("gradeRow"),
  gradePill: document.getElementById("gradePill"),
  gradeMark: document.getElementById("gradeMark"),
  starBurst: document.getElementById("starBurst"),
  reviewList: document.getElementById("reviewList"),
  confetti: document.getElementById("confetti"),
  homeSubtitle: document.getElementById("homeSubtitle"),
  gameLevel: document.getElementById("gameLevel"),
  achGrid: document.getElementById("achGrid"),
  newAchs: document.getElementById("newAchs"),
  flyLayer: document.getElementById("flyLayer"),
  toastStack: document.getElementById("toastStack"),
  balloon1: document.getElementById("balloon1"),
  balloon2: document.getElementById("balloon2"),
  balloon3: document.getElementById("balloon3"),
  homeAchCount: document.getElementById("homeAchCount"),
  homeAchFill: document.getElementById("homeAchFill"),
  homeHistCount: document.getElementById("homeHistCount"),
  openGalleryBtn: document.getElementById("openGalleryBtn"),
  openSessionsBtn: document.getElementById("openSessionsBtn"),
  openBoardBtn: document.getElementById("openBoardBtn"),
  nickInput: document.getElementById("nickInput"),
  nickSaveBtn: document.getElementById("nickSaveBtn"),
  nickHint: document.getElementById("nickHint"),
  nickSetup: document.getElementById("nickSetup"),
  nickReady: document.getElementById("nickReady"),
  nickDisplay: document.getElementById("nickDisplay"),
  nickChangeBtn: document.getElementById("nickChangeBtn"),
  syncHint: document.getElementById("syncHint"),
  syncNowBtn: document.getElementById("syncNowBtn"),
  boardStatus: document.getElementById("boardStatus"),
  boardList: document.getElementById("boardList"),
  boardRefreshBtn: document.getElementById("boardRefreshBtn"),
  galleryCount: document.getElementById("galleryCount"),
  galleryFill: document.getElementById("galleryFill"),
  galleryList: document.getElementById("galleryList"),
  sessionStats: document.getElementById("sessionStats"),
  sessionList: document.getElementById("sessionList"),
  homeMascot: document.getElementById("homeMascot"),
  gameMascot: document.getElementById("gameMascot"),
  resultMascot: document.getElementById("resultMascot"),
  shopMascot: document.getElementById("shopMascot"),
  boostBar: document.getElementById("boostBar"),
  openShopBtn: document.getElementById("openShopBtn"),
  shopCoins: document.getElementById("shopCoins"),
  shopList: document.getElementById("shopList"),
  fxLayer: document.getElementById("fxLayer"),
  skyDecor: document.getElementById("skyDecor"),
  welcomeModal: document.getElementById("welcomeModal"),
  welcomeOkBtn: document.getElementById("welcomeOkBtn"),
  sixSevenModal: document.getElementById("sixSevenModal"),
  sixSevenOkBtn: document.getElementById("sixSevenOkBtn"),
};

/* ——— Уход за маскотом (тамагочи) ——— */
const CARE_MAX = 100;
const CARE_DECAY_PER_HOUR = {
  hunger: 7,
  happiness: 3,
  energy: 4,
  hygiene: 5,
  toilet: 8,
  boredom: -6, // скука растёт (значение boredom ↑)
};
const CARE_PLAY_CD_MS = 45 * 1000;
const CARE_SLEEP_CD_MS = 70 * 1000;
const CARE_TOILET_CD_MS = 25 * 1000;
const CARE_WASH_CD_MS = 35 * 1000;

/** Еда: разные эффекты — выбирай по ситуации. */
const CARE_FOOD = {
  apple: { id: "apple", name: "Яблоко", icon: "🍎", price: 5, hunger: 26, happiness: 3, tags: ["фрукт"], desc: "Лёгкий перекус." },
  banana: { id: "banana", name: "Банан", icon: "🍌", price: 6, hunger: 30, energy: 6, tags: ["фрукт"], desc: "Силы на учёбу." },
  carrot: { id: "carrot", name: "Морковка", icon: "🥕", price: 5, hunger: 24, hygiene: 2, tags: ["овощ"], desc: "Хрустит и полезно." },
  bread: { id: "bread", name: "Хлеб", icon: "🍞", price: 7, hunger: 38, happiness: 2, tags: ["сытное"], desc: "Простая сытость." },
  cheese: { id: "cheese", name: "Сыр", icon: "🧀", price: 9, hunger: 34, energy: 4, happiness: 5, tags: ["сытное"], desc: "Вкусно и сытно." },
  egg: { id: "egg", name: "Яичко", icon: "🥚", price: 8, hunger: 32, energy: 8, tags: ["завтрак"], desc: "Заряд бодрости." },
  porridge: { id: "porridge", name: "Каша", icon: "🍚", price: 10, hunger: 48, energy: 5, happiness: 3, tags: ["завтрак", "сытное"], desc: "На весь день." },
  soup: { id: "soup", name: "Супчик", icon: "🥣", price: 12, hunger: 52, happiness: 6, energy: 4, toilet: -4, tags: ["обед"], desc: "Согревает животик." },
  fish: { id: "fish", name: "Рыбка", icon: "🐟", price: 14, hunger: 44, happiness: 8, energy: 6, tags: ["обед"], desc: "Много белка." },
  salad: { id: "salad", name: "Салатик", icon: "🥗", price: 11, hunger: 28, hygiene: 6, happiness: 7, tags: ["овощ"], desc: "Лёгко и свежо." },
  berry: { id: "berry", name: "Ягодки", icon: "🫐", price: 7, hunger: 18, happiness: 14, tags: ["десерт"], desc: "Сладость и радость." },
  cookie: { id: "cookie", name: "Печенька", icon: "🍪", price: 8, hunger: 22, happiness: 16, energy: 2, toilet: -3, tags: ["десерт"], desc: "Для настроения." },
  yogurt: { id: "yogurt", name: "Йогурт", icon: "🥛", price: 9, hunger: 26, happiness: 8, hygiene: 3, tags: ["десерт"], desc: "Нежный перекус." },
  cake: { id: "cake", name: "Тортик", icon: "🍰", price: 18, hunger: 36, happiness: 22, energy: -2, toilet: -8, tags: ["десерт", "праздник"], desc: "Праздник (чуть тяжёлый)." },
  juice: { id: "juice", name: "Сок", icon: "🧃", price: 6, hunger: 12, happiness: 6, energy: 5, toilet: -5, tags: ["питьё"], desc: "Освежает." },
  honey: { id: "honey", name: "Мёд", icon: "🍯", price: 15, hunger: 20, happiness: 12, energy: 10, tags: ["лечебное"], desc: "Силы и улыбка." },
};

/** Предметы комнаты: один раз купил — лучше спит. */
const CARE_ROOM = {
  pillow: { id: "pillow", name: "Подушка", icon: "🛏️", price: 22, sleepBonus: 12, desc: "Мягче спать (+энергия)." },
  blanket: { id: "blanket", name: "Одеялко", icon: "🧣", price: 28, sleepBonus: 10, desc: "Тепло и уютно." },
  bed: { id: "bed", name: "Кроватка", icon: "🛌", price: 55, sleepBonus: 22, desc: "Настоящий сон богатыря." },
  lamp: { id: "lamp", name: "Ночник", icon: "💡", price: 32, sleepBonus: 8, happiness: 2, desc: "Спокойный свет перед сном." },
  plant: { id: "plant", name: "Цветок", icon: "🪴", price: 20, sleepBonus: 4, happiness: 3, desc: "В комнате свежее." },
};

/** Гигиена: расходники. */
const CARE_WASH = {
  soap: { id: "soap", name: "Мыло", icon: "🧼", price: 6, hygiene: 34, desc: "Помыть лапки." },
  shampoo: { id: "shampoo", name: "Шампунь", icon: "🧴", price: 10, hygiene: 55, happiness: 4, desc: "Блестящая шёрстка." },
  towel: { id: "towel", name: "Полотенце", icon: "🧺", price: 8, hygiene: 28, energy: 2, desc: "Вытереться насухо." },
};

function emptyCare() {
  const now = Date.now();
  return {
    hunger: 78,
    happiness: 78,
    energy: 78,
    hygiene: 78,
    toilet: 78,
    boredom: 15,
    sick: false,
    sickSince: 0,
    lastTickAt: now,
    playAt: 0,
    sleepAt: 0,
    toiletAt: 0,
    washAt: 0,
    feeds: 0,
    plays: 0,
    sleeps: 0,
    heals: 0,
    food: { apple: 1, banana: 0, carrot: 0, bread: 0, cheese: 0, egg: 0, porridge: 0, soup: 0, fish: 0, salad: 0, berry: 0, cookie: 0, yogurt: 0, cake: 0, juice: 0, honey: 0 },
    room: [],
    wash: { soap: 1, shampoo: 0, towel: 0 },
  };
}

function clampCare(n) {
  return Math.max(0, Math.min(CARE_MAX, Math.round(Number(n) || 0)));
}

function normalizeCareBag(raw, catalog) {
  const out = {};
  Object.keys(catalog).forEach((id) => {
    out[id] = Math.max(0, Math.min(99, Number(raw && raw[id]) || 0));
  });
  return out;
}

function normalizeCare(raw) {
  const base = emptyCare();
  if (!raw || typeof raw !== "object") return base;
  const room = Array.isArray(raw.room)
    ? raw.room.filter((id) => CARE_ROOM[id])
    : [];
  return {
    hunger: clampCare(raw.hunger != null ? raw.hunger : base.hunger),
    happiness: clampCare(raw.happiness != null ? raw.happiness : base.happiness),
    energy: clampCare(raw.energy != null ? raw.energy : base.energy),
    hygiene: clampCare(raw.hygiene != null ? raw.hygiene : base.hygiene),
    toilet: clampCare(raw.toilet != null ? raw.toilet : base.toilet),
    boredom: clampCare(raw.boredom != null ? raw.boredom : base.boredom),
    sick: !!raw.sick,
    sickSince: Math.max(0, Number(raw.sickSince) || 0),
    lastTickAt: Math.max(0, Number(raw.lastTickAt) || Date.now()),
    playAt: Math.max(0, Number(raw.playAt) || 0),
    sleepAt: Math.max(0, Number(raw.sleepAt) || 0),
    toiletAt: Math.max(0, Number(raw.toiletAt) || 0),
    washAt: Math.max(0, Number(raw.washAt) || 0),
    feeds: Math.max(0, Number(raw.feeds) || 0),
    plays: Math.max(0, Number(raw.plays) || 0),
    sleeps: Math.max(0, Number(raw.sleeps) || 0),
    heals: Math.max(0, Number(raw.heals) || 0),
    food: normalizeCareBag(raw.food, CARE_FOOD),
    room: [...new Set(room)],
    wash: normalizeCareBag(raw.wash, CARE_WASH),
  };
}

function ensureCare() {
  if (!state.care) state.care = emptyCare();
  state.care = normalizeCare(state.care);
  tickCare(false);
  return state.care;
}

function careSleepBonus() {
  const c = ensureCare();
  return (c.room || []).reduce((sum, id) => sum + (CARE_ROOM[id]?.sleepBonus || 0), 0);
}

function careRoomOwned(id) {
  return (ensureCare().room || []).includes(id);
}

function careFoodCount(id) {
  return (ensureCare().food && ensureCare().food[id]) || 0;
}

function careWashCount(id) {
  return (ensureCare().wash && ensureCare().wash[id]) || 0;
}

function careTotalFood() {
  const f = ensureCare().food || {};
  return Object.values(f).reduce((a, n) => a + (n || 0), 0);
}

function careTotalWash() {
  const w = ensureCare().wash || {};
  return Object.values(w).reduce((a, n) => a + (n || 0), 0);
}

/** Спад показателей по реальному времени. */
function tickCare(doSave = true) {
  if (!state.care) state.care = emptyCare();
  const c = state.care;
  const now = Date.now();
  const last = Math.max(0, Number(c.lastTickAt) || now);
  const hours = Math.min(36, Math.max(0, (now - last) / (60 * 60 * 1000)));
  if (hours > 0.02) {
    c.hunger = clampCare(c.hunger - CARE_DECAY_PER_HOUR.hunger * hours);
    c.happiness = clampCare(c.happiness - CARE_DECAY_PER_HOUR.happiness * hours);
    c.energy = clampCare(c.energy - CARE_DECAY_PER_HOUR.energy * hours);
    c.hygiene = clampCare(c.hygiene - CARE_DECAY_PER_HOUR.hygiene * hours);
    c.toilet = clampCare(c.toilet - CARE_DECAY_PER_HOUR.toilet * hours);
    // boredom растёт (decay negative → add)
    c.boredom = clampCare(c.boredom - CARE_DECAY_PER_HOUR.boredom * hours);
    // болезнь: шанс если грязно/голодно/туалет
    if (!c.sick) {
      const risk = (c.hygiene < 30 ? 0.08 : 0) + (c.hunger < 25 ? 0.05 : 0) + (c.toilet < 20 ? 0.06 : 0);
      const rolls = Math.min(8, Math.floor(hours * 2));
      for (let i = 0; i < rolls; i++) {
        if (Math.random() < risk) {
          c.sick = true;
          c.sickSince = now;
          break;
        }
      }
    } else {
      // больной слабеет
      c.energy = clampCare(c.energy - 2 * hours);
      c.happiness = clampCare(c.happiness - 3 * hours);
    }
    c.lastTickAt = now;
    if (doSave) saveState();
  } else if (!c.lastTickAt) {
    c.lastTickAt = now;
  }
  return c;
}

function careAdd(delta, opts = {}) {
  const c = ensureCare();
  ["hunger", "happiness", "energy", "hygiene", "toilet", "boredom"].forEach((k) => {
    if (delta[k]) c[k] = clampCare(c[k] + delta[k]);
  });
  c.lastTickAt = Date.now();
  if (!opts.silent) {
    saveState();
    unlockAchievements();
  }
  return c;
}

function careAvg() {
  const c = ensureCare();
  const boreOk = CARE_MAX - c.boredom;
  return (c.hunger + c.happiness + c.energy + c.hygiene + c.toilet + boreOk) / 6;
}

function careNeedLabel() {
  const c = ensureCare();
  const needs = [];
  if (c.sick) needs.push("болеет");
  if (c.hunger < 35) needs.push("голоден");
  if (c.toilet < 30) needs.push("в туалет");
  if (c.hygiene < 35) needs.push("грязный");
  if (c.boredom > 65) needs.push("скучает");
  if (c.energy < 30) needs.push("устал");
  if (c.happiness < 30) needs.push("грустный");
  return needs;
}

function careMoodHint() {
  const c = ensureCare();
  if (c.sick) return "sad";
  const avg = careAvg();
  if (c.hunger < 22 || c.hygiene < 22 || c.toilet < 18 || c.boredom > 80 || c.energy < 18) return "sad";
  if (avg < 42) return "neutral";
  if (avg >= 72 && !c.sick) return "happy";
  return null;
}

function displayMascotMood() {
  const care = careMoodHint();
  const run = lastRunMood();
  if (care === "sad") return "sad";
  if (care === "happy" && run !== "sad") return "happy";
  if (care === "neutral" && run === "happy") return "neutral";
  return run;
}

function careStatusText() {
  const c = ensureCare();
  const needs = careNeedLabel();
  if (c.sick) return "Маскот заболел! Нужен укольчик — мини-игра лечения.";
  if (needs.includes("в туалет")) return "Срочно в туалет!";
  if (needs.includes("голоден")) return "Голоден — купи еду в магазине «Уход» и покорми.";
  if (needs.includes("грязный")) return "Пора мыться — купи мыло или шампунь.";
  if (needs.includes("скучает")) return "Скучает! Поиграй в обучалки — станет веселее.";
  if (needs.includes("устал")) {
    const bonus = careSleepBonus();
    return bonus
      ? `Хочет спать (комната +${bonus} к сну).`
      : "Хочет спать. Предметы комнаты в магазине улучшают сон.";
  }
  if (Math.round(careAvg()) >= 80) return "Маскот чистый, сытый и довольный!";
  return "Всё ок — можно чуть подкормить или поучиться.";
}

function careBarClass(v, invert = false) {
  const score = invert ? (CARE_MAX - v) : v;
  if (score < 28) return "low";
  if (score < 55) return "mid";
  return "ok";
}

function careNeedSpeech() {
  const needs = careNeedLabel();
  if (!needs.length) return "";
  const map = {
    болеет: "Мне плохо… нужен укольчик.",
    голоден: "Покорми меня едой из запаса!",
    "в туалет": "Хочу в туалет!",
    грязный: "Я весь грязный…",
    скучает: "Давай поучимся вместе!",
    устал: "Хочу спать…",
    грустный: "Обними меня игрой!",
  };
  return map[needs[0]] || "Позаботься обо мне!";
}

function renderPetCare() {
  const panel = document.getElementById("petCare");
  if (!panel) return;
  const c = ensureCare();
  const setBar = (id, val, invert = false) => {
    const fill = document.getElementById(`${id}Fill`);
    const num = document.getElementById(`${id}Val`);
    const row = document.querySelector(`[data-pet-stat="${id}"]`);
    const shown = clampCare(val);
    const width = invert ? shown : shown;
    if (fill) fill.style.width = `${width}%`;
    if (num) num.textContent = String(shown);
    if (row) {
      row.className = `pet-bar ${careBarClass(val, invert)}`;
      if (id === "petSick") row.classList.toggle("sick-on", !!c.sick);
    }
  };
  setBar("petHunger", c.hunger);
  setBar("petHappy", c.happiness);
  setBar("petEnergy", c.energy);
  setBar("petHygiene", c.hygiene);
  setBar("petToilet", c.toilet);
  setBar("petBoredom", c.boredom, true);

  const sickRow = document.getElementById("petSickRow");
  if (sickRow) sickRow.classList.toggle("hidden", !c.sick);

  const status = document.getElementById("petStatus");
  if (status) status.textContent = careStatusText();

  const bag = document.getElementById("petBag");
  if (bag) {
    const foods = Object.keys(CARE_FOOD)
      .filter((id) => (c.food[id] || 0) > 0)
      .map((id) => `${CARE_FOOD[id].icon}×${c.food[id]}`)
      .join(" ");
    const rooms = (c.room || []).map((id) => CARE_ROOM[id].icon).join("") || "—";
    bag.textContent = `Запас: ${foods || "нет еды"} · Комната: ${rooms}`;
  }

  const now = Date.now();
  const feedBtn = document.getElementById("petFeedBtn");
  const playBtn = document.getElementById("petPlayBtn");
  const sleepBtn = document.getElementById("petSleepBtn");
  const toiletBtn = document.getElementById("petToiletBtn");
  const washBtn = document.getElementById("petWashBtn");
  const healBtn = document.getElementById("petHealBtn");

  if (feedBtn) {
    const n = careTotalFood();
    feedBtn.disabled = n < 1 || c.sick;
    feedBtn.textContent = n ? `🍎 Кормить (${n})` : "🍎 Нет еды — в магазин";
  }
  if (playBtn) {
    playBtn.disabled = c.sick || c.energy < 10;
    playBtn.textContent = "🎮 Играть";
  }
  if (sleepBtn) {
    const left = Math.max(0, (c.sleepAt || 0) - now);
    const bonus = careSleepBonus();
    sleepBtn.disabled = left > 0;
    sleepBtn.textContent = left > 0
      ? `😴 ${Math.ceil(left / 1000)}с`
      : (bonus ? `😴 Спать (+${bonus})` : "😴 Спать");
  }
  if (toiletBtn) {
    const left = Math.max(0, (c.toiletAt || 0) - now);
    toiletBtn.disabled = left > 0;
    toiletBtn.textContent = left > 0 ? `🚽 ${Math.ceil(left / 1000)}с` : "🚽 Туалет";
  }
  if (washBtn) {
    const left = Math.max(0, (c.washAt || 0) - now);
    const n = careTotalWash();
    washBtn.disabled = left > 0 || n < 1;
    washBtn.textContent = left > 0
      ? `🧼 ${Math.ceil(left / 1000)}с`
      : (n ? `🧼 Мыться (${n})` : "🧼 Нет мыла");
  }
  if (healBtn) {
    healBtn.classList.toggle("hidden", !c.sick);
    healBtn.disabled = !c.sick;
  }
}

function openPetFoodPicker() {
  const c = ensureCare();
  const modal = document.getElementById("petFoodModal");
  const list = document.getElementById("petFoodList");
  if (!modal || !list) {
    // fallback: eat first available
    const id = Object.keys(CARE_FOOD).find((k) => (c.food[k] || 0) > 0);
    if (id) petFeed(id);
    return;
  }
  const items = Object.values(CARE_FOOD).filter((f) => (c.food[f.id] || 0) > 0);
  if (!items.length) {
    showToasts([{ plain: true, icon: "🛒", name: "Нет еды", desc: "Купи еду во вкладке «Уход» в магазине." }]);
    return;
  }
  list.innerHTML = items.map((f) => {
    const bits = [];
    if (f.hunger) bits.push(`🍎${f.hunger > 0 ? "+" : ""}${f.hunger}`);
    if (f.happiness) bits.push(`😊${f.happiness > 0 ? "+" : ""}${f.happiness}`);
    if (f.energy) bits.push(`⚡${f.energy > 0 ? "+" : ""}${f.energy}`);
    if (f.hygiene) bits.push(`✨+${f.hygiene}`);
    const tag = (f.tags && f.tags[0]) ? ` · ${f.tags[0]}` : "";
    return `<button type="button" class="pet-pick-card" data-pet-food="${f.id}">
      <span class="ico">${f.icon}</span>
      <span class="name">${f.name} ×${c.food[f.id]}${tag}</span>
      <span class="desc">${bits.join(" ") || f.desc}</span>
    </button>`;
  }).join("");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closePetFoodPicker() {
  const modal = document.getElementById("petFoodModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function openPetWashPicker() {
  const c = ensureCare();
  const modal = document.getElementById("petWashModal");
  const list = document.getElementById("petWashList");
  if (!modal || !list) {
    const id = Object.keys(CARE_WASH).find((k) => (c.wash[k] || 0) > 0);
    if (id) petWash(id);
    return;
  }
  const items = Object.values(CARE_WASH).filter((w) => (c.wash[w.id] || 0) > 0);
  if (!items.length) {
    showToasts([{ plain: true, icon: "🛒", name: "Нет средств", desc: "Купи мыло во вкладке «Уход»." }]);
    return;
  }
  list.innerHTML = items.map((w) => `
    <button type="button" class="pet-pick-card" data-pet-wash="${w.id}">
      <span class="ico">${w.icon}</span>
      <span class="name">${w.name} ×${c.wash[w.id]}</span>
      <span class="desc">+${w.hygiene} чистота</span>
    </button>`).join("");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closePetWashPicker() {
  const modal = document.getElementById("petWashModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function petFeed(foodId) {
  const c = ensureCare();
  if (c.sick) {
    showToasts([{ plain: true, icon: "🤒", name: "Болеет", desc: "Сначала вылечи укольчиком." }]);
    return;
  }
  const item = CARE_FOOD[foodId];
  if (!item || (c.food[foodId] || 0) < 1) {
    showToasts([{ plain: true, icon: "🛒", name: "Нет еды", desc: "Купи еду в магазине → Уход." }]);
    return;
  }
  c.food[foodId] -= 1;
  careAdd({
    hunger: item.hunger || 0,
    happiness: item.happiness || 0,
    energy: item.energy || 0,
    hygiene: item.hygiene || 0,
    toilet: item.toilet || -5,
  }, { silent: true });
  c.feeds = (c.feeds || 0) + 1;
  saveState();
  closePetFoodPicker();
  const fresh = unlockAchievements();
  const effect = [
    item.hunger ? `сытость ${item.hunger > 0 ? "+" : ""}${item.hunger}` : "",
    item.happiness ? `счастье ${item.happiness > 0 ? "+" : ""}${item.happiness}` : "",
    item.energy ? `энергия ${item.energy > 0 ? "+" : ""}${item.energy}` : "",
  ].filter(Boolean).join(", ");
  showToasts([{ plain: true, icon: item.icon, name: item.name, desc: effect || item.desc }]);
  if (fresh.length) showToasts(fresh.slice(0, 1).map((a) => ({ icon: a.icon, name: a.name, desc: a.desc })));
  if (els.totalCoins) els.totalCoins.textContent = String(state.coins);
  renderPetCare();
  paintMascots();
}

function petPlay() {
  const c = ensureCare();
  if (c.sick) {
    showToasts([{ plain: true, icon: "🤒", name: "Болеет", desc: "Сначала укольчик." }]);
    return;
  }
  if (c.energy < 10) {
    showToasts([{ plain: true, icon: "😴", name: "Нет сил", desc: "Сначала поспит — потом в игру." }]);
    return;
  }
  // Играть = идём в обучалку; характеристики меняет уже прогон
  careAdd({ energy: -4 }, { silent: true });
  c.plays = (c.plays || 0) + 1;
  saveState();
  renderPetCare();
  showToasts([{ plain: true, icon: "🎮", name: "В игру!", desc: "Скука уйдёт после примеров" }]);
  showScreen("home");
  renderHome();
  // чуть подождать отрисовку дома, затем старт текущего уровня
  setTimeout(() => {
    if (typeof startGame === "function") startGame();
  }, 60);
}

function petSleep() {
  const c = ensureCare();
  const now = Date.now();
  if ((c.sleepAt || 0) > now) return;
  const bonus = careSleepBonus();
  careAdd({
    energy: 32 + bonus,
    hunger: -6,
    happiness: 3 + Math.floor(bonus / 8),
    hygiene: -4,
  }, { silent: true });
  c.sleepAt = now + CARE_SLEEP_CD_MS;
  c.sleeps = (c.sleeps || 0) + 1;
  saveState();
  unlockAchievements();
  showToasts([{
    plain: true,
    icon: "😴",
    name: bonus ? "Сон в уюте!" : "Сон",
    desc: bonus ? `Комната дала +${bonus} энергии` : "Купи кровать/подушку — сон сильнее",
  }]);
  renderPetCare();
  paintMascots();
}

function petToilet() {
  const c = ensureCare();
  const now = Date.now();
  if ((c.toiletAt || 0) > now) return;
  careAdd({ toilet: 55, hygiene: -8, happiness: 4 }, { silent: true });
  c.toiletAt = now + CARE_TOILET_CD_MS;
  saveState();
  showToasts([{ plain: true, icon: "🚽", name: "Уф, легче!", desc: "После туалета лучше помыться." }]);
  renderPetCare();
  paintMascots();
}

function petWash(washId) {
  const c = ensureCare();
  const now = Date.now();
  if ((c.washAt || 0) > now) return;
  const item = CARE_WASH[washId];
  if (!item || (c.wash[washId] || 0) < 1) {
    showToasts([{ plain: true, icon: "🛒", name: "Нет средства", desc: "Купи мыло в «Уход»." }]);
    return;
  }
  c.wash[washId] -= 1;
  careAdd({
    hygiene: item.hygiene || 0,
    happiness: item.happiness || 0,
    energy: item.energy || 0,
  }, { silent: true });
  c.washAt = now + CARE_WASH_CD_MS;
  saveState();
  closePetWashPicker();
  showToasts([{ plain: true, icon: item.icon, name: "Чистюля!", desc: item.name }]);
  renderPetCare();
  paintMascots();
}

/* ——— Мини-игра: укольчик ——— */
let shotGame = null;
let shotRaf = 0;

function openShotGame() {
  const c = ensureCare();
  if (!c.sick) return;
  const modal = document.getElementById("petShotModal");
  if (!modal) return;
  closePetFoodPicker();
  closePetWashPicker();
  shotGame = {
    t: 0,
    hit: false,
    done: false,
    // target zone center 0..1
    zone: 0.55 + Math.random() * 0.2,
    zoneW: 0.14,
  };
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("pet-shot-open");
  const tip = document.getElementById("petShotTip");
  if (tip) tip.textContent = "Поймай момент: жми, когда шприц над зелёной зоной!";
  const result = document.getElementById("petShotResult");
  if (result) {
    result.classList.add("hidden");
    result.textContent = "";
  }
  const fire = document.getElementById("petShotFire");
  if (fire) fire.disabled = false;
  cancelAnimationFrame(shotRaf);
  const loop = () => {
    if (!shotGame || shotGame.done) return;
    shotGame.t += 0.018;
    const x = (Math.sin(shotGame.t * 2.2) + 1) / 2; // 0..1
    shotGame.pos = x;
    const needle = document.getElementById("petShotNeedle");
    const track = document.getElementById("petShotTrack");
    if (needle && track) {
      needle.style.left = `${x * 100}%`;
    }
    shotRaf = requestAnimationFrame(loop);
  };
  // paint zone
  const zoneEl = document.getElementById("petShotZone");
  if (zoneEl) {
    zoneEl.style.left = `${(shotGame.zone - shotGame.zoneW / 2) * 100}%`;
    zoneEl.style.width = `${shotGame.zoneW * 100}%`;
  }
  shotRaf = requestAnimationFrame(loop);
}

function closeShotGame() {
  shotGame = null;
  cancelAnimationFrame(shotRaf);
  const modal = document.getElementById("petShotModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }
  document.body.classList.remove("pet-shot-open");
}

function fireShotGame() {
  if (!shotGame || shotGame.done) return;
  const pos = shotGame.pos == null ? 0.5 : shotGame.pos;
  const lo = shotGame.zone - shotGame.zoneW / 2;
  const hi = shotGame.zone + shotGame.zoneW / 2;
  const ok = pos >= lo && pos <= hi;
  shotGame.done = true;
  cancelAnimationFrame(shotRaf);
  const fire = document.getElementById("petShotFire");
  if (fire) fire.disabled = true;
  const result = document.getElementById("petShotResult");
  if (ok) {
    const c = ensureCare();
    c.sick = false;
    c.sickSince = 0;
    c.heals = (c.heals || 0) + 1;
    careAdd({ happiness: 18, energy: 12, boredom: -8 }, { silent: true });
    saveState();
    unlockAchievements();
    if (result) {
      result.classList.remove("hidden");
      result.textContent = "Попал! Маскот уже поправляется 💚";
    }
    showToasts([{ plain: true, icon: "💉", name: "Вылечен!", desc: "Больше не болеет" }]);
    setTimeout(() => {
      closeShotGame();
      renderPetCare();
      paintMascots();
    }, 900);
  } else {
    if (result) {
      result.classList.remove("hidden");
      result.textContent = "Мимо… Попробуй ещё раз, когда шприц в зелёной зоне!";
    }
    setTimeout(() => {
      // restart round
      openShotGame();
    }, 1100);
  }
}

function applyCareAfterStudy(correct, total, timedOut) {
  const mistakes = Math.max(0, (total || TOTAL) - (correct || 0));
  let happiness = 3 + Math.round((correct || 0) * 0.8);
  if (mistakes === 0) happiness += 6;
  else if (mistakes <= 2) happiness += 2;
  // Скука лечится учёбой в приложении
  let boredom = -18 - Math.round((correct || 0) * 2.2);
  if (mistakes === 0) boredom -= 12;
  if (timedOut) {
    happiness -= 3;
    boredom += 4;
  }
  const hunger = -Math.max(4, Math.floor((correct || 0) / 2) + 2);
  const energy = -Math.max(3, 2 + Math.floor(mistakes / 2));
  careAdd({ happiness, hunger, energy, boredom, toilet: -4 }, { silent: true });
}

function buyCareFood(id) {
  const item = CARE_FOOD[id];
  if (!item) return;
  if (state.coins < item.price) return notEnough();
  const c = ensureCare();
  state.coins -= item.price;
  c.food[id] = (c.food[id] || 0) + 1;
  saveState();
  pingBuy(item.icon, item.name);
  renderShop();
  renderPetCare();
}

function buyCareRoom(id) {
  const item = CARE_ROOM[id];
  if (!item) return;
  if (careRoomOwned(id)) return;
  if (state.coins < item.price) return notEnough();
  const c = ensureCare();
  state.coins -= item.price;
  if (!c.room.includes(id)) c.room.push(id);
  if (item.happiness) careAdd({ happiness: item.happiness }, { silent: true });
  saveState();
  pingBuy(item.icon, item.name);
  renderShop();
  renderPetCare();
}

function buyCareWash(id) {
  const item = CARE_WASH[id];
  if (!item) return;
  if (state.coins < item.price) return notEnough();
  const c = ensureCare();
  state.coins -= item.price;
  c.wash[id] = (c.wash[id] || 0) + 1;
  saveState();
  pingBuy(item.icon, item.name);
  renderShop();
  renderPetCare();
}

let petCareTimerId = 0;
function startPetCareTimer() {
  clearInterval(petCareTimerId);
  petCareTimerId = setInterval(() => {
    if (!screens.home || screens.home.classList.contains("hidden")) return;
    tickCare(true);
    renderPetCare();
  }, 15000);
}

let state = loadState();
saveState();
let selectedLevel = state.lastLevel || 1;
let run = null;
let tickId = null;
let sessionFilter = "all";
let shopTab = "boosts";
let shopEquipFilter = "";
let boardFilter = "all";
let boardMode = MODE_BASIC;
let selectedMode = (() => {
  try {
    const saved = localStorage.getItem(`${STORAGE_KEY}-mode`);
    if (saved === MODE_CHAIN) return MODE_CHAIN;
    if (saved === MODE_UNITS) return MODE_UNITS;
    if (saved === MODE_MUL) return MODE_MUL;
    if (saved === MODE_DIV) return MODE_DIV;
    if (saved === MODE_ENG) return MODE_ENG;
    if (saved === MODE_CODE) return MODE_CODE;
    if (saved === MODE_SAFE) return MODE_SAFE;
    return MODE_BASIC;
  } catch {
    return MODE_BASIC;
  }
})();
let selectedTheme = (() => {
  try {
    const saved = localStorage.getItem(`${STORAGE_KEY}-theme`);
    if (saved === THEME_ENG || saved === THEME_CODE || saved === THEME_MATH || saved === THEME_SAFE) return saved;
  } catch { /* ignore */ }
  if (selectedMode === MODE_ENG) return THEME_ENG;
  if (selectedMode === MODE_CODE) return THEME_CODE;
  if (selectedMode === MODE_SAFE) return THEME_SAFE;
  return THEME_MATH;
})();
boardMode = selectedMode === MODE_BASIC ? MODE_BASIC : selectedMode;
let playerNick = loadNick();

function loadNick() {
  try {
    return normalizeNick(localStorage.getItem(NICK_KEY) || "");
  } catch {
    return "";
  }
}

function saveNick(nick) {
  playerNick = normalizeNick(nick);
  try {
    if (playerNick) localStorage.setItem(NICK_KEY, playerNick);
    else localStorage.removeItem(NICK_KEY);
  } catch {
    /* ignore */
  }
  return playerNick;
}

function normalizeNick(raw) {
  return String(raw || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
}

function isNickOk(nick) {
  return nick.length >= 2 && nick.length <= 16;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function emptyEquip() {
  return { head: "none", body: "none", weapon: "none", accessory: [], relic: "none" };
}

function emptyShop() {
  return {
    skins: ["honey"],
    hats: ["none"],
    bodies: ["none"],
    weapons: ["none"],
    toys: [],
    fxOwned: ["classic"],
    relics: [],
    skies: ["none"],
    skills: [],
    skin: "honey",
    hat: "none",
    relic: "none",
    sky: "none",
    skill: "none",
    toysOn: [],
    equip: emptyEquip(),
    fx: "classic",
    slow: 0,
    extra: 0,
    cheat: 0,
    potion: 0,
    megaPotion: 0,
    shieldScroll: 0,
    boostUsed: { slow: 0, extra: 0, cheat: 0, potion: 0, megaPotion: 0, shieldScroll: 0 },
  };
}

function syncEquipMirrors(shop) {
  const eq = shop.equip || emptyEquip();
  shop.hat = HATS[eq.head] ? eq.head : "none";
  shop.relic = RELICS[eq.relic] ? eq.relic : "none";
  shop.toysOn = Array.isArray(eq.accessory)
    ? eq.accessory.filter((id) => TOYS[id]).slice(0, ACCESSORY_MAX)
    : [];
  eq.accessory = shop.toysOn.slice();
  shop.equip = eq;
  return shop;
}

function migrateEquip(raw, shop) {
  const eq = emptyEquip();
  if (raw && raw.equip && typeof raw.equip === "object") {
    eq.head = HATS[raw.equip.head] ? raw.equip.head : "none";
    eq.body = (BODIES[raw.equip.body] || (raw.equip.body === "ironShield" && RELICS.ironShield))
      ? raw.equip.body
      : "none";
    if (eq.body === "ironShield" && !BODIES.ironShield) {
      /* keep as owned body via relics map */ 
    }
    eq.weapon = WEAPONS[raw.equip.weapon] ? raw.equip.weapon : "none";
    eq.accessory = Array.isArray(raw.equip.accessory)
      ? raw.equip.accessory.filter((id) => TOYS[id]).slice(0, ACCESSORY_MAX)
      : [];
    eq.relic = RELICS[raw.equip.relic] ? raw.equip.relic : "none";
  } else {
    eq.head = HATS[shop.hat] ? shop.hat : "none";
    eq.accessory = Array.isArray(shop.toysOn)
      ? shop.toysOn.filter((id) => TOYS[id]).slice(0, ACCESSORY_MAX)
      : [];
    const oldRelic = shop.relic;
    if (oldRelic === "woodSword" && WEAPONS.woodSword) {
      eq.weapon = "woodSword";
      eq.relic = "none";
    } else if (oldRelic === "ironShield") {
      eq.body = "ironShield";
      eq.relic = "none";
    } else if (RELICS[oldRelic]) {
      eq.relic = oldRelic;
    }
  }
  // If player owned woodSword in relics, ensure weapons inventory
  if ((shop.relics || []).includes("woodSword") && !(shop.weapons || []).includes("woodSword")) {
    shop.weapons = [...(shop.weapons || ["none"]), "woodSword"];
  }
  if ((shop.relics || []).includes("ironShield") && !(shop.bodies || []).includes("ironShield")) {
    shop.bodies = [...(shop.bodies || ["none"]), "ironShield"];
  }
  shop.equip = eq;
  return syncEquipMirrors(shop);
}

function normalizeShop(raw) {
  const base = emptyShop();
  if (!raw || typeof raw !== "object") return base;
  const skins = Array.isArray(raw.skins) ? raw.skins : base.skins;
  const hats = Array.isArray(raw.hats) ? raw.hats : base.hats;
  let bodies = Array.isArray(raw.bodies) ? raw.bodies.filter((id) => BODIES[id] || id === "ironShield" || id === "none") : ["none"];
  if (!bodies.includes("none")) bodies = ["none", ...bodies];
  let weapons = Array.isArray(raw.weapons) ? raw.weapons.filter((id) => WEAPONS[id] || id === "none") : ["none"];
  if (!weapons.includes("none")) weapons = ["none", ...weapons];
  const toys = Array.isArray(raw.toys) ? raw.toys : base.toys;
  let relics = Array.isArray(raw.relics) ? raw.relics.filter((id) => RELICS[id] || id === "woodSword" || id === "ironShield") : [];
  // migrate weapon/body out of relics list into inventories
  if (relics.includes("woodSword") && !weapons.includes("woodSword")) weapons.push("woodSword");
  if (relics.includes("ironShield") && !bodies.includes("ironShield")) bodies.push("ironShield");
  relics = relics.filter((id) => RELICS[id]);
  const skills = Array.isArray(raw.skills) ? raw.skills.filter((id) => SKILLS[id]) : [];
  let skies = Array.isArray(raw.skies) ? raw.skies.filter((id) => SKIES[id]) : ["none"];
  if (!skies.includes("none")) skies = ["none", ...skies];
  let fxOwned = Array.isArray(raw.fxOwned) ? raw.fxOwned.filter((id) => FX[id]) : ["classic"];
  if (!fxOwned.includes("classic")) fxOwned = ["classic", ...fxOwned];
  const fx = FX[raw.fx] ? raw.fx : "classic";
  const sky = SKIES[raw.sky] ? raw.sky : "none";
  const skill = SKILLS[raw.skill] ? raw.skill : "none";
  const shop = {
    skins: skins.includes("honey") ? skins : ["honey", ...skins],
    hats: hats.includes("none") ? hats : ["none", ...hats],
    bodies,
    weapons,
    toys,
    relics,
    skills,
    skies,
    fxOwned,
    skin: SKINS[raw.skin] ? raw.skin : "honey",
    hat: HATS[raw.hat] ? raw.hat : "none",
    relic: RELICS[raw.relic] ? raw.relic : (raw.relic === "woodSword" || raw.relic === "ironShield" ? "none" : "none"),
    sky: skies.includes(sky) ? sky : "none",
    skill: skills.includes(skill) ? skill : "none",
    toysOn: Array.isArray(raw.toysOn) ? raw.toysOn.filter((id) => TOYS[id]) : [],
    equip: emptyEquip(),
    fx: fxOwned.includes(fx) ? fx : "classic",
    slow: Number(raw.slow) || 0,
    extra: Number(raw.extra) || 0,
    cheat: Number(raw.cheat) || 0,
    potion: Number(raw.potion) || 0,
    megaPotion: Number(raw.megaPotion) || 0,
    shieldScroll: Number(raw.shieldScroll) || 0,
    boostUsed: {
      slow: Number(raw.boostUsed && raw.boostUsed.slow) || 0,
      extra: Number(raw.boostUsed && raw.boostUsed.extra) || 0,
      cheat: Number(raw.boostUsed && raw.boostUsed.cheat) || 0,
      potion: Number(raw.boostUsed && raw.boostUsed.potion) || 0,
      megaPotion: Number(raw.boostUsed && raw.boostUsed.megaPotion) || 0,
      shieldScroll: Number(raw.boostUsed && raw.boostUsed.shieldScroll) || 0,
    },
  };
  return migrateEquip(raw, shop);
}

function loadState() {
  const empty = {
    stars: 0,
    coins: 0,
    runs: [],
    achievements: [],
    lastLevel: 1,
    version: DATA_VERSION,
    shop: emptyShop(),
    dailyClaimDay: "",
    dailyStreak: 0,
    safeCleared: {},
    kingdom: emptyKingdom(),
    care: emptyCare(),
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const data = JSON.parse(raw);
    const ver = Number(data.version);
    if (ver !== 2 && ver !== 3 && ver !== 4 && ver !== 5 && ver !== 6 && ver !== 7 && ver !== 8 && ver !== 9 && ver !== 10 && ver !== 11 && ver !== DATA_VERSION) {
      return { ...empty, lastLevel: 1 };
    }
    let runs = Array.isArray(data.runs) ? data.runs : [];
    let lastLevel = Number(data.lastLevel) || 1;
    if (ver === 2) {
      runs = runs.map((r) => ({ ...r, level: r.level === 3 ? 4 : r.level }));
      lastLevel = lastLevel === 3 ? 4 : lastLevel;
    }
    return {
      stars: Number(data.stars) || 0,
      coins: Number(data.coins) || 0,
      runs,
      achievements: Array.isArray(data.achievements) ? data.achievements : [],
      lastLevel,
      version: DATA_VERSION,
      shop: normalizeShop(data.shop),
      dailyClaimDay: typeof data.dailyClaimDay === "string" ? data.dailyClaimDay : "",
      dailyStreak: Math.max(0, Number(data.dailyStreak) || 0),
      safeCleared: (data.safeCleared && typeof data.safeCleared === "object") ? data.safeCleared : {},
      kingdom: normalizeKingdom(data.kingdom),
      care: normalizeCare(data.care),
    };
  } catch {
    return empty;
  }
}

const RUNS_KEEP = 60;

function saveState() {
  state.version = DATA_VERSION;
  try {
    if (Array.isArray(state.runs) && state.runs.length > RUNS_KEEP) {
      state.runs = state.runs.slice(0, RUNS_KEEP);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // Квота localStorage — режем историю и пробуем ещё раз
    try {
      if (Array.isArray(state.runs)) state.runs = state.runs.slice(0, 20);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err2) {
      console.warn("saveState failed", err2);
    }
  }
}

function rankFor(stars) {
  return [...RANKS].reverse().find((r) => stars >= r.min) || RANKS[0];
}

function rankIndexOf(stars) {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (stars >= r.min) idx = i;
  });
  return idx;
}

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

function isDailyReady() {
  return state.dailyClaimDay !== todayKey();
}

function pickDailyReward() {
  const roll = Math.random() * 100;
  let stars = 0;
  let coins = 0;
  let kind = "coins";
  if (roll < 45) {
    kind = "coins";
    const pool = [10, 12, 15, 18, 20, 25];
    coins = pool[Math.floor(Math.random() * pool.length)];
  } else if (roll < 85) {
    kind = "stars";
    const pool = [3, 4, 5, 6, 8];
    stars = pool[Math.floor(Math.random() * pool.length)];
  } else {
    kind = "both";
    coins = 8 + Math.floor(Math.random() * 8);
    stars = 2 + Math.floor(Math.random() * 3);
  }
  const streak = Math.max(1, Number(state.dailyStreak) || 0);
  if (streak > 0 && streak % 7 === 0) coins += 5;
  return { kind, stars, coins, streak };
}

function formatDailyReward(reward) {
  const bits = [];
  if (reward.stars) bits.push(`+${reward.stars} опыта`);
  if (reward.coins) bits.push(`+${reward.coins} монет`);
  return bits.join(" · ") || "Пусто";
}

function renderDailyBox() {
  if (!els.dailyBoxBtn) return;
  const ready = isDailyReady();
  const streak = Math.max(0, Number(state.dailyStreak) || 0);
  els.dailyBoxBtn.classList.toggle("ready", ready);
  els.dailyBoxBtn.classList.toggle("claimed", !ready);
  els.dailyBoxBtn.disabled = false;
  if (ready) {
    els.dailyBoxTitle.textContent = "Ежедневный бокс";
    els.dailyBoxHint.textContent = streak > 1
      ? `Серия ${streak} дн. · монеты или опыт`
      : "Случайные монеты или опыт";
    els.dailyBoxBadge.textContent = "Новый";
    els.dailyBoxBtn.setAttribute("aria-label", "Открыть ежедневный бокс");
  } else {
    els.dailyBoxTitle.textContent = "Бокс открыт";
    els.dailyBoxHint.textContent = streak > 1
      ? `Серия ${streak} дн. · завтра снова`
      : "Завтра будет новый подарок";
    els.dailyBoxBadge.textContent = "Завтра";
    els.dailyBoxBtn.setAttribute("aria-label", "Ежедневный бокс уже открыт сегодня");
  }
}

function openDailyModal() {
  if (!els.dailyModal) return;
  const card = els.dailyModal.querySelector(".daily-modal");
  card?.classList.remove("opening", "opened");
  els.dailyChest.textContent = "📦";
  els.dailyModalLead.textContent = isDailyReady()
    ? "Что спрятано сегодня?"
    : "Сегодня уже открывали — загляни завтра!";
  els.dailyModalReward.classList.add("hidden");
  els.dailyModalReward.textContent = "";
  els.dailyClaimBtn.disabled = false;
  els.dailyClaimBtn.classList.toggle("hidden", !isDailyReady());
  els.dailyCloseBtn.classList.toggle("hidden", isDailyReady());
  els.dailyCloseBtn.textContent = isDailyReady() ? "Ура!" : "Понятно";
  els.dailyModal.classList.remove("hidden");
}

function closeDailyModal() {
  els.dailyModal?.classList.add("hidden");
}

function claimDailyBox() {
  if (!isDailyReady()) {
    openDailyModal();
    return;
  }
  const today = todayKey();
  const yday = yesterdayKey();
  if (state.dailyClaimDay === yday) state.dailyStreak = (Number(state.dailyStreak) || 0) + 1;
  else state.dailyStreak = 1;

  const reward = pickDailyReward();
  const card = els.dailyModal.querySelector(".daily-modal");
  card?.classList.add("opening");
  els.dailyClaimBtn.disabled = true;
  els.dailyModalLead.textContent = "Открываем…";

  setTimeout(() => {
    state.stars += reward.stars;
    state.coins += reward.coins;
    state.dailyClaimDay = today;
    const fresh = unlockAchievements();
    saveState();

    card?.classList.remove("opening");
    card?.classList.add("opened");
    els.dailyChest.textContent = reward.kind === "stars" ? "⭐" : reward.kind === "both" ? "🎁" : "🪙";
    els.dailyModalLead.textContent = reward.streak >= 7 && reward.streak % 7 === 0
      ? `Серия ${reward.streak} дней — бонус!`
      : "Ура, подарок!";
    els.dailyModalReward.textContent = formatDailyReward(reward);
    els.dailyModalReward.classList.remove("hidden");
    els.dailyClaimBtn.classList.add("hidden");
    els.dailyClaimBtn.disabled = false;
    els.dailyCloseBtn.classList.remove("hidden");
    els.dailyCloseBtn.textContent = "Ура!";

    spawnLoot(reward.stars, reward.coins);
    renderHome();
    if (fresh.length) {
      showToasts(fresh.slice(0, 3).map((a) => ({ icon: a.icon, name: a.name, desc: a.desc })));
    } else {
      showToasts([{ plain: true, icon: els.dailyChest.textContent, name: "Ежедневный бокс", desc: formatDailyReward(reward) }]);
    }
  }, 520);
}

function levelCfg(level, mode = selectedMode) {
  if (isBattleLevel(level)) {
    const base = LEVELS[level] || LEVELS[BATTLE_LEVEL];
    const extra = BATTLE_CFG[level] || {};
    return { ...base, ...extra, battle: true };
  }
  if (mode === MODE_UNITS) return UNIT_LEVELS[level] || UNIT_LEVELS[1];
  if (mode === MODE_MUL) return MUL_LEVELS[level] || MUL_LEVELS[1];
  if (mode === MODE_DIV) return DIV_LEVELS[level] || DIV_LEVELS[1];
  if (mode === MODE_ENG) return ENG_LEVELS[level] || ENG_LEVELS[1];
  if (mode === MODE_CODE) return CODE_LEVELS[level] || CODE_LEVELS[1];
  return LEVELS[level] || LEVELS[1];
}

function modeLabelShort(mode) {
  if (mode === MODE_CHAIN) return " · 2ш";
  if (mode === MODE_UNITS) return " · меры";
  if (mode === MODE_MUL) return " · ×";
  if (mode === MODE_DIV) return " · ÷";
  if (mode === MODE_ENG) return " · EN";
  if (mode === MODE_CODE) return " · код";
  return "";
}

function themeOfMode(mode = selectedMode) {
  if (mode === MODE_ENG) return THEME_ENG;
  if (mode === MODE_CODE) return THEME_CODE;
  if (mode === MODE_SAFE) return THEME_SAFE;
  return THEME_MATH;
}

function safeClearedCount() {
  const map = state.safeCleared || {};
  return SAFE_SCENARIOS.filter((s) => map[s.id]).length;
}

function isSafeAllCleared() {
  return safeClearedCount() >= SAFE_SCENARIOS.length;
}

function themePerfectCount(themeId) {
  if (themeId === THEME_SAFE) return safeClearedCount();
  const modes = (THEME_META[themeId] && THEME_META[themeId].modes) || [];
  let n = 0;
  modes.forEach((mode) => {
    for (let lvl = 1; lvl <= 5; lvl += 1) {
      if (state.runs.some((r) => (r.mode || MODE_BASIC) === mode && (r.level || 1) === lvl && r.correct === 10)) n += 1;
    }
  });
  return n;
}

function professionFor(themeId) {
  const list = PROFESSIONS[themeId] || [];
  const score = themePerfectCount(themeId);
  let cur = null;
  list.forEach((p) => {
    if (score >= p.need) cur = p;
  });
  return { current: cur, score, next: list.find((p) => score < p.need) || null, all: list };
}

function saveTheme() {
  try { localStorage.setItem(`${STORAGE_KEY}-theme`, selectedTheme); } catch { /* ignore */ }
}

function fastPerfect(modeId, levelId) {
  return state.runs.some((r) =>
    (r.mode || MODE_BASIC) === modeId
    && (r.level || 1) === levelId
    && r.correct === 10
    && !r.timedOut
    && (r.ms || 0) > 0
    && (r.ms || 0) < SECRET_SPEED_MS
  );
}

function secretGateNeeds() {
  const need = [];
  for (let l = 1; l <= 5; l += 1) {
    need.push({ mode: MODE_BASIC, level: l });
    need.push({ mode: MODE_CHAIN, level: l });
  }
  for (let l = 1; l <= 5; l += 1) need.push({ mode: MODE_MUL, level: l });
  for (let l = 1; l <= 5; l += 1) need.push({ mode: MODE_DIV, level: l });
  need.push({ mode: MODE_UNITS, level: 1 });
  need.push({ mode: MODE_UNITS, level: 2 });
  return need;
}

function secretGateProgress() {
  const need = secretGateNeeds();
  const current = need.filter((n) => fastPerfect(n.mode, n.level)).length;
  return { current, target: need.length };
}

function isSecretGateReady() {
  return secretGateNeeds().every((n) => fastPerfect(n.mode, n.level));
}

function isSecretUnlocked() {
  return isSecretGateReady();
}

function grantSecretReward() {
  let changed = false;
  if (!state.shop.toys.includes("secretKey")) {
    state.shop.toys.push("secretKey");
    const eq = state.shop.equip || emptyEquip();
    if ((eq.accessory || []).length < ACCESSORY_MAX && !eq.accessory.includes("secretKey")) {
      eq.accessory.push("secretKey");
      state.shop.equip = eq;
      syncEquipMirrors(state.shop);
    }
    changed = true;
  }
  if (!state.shop.skies.includes("secretNight")) {
    state.shop.skies.push("secretNight");
    changed = true;
  }
  return changed;
}

function hasSecretPerfect(modeId) {
  return state.runs.some((r) =>
    (r.mode || MODE_BASIC) === modeId && (r.level || 1) === SECRET_LEVEL && r.correct === 10
  );
}

function professionUnlocked(profId) {
  if (!profId) return true;
  for (const themeId of [THEME_MATH, THEME_ENG, THEME_CODE, THEME_SAFE]) {
    const info = professionFor(themeId);
    if (info.all.some((p) => p.id === profId && info.score >= p.need)) return true;
  }
  return false;
}

function skillGateOpen(skill) {
  if (!skill) return false;
  if (skill.needProfession && !professionUnlocked(skill.needProfession)) return false;
  if (skill.battleOnly) return state.stars >= (skill.rankMin || 0);
  if (skill.needProfession) return state.stars >= (skill.rankMin || 0);
  if (skill.secretMode) return hasSecretPerfect(skill.secretMode) && state.stars >= (skill.rankMin || 0);
  // обычные скиллы — только звание
  return state.stars >= (skill.rankMin || 0);
}

function equippedSkill() {
  const id = state.shop && state.shop.skill;
  return id && SKILLS[id] && state.shop.skills.includes(id) ? SKILLS[id] : null;
}

function isBattleLevel(id) {
  return BATTLE_LEVELS.includes(Number(id));
}

function battleCfg(id = selectedLevel) {
  return BATTLE_CFG[id] || BATTLE_CFG[BATTLE_LEVEL];
}

function hasBattleWin(levelId, mode = selectedMode) {
  return state.runs.some((r) =>
    (r.mode || MODE_BASIC) === mode && Number(r.level) === Number(levelId) && r.battleWin
  );
}

function bodyItem(id) {
  if (id === "ironShield") return RELICS.ironShield || null;
  return BODIES[id] || null;
}

function weaponItem(id) {
  return WEAPONS[id] || null;
}

function equippedBattlePassives() {
  const eq = (state.shop && state.shop.equip) || emptyEquip();
  const parts = [];
  const w = weaponItem(eq.weapon);
  if (w && w.battle) parts.push(w.battle);
  const b = bodyItem(eq.body);
  if (b && b.battle) parts.push(b.battle);
  const r = RELICS[eq.relic];
  if (r && r.battle) parts.push(r.battle);
  const out = { dmgBonus: 0, maxHpBonus: 0, firstHitFree: false, rewardBonus: 0 };
  parts.forEach((p) => {
    out.dmgBonus += p.dmgBonus || 0;
    out.maxHpBonus += p.maxHpBonus || 0;
    if (p.firstHitFree) out.firstHitFree = true;
    out.rewardBonus += p.rewardBonus || 0;
  });
  return out;
}

function equippedBattleRelic() {
  // compat alias
  return equippedBattlePassives();
}

function battleRoundsForMode(mode = selectedMode, battleId = selectedLevel) {
  let all;
  if (mode === MODE_UNITS) all = [1, 2];
  else if (mode === MODE_MUL || mode === MODE_DIV || mode === MODE_ENG || mode === MODE_CODE) all = [1, 2, 3, 4, 5];
  else all = [1, 2, 3, 4, 5];
  const frac = (battleCfg(battleId).roundFrac != null) ? battleCfg(battleId).roundFrac : 1;
  const n = Math.max(1, Math.ceil(all.length * frac));
  return all.slice(0, n);
}

function isBossLadderReady() {
  return battleRoundsForMode(selectedMode, BATTLE_LEVEL).length
    ? battleRoundsForMode(selectedMode, 8).every((id) => hasPerfect(id))
    : false;
}

function isBossOpen(id = BATTLE_LEVEL) {
  const bid = Number(id);
  if (!isBattleLevel(bid)) return false;
  const allReady = (selectedMode === MODE_UNITS
    ? [1, 2]
    : [1, 2, 3, 4, 5]
  ).every((lvl) => hasPerfect(lvl));
  if (bid === 7) return allReady;
  if (bid === 8) return hasBattleWin(7);
  if (bid === 9) return hasBattleWin(8);
  return false;
}

function normalMaxLevel() {
  const modeInfo = MODE_META[selectedMode] || MODE_META[MODE_BASIC];
  if (selectedMode === MODE_UNITS || selectedMode === MODE_MUL || selectedMode === MODE_DIV
    || selectedMode === MODE_ENG || selectedMode === MODE_CODE) {
    return modeInfo.maxLevel || 2;
  }
  return Math.min(modeInfo.maxLevel || 5, SECRET_LEVEL - 1);
}

function modeHasSecret() {
  return selectedMode === MODE_BASIC || selectedMode === MODE_CHAIN;
}

function skillReadyAt(runObj = run) {
  return (runObj && runObj.skillReadyAt) || 0;
}

function skillIsActive(runObj = run) {
  return !!(runObj && runObj.skillActiveUntil && Date.now() < runObj.skillActiveUntil);
}

function skillCooldownLeft(runObj = run) {
  return Math.max(0, skillReadyAt(runObj) - Date.now());
}

function hasPerfect(levelId) {
  return state.runs.some((r) =>
    (r.mode || MODE_BASIC) === selectedMode && (r.level || 1) === levelId && r.correct === 10
  );
}

function isLevelOpen(id) {
  if (isBattleLevel(id)) return isBossOpen(id);
  const modeInfo = MODE_META[selectedMode] || MODE_META[MODE_BASIC];
  const max = modeInfo.maxLevel || 5;
  if (id < 1 || id > max) return false;
  if (selectedMode === MODE_UNITS) {
    if (id === 1) return modeProgress(MODE_BASIC, 3) || modeProgress(MODE_CHAIN, 3);
    return hasPerfect(1);
  }
  if (selectedMode === MODE_MUL || selectedMode === MODE_DIV || selectedMode === MODE_ENG || selectedMode === MODE_CODE) {
    if (id <= 1) return true;
    return hasPerfect(id - 1);
  }
  if (id === SECRET_LEVEL) return isSecretUnlocked();
  if (id <= 1) return true;
  return hasPerfect(id - 1);
}

function maxOpenLevel() {
  const modeInfo = MODE_META[selectedMode] || MODE_META[MODE_BASIC];
  const max = modeInfo.maxLevel || 5;
  let open = 1;
  for (let i = 1; i <= max; i += 1) {
    if (isLevelOpen(i)) open = i;
    else break;
  }
  return open;
}

function modeProgress(modeId, levelId) {
  return state.runs.some((r) => (r.mode || MODE_BASIC) === modeId && (r.level || 1) === levelId && r.correct === 10);
}

function schoolGrade(correct, forgive = 0) {
  const rawMistakes = TOTAL - correct;
  const forgiven = Math.min(Math.max(0, forgive), CHEAT_MAX_PER_RUN);
  const mistakes = Math.max(0, rawMistakes - forgiven);
  const note = forgiven
    ? ` (ошибок ${rawMistakes}, прощено бустом: ${Math.min(forgiven, rawMistakes)})`
    : "";
  if (mistakes <= 0) {
    return {
      mark: 5,
      failed: false,
      title: "Отлично!",
      text: forgiven && rawMistakes > 0
        ? `Оценка 5 — читер спас от ${Math.min(forgiven, rawMistakes)} ошиб${Math.min(forgiven, rawMistakes) === 1 ? "ки" : "ок"}!`
        : "Оценка 5 — ни одной ошибки!",
      forgiven,
      rawMistakes,
    };
  }
  if (mistakes === 1) {
    return { mark: 4, failed: false, title: "Хорошо!", text: `Оценка 4 — одна ошибка.${note}`, forgiven, rawMistakes };
  }
  if (mistakes === 2) {
    return { mark: 3, failed: false, title: "Удовлетворительно", text: `Оценка 3 — две ошибки.${note}`, forgiven, rawMistakes };
  }
  return {
    mark: 2,
    failed: true,
    title: "Провалено",
    text: `Оценка 2 — ошибок для оценки: ${mistakes}.${note} Надо пересдать!`,
    forgiven,
    rawMistakes,
  };
}

function xpInfo() {
  const i = rankIndexOf(state.stars);
  const cur = RANKS[i];
  const next = RANKS[i + 1];
  if (!next) return { pct: 100, label: "Максимальный ранг!" };
  return {
    pct: Math.min(100, Math.round(((state.stars - cur.min) / (next.min - cur.min)) * 100)),
    label: `${state.stars} / ${next.min} опыта до «${next.name}»`,
  };
}

function mapLayoutForMode(mode = selectedMode) {
  // Нелинейная карта: старт линейный, дальше развилки и арена боёв.
  if (mode === MODE_UNITS) {
    return [
      { id: 1, kind: "level", col: 2, row: 1 },
      { id: 2, kind: "level", col: 4, row: 1 },
      { id: 7, kind: "boss", col: 1, row: 2 },
      { id: 8, kind: "boss", col: 3, row: 3 },
      { id: 9, kind: "boss", col: 5, row: 2 },
    ];
  }
  if (mode === MODE_ENG || mode === MODE_CODE) {
    return [
      { id: 1, kind: "level", col: 2, row: 1 },
      { id: 2, kind: "level", col: 4, row: 1 },
      { id: 3, kind: "level", col: 3, row: 2 },
      { id: 4, kind: "level", col: 1, row: 3 },
      { id: 5, kind: "level", col: 5, row: 3 },
    ];
  }
  if (mode === MODE_MUL || mode === MODE_DIV) {
    return [
      { id: 1, kind: "level", col: 2, row: 1 },
      { id: 2, kind: "level", col: 4, row: 1 },
      { id: 3, kind: "level", col: 3, row: 2 },
      { id: 4, kind: "level", col: 1, row: 3 },
      { id: 5, kind: "level", col: 5, row: 3 },
      { id: 7, kind: "boss", col: 2, row: 4 },
      { id: 8, kind: "boss", col: 4, row: 5 },
      { id: 9, kind: "boss", col: 3, row: 6 },
    ];
  }
  // База / 2 действия: старт → развилка → секрет сбоку → арена боёв
  return [
    { id: 1, kind: "level", col: 2, row: 1 },
    { id: 2, kind: "level", col: 4, row: 1 },
    { id: 3, kind: "level", col: 3, row: 2 },
    { id: 4, kind: "level", col: 1, row: 3 },
    { id: 5, kind: "level", col: 5, row: 3 },
    { id: SECRET_LEVEL, kind: "secret", col: 6, row: 4 },
    { id: 7, kind: "boss", col: 2, row: 5 },
    { id: 8, kind: "boss", col: 4, row: 4 },
    { id: 9, kind: "boss", col: 3, row: 6 },
  ];
}

function mapTokenHtml() {
  const shop = state.shop || emptyShop();
  const skin = SKINS[shop.skin] || SKINS.honey;
  const eq = shop.equip || emptyEquip();
  const hat = eq.head && eq.head !== "none" ? (HATS[eq.head]?.icon || "") : "";
  const form = skin.form || "blob";
  const weapon = eq.weapon && eq.weapon !== "none" ? (WEAPONS[eq.weapon]?.icon || "") : "";
  return `<div class="map-token mc-mascot form-${form}" id="mapToken" aria-hidden="true"
      style="--skin:${skin.body};--inner:${skin.inner};">
      ${hat ? `<span class="mc-hat">${hat}</span>` : ""}
      ${form === "cat" ? '<span class="mc-ear l"></span><span class="mc-ear r"></span>' : ""}
      <span class="mc-head"></span>
      <span class="mc-torso"></span>
      <span class="mc-legs"><i></i><i></i></span>
      ${weapon ? `<span class="mc-weapon">${weapon}</span>` : ""}
    </div>`;
}

function mapPathSvg(layout) {
  // Простые «тропинки» между соседними по прогрессии узлами
  const byId = Object.fromEntries(layout.map((n) => [n.id, n]));
  const links = [];
  const normals = layout.filter((n) => n.kind === "level").map((n) => n.id).sort((a, b) => a - b);
  for (let i = 0; i < normals.length - 1; i += 1) links.push([normals[i], normals[i + 1]]);
  if (byId[SECRET_LEVEL] && byId[5]) links.push([5, SECRET_LEVEL]);
  if (byId[5] && byId[7]) links.push([5, 7]);
  else if (byId[2] && byId[7] && !byId[5]) links.push([2, 7]);
  else if (byId[normals[normals.length - 1]] && byId[7]) links.push([normals[normals.length - 1], 7]);
  if (byId[7] && byId[8]) links.push([7, 8]);
  if (byId[8] && byId[9]) links.push([8, 9]);
  // Также короткая развилка 3→4 и 3→5
  if (byId[3] && byId[4]) links.push([3, 4]);
  if (byId[3] && byId[5]) links.push([3, 5]);

  const cellW = 100 / 6;
  const maxRow = Math.max(...layout.map((n) => n.row));
  const cellH = 100 / Math.max(maxRow, 1);
  const center = (n) => ({
    x: (n.col - 0.5) * cellW,
    y: (n.row - 0.35) * cellH,
  });
  const d = links.map(([a, b]) => {
    const A = byId[a];
    const B = byId[b];
    if (!A || !B) return "";
    const p = center(A);
    const q = center(B);
    const mx = (p.x + q.x) / 2;
    const my = (p.y + q.y) / 2 - 4;
    return `M ${p.x} ${p.y} Q ${mx} ${my} ${q.x} ${q.y}`;
  }).filter(Boolean).join(" ");
  return `<svg class="map-trails" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d}" fill="none" stroke="#5a3d1e" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>
    <path d="${d}" fill="none" stroke="#c4a574" stroke-width="0.9" stroke-linecap="round" stroke-dasharray="2 2" opacity=".9"/>
  </svg>`;
}

function renderLevels() {
  if (!isBattleLevel(selectedLevel) && selectedLevel !== SECRET_LEVEL && !isLevelOpen(selectedLevel)) {
    selectedLevel = maxOpenLevel();
  }
  const modeInfo = MODE_META[selectedMode] || MODE_META[MODE_BASIC];
  const root = document.getElementById("levels");
  if (!root) return;
  const layout = mapLayoutForMode().filter((n) => {
    if (n.kind === "secret") return modeHasSecret();
    if (n.kind === "level") return n.id <= normalMaxLevel();
    return true;
  });

  const dots = layout.map((node) => {
    const id = node.id;
    const open = isLevelOpen(id);
    const cfg = levelCfg(id);
    const theme = node.kind === "boss"
      ? "boss"
      : ((modeInfo.themes && modeInfo.themes[id - 1]) || cfg.theme || "easy");
    const selected = selectedLevel === id ? " selected" : "";
    const locked = open ? "" : " locked";
    const done = (!isBattleLevel(id) && hasPerfect(id))
      || (isBattleLevel(id) && hasBattleWin(id))
      ? " done"
      : "";
    let name;
    let need = "";
    if (node.kind === "boss") {
      const bcfg = battleCfg(id);
      name = bcfg.name || `Бой ${id - 6}`;
      if (!open) {
        if (id === 7) need = "Все уровни 10/10";
        else if (id === 8) need = "Победи Бой 1";
        else need = "Победи Бой 2";
      }
    } else if (node.kind === "secret") {
      name = open ? (modeInfo.levelNames[id - 1] || "Секрет") : "???";
      if (!open) need = "Скорость везде";
    } else {
      name = modeInfo.levelNames[id - 1] || cfg.name;
      if (!open) {
        if (selectedMode === MODE_UNITS && id === 1) need = "Сначала «Сложный»";
        else if (modeInfo.levelNames[id - 2]) need = `10/10 «${modeInfo.levelNames[id - 2]}»`;
      }
    }
    const foeIco = { slime: "🟢", rock: "🪨", storm: "⛈️" };
    const ico = node.kind === "boss"
      ? (foeIco[battleCfg(id).foe] || "🐉")
      : node.kind === "secret" ? "🗝️" : (done ? "⭐" : "⛏️");
    const branch = node.kind === "boss" ? " arena" : (node.row >= 3 && node.kind === "level" ? " fork" : "");
    return `<button type="button" class="map-node mc-block ${theme}${selected}${locked}${done}${branch}" data-level="${id}" style="grid-column:${node.col};grid-row:${node.row}">
      <span class="mc-cube" aria-hidden="true">
        <span class="mc-top"></span>
        <span class="mc-left"></span>
        <span class="mc-right"></span>
      </span>
      <span class="map-face">
        <span class="map-ico">${ico}</span>
        <span class="map-name">${name}</span>
        ${need ? `<span class="map-need">${need}</span>` : ""}
      </span>
    </button>`;
  }).join("");

  const maxRow = Math.max(...layout.map((n) => n.row), 1);
  root.innerHTML = `
    <div class="adventure-map mc-world" id="adventureMap" style="--map-rows:${maxRow}">
      <div class="mc-sky" aria-hidden="true"></div>
      <div class="mc-ground" aria-hidden="true"></div>
      ${mapPathSvg(layout)}
      <div class="map-nodes nonlinear">${dots}</div>
      ${mapTokenHtml()}
    </div>`;
  requestAnimationFrame(() => placeMapToken(selectedLevel, false));
  document.querySelectorAll("#modeTabs .filter-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.mode === selectedMode);
  });
  if (els.startBtn) {
    els.startBtn.textContent = isBattleLevel(selectedLevel) ? "В бой!" : "Старт";
  }
}

function placeMapToken(levelId, animate) {
  const token = document.getElementById("mapToken");
  const node = document.querySelector(`.map-node[data-level="${levelId}"]`);
  const map = document.getElementById("adventureMap");
  if (!token || !node || !map) return;
  const mr = map.getBoundingClientRect();
  const nr = node.getBoundingClientRect();
  const x = nr.left - mr.left + nr.width / 2 - 16;
  const y = nr.top - mr.top - 10;
  token.classList.toggle("travel", !!animate);
  token.style.transform = `translate(${x}px, ${y}px)`;
  if (animate) setTimeout(() => token.classList.remove("travel"), 520);
}

function formatTime(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function formatStamp(iso) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startIsoOf(record) {
  if (record.startedAt) return record.startedAt;
  if (record.date && record.ms) {
    return new Date(new Date(record.date).getTime() - record.ms).toISOString();
  }
  return record.date;
}

function generateEasy() {
  if (Math.random() < 0.55) {
    const a = rand(1, 19);
    const b = rand(0, 20 - a);
    return { a, b, op: "+", answer: a + b };
  }
  const a = rand(1, 20);
  const b = rand(0, a);
  return { a, b, op: "−", answer: a - b };
}

function generateSecretBasic() {
  if (Math.random() < 0.5) {
    const sum = rand(11, 30);
    const a = rand(1, sum - 1);
    return { a, b: sum - a, op: "+", answer: sum, text: `${a} + ${sum - a} = ?` };
  }
  const a = rand(11, 30);
  const b = rand(1, Math.min(9, a));
  return { a, b, op: "−", answer: a - b, text: `${a} − ${b} = ?` };
}

function generateSecretChain() {
  let guard = 0;
  while (guard < 220) {
    const a = rand(1, 28);
    const b = rand(1, 12);
    const c = rand(1, 12);
    const op1 = Math.random() < 0.5 ? "+" : "−";
    const op2 = Math.random() < 0.5 ? "+" : "−";
    const step1 = op1 === "+" ? a + b : a - b;
    const result = op2 === "+" ? step1 + c : step1 - c;
    const badEqualSub = (op1 === "−" && a === b) || (op2 === "−" && step1 === c);
    if (step1 >= 0 && result >= 0 && step1 <= 30 && result <= 30 && !badEqualSub) {
      return {
        a, b, c, op1, op2,
        text: `${a} ${op1} ${b} ${op2} ${c} = ?`,
        answer: result,
      };
    }
    guard += 1;
  }
  return { a: 20, b: 5, c: 3, op1: "+", op2: "−", text: "20 + 5 − 3 = ?", answer: 22 };
}

function generateLengthConvert() {
  // Простые соседние переводы + составные (всегда целое число, без дробей).
  const simple = [
    () => { const n = rand(1, 9); return { text: `${n} см = ? мм`, answer: n * 10 }; },
    () => { const n = rand(1, 9); return { text: `${n * 10} мм = ? см`, answer: n }; },
    () => { const n = rand(1, 9); return { text: `${n} дм = ? см`, answer: n * 10 }; },
    () => { const n = rand(1, 9); return { text: `${n * 10} см = ? дм`, answer: n }; },
    () => { const n = rand(1, 9); return { text: `${n} м = ? дм`, answer: n * 10 }; },
    () => { const n = rand(1, 9); return { text: `${n * 10} дм = ? м`, answer: n }; },
    () => { const n = rand(1, 5); return { text: `${n} м = ? см`, answer: n * 100 }; },
    () => { const n = rand(1, 5); return { text: `${n * 100} см = ? м`, answer: n }; },
    () => { const n = rand(1, 9); return { text: `${n} дм = ? мм`, answer: n * 100 }; },
    () => { const n = rand(1, 9); return { text: `${n * 100} мм = ? дм`, answer: n }; },
  ];
  const compound = [
    // дм + см → см
    () => {
      const dm = rand(1, 9);
      const cm = rand(1, 9);
      return { text: `${dm} дм ${cm} см = ? см`, answer: dm * 10 + cm };
    },
    // дм + см → мм
    () => {
      const dm = rand(1, 5);
      const cm = rand(0, 9);
      return { text: `${dm} дм ${cm} см = ? мм`, answer: dm * 100 + cm * 10 };
    },
    // см + мм → мм
    () => {
      const cm = rand(1, 9);
      const mm = rand(1, 9);
      return { text: `${cm} см ${mm} мм = ? мм`, answer: cm * 10 + mm };
    },
    // м + дм → дм
    () => {
      const m = rand(1, 5);
      const dm = rand(1, 9);
      return { text: `${m} м ${dm} дм = ? дм`, answer: m * 10 + dm };
    },
    // м + дм → см
    () => {
      const m = rand(1, 3);
      const dm = rand(0, 9);
      return { text: `${m} м ${dm} дм = ? см`, answer: m * 100 + dm * 10 };
    },
    // м + см → см
    () => {
      const m = rand(1, 3);
      const cm = rand(1, 99);
      return { text: `${m} м ${cm} см = ? см`, answer: m * 100 + cm };
    },
    // м + дм + см → см (чуть сложнее)
    () => {
      const m = rand(1, 2);
      const dm = rand(0, 9);
      const cm = rand(1, 9);
      return { text: `${m} м ${dm} дм ${cm} см = ? см`, answer: m * 100 + dm * 10 + cm };
    },
    // дм + мм → мм
    () => {
      const dm = rand(1, 4);
      const mm = rand(1, 9);
      return { text: `${dm} дм ${mm} мм = ? мм`, answer: dm * 100 + mm };
    },
  ];
  const pool = Math.random() < 0.45 ? simple : compound;
  return pool[rand(0, pool.length - 1)]();
}

function toMm(parts) {
  return (parts.m || 0) * 1000 + (parts.dm || 0) * 100 + (parts.cm || 0) * 10 + (parts.mm || 0);
}

function formatLengthParts(parts) {
  const bits = [];
  if (parts.m) bits.push(`${parts.m} м`);
  if (parts.dm) bits.push(`${parts.dm} дм`);
  if (parts.cm) bits.push(`${parts.cm} см`);
  if (parts.mm) bits.push(`${parts.mm} мм`);
  if (!bits.length) bits.push("0 мм");
  return bits.join(" ");
}

function randomLengthParts() {
  const roll = Math.random();
  if (roll < 0.25) return { cm: rand(1, 9), mm: rand(0, 9) };
  if (roll < 0.45) return { dm: rand(1, 5), cm: rand(0, 9) };
  if (roll < 0.65) return { cm: rand(1, 19) };
  if (roll < 0.8) return { dm: rand(1, 9) };
  if (roll < 0.92) return { m: 1, cm: rand(0, 90) };
  return { mm: rand(10, 99) };
}

function generateLengthCompare() {
  let left = randomLengthParts();
  let right = randomLengthParts();
  let guard = 0;
  while (guard < 40 && formatLengthParts(left) === formatLengthParts(right)) {
    right = randomLengthParts();
    guard += 1;
  }
  // classic textbook pairs
  if (Math.random() < 0.35) {
    const pairs = [
      [{ cm: 1, mm: 7 }, { cm: 1 }],
      [{ cm: 9 }, { dm: 1 }],
      [{ dm: 1 }, { cm: 10 }],
      [{ cm: 1, mm: 9 }, { cm: 2 }],
      [{ m: 1 }, { cm: 90 }],
      [{ dm: 2 }, { cm: 15 }],
      [{ cm: 5, mm: 5 }, { cm: 5, mm: 5 }],
    ];
    const pick = pairs[rand(0, pairs.length - 1)];
    left = pick[0];
    right = pick[1];
  }
  const lv = toMm(left);
  const rv = toMm(right);
  const answer = lv === rv ? 0 : lv > rv ? 1 : 2;
  const lText = formatLengthParts(left);
  const rText = formatLengthParts(right);
  return {
    text: `Что больше?\n1) ${lText}\n2) ${rText}\n(0 = равно)`,
    answer,
    compare: true,
  };
}

function generateUnitsConvert() {
  return generateLengthConvert();
}

function generateUnitsCompare() {
  return generateLengthCompare();
}

function generateMedium() {
  if (Math.random() < 0.5) {
    const sum = rand(10, 20);
    const a = rand(1, sum - 1);
    const b = sum - a;
    return { a, b, op: "+", answer: sum };
  }
  const a = rand(10, 20);
  const b = rand(1, a - 1);
  return { a, b, op: "−", answer: a - b };
}

function generateChainProblem(level) {
  const mediumOrHard = level >= 2;
  const hardish = level >= 3;
  const noZero = mediumOrHard;
  const minBase = noZero ? 1 : 0;
  let a = rand(minBase, 18);
  let b = rand(minBase, 10);
  let c = rand(minBase, hardish ? 10 : 8);
  let op1 = Math.random() < 0.5 ? "+" : "−";
  let op2 = Math.random() < 0.5 ? "+" : "−";
  let guard = 0;
  while (guard < 200) {
    if (noZero && (a === 0 || b === 0 || c === 0)) {
      a = rand(1, 18); b = rand(1, 10); c = rand(1, hardish ? 10 : 8); guard += 1; continue;
    }
    const step1 = op1 === "+" ? a + b : a - b;
    const result = op2 === "+" ? step1 + c : step1 - c;
    const badEqualSub = (op1 === "−" && a === b) || (op2 === "−" && step1 === c);
    if (step1 < 0 || result < 0 || step1 > 20 || result > 20 || badEqualSub) {
      a = rand(minBase, 18); b = rand(minBase, 10); c = rand(minBase, hardish ? 10 : 8);
      if (hardish && Math.random() < 0.55) {
        op1 = Math.random() < 0.5 ? "+" : "−";
        op2 = op1 === "+" ? "−" : "+";
      } else {
        op1 = Math.random() < 0.5 ? "+" : "−";
        op2 = Math.random() < 0.5 ? "+" : "−";
      }
      guard += 1;
      continue;
    }
    return {
      a, b, c, op1, op2,
      text: `${a} ${op1} ${b} ${op2} ${c} = ?`,
      answer: result,
    };
  }
  return { a: 8, b: 3, c: 2, op1: "+", op2: "−", text: "8 + 3 − 2 = ?", answer: 9 };
}

function generateCrossingAdd() {
  const a = rand(1, 9);
  const b = rand(Math.max(1, 10 - a), 9);
  return { a, b, op: "+", answer: a + b };
}

function generateCrossingSub() {
  const a = rand(10, 18);
  const minB = Math.max(1, a - 9);
  const maxB = Math.min(9, a);
  const b = rand(minB, maxB);
  return { a, b, op: "−", answer: a - b };
}

function generateSharpFocus() {
  return Math.random() < 0.5 ? generateCrossingAdd() : generateCrossingSub();
}

function repeatedSum(n, times) {
  return Array.from({ length: times }, () => String(n)).join(" + ");
}

function generateMulIntro() {
  const n = rand(2, 5);
  const times = rand(2, 5);
  const product = n * times;
  const roll = Math.random();
  if (roll < 0.4) {
    // Понять: сумма одинаковых → ответ
    return {
      a: n,
      b: times,
      op: "×",
      answer: product,
      text: `${repeatedSum(n, times)} = ?`,
      hint: `${times} раз по ${n}`,
    };
  }
  if (roll < 0.7) {
    // С подсказкой суммы рядом
    return {
      a: n,
      b: times,
      op: "×",
      answer: product,
      text: `${times} × ${n} = ?`,
      hint: `${repeatedSum(n, times)}`,
    };
  }
  // Явная связка
  return {
    a: n,
    b: times,
    op: "×",
    answer: product,
    text: `${times} × ${n}  (= ${repeatedSum(n, times)})  = ?`,
  };
}

function generateMulByTables(tables, secondMax = 10) {
  const a = tables[rand(0, tables.length - 1)];
  const b = rand(1, secondMax);
  return { a, b, op: "×", answer: a * b, text: `${a} × ${b} = ?` };
}

function generateMulMissing(tables) {
  const a = tables[rand(0, tables.length - 1)];
  const b = rand(2, 9);
  const product = a * b;
  if (Math.random() < 0.5) {
    return { a, b, op: "×", answer: b, text: `${a} × ? = ${product}`, missing: "b" };
  }
  return { a, b, op: "×", answer: a, text: `? × ${b} = ${product}`, missing: "a" };
}

function generateMulMixed() {
  const tables = [2, 3, 4, 5, 6, 7, 8, 9];
  if (Math.random() < 0.7) return generateMulByTables(tables, 9);
  return generateMulMissing(tables);
}

function generateMulProblem(level) {
  const cfg = levelCfg(level, MODE_MUL);
  const kind = cfg.mul || "mixed";
  if (kind === "intro") return generateMulIntro();
  if (kind === "t23") return generateMulByTables([2, 3], 10);
  if (kind === "t45") return generateMulByTables([4, 5], 10);
  if (kind === "t69") return generateMulByTables([6, 7, 8, 9], 9);
  return generateMulMixed();
}

function generateDivIntro() {
  const divisor = rand(2, 5);
  const quotient = rand(2, 5);
  const dividend = divisor * quotient;
  const roll = Math.random();
  if (roll < 0.4) {
    return {
      a: dividend,
      b: divisor,
      op: "÷",
      answer: quotient,
      text: `Сколько раз ${divisor} входит в ${dividend}?`,
      hint: `${divisor} × ${quotient} = ${dividend}`,
    };
  }
  if (roll < 0.7) {
    return {
      a: dividend,
      b: divisor,
      op: "÷",
      answer: quotient,
      text: `${dividend} ÷ ${divisor} = ?`,
      hint: `потому что ${divisor} × ${quotient} = ${dividend}`,
    };
  }
  return {
    a: dividend,
    b: divisor,
    op: "÷",
    answer: quotient,
    text: `${dividend} ÷ ${divisor}  (= ${divisor} × ${quotient})  = ?`,
  };
}

function generateDivByTables(tables, quotMax = 10) {
  const b = tables[rand(0, tables.length - 1)];
  const answer = rand(1, quotMax);
  const a = b * answer;
  return { a, b, op: "÷", answer, text: `${a} ÷ ${b} = ?` };
}

function generateDivMissing(tables) {
  const b = tables[rand(0, tables.length - 1)];
  const quot = rand(2, 9);
  const a = b * quot;
  if (Math.random() < 0.5) {
    return { a, b, op: "÷", answer: b, text: `${a} ÷ ? = ${quot}`, missing: "b" };
  }
  return { a, b, op: "÷", answer: a, text: `? ÷ ${b} = ${quot}`, missing: "a" };
}

function generateDivMixed() {
  const tables = [2, 3, 4, 5, 6, 7, 8, 9];
  if (Math.random() < 0.7) return generateDivByTables(tables, 9);
  return generateDivMissing(tables);
}

function generateDivProblem(level) {
  const cfg = levelCfg(level, MODE_DIV);
  const kind = cfg.div || "mixed";
  if (kind === "intro") return generateDivIntro();
  if (kind === "t23") return generateDivByTables([2, 3], 10);
  if (kind === "t45") return generateDivByTables([4, 5], 10);
  if (kind === "t69") return generateDivByTables([6, 7, 8, 9], 9);
  return generateDivMixed();
}

function shuffleChoices(correct, pool) {
  const wrong = shuffle(pool.filter((x) => x !== correct)).slice(0, 2);
  const opts = shuffle([correct, ...wrong]);
  return { choices: opts, answer: opts.indexOf(correct) + 1 };
}

function generateEngQuiz(bank) {
  const item = bank[rand(0, bank.length - 1)];
  const askEn = Math.random() < 0.55;
  if (askEn) {
    const q = shuffleChoices(item.ru, bank.map((b) => b.ru));
    return {
      text: `${item.ico || ""}  ${item.en}  = ?`,
      hint: "Выбери перевод: 1, 2 или 3",
      choices: q.choices,
      answer: q.answer,
      choice: true,
      a: item.en,
      b: item.ru,
      op: "EN",
    };
  }
  const q = shuffleChoices(item.en, bank.map((b) => b.en));
  return {
    text: `${item.ico || ""}  ${item.ru}  = ?`,
    hint: "Выбери английское слово: 1, 2 или 3",
    choices: q.choices,
    answer: q.answer,
    choice: true,
    a: item.ru,
    b: item.en,
    op: "EN",
  };
}

function generateEngProblem(level) {
  const cfg = levelCfg(level, MODE_ENG);
  const kind = cfg.eng || "mixed";
  if (kind === "mixed") {
    const keys = Object.keys(ENG_WORDS);
    const bank = ENG_WORDS[keys[rand(0, keys.length - 1)]];
    return generateEngQuiz(bank);
  }
  return generateEngQuiz(ENG_WORDS[kind] || ENG_WORDS.animals);
}

function pickCodeQuizItem(kind) {
  if (kind === "mixed") {
    const keys = ["folders", "copy", "memory", "net"];
    const k = keys[rand(0, keys.length - 1)];
    const bank = CODE_QUIZ[k];
    return { kind: k, item: bank[rand(0, bank.length - 1)] };
  }
  const bank = CODE_QUIZ[kind] || CODE_QUIZ.folders;
  return { kind, item: bank[rand(0, bank.length - 1)] };
}

function generateCodeProblem(level) {
  const cfg = levelCfg(level, MODE_CODE);
  const kind = cfg.code || "mixed";
  const { item } = pickCodeQuizItem(kind);
  const q = shuffleChoices(item.ok, item.choices);
  return {
    text: item.q,
    hint: item.hint || "Вспомни мини-урок перед стартом",
    choices: q.choices,
    answer: q.answer,
    choice: true,
    op: "PC",
    a: item.q,
    b: item.ok,
  };
}

function generateProblem(level) {
  if (selectedMode === MODE_UNITS) {
    const cfg = levelCfg(level);
    if (cfg.units === "compare") return generateUnitsCompare();
    return generateUnitsConvert();
  }
  if (selectedMode === MODE_MUL) return generateMulProblem(level);
  if (selectedMode === MODE_DIV) return generateDivProblem(level);
  if (selectedMode === MODE_ENG) return generateEngProblem(level);
  if (selectedMode === MODE_CODE) return generateCodeProblem(level);
  if (level === SECRET_LEVEL) {
    return selectedMode === MODE_CHAIN ? generateSecretChain() : generateSecretBasic();
  }
  if (selectedMode === MODE_CHAIN) return generateChainProblem(level);
  if (level >= 3) return generateSharpFocus();
  if (level === 2) return generateMedium();
  return generateEasy();
}

function pushUnique(items, seen, make, guardMax) {
  let guard = 0;
  while (guard < guardMax) {
    const p = make();
    const key = `${p.a}${p.op}${p.b}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push(p);
      return true;
    }
    guard += 1;
  }
  items.push(make());
  return false;
}

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = rand(0, i);
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

function generateSharpRun() {
  const items = [];
  const seen = new Set();
  for (let i = 0; i < 7; i += 1) pushUnique(items, seen, generateSharpFocus, 40);
  for (let i = 0; i < 3; i += 1) pushUnique(items, seen, generateMedium, 40);
  return shuffle(items);
}

function generateRun(level) {
  if (selectedMode === MODE_UNITS) {
    const cfg = levelCfg(level);
    const items = [];
    const seen = new Set();
    let guard = 0;
    while (items.length < TOTAL && guard < 160) {
      const p = cfg.units === "compare" ? generateUnitsCompare() : generateUnitsConvert();
      if (!seen.has(p.text)) {
        seen.add(p.text);
        items.push(p);
      }
      guard += 1;
    }
    while (items.length < TOTAL) {
      items.push(cfg.units === "compare" ? generateUnitsCompare() : generateUnitsConvert());
    }
    return items;
  }
  if (level === SECRET_LEVEL) {
    const items = [];
    const seen = new Set();
    const make = () => {
      if (selectedMode === MODE_CHAIN) return generateSecretChain();
      return generateSecretBasic();
    };
    let guard = 0;
    while (items.length < TOTAL && guard < 160) {
      const p = make();
      const key = p.text || `${p.a}${p.op}${p.b}${p.c || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push(p);
      }
      guard += 1;
    }
    while (items.length < TOTAL) items.push(make());
    return items;
  }
  if (selectedMode === MODE_MUL) {
    const items = [];
    const seen = new Set();
    let guard = 0;
    while (items.length < TOTAL && guard < 200) {
      const p = generateMulProblem(level);
      const key = p.text || `${p.a}×${p.b}=${p.answer}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push(p);
      }
      guard += 1;
    }
    while (items.length < TOTAL) items.push(generateMulProblem(level));
    return items;
  }
  if (selectedMode === MODE_DIV) {
    const items = [];
    const seen = new Set();
    let guard = 0;
    while (items.length < TOTAL && guard < 200) {
      const p = generateDivProblem(level);
      const key = p.text || `${p.a}÷${p.b}=${p.answer}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push(p);
      }
      guard += 1;
    }
    while (items.length < TOTAL) items.push(generateDivProblem(level));
    return items;
  }
  if (selectedMode === MODE_ENG || selectedMode === MODE_CODE) {
    const items = [];
    const seen = new Set();
    const make = () => (selectedMode === MODE_ENG ? generateEngProblem(level) : generateCodeProblem(level));
    let guard = 0;
    while (items.length < TOTAL && guard < 220) {
      const p = make();
      const key = p.text || `${p.op}:${p.answer}:${(p.choices || []).join(",")}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push(p);
      }
      guard += 1;
    }
    while (items.length < TOTAL) items.push(make());
    return items;
  }
  if (selectedMode === MODE_CHAIN) {
    const items = [];
    const seen = new Set();
    while (items.length < TOTAL) pushUnique(items, seen, () => generateChainProblem(level), 80);
    return items;
  }
  if (level >= 3) return generateSharpRun();
  const items = [];
  const seen = new Set();
  let guard = 0;
  while (items.length < TOTAL && guard < 120) {
    const p = generateProblem(level);
    const key = `${p.a}${p.op}${p.b}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push(p);
    }
    guard += 1;
  }
  while (items.length < TOTAL) items.push(generateProblem(level));
  return items;
}

function showScreen(name) {
  Object.entries(screens).forEach(([key, node]) => {
    if (!node) return;
    node.classList.toggle("hidden", key !== name);
  });
  document.body.classList.toggle("screen-game", name === "game");
  document.body.classList.toggle("screen-safe", name === "safe");
  document.body.classList.toggle("screen-kingdom", name === "kingdom");
  if (name !== "safe") {
    document.body.classList.remove("safe-fail", "safe-win");
  }
  if (name !== "kingdom" && kingdomTimerId) {
    clearInterval(kingdomTimerId);
    kingdomTimerId = 0;
  }
}

function applyTheme(level) {
  const cfg = levelCfg(isBattleLevel(level) ? level : level);
  document.body.dataset.theme = cfg.theme === "boss" ? "exam" : cfg.theme;
  const modeInfo = MODE_META[selectedMode] || MODE_META[MODE_BASIC];
  if (isBattleLevel(level)) {
    const bcfg = battleCfg(level);
    els.homeSubtitle.textContent = `${bcfg.name} «${modeInfo.name}»: ${bcfg.subtitle}`;
  } else if (selectedMode === MODE_UNITS) {
    els.homeSubtitle.textContent = `Режим «Меры»: ${modeInfo.levelDescs[(level || 1) - 1] || cfg.subtitle}`;
  } else if (selectedMode === MODE_CHAIN || selectedMode === MODE_MUL || selectedMode === MODE_DIV
    || selectedMode === MODE_ENG || selectedMode === MODE_CODE) {
    els.homeSubtitle.textContent = `Режим «${modeInfo.name}»: ${modeInfo.levelDescs[(level || 1) - 1] || cfg.subtitle}`;
  } else {
    els.homeSubtitle.textContent = cfg.subtitle;
  }
  const homeTitle = document.getElementById("homeTitle");
  if (homeTitle) {
    const tmeta = THEME_META[selectedTheme] || THEME_META[THEME_MATH];
    if (selectedTheme === THEME_MATH) homeTitle.textContent = "Счёт до 20";
    else if (selectedTheme === THEME_SAFE) homeTitle.textContent = "🛡️ Безопасность";
    else homeTitle.textContent = `${tmeta.icon} ${tmeta.name}`;
  }
  if (selectedTheme === THEME_SAFE && els.homeSubtitle) {
    els.homeSubtitle.textContent = "Обязательные 8-битные квесты: не качай всё подряд и не верь мошенникам.";
  }
  [els.balloon1, els.balloon2, els.balloon3].forEach((node, i) => {
    node.textContent = cfg.balloons[i];
  });
  document.querySelectorAll(".map-node, .level-card").forEach((card) => {
    card.classList.toggle("selected", Number(card.dataset.level) === selectedLevel);
  });
  paintMascots();
}

function lastRunMood() {
  const last = state.runs && state.runs[0];
  if (!last) return "happy";
  const mistakes = Math.max(0, (last.total || TOTAL) - (last.correct || 0));
  if (mistakes > 5) return "sad";
  if (mistakes >= 3) return "neutral";
  return "happy";
}

function lastRunContext() {
  const last = state.runs && state.runs[0];
  if (!last) return null;
  const mistakes = Math.max(0, (last.total || TOTAL) - (last.correct || 0));
  return {
    last,
    mistakes,
    correct: last.correct || 0,
    level: last.level || 1,
    timedOut: !!last.timedOut,
    grade: last.grade == null ? null : Number(last.grade),
    failed: !!last.failed,
  };
}

const MASCOT_TIPS = [
  { id: "start", when: (c) => !c, text: "Давай потренируемся вместе — я рядом!" },
  { id: "storm_grade", when: (c) => c && c.mistakes > 5, text: "Если постараемся получше — сможем наконец получить хорошую оценку!" },
  { id: "storm_calm", when: (c) => c && c.mistakes > 5, text: "Много ошибочек… Считай спокойнее — и следующий раз будет лучше." },
  { id: "mid_push", when: (c) => c && c.mistakes >= 3 && c.mistakes <= 5, text: "Почти! Ещё чуть внимательности — и результат станет крутым." },
  { id: "mid_retry", when: (c) => c && c.mistakes >= 3 && c.mistakes <= 5, text: "Не сдаёмся: один спокойный прогон — и уже заметно лучше." },
  { id: "near_perfect", when: (c) => c && c.mistakes > 0 && c.mistakes < 3, text: "Уже здорово! Ещё чуть — и будет идеально." },
  { id: "strong", when: (c) => c && c.correct >= 8 && c.mistakes <= 2, text: "Сильный результат! Ещё один такой — и уверенность вырастет." },
  { id: "perfect", when: (c) => c && c.mistakes === 0, text: "Вау, без ошибок! Так держать!" },
  { id: "perfect_next", when: (c) => c && c.mistakes === 0 && c.level < 5, text: "Десять из десяти — можно смело идти дальше!" },
  { id: "fail_retry", when: (c) => c && c.failed, text: "Пятёрка далеко, но тройка уже рядом. Давай пересдадим?" },
  { id: "grade3", when: (c) => c && c.grade === 3 && !c.failed, text: "Тройка есть! Если постараемся — дотянем до четвёрки." },
  { id: "grade4", when: (c) => c && c.grade === 4, text: "Хорошист! Чистый прогон — и пятёрка наша." },
  { id: "grade5", when: (c) => c && c.grade === 5, text: "Отличник! Я так рад за тебя!" },
  { id: "timeout", when: (c) => c && c.timedOut, text: "Время поджимало — потренируем скорость без лишней спешки." },
  { id: "exam_care", when: (c) => c && c.level === 5 && c.mistakes > 0, text: "На контрольной каждая ошибка дорога. Давай ещё разок внимательнее." },
];

let speechState = { runKey: "", tip: "", showHome: false, until: 0 };
let speechHideTimer = 0;

function lastRunSpeechKey(ctx) {
  if (!ctx) return "none";
  const r = ctx.last;
  return `${r.date || ""}|${r.correct}|${r.level}|${r.ms}|${r.grade ?? ""}|${r.timedOut ? 1 : 0}`;
}

function matchingMascotTips(ctx) {
  const matched = MASCOT_TIPS.filter((t) => t.when(ctx));
  return matched.length ? matched : MASCOT_TIPS.filter((t) => t.id === "start");
}

function ensureSpeechTip() {
  const ctx = lastRunContext();
  const key = lastRunSpeechKey(ctx);
  if (speechState.runKey === key && speechState.tip) return speechState;
  const pool = matchingMascotTips(ctx);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  speechState = {
    runKey: key,
    tip: pick.text,
    showHome: Math.random() < 0.72,
    until: Date.now() + 5200,
  };
  return speechState;
}

function speechBubbleHtml(text) {
  return `<div class="mascot-bubble" role="status"><span class="mascot-bubble-text">${escapeHtml(text)}</span></div>`;
}

function scheduleSpeechHide(until) {
  clearTimeout(speechHideTimer);
  const left = Math.max(0, until - Date.now());
  speechHideTimer = setTimeout(() => {
    document.querySelectorAll(".mascot-bubble").forEach((n) => n.classList.add("fade-out"));
    setTimeout(() => {
      document.querySelectorAll(".mascot-bubble").forEach((n) => n.remove());
      document.querySelectorAll(".mascot-stage").forEach((s) => s.classList.remove("has-speech"));
    }, 360);
  }, left);
}

function mouthPath(mood, form) {
  if (form === "hedgehog") {
    if (mood === "happy") return "M62 116 Q80 138 98 116";
    if (mood === "sad") return "M62 130 Q80 108 98 130";
    return "M64 121 H96";
  }
  if (mood === "happy") return "M60 114 Q80 140 100 114";
  if (mood === "sad") return "M60 130 Q80 106 100 130";
  return "M62 120 H98";
}

function eyeExtras(mood) {
  if (mood === "sad") {
    return `
      <path d="M52 70 Q58 66 64 70" fill="none" stroke="#3D3A4A" stroke-width="3" stroke-linecap="round"/>
      <path d="M96 70 Q102 66 108 70" fill="none" stroke="#3D3A4A" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="70" cy="96" rx="3" ry="5" fill="#7EB6FF" opacity=".85"/>
      <ellipse cx="108" cy="96" rx="3" ry="5" fill="#7EB6FF" opacity=".7"/>
    `;
  }
  if (mood === "happy") {
    return `
      <path d="M52 72 Q58 68 64 72" fill="none" stroke="#3D3A4A" stroke-width="2.5" stroke-linecap="round" opacity=".35"/>
      <path d="M96 72 Q102 68 108 72" fill="none" stroke="#3D3A4A" stroke-width="2.5" stroke-linecap="round" opacity=".35"/>
    `;
  }
  return "";
}

function hatSVG(id) {
  if (id === "party") {
    return `<polygon points="80,-6 56,36 104,36" fill="#ff5d7a"/><circle cx="80" cy="-6" r="7" fill="#ffd166"/>`;
  }
  if (id === "crown") {
    return `<path d="M50 34 L58 14 L70 30 L80 8 L90 30 L102 14 L110 34 Z" fill="#ffd166" stroke="#d48910" stroke-width="2"/>`;
  }
  if (id === "wizard") {
    return `<polygon points="80,-10 58,38 102,38" fill="#6d5a8a"/><circle cx="80" cy="-10" r="6" fill="#ffd166"/>`;
  }
  if (id === "hero") {
    return `<path d="M46 38 Q80 4 114 38 L114 54 Q80 46 46 54 Z" fill="#7a8fa0"/><rect x="70" y="28" width="20" height="8" rx="3" fill="#cfe4ff"/>`;
  }
  if (id === "knightHelm") {
    return `<path d="M48 36 Q80 2 112 36 L112 56 Q80 48 48 56 Z" fill="#8a9aab"/><rect x="62" y="40" width="36" height="10" rx="3" fill="#2d3640" opacity=".55"/>`;
  }
  if (id === "gnomeCap") {
    return `<polygon points="80,-8 54,40 106,40" fill="#e76f51"/><ellipse cx="80" cy="40" rx="28" ry="6" fill="#c45c26"/>`;
  }
  if (id === "mapleLeaf") {
    return `<text x="80" y="28" text-anchor="middle" font-size="28">🍁</text>`;
  }
  // остальные — эмодзи из каталога
  const hat = HATS[id];
  if (hat && hat.icon && id !== "none") {
    return `<text x="80" y="26" text-anchor="middle" font-size="26">${hat.icon}</text>`;
  }
  return "";
}

function relicSVG(id) {
  if (id === "sproutBadge") return `<text x="128" y="132" text-anchor="middle" font-size="16">🌱</text>`;
  if (id === "pencilPin") return `<text x="128" y="36" text-anchor="middle" font-size="15">✏️</text>`;
  if (id === "bookCharm") return `<rect x="118" y="118" width="22" height="16" rx="2" fill="#3d6ea8"/><text x="129" y="130" text-anchor="middle" font-size="8" fill="#fff6c2" font-weight="900">+</text>`;
  if (id === "starMedallion") return `<circle cx="80" cy="128" r="10" fill="#ffd166" stroke="#d48910" stroke-width="2"/><text x="80" y="132" text-anchor="middle" font-size="10">★</text>`;
  if (id === "shineOrb") return `<circle cx="80" cy="86" r="58" fill="none" stroke="#ffd166" stroke-width="2.5" opacity=".5"/><circle cx="80" cy="86" r="64" fill="none" stroke="#fff6c2" stroke-width="1.5" opacity=".35"/>`;
  if (id === "masterRing") return `<circle cx="108" cy="118" r="9" fill="none" stroke="#c084fc" stroke-width="3"/><circle cx="108" cy="118" r="4" fill="#ffd166"/>`;
  if (id === "sageOrb") return `<circle cx="30" cy="100" r="12" fill="#7b5cff" opacity=".55"/><circle cx="28" cy="96" r="3" fill="#fff" opacity=".6"/>`;
  if (id === "champCup") return `<text x="80" y="8" text-anchor="middle" font-size="18">🏆</text>`;
  if (id === "knightShield") return `<path d="M128 20 L146 28 L146 48 Q137 62 128 68 Q119 62 110 48 L110 28 Z" fill="#7a8fa0" stroke="#445566" stroke-width="2"/><text x="128" y="48" text-anchor="middle" font-size="10" fill="#fff">+</text>`;
  if (id === "heroFlame") return `<path d="M18 70 Q8 50 22 40 Q16 55 28 62 Q34 48 40 58 Q48 70 30 78 Z" fill="#ff7a59" opacity=".85"/>`;
  if (id === "legendSeal") return `<circle cx="126" cy="24" r="12" fill="#ffd24a"/><text x="126" y="28" text-anchor="middle" font-size="11" font-weight="900">L</text>`;
  if (id === "archCrown") return `<path d="M48 20 L56 4 L68 18 L80 0 L92 18 L104 4 L112 20 Z" fill="#ffd166" stroke="#d48910" stroke-width="2"/><circle cx="80" cy="8" r="3" fill="#fff"/>`;
  return "";
}

function skyDecorHtml(id) {
  if (!id || id === "none") return "";
  const stars = (n, cls = "sky-star") => Array.from({ length: n }, (_, i) => `<span class="${cls} s${(i % 8) + 1}"></span>`).join("");
  const clouds = (n) => Array.from({ length: n }, (_, i) => `<span class="sky-puff p${(i % 5) + 1}"></span>`).join("");
  if (id === "softClouds") return clouds(5);
  if (id === "floatingStars") return stars(10);
  if (id === "softMoon") return `<span class="sky-moon m1"></span>`;
  if (id === "nightSky") return `<span class="sky-moon m1"></span>${stars(12)}`;
  if (id === "auroraClouds") return `<span class="sky-aurora a1"></span><span class="sky-aurora a2"></span>${clouds(3)}`;
  if (id === "goldenStars") return stars(14, "sky-star gold");
  if (id === "twinMoons") return `<span class="sky-moon m1"></span><span class="sky-moon m2"></span>${stars(6)}`;
  if (id === "nebula") return `<span class="sky-nebula n1"></span><span class="sky-nebula n2"></span>${stars(8)}`;
  if (id === "meteorShowers") return `${stars(6)}<span class="sky-meteor me1"></span><span class="sky-meteor me2"></span><span class="sky-meteor me3"></span>`;
  if (id === "crystalSky") return `${stars(8, "sky-star crystal")}<span class="sky-crystal c1"></span><span class="sky-crystal c2"></span><span class="sky-crystal c3"></span>`;
  if (id === "archmageSky") {
    return `<span class="sky-moon m1"></span><span class="sky-aurora a1"></span>${clouds(3)}${stars(10)}<span class="sky-meteor me1"></span><span class="sky-crystal c1"></span>`;
  }
  if (id === "secretNight") {
    return `<span class="sky-moon m1"></span>${stars(16)}<span class="sky-meteor me1"></span><span class="sky-meteor me2"></span><span class="sky-nebula n1"></span>`;
  }
  return "";
}

function applySkyDecor() {
  const skyId = (state.shop && SKIES[state.shop.sky] && state.shop.skies.includes(state.shop.sky))
    ? state.shop.sky
    : "none";
  document.body.dataset.sky = skyId;
  const el = els.skyDecor || document.getElementById("skyDecor");
  if (el) el.innerHTML = skyDecorHtml(skyId);
}

function unlockSkiesByRank() {
  let changed = false;
  Object.values(SKIES).forEach((sky) => {
    if (sky.rankMin >= 99999) return;
    if (state.stars >= sky.rankMin && !state.shop.skies.includes(sky.id)) {
      state.shop.skies.push(sky.id);
      changed = true;
    }
  });
  return changed;
}

function mascotMarkup(size, mood = "neutral", look = null) {
  const shop = look || state.shop || emptyShop();
  const eq = shop.equip || emptyEquip();
  const skin = SKINS[shop.skin] || SKINS.honey;
  const form = skin.form || "blob";
  const toys = look ? [] : (eq.accessory || shop.toysOn || []);
  const hatId = look ? (look.hat || "none") : (eq.head || shop.hat || "none");
  const relicId = look ? (look.relic || "none") : (eq.relic || shop.relic || "none");
  const bodyId = look ? "none" : (eq.body || "none");
  const weaponId = look ? "none" : (eq.weapon || "none");
  const moodKey = mood === true ? "happy" : mood === false ? "neutral" : mood;
  const mouth = mouthPath(moodKey, form);
  const brows = eyeExtras(moodKey);
  const bow = toys.includes("bow")
    ? `<ellipse cx="38" cy="34" rx="11" ry="7" fill="#ff5d7a"/><ellipse cx="52" cy="34" rx="11" ry="7" fill="#ff5d7a"/><circle cx="45" cy="36" r="4" fill="#fff"/>`
    : "";
  const glasses = toys.includes("glasses") && !toys.includes("shades")
    ? `<g fill="none" stroke="#3D3A4A" stroke-width="3"><circle cx="62" cy="82" r="13"/><circle cx="98" cy="82" r="13"/><path d="M75 82 H85"/></g>`
    : "";
  const shades = toys.includes("shades")
    ? `<g>
        <path d="M48 78 H70" stroke="#111" stroke-width="3" stroke-linecap="round"/>
        <path d="M90 78 H112" stroke="#111" stroke-width="3" stroke-linecap="round"/>
        <path d="M70 80 H90" stroke="#111" stroke-width="3"/>
        <ellipse cx="59" cy="84" rx="14" ry="10" fill="#111" opacity=".92"/>
        <ellipse cx="101" cy="84" rx="14" ry="10" fill="#111" opacity=".92"/>
        <ellipse cx="54" cy="81" rx="4" ry="2.5" fill="#fff" opacity=".18"/>
        <ellipse cx="96" cy="81" rx="4" ry="2.5" fill="#fff" opacity=".18"/>
      </g>`
    : "";

  let body = "";
  if (form === "cat") {
    body = `
      <path d="M32 48 L48 18 L58 52 Z" fill="${skin.body}"/>
      <path d="M128 48 L112 18 L102 52 Z" fill="${skin.body}"/>
      <path d="M40 30 L48 18 L52 34 Z" fill="${skin.inner}"/>
      <path d="M120 30 L112 18 L108 34 Z" fill="${skin.inner}"/>
      <circle cx="80" cy="86" r="52" fill="${skin.body}"/>
      ${brows}
      <ellipse cx="62" cy="82" rx="7" ry="11" fill="#3D3A4A"/>
      <ellipse cx="98" cy="82" rx="7" ry="11" fill="#3D3A4A"/>
      <circle cx="64" cy="78" r="2.5" fill="#fff"/>
      <circle cx="100" cy="78" r="2.5" fill="#fff"/>
      <ellipse cx="80" cy="100" rx="8" ry="5" fill="${skin.inner}"/>
      <path d="M28 100 H52 M28 108 H50 M108 100 H132 M110 108 H132" stroke="#3D3A4A" stroke-width="2" stroke-linecap="round"/>
      ${bow}
      <path d="${mouth}" fill="none" stroke="#3D3A4A" stroke-width="5" stroke-linecap="round"/>
    `;
  } else if (form === "hedgehog") {
    body = `
      <path d="M40 70 L28 40 L50 58 Z" fill="${skin.inner}"/>
      <path d="M55 52 L48 22 L68 48 Z" fill="${skin.inner}"/>
      <path d="M80 46 L80 14 L92 46 Z" fill="${skin.inner}"/>
      <path d="M105 52 L112 22 L92 48 Z" fill="${skin.inner}"/>
      <path d="M120 70 L132 40 L110 58 Z" fill="${skin.inner}"/>
      <ellipse cx="80" cy="90" rx="54" ry="48" fill="${skin.body}"/>
      <circle cx="48" cy="70" r="14" fill="${skin.body}"/>
      <circle cx="112" cy="70" r="14" fill="${skin.body}"/>
      <circle cx="48" cy="70" r="6" fill="${skin.inner}"/>
      <circle cx="112" cy="70" r="6" fill="${skin.inner}"/>
      ${brows}
      <ellipse cx="62" cy="88" rx="7" ry="9" fill="#3D3A4A"/>
      <ellipse cx="98" cy="88" rx="7" ry="9" fill="#3D3A4A"/>
      <circle cx="64" cy="85" r="2.5" fill="#fff"/>
      <circle cx="100" cy="85" r="2.5" fill="#fff"/>
      <ellipse cx="80" cy="104" rx="9" ry="6" fill="#F07167"/>
      ${bow}
      <path d="${mouth}" fill="none" stroke="#3D3A4A" stroke-width="5" stroke-linecap="round"/>
    `;
  } else {
    body = `
      <circle cx="80" cy="86" r="52" fill="${skin.body}"/>
      <circle cx="48" cy="42" r="18" fill="${skin.body}"/>
      <circle cx="112" cy="42" r="18" fill="${skin.body}"/>
      <circle cx="48" cy="42" r="8" fill="${skin.inner}"/>
      <circle cx="112" cy="42" r="8" fill="${skin.inner}"/>
      ${bow}
      ${brows}
      <ellipse cx="62" cy="82" rx="8" ry="10" fill="#3D3A4A"/>
      <ellipse cx="98" cy="82" rx="8" ry="10" fill="#3D3A4A"/>
      <circle cx="65" cy="79" r="3" fill="#fff"/>
      <circle cx="101" cy="79" r="3" fill="#fff"/>
      ${glasses}
      ${shades}
      <ellipse cx="80" cy="102" rx="10" ry="7" fill="#F07167"/>
      <path d="${mouth}" fill="none" stroke="#3D3A4A" stroke-width="5" stroke-linecap="round"/>
    `;
  }

  // очки/тёмные очки и для зверьков
  if ((form === "cat" || form === "hedgehog") && (glasses || shades)) {
    body += glasses + shades;
  }

  const bodyCape = (bodyId === "clothVest" || bodyId === "hoodie")
    ? `<path d="M40 100 Q80 130 120 100 L110 140 Q80 155 50 140 Z" fill="#8ecae6" opacity=".85"/>`
    : (bodyId === "leatherVest" || bodyId === "ironShield" || bodyId === "scaleMail")
      ? `<path d="M42 95 Q80 125 118 95 L112 138 Q80 152 48 138 Z" fill="#c4a484"/><path d="M70 100 H90 V130 H70 Z" fill="#8d6e63"/>`
      : (bodyId === "mageCloak" || bodyId === "cape" || bodyId === "kimono")
        ? `<path d="M36 90 Q80 140 124 90 L118 150 Q80 168 42 150 Z" fill="#7b5ea7" opacity=".9"/><circle cx="80" cy="120" r="6" fill="#ffd166"/>`
        : (bodyId === "sweater" || bodyId === "tshirt")
          ? `<path d="M48 108 Q80 122 112 108 L108 142 Q80 150 52 142 Z" fill="#ef476f" opacity=".8"/>`
          : (bodyId === "raincoat")
            ? `<path d="M40 100 Q80 128 120 100 L114 145 Q80 158 46 145 Z" fill="#4cc9f0" opacity=".85"/>`
            : (bodyId === "pajamas")
              ? `<path d="M48 108 Q80 122 112 108 L108 142 Q80 150 52 142 Z" fill="#b8b8ff" opacity=".85"/>`
              : (bodyId === "dress")
                ? `<path d="M55 105 L105 105 L118 150 Q80 160 42 150 Z" fill="#f72585" opacity=".85"/>`
                : (bodyId === "tuxedo")
                  ? `<path d="M48 100 H112 L108 145 H52 Z" fill="#2b2d42"/><path d="M72 100 L80 130 L88 100" fill="#fff"/>`
                  : (bodyId === "apron" || bodyId === "overalls")
                    ? `<path d="M50 105 H110 V145 H50 Z" fill="#ffd166" opacity=".9"/><path d="M70 105 V145 M90 105 V145" stroke="#e9c46a" stroke-width="3"/>`
                    : "";
  const weaponIcon = weaponId && weaponId !== "none" && WEAPONS[weaponId]
    ? `<text x="132" y="110" font-size="28">${WEAPONS[weaponId].icon}</text>`
    : "";

  return `<svg viewBox="0 -12 160 172" width="${size}" height="${size}">
    ${relicSVG(relicId)}
    ${hatSVG(hatId)}
    <ellipse cx="80" cy="145" rx="42" ry="8" fill="#000" opacity=".08"/>
    ${body}
    ${bodyCape}
    ${weaponIcon}
  </svg>`;
}

function boardAvatarHtml(nick, skinId, hatId) {
  const look = { skin: SKINS[skinId] ? skinId : "honey", hat: HATS[hatId] ? hatId : "none", toysOn: [] };
  return `<span class="board-avatar" title="${escapeHtml(nick)}">${mascotMarkup(40, "neutral", look)}</span>`;
}

function stormOverlayHtml() {
  return `<div class="mood-storm" aria-hidden="true">
    <span class="storm-cloud c-a"></span>
    <span class="storm-cloud c-b"></span>
    <span class="storm-bolt b1"></span>
    <span class="storm-bolt b2"></span>
    <span class="storm-two t1">2</span>
    <span class="storm-two t2">2</span>
    <span class="storm-two t3">2</span>
    <span class="storm-two t4">2</span>
    <span class="storm-rain"></span>
  </div>`;
}

function toyNode(id) {
  const t = document.createElement("div");
  t.className = `toy ${id}`;
  if (id === "wand") {
    t.innerHTML = `
      <span class="wand-shaft"></span>
      <span class="wand-band"></span>
      <span class="wand-star" aria-hidden="true"></span>
      <span class="wand-spark a"></span>
      <span class="wand-spark b"></span>
      <span class="wand-spark c"></span>
    `;
    return t;
  }
  if (id === "mathbook" || id === "fiveplus") {
    t.setAttribute("aria-hidden", "true");
    return t;
  }
  t.textContent = TOYS[id].icon;
  return t;
}

function paintStage(stageId, mascotEl, size, mood, speechText = "") {
  if (!mascotEl) return;
  const moodKey = mood === true ? "happy" : mood === false ? "neutral" : mood;
  mascotEl.innerHTML = mascotMarkup(size, moodKey);
  mascotEl.classList.toggle("mood-sad", moodKey === "sad");
  mascotEl.classList.toggle("mood-happy", moodKey === "happy");
  mascotEl.classList.toggle("mood-neutral", moodKey === "neutral");
  const stage = document.getElementById(stageId);
  if (!stage) return;
  stage.querySelectorAll(".toy, .mood-storm, .mascot-bubble").forEach((n) => n.remove());
  stage.classList.toggle("has-storm", moodKey === "sad");
  stage.classList.toggle("has-speech", !!speechText);
  if (moodKey === "sad") {
    stage.insertAdjacentHTML("beforeend", stormOverlayHtml());
  }
  const acc = ((state.shop.equip && state.shop.equip.accessory) || state.shop.toysOn || []);
  acc.forEach((id) => {
    if (!TOYS[id] || TOYS[id].svg) return;
    stage.appendChild(toyNode(id));
  });
  if (speechText) {
    stage.insertAdjacentHTML("beforeend", speechBubbleHtml(speechText));
  }
}

function paintMascots() {
  ensureCare();
  const mood = displayMascotMood();
  const speech = ensureSpeechTip();
  const live = Date.now() < speech.until;
  let homeTalk = live && speech.showHome ? speech.tip : "";
  if (!homeTalk) {
    homeTalk = careNeedSpeech();
  }
  const resultTalk = live ? speech.tip : "";
  paintStage("homeStage", els.homeMascot, 140, mood, homeTalk);
  paintStage("gameStage", els.gameMascot, 88, mood === "sad" ? "neutral" : mood, "");
  paintStage("resultStage", els.resultMascot, 120, mood, resultTalk);
  paintStage("shopStage", els.shopMascot, 120, mood === "sad" ? "neutral" : mood, "");
  if (homeTalk || resultTalk) scheduleSpeechHide(speech.until || (Date.now() + 6000));
}

function achProgress(a) {
  let p = { current: 0, target: 1 };
  try {
    p = a.progress(state) || p;
  } catch (err) {
    console.warn("ach progress failed", a && a.id, err);
  }
  let unlocked = state.achievements.includes(a.id);
  if (!unlocked) {
    try {
      unlocked = !!a.check(state);
    } catch (err) {
      /* ignore */
    }
  }
  const shown = unlocked ? Math.max(p.current, p.target) : Math.max(0, p.current);
  const pct = unlocked ? 100 : Math.min(100, Math.round((shown / Math.max(1, p.target)) * 100));
  return {
    current: Math.min(shown, p.target),
    raw: p.current,
    target: p.target,
    pct,
    unlocked,
  };
}

function achIconHtml(a, sizeClass = "") {
  if (a.gold || a.icon === "67") return `<span class="ico-67 ${sizeClass}">6 7</span>`;
  if (a.icon === "🪙") return '<span class="coin sm"></span>';
  return a.icon;
}

function unlockedCount() {
  return ACHIEVEMENTS.filter((a) => achProgress(a).unlocked).length;
}

function answersReviewHtml(answers) {
  if (!answers || !answers.length) {
    return `<p class="hist-miss">Примеры этой сессии не сохранились.</p>`;
  }
  return `<ul class="hist-ex">${answers.map((a, i) => {
    const cls = a.ok ? "ok" : "bad";
    const kid = a.given == null || a.given === "" ? "—" : a.given;
    const mark = a.ok ? "верно" : `нужно ${a.answer}`;
    const expr = a.text
      ? escapeHtml(a.text.replace("?", String(kid))).replace(/\n/g, "<br>")
      : `${a.a} ${a.op} ${a.b} = ${kid}`;
    return `<li class="${cls}">
      <span class="n">${i + 1}.</span>
      <span class="ex">${expr}</span>
      <span class="mark">${mark}</span>
    </li>`;
  }).join("")}</ul>`;
}

function historyItemHtml(r, detailed) {
  const mode = r.mode || MODE_BASIC;
  const lvl = levelCfg(r.level || 1, mode) || { name: "Уровень" };
  const modeInfo = MODE_META[mode] || MODE_META[MODE_BASIC];
  const battleName = isBattleLevel(r.level) ? (battleCfg(r.level).name || "Бой") : null;
  const lvlName = battleName
    || modeInfo.levelNames[(r.level || 1) - 1]
    || lvl.name
    || "Уровень";
  const extra = r.timedOut ? " · время вышло" : "";
  const gradeBit = r.grade != null
    ? ` · <span class="hist-grade g${r.grade}${r.failed ? " fail" : ""}">${r.failed ? "2 провал" : r.grade}${r.forgive ? ` · читер×${r.forgive}` : ""}</span>`
    : "";
  const coins = detailed && r.coins != null
    ? ` · <span class="coin sm"></span> +${r.coins}`
    : "";
  const answers = r.answers || [];
  const mistakes = answers.filter((a) => !a.ok).length;
  const errLabel = answers.length
    ? (mistakes ? `ошибок: ${mistakes}` : "без ошибок")
    : "примеры не записаны";
  return `<li>
    <details class="hist-fold">
      <summary>
        <div class="hist-top">
          <span><span class="hist-level l${Math.min(r.level || 1, 6)}">${lvlName}${modeLabelShort(mode)}</span>${r.correct}/10${gradeBit}</span>
          <span>${formatTime(r.ms)}${extra}</span>
        </div>
        <div class="hist-start">Старт: ${formatStamp(startIsoOf(r))}</div>
        ${detailed ? `<div class="hist-extra">Длительность: ${formatTime(r.ms)}${coins}</div>` : ""}
        <div class="hist-more ${mistakes || r.failed ? "has-err" : ""}">${errLabel} · развернуть</div>
      </summary>
      ${answersReviewHtml(answers)}
    </details>
  </li>`;
}

function renderNickCard(forceEdit = false) {
  const ready = isNickOk(playerNick) && !forceEdit;
  if (els.nickSetup) els.nickSetup.classList.toggle("hidden", ready);
  if (els.nickReady) els.nickReady.classList.toggle("hidden", !ready);
  if (els.nickDisplay) els.nickDisplay.textContent = playerNick;
  if (els.nickInput && !ready && document.activeElement !== els.nickInput) {
    els.nickInput.value = playerNick;
  }
}

function renderThemeTabs() {
  const root = document.getElementById("themeTabs");
  if (!root) return;
  root.innerHTML = [THEME_MATH, THEME_ENG, THEME_CODE, THEME_SAFE].map((id) => {
    const meta = THEME_META[id];
    const on = selectedTheme === id ? " selected" : "";
    const prof = professionFor(id);
    const badge = prof.current ? `<span class="theme-prof-ico" title="${prof.current.name}">${prof.current.icon}</span>` : "";
    const must = id === THEME_SAFE && !isSafeAllCleared() ? '<span class="theme-must">!</span>' : "";
    return `<button type="button" class="filter-btn theme-tab${on}${id === THEME_SAFE ? " theme-safe" : ""}" data-theme="${id}">
      <span class="theme-ico">${meta.icon}</span> ${meta.name}${badge}${must}
    </button>`;
  }).join("");
}

function renderProfessions() {
  const root = document.getElementById("professionRow");
  if (!root) return;
  const themes = [THEME_MATH, THEME_ENG, THEME_CODE, THEME_SAFE];
  root.innerHTML = themes.map((id) => {
    const meta = THEME_META[id];
    const info = professionFor(id);
    const cur = info.current;
    const nxt = info.next;
    const title = cur ? cur.name : "Новичок";
    const ico = cur ? cur.icon : "🌱";
    const prog = nxt
      ? `${info.score}/${nxt.need} → ${nxt.name}`
      : (cur ? "Максимум!" : (id === THEME_SAFE ? "Пройди квесты" : "Пройди 10/10"));
    const on = selectedTheme === id ? " on" : "";
    return `<button type="button" class="prof-chip${on}" data-theme="${id}" title="${meta.blurb}">
      <span class="prof-ico">${meta.icon}${ico}</span>
      <span class="prof-text"><strong>${meta.name}: ${title}</strong><small>${prog}</small></span>
    </button>`;
  }).join("");
}

function selectTheme(themeId) {
  if (![THEME_MATH, THEME_ENG, THEME_CODE, THEME_SAFE].includes(themeId)) return;
  if (selectedTheme === themeId) return;
  selectedTheme = themeId;
  saveTheme();
  const modes = THEME_META[themeId].modes;
  if (!modes.includes(selectedMode)) {
    selectedMode = modes[0];
    saveMode();
  }
  if (themeId !== THEME_SAFE) {
    selectedLevel = maxOpenLevel();
    state.lastLevel = selectedLevel;
  }
  saveState();
  renderHome();
}

function renderHome() {
  if (selectedMode === MODE_MUL && (selectedLevel === SECRET_LEVEL || (selectedLevel > 5 && !isBattleLevel(selectedLevel)))) {
    selectedLevel = maxOpenLevel();
  }
  if (selectedMode === MODE_DIV && (selectedLevel === SECRET_LEVEL || (selectedLevel > 5 && !isBattleLevel(selectedLevel)))) {
    selectedLevel = maxOpenLevel();
  }
  if ((selectedMode === MODE_ENG || selectedMode === MODE_CODE)
    && (selectedLevel === SECRET_LEVEL || (selectedLevel > 5 && !isBattleLevel(selectedLevel)))) {
    selectedLevel = maxOpenLevel();
  }
  if (!isBattleLevel(selectedLevel) && !isLevelOpen(selectedLevel)) selectedLevel = maxOpenLevel();
  if (unlockSkiesByRank()) saveState();
  applyTheme(selectedLevel);
  applySkyDecor();
  renderNickCard();
  updateSyncHint();
  els.totalStars.textContent = String(state.stars);
  els.totalCoins.textContent = String(state.coins);
  const rank = rankFor(state.stars);
  const idx = rankIndexOf(state.stars);
  els.rankName.textContent = rank.name;
  els.rankRow.innerHTML = RANKS.map((r, i) => {
    const cls = i === idx ? "on" : i < idx ? "have" : "";
    return `<span class="rank-medal r${i} ${cls}" title="${r.name}">${r.icon}</span>`;
  }).join("");
  const xp = xpInfo();
  els.xpLabel.textContent = xp.label;
  els.xpFill.style.width = `${xp.pct}%`;
  renderThemeTabs();
  renderProfessions();
  const modeInfo = MODE_META[selectedMode] || MODE_META[MODE_BASIC];
  const modeTabs = document.getElementById("modeTabs");
  if (modeTabs) modeTabs.classList.toggle("hidden", selectedTheme !== THEME_MATH);
  const isSafeTheme = selectedTheme === THEME_SAFE;
  const levelsEl = document.getElementById("levels");
  if (levelsEl) levelsEl.classList.toggle("hidden", isSafeTheme);
  if (els.startBtn) els.startBtn.classList.toggle("hidden", isSafeTheme);
  renderSafeBanner();
  renderSafeHub();
  // тихо не собираем — игрок сам жмёт в королевстве

  if (isSafeTheme) {
    els.unlockHint.textContent = isSafeAllCleared()
      ? "Все квесты безопасности пройдены — ты кибер-герой!"
      : `Обязательные квесты: защити себя ${safeClearedCount()}/${SAFE_SCENARIOS.length}. Жми сценарий!`;
  } else if (selectedMode === MODE_UNITS) {
    if (!isLevelOpen(1)) {
      els.unlockHint.textContent = "Меры откроются после 10/10 на «Сложный» (База или 2 действия).";
    } else if (!isLevelOpen(2)) {
      els.unlockHint.textContent = "10/10 на «Конвертация» откроет «Сравнение».";
    } else {
      els.unlockHint.textContent = "Оба уровня мер открыты. Перед стартом — таблица на 10 сек.";
    }
  } else if (selectedMode === MODE_MUL) {
    if (!isLevelOpen(2)) {
      els.unlockHint.textContent = "Сначала «Суть»: пойми, что умножение — это сложение одинаковых.";
    } else if (!isLevelOpen(5)) {
      const next = [2, 3, 4, 5].find((id) => !isLevelOpen(id));
      const prev = next - 1;
      els.unlockHint.textContent = `10/10 на «${modeInfo.levelNames[prev - 1]}» откроет «${modeInfo.levelNames[next - 1]}»`;
    } else if (!isBossOpen(7)) {
      els.unlockHint.textContent = "Все этапы умножения открыты. Пройди их на 10/10 — откроется Бой 1.";
    } else if (!isBossOpen(9)) {
      els.unlockHint.textContent = "Бои открыты — побеждай Бой 1 → 2 → 3!";
    } else {
      els.unlockHint.textContent = "Лестница умножения и все бои пройдены!";
    }
  } else if (selectedMode === MODE_DIV) {
    if (!isLevelOpen(2)) {
      els.unlockHint.textContent = "Сначала «Суть»: деление — обратное умножению.";
    } else if (!isLevelOpen(5)) {
      const next = [2, 3, 4, 5].find((id) => !isLevelOpen(id));
      const prev = next - 1;
      els.unlockHint.textContent = `10/10 на «${modeInfo.levelNames[prev - 1]}» откроет «${modeInfo.levelNames[next - 1]}»`;
    } else if (!isBossOpen(7)) {
      els.unlockHint.textContent = "Все этапы деления открыты. Пройди их на 10/10 — откроется Бой 1.";
    } else if (!isBossOpen(9)) {
      els.unlockHint.textContent = "Бои открыты — побеждай Бой 1 → 2 → 3!";
    } else {
      els.unlockHint.textContent = "Лестница деления и все бои пройдены!";
    }
  } else if (selectedMode === MODE_ENG || selectedMode === MODE_CODE) {
    if (!isLevelOpen(2)) {
      els.unlockHint.textContent = `Начни с «${modeInfo.levelNames[0]}» — 10/10 откроет следующий этап.`;
    } else if (!isLevelOpen(5)) {
      const next = [2, 3, 4, 5].find((id) => !isLevelOpen(id));
      const prev = next - 1;
      els.unlockHint.textContent = `10/10 на «${modeInfo.levelNames[prev - 1]}» откроет «${modeInfo.levelNames[next - 1]}»`;
    } else {
      const prof = professionFor(themeOfMode(selectedMode));
      const tip = prof.next
        ? `Лестница открыта. Профессия: ${prof.current ? prof.current.name : "Новичок"} → ${prof.next.name} (${prof.score}/${prof.next.need}).`
        : `Лестница «${modeInfo.name}» пройдена! Профессия: ${prof.current ? prof.current.name : "—"}.`;
      els.unlockHint.textContent = tip;
    }
  } else if (!isLevelOpen(2)) {
    els.unlockHint.textContent = `10/10 на «${modeInfo.levelNames[0]}» откроет «${modeInfo.levelNames[1]}»`;
  } else if (!isLevelOpen(3)) {
    els.unlockHint.textContent = `10/10 на «${modeInfo.levelNames[1]}» откроет «${modeInfo.levelNames[2]}»`;
  } else if (!isLevelOpen(4)) {
    els.unlockHint.textContent = `10/10 на «${modeInfo.levelNames[2]}» откроет «${modeInfo.levelNames[3]}»`;
  } else if (!isLevelOpen(5)) {
    els.unlockHint.textContent = `10/10 на «${modeInfo.levelNames[3]}» откроет «${modeInfo.levelNames[4]}»`;
  } else if (!isLevelOpen(SECRET_LEVEL)) {
    const gate = secretGateProgress();
    els.unlockHint.textContent = `Секрет: пройди все режимы 10/10 быстрее 40 сек (${gate.current}/${gate.target}).`;
  } else {
    els.unlockHint.textContent = `Все уровни «${modeInfo.unlockText}» открыты — включая секрет!`;
  }
  if (!isSafeTheme) renderLevels();
  renderDailyBox();

  const done = unlockedCount();
  const total = ACHIEVEMENTS.length;
  els.homeAchCount.textContent = `${done}/${total}`;
  els.homeAchFill.style.width = `${Math.round((done / total) * 100)}%`;
  const unlockedAchs = ACHIEVEMENTS.filter((a) => achProgress(a).unlocked);
  const lockedAchs = ACHIEVEMENTS.filter((a) => !achProgress(a).unlocked);
  const preview = [
    ...unlockedAchs.slice(0, Math.min(5, HOME_ACH_PREVIEW)),
    ...lockedAchs.slice(0, Math.max(0, HOME_ACH_PREVIEW - Math.min(unlockedAchs.length, 5))),
  ].slice(0, HOME_ACH_PREVIEW);
  els.achGrid.innerHTML = preview.map((a) => {
    const p = achProgress(a);
    return `<div class="ach ${p.unlocked ? "unlocked" : "locked"}${a.coop ? " coop" : ""}${a.gold ? " gold-meme" : ""}" data-open="gallery" data-ach="${a.id}" title="${a.desc}">
      <span class="ico">${achIconHtml(a)}</span>
      <span class="ttl">${a.coop ? "🤝 " : ""}${a.name}</span>
      <div class="mini-bar"><i style="width:${p.pct}%"></i></div>
    </div>`;
  }).join("") + (total > HOME_ACH_PREVIEW
    ? `<div class="ach more-ach" data-open="gallery" title="Открыть галерею"><span class="ico">…</span><span class="ttl">Ещё ${total - preview.length}</span><div class="mini-bar"><i style="width:${Math.round((done / total) * 100)}%"></i></div></div>`
    : "");

  els.homeHistCount.textContent = String(state.runs.length);
  if (!state.runs.length) {
    els.historyList.innerHTML = `<li class="empty">Пока нет сессий — нажми Старт!</li>`;
  } else {
    els.historyList.innerHTML = state.runs.slice(0, 3).map((r) => historyItemHtml(r, false)).join("");
  }

  renderGallery();
  renderSessions();
  renderPetCare();
  paintMascots();
  startPetCareTimer();
}

function renderGallery() {
  const done = unlockedCount();
  const total = ACHIEVEMENTS.length;
  els.galleryCount.textContent = `${done}/${total}`;
  els.galleryFill.style.width = `${Math.round((done / total) * 100)}%`;
  els.galleryList.innerHTML = ACHIEVEMENTS.map((a) => {
    const p = achProgress(a);
    const status = p.unlocked ? `<span class="done-tag">получено</span>` : `<span>${p.current} / ${p.target}</span>`;
    return `<article class="gallery-item ${p.unlocked ? "unlocked" : "locked"}${a.coop ? " coop" : ""}${a.gold ? " gold-meme" : ""}" data-ach="${a.id}">
      <div class="g-ico">${achIconHtml(a)}</div>
      <div>
        <div class="g-name">${a.name}${a.coop ? ' <span class="coop-tag">кооп</span>' : ""}${a.gold ? ' <span class="coop-tag">пасхалка</span>' : ""}</div>
        <div class="g-desc">${a.desc}</div>
      </div>
      <div class="g-bar">
        <div class="g-meta">${status}<span>${p.pct}%</span></div>
        <div class="bar"><div style="width:${p.pct}%"></div></div>
      </div>
    </article>`;
  }).join("");
}

function renderSessions() {
  const runs = state.runs;
  const filtered = sessionFilter === "all"
    ? runs
    : runs.filter((r) => String(r.level || 1) === String(sessionFilter));
  const totalMs = runs.reduce((sum, r) => sum + (r.ms || 0), 0);
  const best = runs.reduce((m, r) => Math.max(m, r.correct || 0), 0);
  els.sessionStats.innerHTML = `
    <div><strong>${runs.length}</strong>сессий</div>
    <div><strong>${best}/10</strong>лучший</div>
    <div><strong>${formatTime(totalMs)}</strong>всего</div>
  `;
  if (!filtered.length) {
    els.sessionList.innerHTML = `<li class="empty">${runs.length ? "Нет сессий этого уровня" : "Сессий пока нет"}</li>`;
    return;
  }
  els.sessionList.innerHTML = filtered.map((r) => historyItemHtml(r, true)).join("");
}

function showUnitsIntro() {
  return new Promise((resolve) => {
    const overlay = document.getElementById("unitsIntro");
    const countEl = document.getElementById("unitsCountdown");
    if (!overlay || !countEl) {
      resolve();
      return;
    }
    let left = Math.round(UNITS_INTRO_MS / 1000);
    countEl.textContent = String(left);
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    const tick = setInterval(() => {
      left -= 1;
      countEl.textContent = String(Math.max(0, left));
      if (left <= 0) {
        clearInterval(tick);
        overlay.classList.add("hidden");
        overlay.setAttribute("aria-hidden", "true");
        resolve();
      }
    }, 1000);
  });
}

function showMulIntro() {
  return new Promise((resolve) => {
    const overlay = document.getElementById("mulIntro");
    const countEl = document.getElementById("mulCountdown");
    if (!overlay || !countEl) {
      resolve();
      return;
    }
    let left = Math.round(MUL_INTRO_MS / 1000);
    countEl.textContent = String(left);
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    const tick = setInterval(() => {
      left -= 1;
      countEl.textContent = String(Math.max(0, left));
      if (left <= 0) {
        clearInterval(tick);
        overlay.classList.add("hidden");
        overlay.setAttribute("aria-hidden", "true");
        resolve();
      }
    }, 1000);
  });
}

function showDivIntro() {
  return new Promise((resolve) => {
    const overlay = document.getElementById("divIntro");
    const countEl = document.getElementById("divCountdown");
    if (!overlay || !countEl) {
      resolve();
      return;
    }
    let left = Math.round(DIV_INTRO_MS / 1000);
    countEl.textContent = String(left);
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    const tick = setInterval(() => {
      left -= 1;
      countEl.textContent = String(Math.max(0, left));
      if (left <= 0) {
        clearInterval(tick);
        overlay.classList.add("hidden");
        overlay.setAttribute("aria-hidden", "true");
        resolve();
      }
    }, 1000);
  });
}

function showCodeIntro(level) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("codeIntro");
    const countEl = document.getElementById("codeCountdown");
    const titleEl = document.getElementById("codeIntroTitle");
    const leadEl = document.getElementById("codeIntroLead");
    const bodyEl = document.getElementById("codeIntroBody");
    const tipEl = document.getElementById("codeIntroTip");
    const skipBtn = document.getElementById("codeIntroSkip");
    if (!overlay || !countEl || !bodyEl) {
      resolve();
      return;
    }
    const cfg = levelCfg(level, MODE_CODE);
    const lesson = CODE_LESSONS[cfg.code] || CODE_LESSONS.folders;
    if (titleEl) titleEl.textContent = lesson.title;
    if (leadEl) leadEl.textContent = lesson.lead;
    if (tipEl) tipEl.textContent = lesson.tip || "";
    bodyEl.innerHTML = (lesson.points || []).map((p) =>
      `<div class="code-lesson-row"><span class="code-lesson-ico">${p.ico}</span><span>${escapeHtml(p.text)}</span></div>`
    ).join("");
    let left = Math.round(CODE_INTRO_MS / 1000);
    countEl.textContent = String(left);
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(tick);
      if (skipBtn) skipBtn.removeEventListener("click", finish);
      overlay.classList.add("hidden");
      overlay.setAttribute("aria-hidden", "true");
      resolve();
    };
    const tick = setInterval(() => {
      left -= 1;
      countEl.textContent = String(Math.max(0, left));
      if (left <= 0) finish();
    }, 1000);
    if (skipBtn) skipBtn.addEventListener("click", finish);
  });
}

async function startGame() {
  if (startGame.busy) return;
  startGame.busy = true;
  try {
    stopFireworks();
    stopFxLayer();
    ensureNickFromInput();
    if (!isBattleLevel(selectedLevel) && !isLevelOpen(selectedLevel)) selectedLevel = maxOpenLevel();
    if (isBattleLevel(selectedLevel) && !isBossOpen(selectedLevel)) selectedLevel = maxOpenLevel();
    renderLevels();
    const isBattle = isBattleLevel(selectedLevel);
    const battleId = isBattle ? selectedLevel : BATTLE_LEVEL;
    const bcfg = isBattle ? battleCfg(battleId) : null;
    const rounds = isBattle ? battleRoundsForMode(selectedMode, battleId) : null;
    const startLevel = isBattle ? rounds[0] : selectedLevel;
    const cfg = levelCfg(startLevel);
    if (selectedMode === MODE_UNITS && !isBattle) {
      showScreen("home");
      await showUnitsIntro();
    }
    if (selectedMode === MODE_MUL && !isBattle && (cfg.intro || cfg.mul === "intro")) {
      showScreen("home");
      await showMulIntro();
    }
    if (selectedMode === MODE_DIV && !isBattle && (cfg.intro || cfg.div === "intro")) {
      showScreen("home");
      await showDivIntro();
    }
    if (selectedMode === MODE_CODE && !isBattle) {
      showScreen("home");
      await showCodeIntro(startLevel);
    }
    const battleFx = isBattle ? equippedBattlePassives() : {};
    const heroBase = (bcfg && bcfg.heroHp) || BATTLE_HERO_HP;
    const bossBase = (bcfg && bcfg.bossHp) || BATTLE_BOSS_HP;
    const startedAt = Date.now();
    run = {
      items: generateRun(cfg.id),
      index: 0,
      input: "",
      answers: [],
      startedAt,
      startedIso: new Date(startedAt).toISOString(),
      level: isBattle ? battleId : cfg.id,
      roundLevel: cfg.id,
      limit: cfg.limit,
      done: false,
      gameMs: 0,
      realMs: 0,
      scoreMs: 0,
      lastTick: Date.now(),
      timeScale: 1,
      scoreScale: 1,
      realScale: 1,
      slowOn: false,
      extraUsed: 0,
      forgive: 0,
      skillReadyAt: 0,
      skillActiveUntil: 0,
      skillHintUsedOn: -1,
      battle: isBattle,
      battleId: isBattle ? battleId : 0,
      rounds: rounds || [],
      roundIndex: 0,
      heroMaxHp: heroBase + (battleFx.maxHpBonus || 0),
      heroHp: heroBase + (battleFx.maxHpBonus || 0),
      bossHp: bossBase,
      bossMaxHp: bossBase,
      firstHitFree: !!battleFx.firstHitFree,
      dmgBonus: battleFx.dmgBonus || 0,
      rewardBonus: battleFx.rewardBonus || 0,
      rewardMul: (bcfg && bcfg.rewardMul) || 1,
      foe: (bcfg && bcfg.foe) || "slime",
      foeName: (bcfg && bcfg.foeName) || "Задание",
      fireNext: false,
      shieldCharges: 0,
      potionUsed: 0,
      megaPotionUsed: 0,
      shieldScrollUsed: 0,
      mendUsed: 0,
      battleWin: false,
      roundBase: 0,
    };
    document.body.classList.remove("slow-mo");
    document.body.classList.toggle("in-battle", isBattle);
    const modeInfo = MODE_META[selectedMode] || MODE_META[MODE_BASIC];
    if (isBattle) {
      els.gameLevel.textContent = `${bcfg.name} · раунд 1/${rounds.length}${modeLabelShort(selectedMode)}`;
    } else {
      els.gameLevel.textContent = `${modeInfo.levelNames[cfg.id - 1] || cfg.name}${modeLabelShort(selectedMode)}`;
    }
    els.timer.classList.toggle("countdown", Boolean(cfg.limit));
    els.timer.classList.remove("danger");
    showScreen("game");
    paintMascots();
    renderBattleArena();
    renderBattleHud();
    renderBoostBar();
    renderProblem();
    startTimer();
  } finally {
    startGame.busy = false;
  }
}

function realElapsed() {
  const now = Date.now();
  const dt = now - run.lastTick;
  run.lastTick = now;
  const realScale = run.realScale != null ? run.realScale : 1;
  const scoreScale = run.scoreScale != null ? run.scoreScale : 1;
  run.realMs = (run.realMs || 0) + dt * realScale;
  run.scoreMs = (run.scoreMs || 0) + dt * scoreScale;
  run.gameMs = run.scoreMs;
  return run.realMs;
}

function gameElapsed() {
  realElapsed();
  return run.scoreMs || 0;
}

function startTimer() {
  stopTimer();
  run.lastTick = Date.now();
  const update = () => {
    if (!run || run.done) return;
    tickSkillEffects();
    if (run.limit) {
      const left = Math.max(0, run.limit - realElapsed());
      els.timer.textContent = formatTime(left);
      els.timer.classList.toggle("danger", left <= 15000);
      if (left <= 0) {
        if (run.battle) finishBattleRoundTimeout();
        else finishRun({ timedOut: true });
      }
    } else {
      els.timer.textContent = formatTime(gameElapsed());
    }
    refreshSkillButton();
  };
  update();
  tickId = setInterval(update, 200);
}

function tickSkillEffects() {
  if (!run || !run.skillActiveUntil) return;
  if (Date.now() < run.skillActiveUntil) return;
  gameElapsed();
  run.skillActiveUntil = 0;
  run.realScale = 1;
  if (!run.slowOn) {
    run.scoreScale = 1;
    run.timeScale = 1;
    document.body.classList.remove("slow-mo");
  } else {
    run.scoreScale = 0.5;
  }
}

function skillButtonHtml() {
  const skill = equippedSkill();
  if (!skill || !run) return "";
  if (skill.battleOnly && !run.battle) return "";
  if (!skill.battleOnly && run.battle && !["timeLord", "sageHint", "wordSense", "debugTrace", "focusBreath", "luckyTick"].includes(skill.id)) return "";
  const now = Date.now();
  const active = skillIsActive();
  const cd = skillCooldownLeft();
  let label = skill.name;
  let disabled = false;
  let cls = "boost-btn skill-btn";
  if (active && (skill.id === "timeLord" || skill.id === "luckyTick")) {
    const left = Math.ceil((run.skillActiveUntil - now) / 1000);
    label = `${skill.icon} Замедление ${left}с`;
    cls += " on";
    disabled = true;
  } else if (cd > 0) {
    label = `${skill.icon} ${Math.ceil(cd / 1000)}с`;
    disabled = true;
  } else {
    label = `${skill.icon} ${skill.name}`;
  }
  return `<button type="button" class="${cls}" data-skill="${skill.id}" ${disabled ? "disabled" : ""}>${label}</button>`;
}

function refreshSkillButton() {
  if (!els.boostBar || !run || run.done) return;
  const btn = els.boostBar.querySelector("[data-skill]");
  const html = skillButtonHtml();
  if (!html) {
    if (btn) btn.remove();
    return;
  }
  if (!btn) {
    els.boostBar.insertAdjacentHTML("beforeend", html);
    return;
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const next = tmp.firstElementChild;
  if (next) btn.replaceWith(next);
}

function useSkill(id) {
  if (!run || run.done) return;
  const skill = SKILLS[id];
  if (!skill || state.shop.skill !== id || !state.shop.skills.includes(id)) return;
  if (skillCooldownLeft() > 0 || skillIsActive()) return;

  if (id === "timeLord" || id === "luckyTick") {
    gameElapsed();
    const now = Date.now();
    run.skillActiveUntil = now + skill.durationMs;
    run.skillReadyAt = run.skillActiveUntil + skill.cooldownMs;
    run.realScale = 0.5;
    run.timeScale = 0.5;
    document.body.classList.add("slow-mo");
    showToasts([{ plain: true, icon: skill.icon, name: skill.name, desc: id === "luckyTick" ? "Время замедлено на 8 сек!" : "Время замедлено на 10 секунд!" }]);
  } else if (id === "sageHint" || id === "wordSense" || id === "debugTrace" || id === "focusBreath") {
    const item = run.items[run.index];
    if (!item) return;
    run.skillReadyAt = Date.now() + skill.cooldownMs;
    run.skillHintUsedOn = run.index;
    run.input = String(item.answer);
    drawAnswer();
    const choiceHint = item.choice && item.choices
      ? `Вариант ${item.answer}: ${item.choices[item.answer - 1]}`
      : `Правильный ответ: ${item.answer}`;
    showToasts([{ plain: true, icon: skill.icon, name: skill.name, desc: choiceHint }]);
  } else if (id === "fireBolt" && run.battle) {
    run.skillReadyAt = Date.now() + skill.cooldownMs;
    run.fireNext = true;
    showToasts([{ plain: true, icon: skill.icon, name: skill.name, desc: "Следующий верный ответ сильнее!" }]);
  } else if (id === "mend" && run.battle) {
    if (run.mendUsed) return;
    run.mendUsed = 1;
    run.skillReadyAt = Date.now() + skill.cooldownMs;
    run.heroHp = Math.min(run.heroMaxHp, run.heroHp + 1);
    renderBattleHud();
    showToasts([{ plain: true, icon: skill.icon, name: skill.name, desc: "+1 HP" }]);
  } else if (id === "frostWard" && run.battle) {
    run.skillReadyAt = Date.now() + skill.cooldownMs;
    run.shieldCharges = (run.shieldCharges || 0) + 1;
    showToasts([{ plain: true, icon: skill.icon, name: skill.name, desc: "Следующая ошибка заблокирована" }]);
  }
  refreshSkillButton();
}

function stopTimer() {
  if (tickId) {
    clearInterval(tickId);
    tickId = null;
  }
}

function renderProblem() {
  const item = run.items[run.index];
  run.input = "";
  els.stepNow.textContent = String(run.index + 1);
  els.progressFill.style.width = `${((run.index + 1) / TOTAL) * 100}%`;
  const rawText = item.text || `${item.a}  ${item.op}  ${item.b}  =  ?`;
  els.problem.innerHTML = escapeHtml(rawText).replace(/\n/g, "<br>");
  els.problem.classList.toggle("units-cmp", Boolean(item.compare) || Boolean(item.choice) || (item.text && item.text.includes("\n")));
  els.problem.classList.toggle("mul-long", Boolean(item.hint) || (item.text && item.text.length > 22) || Boolean(item.choice));
  let hintEl = document.getElementById("mulHint");
  if (!hintEl && els.problemCard) {
    hintEl = document.createElement("div");
    hintEl.id = "mulHint";
    hintEl.className = "mul-hint";
    els.problemCard.appendChild(hintEl);
  }
  if (hintEl) {
    if (item.hint) {
      hintEl.textContent = `подсказка: ${item.hint}`;
      hintEl.classList.remove("hidden");
    } else {
      hintEl.textContent = "";
      hintEl.classList.add("hidden");
    }
  }
  let choiceEl = document.getElementById("choicePad");
  if (!choiceEl && els.problemCard) {
    choiceEl = document.createElement("div");
    choiceEl.id = "choicePad";
    choiceEl.className = "choice-pad";
    els.problemCard.appendChild(choiceEl);
  }
  if (choiceEl) {
    if (item.choice && Array.isArray(item.choices)) {
      choiceEl.innerHTML = item.choices.map((c, i) =>
        `<button type="button" class="choice-btn" data-choice="${i + 1}"><span class="choice-n">${i + 1}</span> ${escapeHtml(String(c))}</button>`
      ).join("");
      choiceEl.classList.remove("hidden");
      document.body.classList.add("choice-mode");
    } else {
      choiceEl.innerHTML = "";
      choiceEl.classList.add("hidden");
      document.body.classList.remove("choice-mode");
    }
  }
  els.problemCard.classList.remove("pop");
  void els.problemCard.offsetWidth;
  els.problemCard.classList.add("pop");
  drawAnswer();
}

function drawAnswer() {
  const has = run.input.length > 0;
  els.answerBox.classList.toggle("has-value", has);
  els.answerText.textContent = run.input;
  const item = run && run.items && run.items[run.index];
  if (item && item.choice) {
    document.querySelectorAll("#choicePad .choice-btn").forEach((b) => {
      b.classList.toggle("picked", has && b.dataset.choice === run.input);
    });
  }
}

function pressKey(key) {
  if (!run || run.done) return;
  if (key === "back") {
    run.input = run.input.slice(0, -1);
    drawAnswer();
    return;
  }
  const item = run.items[run.index];
  if (item && item.choice) {
    if (/^[123]$/.test(key)) {
      run.input = key;
      drawAnswer();
    }
    return;
  }
  if (/^\d$/.test(key) && run.input.length < 4) {
    run.input += key;
    drawAnswer();
  }
}

function captureCurrent(emptyMark) {
  const item = run.items[run.index];
  const typed = run.input.trim();
  const given = typed === "" ? null : Number(typed);
  const ok = given !== null && Number.isFinite(given) && given === item.answer;
  run.answers.push({
    ...item,
    given: typed === "" ? emptyMark : typed,
    ok,
  });
}

function foeMarkup(foe, size = 72) {
  const skins = {
    slime: { body: "#7dce82", eye: "#2d5a32", blush: "#c5f0c8" },
    rock: { body: "#9aa3ad", eye: "#3d4450", blush: "#cfd5dc" },
    storm: { body: "#6b7fd7", eye: "#1e2450", blush: "#c8d0ff" },
  };
  const s = skins[foe] || skins.slime;
  const blush = foe === "rock" ? "#cfd5dc" : s.blush;
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true">
    <ellipse cx="60" cy="105" rx="32" ry="6" fill="#000" opacity=".08"/>
    <circle cx="60" cy="62" r="40" fill="${s.body}"/>
    ${foe === "storm" ? '<path d="M70 18 L58 48 H70 L52 78" fill="#ffe066" stroke="#e8a317" stroke-width="2"/>' : ""}
    ${foe === "rock" ? '<path d="M40 50 L50 35 L70 38 L80 55 L72 78 L48 76 Z" fill="#7f8894" opacity=".35"/>' : ""}
    <ellipse cx="46" cy="58" rx="6" ry="8" fill="${s.eye}"/>
    <ellipse cx="74" cy="58" rx="6" ry="8" fill="${s.eye}"/>
    <circle cx="48" cy="55" r="2" fill="#fff"/>
    <circle cx="76" cy="55" r="2" fill="#fff"/>
    <ellipse cx="60" cy="78" rx="10" ry="5" fill="${blush}"/>
    <path d="M48 72 Q60 82 72 72" fill="none" stroke="${s.eye}" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

function renderBattleArena() {
  const arena = document.getElementById("battleArena");
  if (!arena) return;
  if (!run || !run.battle) {
    arena.classList.add("hidden");
    arena.innerHTML = "";
    document.getElementById("gameStage")?.classList.remove("hidden-by-battle");
    return;
  }
  document.getElementById("gameStage")?.classList.add("hidden-by-battle");
  arena.classList.remove("hidden");
  const foe = run.foe || "slime";
  arena.innerHTML = `
    <div class="arena-fighter hero" id="arenaHero">
      <div class="arena-mascot" id="arenaHeroMascot"></div>
      <div class="arena-tag">Ты</div>
    </div>
    <div class="arena-vs" aria-hidden="true">VS</div>
    <div class="arena-fighter foe" id="arenaFoe">
      <div class="arena-mascot" id="arenaFoeMascot">${foeMarkup(foe, 78)}</div>
      <div class="arena-tag">${run.foeName || "Задание"}</div>
    </div>
    <div class="arena-bolts" id="arenaBolts" aria-hidden="true"></div>
  `;
  const heroEl = document.getElementById("arenaHeroMascot");
  if (heroEl) heroEl.innerHTML = mascotMarkup(78, "happy");
}

function playBattleBolt(ok) {
  const layer = document.getElementById("arenaBolts");
  const hero = document.getElementById("arenaHero");
  const foe = document.getElementById("arenaFoe");
  if (!layer || !hero || !foe) return;
  const bolt = document.createElement("span");
  bolt.className = `battle-bolt ${ok ? "hero-hit" : "foe-hit"}`;
  layer.appendChild(bolt);
  const target = ok ? foe : hero;
  target.classList.remove("hit-shake");
  // reflow
  void target.offsetWidth;
  target.classList.add("hit-shake");
  setTimeout(() => {
    bolt.remove();
    target.classList.remove("hit-shake");
  }, 480);
}

function renderBattleHud() {
  const hud = document.getElementById("battleHud");
  if (!hud) return;
  if (!run || !run.battle) {
    hud.classList.add("hidden");
    hud.innerHTML = "";
    return;
  }
  hud.classList.remove("hidden");
  const heroPct = Math.max(0, Math.round((run.heroHp / run.heroMaxHp) * 100));
  const bossPct = Math.max(0, Math.round((run.bossHp / run.bossMaxHp) * 100));
  const bName = battleCfg(run.battleId || run.level).name || "Бой";
  hud.innerHTML = `
    <div class="hp-side hero">
      <div class="hp-label">Ты ${"❤".repeat(Math.max(0, run.heroHp))}${"🖤".repeat(Math.max(0, run.heroMaxHp - run.heroHp))}</div>
      <div class="hp-bar"><i style="width:${heroPct}%"></i></div>
    </div>
    <div class="hp-round">${bName}<br>Раунд ${run.roundIndex + 1}/${run.rounds.length}</div>
    <div class="hp-side boss">
      <div class="hp-label">${run.foeName || "Задание"} ${run.bossHp}/${run.bossMaxHp}</div>
      <div class="hp-bar"><i style="width:${bossPct}%"></i></div>
    </div>
  `;
}

function applyBattleOutcome(ok) {
  if (!run || !run.battle) return;
  playBattleBolt(ok);
  if (ok) {
    let dmg = 1 + (run.dmgBonus || 0);
    if (run.fireNext) {
      dmg += 1;
      run.fireNext = false;
    }
    run.bossHp = Math.max(0, run.bossHp - dmg);
  } else {
    if (run.shieldCharges > 0) {
      run.shieldCharges -= 1;
      showToasts([{ plain: true, icon: "🛡️", name: "Щит!", desc: "Урон заблокирован" }]);
    } else if (run.firstHitFree) {
      run.firstHitFree = false;
      showToasts([{ plain: true, icon: "🧿", name: "Амулет!", desc: "Первый удар не засчитан" }]);
    } else {
      run.heroHp = Math.max(0, run.heroHp - 1);
    }
  }
  renderBattleHud();
}

function advanceBattleRound() {
  const modeInfo = MODE_META[selectedMode] || MODE_META[MODE_BASIC];
  run.roundIndex += 1;
  if (run.roundIndex >= run.rounds.length) {
    run.battleWin = run.heroHp > 0;
    finishRun({ timedOut: false });
    return;
  }
  const nextLevel = run.rounds[run.roundIndex];
  const cfg = levelCfg(nextLevel);
  run.roundLevel = nextLevel;
  run.items = generateRun(nextLevel);
  run.index = 0;
  run.input = "";
  run.limit = cfg.limit;
  run.realMs = 0;
  run.roundBase = run.answers.length;
  run.lastTick = Date.now();
  els.gameLevel.textContent = `${battleCfg(run.battleId || run.level).name || "Бой"} · раунд ${run.roundIndex + 1}/${run.rounds.length} · ${modeInfo.levelNames[nextLevel - 1] || cfg.name}`;
  els.timer.classList.toggle("countdown", Boolean(cfg.limit));
  els.timer.classList.remove("danger");
  showToasts([{ plain: true, icon: "⚔️", name: `Раунд ${run.roundIndex + 1}`, desc: modeInfo.levelNames[nextLevel - 1] || cfg.name }]);
  renderBoostBar();
  renderProblem();
  startTimer();
}

function finishBattleRoundTimeout() {
  if (!run || run.done || !run.battle) return;
  if (run.answers.length === (run.roundBase || 0) + run.index) captureCurrent("—");
  const target = (run.roundBase || 0) + TOTAL;
  while (run.answers.length < target) {
    const item = run.items[run.answers.length - (run.roundBase || 0)];
    if (!item) break;
    run.answers.push({ ...item, given: "—", ok: false });
  }
  applyBattleOutcome(false);
  if (run.heroHp <= 0) {
    run.battleWin = false;
    finishRun({ timedOut: true });
    return;
  }
  if (run.bossHp <= 0) {
    run.battleWin = true;
    finishRun({ timedOut: false });
    return;
  }
  advanceBattleRound();
}

function goNext() {
  if (!run || run.done) return;
  captureCurrent("—");
  const last = run.answers[run.answers.length - 1];
  if (run.battle) {
    applyBattleOutcome(!!(last && last.ok));
    if (run.heroHp <= 0) {
      run.battleWin = false;
      finishRun({ timedOut: false });
      return;
    }
    if (run.bossHp <= 0) {
      run.battleWin = true;
      finishRun({ timedOut: false });
      return;
    }
    if (run.index + 1 >= TOTAL) {
      advanceBattleRound();
      return;
    }
    run.index += 1;
    renderProblem();
    return;
  }
  if (run.index + 1 >= TOTAL) {
    finishRun({ timedOut: false });
    return;
  }
  run.index += 1;
  renderProblem();
}

function encouragement(correct, timedOut, grade) {
  if (grade) {
    if (timedOut && grade.failed) return { title: "Время и оценка", text: `${grade.text} Успей ответить и ошибайся меньше.` };
    if (timedOut) return { title: grade.title, text: `${grade.text} Но время вышло — потренируй скорость.` };
    return { title: grade.title, text: grade.text };
  }
  if (timedOut && correct < 10) return { title: "Время вышло!", text: "Успел ответить — уже победа. Ещё разок?" };
  if (correct === 10) return { title: "Чемпион!", text: "Все 10 примеров верные!" };
  if (correct >= 8) return { title: "Суперзвезда!", text: "Почти идеально — так держать!" };
  if (correct >= 5) return { title: "Молодец!", text: "Хороший счёт. Ещё чуть-чуть!" };
  if (correct >= 3) return { title: "Так держать!", text: "Ты уже на верном пути." };
  return { title: "Попробуй ещё!", text: "Каждая попытка делает тебя сильнее." };
}

function coinsFor(level, correct, timedOut, grade) {
  const cfg = levelCfg(level);
  if (grade?.failed) return Math.max(0, correct);
  let coins = correct * (cfg.coin || 1);
  if (correct === 10) coins += 5;
  if ((level === 4 || level === 5) && !timedOut && correct >= 8) coins += 5;
  if (level === 5 && grade?.mark === 5 && !timedOut) coins += 5;
  if (level === SECRET_LEVEL && correct === 10) coins += 20;
  if (selectedMode === MODE_UNITS && correct === 10) coins += 5;
  if (selectedMode === MODE_MUL && correct === 10) coins += 5;
  if (selectedMode === MODE_DIV && correct === 10) coins += 5;
  return coins;
}

function unlockAchievements() {
  const before = new Set(state.achievements);
  const now = [];
  ACHIEVEMENTS.forEach((a) => {
    try {
      if (a.check(state)) now.push(a.id);
    } catch (err) {
      console.warn("ach check failed", a.id, err);
    }
  });
  const fresh = now.filter((id) => !before.has(id));
  state.achievements = [...new Set([...state.achievements, ...now])];
  return ACHIEVEMENTS.filter((a) => fresh.includes(a.id));
}

function finishRun({ timedOut = false } = {}) {
  if (!run || run.done) return;
  run.done = true;
  stopTimer();

  if (timedOut && !run.battle && run.answers.length < TOTAL) {
    if (run.answers.length === run.index) captureCurrent("—");
    while (run.answers.length < TOTAL) {
      const item = run.items[run.answers.length];
      run.answers.push({ ...item, given: "—", ok: false });
    }
  }

  gameElapsed();
  let ms = Math.max(0, Math.round(run.scoreMs || run.gameMs || 0));
  const correct = run.answers.filter((a) => a.ok).length;
  const cfg = levelCfg(run.battle ? (run.battleId || run.level) : run.level);
  const grade = (!run.battle && cfg.school) ? schoolGrade(correct, run.forgive || 0) : null;
  const openBefore = maxOpenLevel();
  const rankBefore = rankIndexOf(state.stars);
  let gainedStars;
  let gainedCoins;
  if (run.battle) {
    const win = !!run.battleWin;
    const mul = run.rewardMul || 1;
    gainedStars = win
      ? Math.round((15 + Math.floor(correct / 5)) * mul)
      : Math.max(1, Math.floor(correct / 4));
    gainedCoins = win
      ? Math.round((40 + correct) * (1 + (run.rewardBonus || 0)) * mul)
      : Math.max(2, Math.floor(correct / 2));
  } else {
    gainedStars = grade?.failed ? Math.max(0, Math.floor(correct / 2)) : correct;
    gainedCoins = coinsFor(run.level, correct, timedOut, grade);
  }
  state.stars += gainedStars;
  state.coins += gainedCoins;
  const openAfter = maxOpenLevel();
  const rankAfter = rankIndexOf(state.stars);
  state.lastLevel = run.battle
    ? (run.battleId || run.level)
    : (isLevelOpen(run.level) ? run.level : maxOpenLevel());
  state.runs.unshift({
    startedAt: run.startedIso,
    date: new Date().toISOString(),
    correct,
    total: run.answers.length || TOTAL,
    ms,
    level: run.battle ? (run.battleId || run.level) : run.level,
    mode: selectedMode,
    timedOut,
    coins: gainedCoins,
    grade: grade ? grade.mark : undefined,
    failed: grade ? grade.failed : undefined,
    forgive: grade && grade.forgiven ? grade.forgiven : undefined,
    battleWin: run.battle ? !!run.battleWin : undefined,
    answers: run.answers.map((a) => ({
      a: a.a,
      op: a.op,
      b: a.b,
      c: a.c,
      op1: a.op1,
      op2: a.op2,
      text: a.text,
      answer: a.answer,
      given: a.given,
      ok: a.ok,
    })),
  });
  if (run.level === SECRET_LEVEL && correct === 10) {
    grantSecretReward();
  }
  let fresh = [];
  try {
    applyCareAfterStudy(correct, run.answers.length || TOTAL, timedOut);
  } catch (err) {
    console.warn("care after study failed", err);
  }
  try {
    fresh = unlockAchievements();
  } catch (err) {
    console.warn("unlockAchievements failed", err);
    fresh = [];
  }
  saveState();

  document.body.classList.remove("in-battle");
  const arenaEl = document.getElementById("battleArena");
  if (arenaEl) {
    arenaEl.classList.add("hidden");
    arenaEl.innerHTML = "";
  }
  document.getElementById("gameStage")?.classList.remove("hidden-by-battle");
  const msg = run.battle
    ? (run.battleWin
      ? { title: `${battleCfg(run.battleId || run.level).name || "Бой"} пройден!`, text: "Задание побеждено — ты герой!" }
      : { title: "Поражение…", text: "HP кончились. Подлечись в магазине и попробуй снова!" })
    : encouragement(correct, timedOut, grade);
  if (els.resultTitle) els.resultTitle.textContent = msg.title;
  if (els.rewardLine) els.rewardLine.textContent = `${msg.text}  +${gainedStars} опыта  +${gainedCoins} монет`;
  try { renderBattleHud(); } catch (err) { /* ignore */ }
  if (els.correctCount) els.correctCount.textContent = String(correct);
  if (els.resultTime) els.resultTime.textContent = timedOut ? `${formatTime(ms)} (время)` : formatTime(ms);
  if (els.coinsGain) els.coinsGain.textContent = String(gainedCoins);
  if (els.starsGain) els.starsGain.textContent = String(gainedStars);
  if (els.startTimePill) els.startTimePill.textContent = `Старт: ${formatStamp(run.startedIso)}`;
  if (els.gradeRow && els.gradeMark) {
    if (grade) {
      els.gradeRow.classList.remove("hidden");
      els.gradeMark.textContent = grade.failed ? "2 · провал" : String(grade.mark);
      if (els.gradePill) {
        els.gradePill.className = `score-pill grade g${grade.mark}${grade.failed ? " fail" : ""}`;
      }
    } else {
      els.gradeRow.classList.add("hidden");
    }
  }
  if (els.starBurst) {
    els.starBurst.innerHTML = gainedStars
      ? Array.from({ length: Math.min(gainedStars, 10) }, (_, i) => `<span class="star-chip sm" style="animation-delay:${i * 0.08}s"></span>`).join("")
      : `<span>🌱</span>`;
  }
  const extraBanners = [];
  if (openAfter > openBefore) {
    const opened = levelCfg(openAfter);
    extraBanners.push(`<div class="ach-banner"><span class="lvl-medal m${Math.min(openAfter, 6)}"></span><div>Новый уровень!<small>Открыт «${opened.name}»</small></div></div>`);
  }
  if (rankAfter > rankBefore) {
    extraBanners.push(`<div class="ach-banner"><span class="rank-medal r${rankAfter} on">${RANKS[rankAfter].icon}</span><div>${RANKS[rankAfter].name}<small>Новый ранг за опыт</small></div></div>`);
  }
  if (run.battle && run.battleWin) {
    const bn = battleCfg(run.battleId || run.level).name || "Бой";
    extraBanners.push(`<div class="ach-banner"><span class="ico">⚔️</span><div>Победа: ${bn}!<small>Жирная награда за сражение</small></div></div>`);
  }
  if (run.level === SECRET_LEVEL && correct === 10) {
    extraBanners.push(`<div class="ach-banner"><span class="ico">🗝️</span><div>Награда тайны<small>Ключ тайны + небо «Тайная ночь»</small></div></div>`);
    if (selectedMode === MODE_BASIC) {
      extraBanners.push(`<div class="ach-banner"><span class="ico">⌛</span><div>Скилл открыт!<small>«Владыка времени» в магазине (нужен Архимаг)</small></div></div>`);
    }
    if (selectedMode === MODE_CHAIN) {
      extraBanners.push(`<div class="ach-banner"><span class="ico">💡</span><div>Скилл открыт!<small>«Мудрец» в магазине (нужен Архимаг)</small></div></div>`);
    }
  }
  if (els.newAchs) {
    els.newAchs.innerHTML = extraBanners.join("") + fresh
      .map((a) => `<div class="ach-banner"><span class="ico">${a.icon === "🪙" ? '<span class="coin md"></span>' : (a.icon === "67" ? '<span class="ico-67">6 7</span>' : a.icon)}</span><div>${a.name}<small>${a.desc}</small></div></div>`)
      .join("");
  }
  if (els.reviewList) els.reviewList.innerHTML = answersReviewHtml(run.answers);

  const celebrate = run.battle
    ? !!run.battleWin
    : (grade ? !grade.failed && grade.mark >= 3 : correct >= 5 || correct === 10);
  const perfectWin = run.battle
    ? !!run.battleWin
    : (grade ? grade.mark === 5 && !timedOut : correct === 10);
  try {
    spawnConfetti(celebrate);
    spawnLoot(gainedStars, gainedCoins);
    spawnVictoryFx(celebrate, perfectWin);
  } catch (err) {
    console.warn("fx failed", err);
  }
  document.body.classList.remove("slow-mo");
  try { paintMascots(); } catch (err) { console.warn("paintMascots", err); }
  const toasts = [...fresh];
  if (openAfter > openBefore) {
    toasts.unshift({ icon: "🔓", name: `Открыт «${levelCfg(openAfter).name}»`, desc: "Можно играть новый уровень!" });
  }
  if (rankAfter > rankBefore) {
    toasts.unshift({ icon: "👑", name: RANKS[rankAfter].name, desc: "Новый ранг за звёзды-опыт" });
  }
  if (grade) {
    toasts.unshift({
      plain: true,
      icon: grade.failed ? "📕" : "📗",
      name: `Оценка ${grade.mark}`,
      desc: grade.failed ? "Провалено — пересдай!" : "Контрольная засчитана",
    });
  }
  showToasts(toasts);
  if (fresh.some((a) => a.id === "six_seven")) {
    setTimeout(() => showSixSevenEgg(), 700);
  }
  // Сначала экран результата и отправка в топ — дом обновляем после,
  // чтобы сбой ухода/ачивок не съел новый результат.
  showScreen("result");
  if (!run.battle) {
    try {
      submitOnlineScore({
        level: run.level,
        correct,
        ms,
        grade: grade ? grade.mark : null,
        timedOut,
        mode: selectedMode,
        localId: run.startedIso,
      });
    } catch (err) {
      console.warn("submitOnlineScore failed", err);
    }
  }
  try {
    renderHome();
  } catch (err) {
    console.warn("renderHome after result failed", err);
    if (els.totalCoins) els.totalCoins.textContent = String(state.coins);
    if (els.totalStars) els.totalStars.textContent = String(state.stars);
  }
}

const FW_COLORS = ["#ffd166", "#ff7a59", "#4ecdc4", "#6bcb77", "#c084fc", "#ff6b9d"];
const FW_GOLD = ["#fff6c2", "#ffd24a", "#ffe566", "#ffb703", "#ff9f1c"];
const FW_MAX_SPARKS = 40;
const FW_SCALE = 0.4;

const fw = {
  canvas: document.getElementById("fireworks"),
  ctx: null,
  rockets: [],
  sparks: [],
  raf: 0,
  stopAt: 0,
  perfect: false,
  nextLaunch: 0,
  launched: 0,
  w: 0,
  h: 0,
};

function fwResize() {
  fw.w = Math.max(1, Math.floor(window.innerWidth * FW_SCALE));
  fw.h = Math.max(1, Math.floor(window.innerHeight * FW_SCALE));
  fw.canvas.width = fw.w;
  fw.canvas.height = fw.h;
}

function ensureNickFromInput() {
  if (isNickOk(playerNick)) return playerNick;
  if (!els.nickInput) return "";
  return saveNick(els.nickInput.value);
}

function submitOnlineScore(payload) {
  const nick = ensureNickFromInput() || playerNick;
  if (!isNickOk(nick)) return;
  const mode = payload.mode || selectedMode || MODE_BASIC;
  if (!isBoardScore({ correct: payload.correct, timedOut: payload.timedOut, mode })) return;
  const localId = payload.localId || `${Date.now()}`;
  enqueueScore({
    id: `run:${localId}`,
    nick,
    level: Number(payload.level),
    correct: Number(payload.correct),
    ms: Math.max(0, Math.round(payload.ms)),
    grade: payload.grade == null ? null : Number(payload.grade),
    timed_out: false,
    skin: (state.shop && state.shop.skin) || "honey",
    hat: (state.shop && state.shop.hat) || "none",
    mode,
    local_at: new Date().toISOString(),
  });
  scoresCache = { key: "", at: 0, rows: [] };
  updateSyncHint();
  syncScoreQueue({ quiet: true }).then(({ sent, left }) => {
    if (sent > 0 && left === 0) {
      showToasts([{ plain: true, icon: "🏆", name: "В топе!", desc: `«${nick}» · ${levelCfg(payload.level, mode).name || ""} · ${formatTime(payload.ms)}` }]);
      refreshCoopStats();
    } else if (left > 0) {
      showToasts([{
        plain: true,
        icon: "📦",
        name: "Сохранено локально",
        desc: "Сеть слабая — идеальный результат уйдёт в топ, когда появится интернет.",
      }]);
    }
  });
}

function scoreRankKey(row) {
  // Все записи в топе — 10/10: сравниваем только скорость (меньше ms — выше).
  return -Math.min(Number(row.ms) || 0, 9999999);
}

function bestScoresByNick(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const nick = normalizeNick(row.nick);
    if (!isNickOk(nick)) return;
    const prev = map.get(nick);
    if (!prev || scoreRankKey(row) > scoreRankKey(prev)) map.set(nick, { ...row, nick });
  });
  return [...map.values()].sort((a, b) => scoreRankKey(b) - scoreRankKey(a)).slice(0, 30);
}

function bestScoresByNickAndLevel(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const nick = normalizeNick(row.nick);
    if (!isNickOk(nick)) return;
    const key = `${nick}::${row.level}`;
    const prev = map.get(key);
    if (!prev || scoreRankKey(row) > scoreRankKey(prev)) map.set(key, { ...row, nick });
  });
  return [...map.values()].sort((a, b) => scoreRankKey(b) - scoreRankKey(a)).slice(0, 40);
}

async function renderBoard() {
  if (!els.boardList || !els.boardStatus) return;
  document.querySelectorAll("#boardModeFilters .filter-btn").forEach((b) => {
    b.classList.toggle("selected", b.dataset.boardMode === boardMode);
  });
  els.boardStatus.textContent = "Загрузка…";
  els.boardList.innerHTML = "";

  // Синхронизацию не блокируем надолго — топ грузим сразу, очередь уходит в фоне.
  const syncPromise = syncScoreQueue({ quiet: true });
  await Promise.race([
    syncPromise,
    new Promise((resolve) => setTimeout(resolve, 600)),
  ]);

  const cacheKey = `${boardFilter}|${boardMode}`;
  try {
    let list;
    if (scoresCache.key === cacheKey && Date.now() - scoresCache.at < SCORES_CACHE_MS) {
      list = scoresCache.rows;
    } else {
      list = await fetchScores(boardFilter, boardMode);
      scoresCache = { key: cacheKey, at: Date.now(), rows: list };
    }
    list.forEach((r) => {
      const nick = normalizeNick(r.nick);
      if (!isNickOk(nick)) return;
      const prev = coopStats.looks[nick];
      if (!prev || new Date(r.created_at || 0) > new Date(prev.at || 0)) {
        coopStats.looks[nick] = { skin: r.skin || "honey", hat: r.hat || "none", at: r.created_at };
      }
    });
    const top = boardFilter === "all" ? bestScoresByNickAndLevel(list) : bestScoresByNick(list);
    const pending = pendingScoreCount();
    if (!top.length) {
      const modeName = MODE_META[boardMode]?.name || "база";
      const lvlName = boardFilter === "all" ? "" : ` на «${MODE_META[boardMode].levelNames[Number(boardFilter) - 1] || levelCfg(Number(boardFilter), boardMode).name}»`;
      els.boardStatus.textContent = pending
        ? `Пока нет идеальных 10/10 (${modeName})${lvlName}. В очереди ${pending} — ждём сеть.`
        : `Пока нет идеальных 10/10 (${modeName})${lvlName}. Пройди все примеры вовремя — и появишься здесь!`;
      updateSyncHint();
      return;
    }
    const modeTitle = MODE_META[boardMode]?.name || "база";
    els.boardStatus.textContent = boardFilter === "all"
      ? `Гонка за время · ${modeTitle} · только 10/10 · ${top.length}${pending ? ` · очередь ${pending}` : ""}`
      : `Топ по времени · ${MODE_META[boardMode].levelNames[Number(boardFilter) - 1] || levelCfg(Number(boardFilter), boardMode).name} · ${modeTitle} · 10/10 · ${top.length}${pending ? ` · очередь ${pending}` : ""}`;
    els.boardList.innerHTML = top.map((row, i) => {
      const rowMode = row.mode || MODE_BASIC;
      const lvl = levelCfg(row.level || 1, rowMode);
      const rowLvlName = MODE_META[rowMode]?.levelNames[(row.level || 1) - 1] || lvl.name;
      const place = i + 1;
      const me = row.nick === playerNick ? " me" : "";
      const podium = place <= 3 ? ` podium p${place}` : "";
      const look = coopStats.looks[row.nick] || { skin: row.skin || "honey", hat: row.hat || "none" };
      const placeInner = place === 1
        ? `<span class="board-medal crown" aria-hidden="true"></span><span class="board-num">1</span>`
        : place === 2
          ? `<span class="board-medal silver" aria-hidden="true"></span><span class="board-num">2</span>`
          : place === 3
            ? `<span class="board-medal bronze" aria-hidden="true"></span><span class="board-num">3</span>`
            : String(place);
      const nickBadge = place === 1
        ? `<span class="board-crown-mini" aria-hidden="true"></span>`
        : place === 2
          ? `<span class="board-star-mini silver" aria-hidden="true"></span>`
          : place === 3
            ? `<span class="board-star-mini bronze" aria-hidden="true"></span>`
            : "";
      return `<li class="board-item${me}${podium}">
        <span class="board-place">${placeInner}</span>
        ${boardAvatarHtml(row.nick, look.skin, look.hat)}
        <div class="board-main">
          <strong class="board-nick">${nickBadge}${escapeHtml(row.nick)}</strong>
          <span class="board-meta"><span class="hist-level l${Math.min(row.level || 1, 6)}">${rowLvlName}</span>${modeLabelShort(rowMode)} · 10/10 · ${formatTime(row.ms)}</span>
        </div>
      </li>`;
    }).join("");
    // Кооп не дёргаем повторно при каждом открытии топа — он уже на таймере.
    syncPromise.then(() => updateSyncHint());
  } catch (err) {
    console.warn("board", err);
    const pending = pendingScoreCount();
    const msg = String(err && err.message ? err.message : err);
    els.boardStatus.textContent = msg.includes("Failed to fetch") || msg.includes("NetworkError")
      ? `Нет сети. Локально в очереди: ${pending}. Открой снова при нормальном интернете.`
      : `Не удалось загрузить топ. В очереди: ${pending}. Нажми «Обновить».`;
  }
  updateSyncHint();
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function spawnFireworks(perfect) {
  stopFireworks();
  fw.perfect = perfect;
  fw.rockets = [];
  fw.sparks = [];
  fw.launched = 0;
  fw.nextLaunch = 0;
  fw.stopAt = Date.now() + (perfect ? 2000 : 1200);
  fwResize();
  fw.ctx = fw.canvas.getContext("2d", { alpha: true });
  fw.canvas.classList.add("on");
  document.body.classList.toggle("fw-perfect", perfect);
  fwTick();
}

let fxTimer = 0;

function stopFxLayer() {
  clearTimeout(fxTimer);
  if (!els.fxLayer) return;
  els.fxLayer.className = "fx-layer";
  els.fxLayer.innerHTML = "";
}

function fxBits(count, make) {
  const parts = [];
  for (let i = 0; i < count; i += 1) parts.push(make(i));
  return parts.join("");
}

function spawnFxLayer(id, perfect) {
  stopFxLayer();
  if (!els.fxLayer || id === "classic") return;
  const big = perfect ? " big" : "";
  els.fxLayer.className = `fx-layer on fx-${id}${big}`;
  if (id === "rainbow") {
    els.fxLayer.innerHTML = fxBits(perfect ? 4 : 3, (i) =>
      `<i class="fx-ribbon r${i % 6}" style="left:${10 + (i * 18) % 80}%;animation-delay:${(i * 0.12).toFixed(2)}s;--rot:${-20 + (i % 5) * 8}deg"></i>`
    );
  } else if (id === "galaxy") {
    els.fxLayer.innerHTML = `
      <div class="fx-nebula"></div>
      <div class="fx-spin">
        ${fxBits(perfect ? 5 : 4, (i) =>
          `<i class="fx-star" style="--a:${(i * 72) % 360}deg;--d:${48 + (i % 4) * 14}px"></i>`
        )}
      </div>
    `;
  } else if (id === "phoenix") {
    els.fxLayer.innerHTML = `
      <div class="fx-flame-ring a"></div>
      <div class="fx-flame-ring b"></div>
      ${fxBits(perfect ? 4 : 3, (i) =>
        `<i class="fx-ember" style="left:${14 + (i * 18) % 72}%;animation-delay:${(i * 0.12).toFixed(2)}s"></i>`
      )}
    `;
  } else if (id === "aurora") {
    els.fxLayer.innerHTML = `
      <div class="fx-aurora a"></div>
      <div class="fx-aurora b"></div>
      ${fxBits(perfect ? 3 : 2, (i) =>
        `<i class="fx-glint" style="left:${16 + (i * 22) % 70}%;top:${18 + (i * 14) % 36}%;animation-delay:${(i * 0.18).toFixed(2)}s"></i>`
      )}
    `;
  } else if (id === "golden") {
    els.fxLayer.innerHTML = `
      <div class="fx-gold-glow"></div>
      ${fxBits(perfect ? 5 : 3, (i) =>
        `<i class="fx-gold" style="left:${10 + (i * 16) % 80}%;animation-delay:${(i * 0.1).toFixed(2)}s"></i>`
      )}
    `;
  }
  fxTimer = setTimeout(stopFxLayer, perfect ? 2000 : 1400);
}

function spawnVictoryFx(celebrate, perfect) {
  stopFxLayer();
  if (!celebrate) {
    stopFireworks();
    return;
  }
  const fxId = state.shop.fx && FX[state.shop.fx] ? state.shop.fx : "classic";
  spawnFireworks(!!perfect);
  if (fxId !== "classic") spawnFxLayer(fxId, !!perfect);
}

function stopFireworks() {
  cancelAnimationFrame(fw.raf);
  fw.raf = 0;
  fw.rockets = [];
  fw.sparks = [];
  document.body.classList.remove("fw-perfect");
  if (fw.canvas) {
    fw.canvas.classList.remove("on");
    if (fw.ctx) fw.ctx.clearRect(0, 0, fw.w || fw.canvas.width, fw.h || fw.canvas.height);
  }
}

function fwPick(list) {
  return list[rand(0, list.length - 1)];
}

function fwLaunch(x, targetY, color) {
  fw.rockets.push({
    x,
    y: fw.h + 4,
    vx: (Math.random() - 0.5) * 0.8,
    vy: -(6.5 + Math.random() * 2.2),
    targetY,
    color,
  });
}

function fwBurst(x, y, color, n) {
  const room = FW_MAX_SPARKS - fw.sparks.length;
  if (room <= 0) return;
  const count = Math.min(n, room);
  for (let i = 0; i < count; i += 1) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.2;
    const sp = 1.4 + Math.random() * 2.2;
    fw.sparks.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      color,
      size: 1.6 + Math.random() * 1.2,
      life: 1,
      fade: 0.028 + Math.random() * 0.012,
    });
  }
}

function fwScheduleLaunches(now) {
  if (now < fw.nextLaunch || now > fw.stopAt - 350) return;
  if (fw.sparks.length > FW_MAX_SPARKS * 0.85) {
    fw.nextLaunch = now + 280;
    return;
  }
  const w = fw.w;
  const h = fw.h;
  if (fw.perfect) {
    fwLaunch(
      w * (0.18 + Math.random() * 0.64),
      h * (0.2 + Math.random() * 0.28),
      fwPick(Math.random() < 0.5 ? FW_GOLD : FW_COLORS)
    );
    fw.nextLaunch = now + 620;
  } else {
    fwLaunch(
      w * (0.25 + Math.random() * 0.5),
      h * (0.24 + Math.random() * 0.2),
      fwPick(FW_COLORS)
    );
    fw.nextLaunch = now + 700;
  }
  fw.launched += 1;
}

function fwTick() {
  const ctx = fw.ctx;
  if (!ctx) return;
  const now = Date.now();
  ctx.clearRect(0, 0, fw.w, fw.h);

  fwScheduleLaunches(now);

  for (let i = fw.rockets.length - 1; i >= 0; i -= 1) {
    const r = fw.rockets[i];
    r.x += r.vx;
    r.y += r.vy;
    r.vy += 0.09;
    ctx.fillStyle = "#fff";
    ctx.fillRect(r.x - 1.5, r.y - 1.5, 3, 3);
    ctx.fillStyle = r.color;
    ctx.fillRect(r.x - 1, r.y + 2, 2, 5);
    if (r.vy >= 0 || r.y <= r.targetY) {
      fwBurst(r.x, r.y, r.color, fw.perfect ? 8 : 6);
      fw.rockets.splice(i, 1);
    }
  }

  for (let i = fw.sparks.length - 1; i >= 0; i -= 1) {
    const s = fw.sparks[i];
    s.life -= s.fade;
    if (s.life <= 0) {
      fw.sparks.splice(i, 1);
      continue;
    }
    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.04;
    s.vx *= 0.99;
    ctx.globalAlpha = s.life;
    ctx.fillStyle = s.color;
    const sz = s.size;
    ctx.fillRect(s.x - sz * 0.5, s.y - sz * 0.5, sz, sz);
  }
  ctx.globalAlpha = 1;

  if (now < fw.stopAt || fw.rockets.length || fw.sparks.length) {
    fw.raf = requestAnimationFrame(fwTick);
  } else {
    stopFireworks();
  }
}

function spawnConfetti(many) {
  els.confetti.innerHTML = "";
  const n = many ? 16 : 6;
  const colors = ["#ff7a59", "#ffd166", "#4ecdc4", "#6bcb77", "#f07167", "#c084fc"];
  for (let i = 0; i < n; i += 1) {
    const bit = document.createElement("i");
    bit.style.setProperty("--x", `${(Math.random() * 240 - 120).toFixed(0)}px`);
    bit.style.background = colors[i % colors.length];
    bit.style.left = `${30 + Math.random() * 40}%`;
    bit.style.animationDelay = `${Math.random() * 0.35}s`;
    els.confetti.appendChild(bit);
  }
}

function spawnLoot(stars, coins) {
  els.flyLayer.innerHTML = "";
  const starN = Math.min(Math.max(stars, 0), 12);
  const coinN = Math.min(Math.max(coins, 0), 12);
  for (let i = 0; i < starN; i += 1) {
    addFlyBit("fly-star", `<span class="star-chip"></span><span class="fly-spark">✦</span>`, i, -0.3);
  }
  for (let i = 0; i < coinN; i += 1) {
    addFlyBit("fly-coin", `<span class="coin"></span><span class="fly-spark">✦</span>`, i, 0.4);
  }
}

function addFlyBit(cls, html, i, offset) {
  const bit = document.createElement("div");
  bit.className = cls;
  bit.innerHTML = html;
  const angle = (i / 8) * Math.PI * 2 + offset;
  const dist = rand(100, 190);
  bit.style.setProperty("--dx", `${Math.round(Math.cos(angle) * dist)}px`);
  bit.style.setProperty("--dy", `${Math.round(-130 - Math.abs(Math.sin(angle)) * 80 - rand(0, 50))}px`);
  bit.style.setProperty("--spin", `${rand(-50, 50)}deg`);
  bit.style.animationDelay = `${i * 0.07}s`;
  els.flyLayer.appendChild(bit);
}

function spawnCoins(n) {
  spawnLoot(0, n);
}

function showToasts(list) {
  els.toastStack.innerHTML = "";
  list.forEach((a, i) => {
    const toast = document.createElement("div");
    toast.className = "toast";
    const title = a.plain ? a.name : `Новая ачивка: ${a.name}`;
    toast.innerHTML = `<span class="ico">${a.icon === "🪙" ? '<span class="coin md"></span>' : a.icon}</span><div>${title}<br><small>${a.desc || ""}</small></div>`;
    toast.style.animationDelay = `${i * 0.12}s`;
    els.toastStack.appendChild(toast);
    setTimeout(() => toast.remove(), 3200 + i * 400);
  });
}

function notEnough() {
  showToasts([{ plain: true, icon: "🪙", name: "Маловато монет", desc: "Сыграй ещё — и копилка подрастёт!" }]);
}

function renderBoostBar() {
  if (!run || run.done) {
    els.boostBar.innerHTML = "";
    return;
  }
  let html = "";
  const roundLevel = run.battle ? run.roundLevel : run.level;
  const showTimeBoosts = (run.battle || (roundLevel >= 4 && roundLevel < SECRET_LEVEL))
    && selectedMode !== MODE_UNITS
    && (run.battle ? Boolean(levelCfg(roundLevel).limit) : Boolean(levelCfg(roundLevel).limit));
  if (showTimeBoosts || run.battle) {
    const slowN = state.shop.slow;
    const extraN = state.shop.extra;
    const cheatN = state.shop.cheat;
    const extraLeft = EXTRA_MAX_PER_RUN - (run.extraUsed || 0);
    if (showTimeBoosts) {
      html += `
        <button type="button" class="boost-btn ${run.slowOn ? "on" : ""}" data-boost="slow" ${run.slowOn || slowN < 1 ? "disabled" : ""}>🐌 Улитка${slowN ? ` ×${slowN}` : ""}</button>
        <button type="button" class="boost-btn ${(run.extraUsed || 0) ? "on" : ""}" data-boost="extra" ${extraLeft < 1 || extraN < 1 ? "disabled" : ""}>⏳ −15 (${run.extraUsed || 0}/${EXTRA_MAX_PER_RUN})${extraN ? ` ×${extraN}` : ""}</button>
      `;
    }
    if (roundLevel === 5) {
      const cheatUsed = run.forgive || 0;
      const cheatLeft = CHEAT_MAX_PER_RUN - cheatUsed;
      const canCheat = cheatN > 0 && cheatLeft > 0;
      html += `<button type="button" class="boost-btn ${cheatUsed ? "on" : ""}" data-boost="cheat" ${canCheat ? "" : "disabled"}>🕵️ Читер${cheatUsed ? ` +${cheatUsed}` : ""}${cheatN ? ` ×${cheatN}` : ""}</button>`;
    }
  }
  if (run.battle) {
    const pN = state.shop.potion || 0;
    const mN = state.shop.megaPotion || 0;
    const sN = state.shop.shieldScroll || 0;
    html += `
      <button type="button" class="boost-btn" data-boost="potion" ${pN < 1 || run.potionUsed >= 2 || run.heroHp >= run.heroMaxHp ? "disabled" : ""}>🧪 +1HP${pN ? ` ×${pN}` : ""}</button>
      <button type="button" class="boost-btn" data-boost="megaPotion" ${mN < 1 || run.megaPotionUsed >= 1 || run.heroHp >= run.heroMaxHp ? "disabled" : ""}>🧴 +2HP${mN ? ` ×${mN}` : ""}</button>
      <button type="button" class="boost-btn" data-boost="shieldScroll" ${sN < 1 || run.shieldScrollUsed >= 1 ? "disabled" : ""}>📜 Щит${sN ? ` ×${sN}` : ""}</button>
    `;
  }
  html += skillButtonHtml();
  els.boostBar.innerHTML = html;
}

function useBoost(id) {
  if (!run || run.done) return;
  if (id === "slow" && !run.slowOn && state.shop.slow > 0) {
    gameElapsed();
    run.scoreScale = 0.5;
    run.slowOn = true;
    state.shop.slow -= 1;
    state.shop.boostUsed.slow = (state.shop.boostUsed.slow || 0) + 1;
    document.body.classList.add("slow-mo");
    saveState();
    showToasts([{ plain: true, icon: "🐌", name: "Учётные секунды замедлены", desc: "Для топа время ползёт медленнее. Лимит — как обычно." }]);
  }
  if (id === "extra" && (run.extraUsed || 0) < EXTRA_MAX_PER_RUN && state.shop.extra > 0) {
    gameElapsed();
    run.scoreMs = Math.max(0, (run.scoreMs || 0) - 15000);
    run.gameMs = run.scoreMs;
    run.extraUsed = (run.extraUsed || 0) + 1;
    state.shop.extra -= 1;
    state.shop.boostUsed.extra = (state.shop.boostUsed.extra || 0) + 1;
    saveState();
    showToasts([{ plain: true, icon: "⏳", name: "−15 секунд", desc: `Учётное время урезано (${run.extraUsed}/${EXTRA_MAX_PER_RUN})` }]);
  }
  if (id === "cheat" && (run.battle ? run.roundLevel === 5 : run.level === 5) && state.shop.cheat > 0 && (run.forgive || 0) < CHEAT_MAX_PER_RUN) {
    run.forgive = (run.forgive || 0) + 1;
    state.shop.cheat -= 1;
    state.shop.boostUsed.cheat = (state.shop.boostUsed.cheat || 0) + 1;
    saveState();
    showToasts([{
      plain: true,
      icon: "🕵️",
      name: `Читер +${run.forgive}`,
      desc: `Ещё ${run.forgive} ошибк${run.forgive === 1 ? "а не считается" : "и не считаются"} для оценки.`,
    }]);
  }
  if (run.battle && id === "potion" && state.shop.potion > 0 && run.potionUsed < 2 && run.heroHp < run.heroMaxHp) {
    state.shop.potion -= 1;
    run.potionUsed += 1;
    state.shop.boostUsed.potion = (state.shop.boostUsed.potion || 0) + 1;
    run.heroHp = Math.min(run.heroMaxHp, run.heroHp + 1);
    saveState();
    renderBattleHud();
    showToasts([{ plain: true, icon: "🧪", name: "Зелье", desc: "+1 HP" }]);
  }
  if (run.battle && id === "megaPotion" && state.shop.megaPotion > 0 && run.megaPotionUsed < 1 && run.heroHp < run.heroMaxHp) {
    state.shop.megaPotion -= 1;
    run.megaPotionUsed += 1;
    state.shop.boostUsed.megaPotion = (state.shop.boostUsed.megaPotion || 0) + 1;
    run.heroHp = Math.min(run.heroMaxHp, run.heroHp + 2);
    saveState();
    renderBattleHud();
    showToasts([{ plain: true, icon: "🧴", name: "Большое зелье", desc: "+2 HP" }]);
  }
  if (run.battle && id === "shieldScroll" && state.shop.shieldScroll > 0 && run.shieldScrollUsed < 1) {
    state.shop.shieldScroll -= 1;
    run.shieldScrollUsed += 1;
    state.shop.boostUsed.shieldScroll = (state.shop.boostUsed.shieldScroll || 0) + 1;
    run.shieldCharges = (run.shieldCharges || 0) + 1;
    saveState();
    showToasts([{ plain: true, icon: "📜", name: "Свиток щита", desc: "Следующая ошибка заблокирована" }]);
  }
  renderBoostBar();
  renderHome();
}

function renderPaperDoll() {
  const host = document.getElementById("paperDoll");
  if (!host) return;
  const eq = state.shop.equip || emptyEquip();
  const slotIcon = (slot, id) => {
    if (slot === "head") return (HATS[id] && HATS[id].icon) || "🙂";
    if (slot === "body") return (bodyItem(id) && bodyItem(id).icon) || "👕";
    if (slot === "weapon") return (WEAPONS[id] && WEAPONS[id].icon) || "✋";
    if (slot === "relic") return (RELICS[id] && RELICS[id].icon) || "✦";
    if (slot === "accessory") {
      const a = eq.accessory || [];
      return a.length ? a.map((x) => (TOYS[x] && TOYS[x].icon) || "•").join("") : "🎒";
    }
    return "·";
  };
  const slots = [
    ["head", "Голова", eq.head],
    ["body", "Тело", eq.body],
    ["weapon", "Оружие", eq.weapon],
    ["accessory", "Штучки", (eq.accessory || []).join(",") || "none"],
    ["relic", "Реликвия", eq.relic],
  ];
  host.innerHTML = `
    <div class="paper-doll">
      <div class="paper-slots">
        ${slots.map(([slot, label, id]) => `
          <button type="button" class="paper-slot ${shopEquipFilter === slot ? "on" : ""}" data-equip-slot="${slot}">
            <span class="paper-ico">${slotIcon(slot, id)}</span>
            <span class="paper-lbl">${label}</span>
          </button>`).join("")}
      </div>
      <div class="paper-preview" id="paperPreview"></div>
    </div>`;
  const prev = document.getElementById("paperPreview");
  if (prev) prev.innerHTML = mascotMarkup(110, "happy");
}

function renderShop() {
  syncEquipMirrors(state.shop);
  els.shopCoins.textContent = String(state.coins);
  paintMascots();
  renderPaperDoll();
  const eq = state.shop.equip || emptyEquip();

  if (shopTab === "boosts") {
    els.shopList.innerHTML = BOOSTS.map((b) => {
      const n = state.shop[b.id] || 0;
      const can = state.coins >= b.price;
      return shopCard(b.icon, b.name, `${b.desc} У тебя: ${n} шт.`, b.price, can, "buy-boost", b.id, "Купить");
    }).join("");
    return;
  }
  if (shopTab === "care") {
    const c = ensureCare();
    let html = `<div class="shop-section">🍎 Еда (в запас)</div>`;
    html += Object.values(CARE_FOOD).map((f) => {
      const n = (c.food && c.food[f.id]) || 0;
      return shopCard(f.icon, f.name, `${f.desc}${(f.tags && f.tags[0]) ? ` · ${f.tags[0]}` : ""} · в запасе: ${n}`, f.price, state.coins >= f.price, "buy-care-food", f.id, "Купить");
    }).join("");
    html += `<div class="shop-section">🛏️ Комната (лучше сон)</div>`;
    html += Object.values(CARE_ROOM).map((r) => {
      const owned = careRoomOwned(r.id);
      return shopCard(
        r.icon,
        r.name,
        `${r.desc} · сон +${r.sleepBonus}`,
        owned ? 0 : r.price,
        owned || state.coins >= r.price,
        owned ? "on" : "buy-care-room",
        r.id,
        owned ? "Куплено" : "Купить",
        owned
      );
    }).join("");
    html += `<div class="shop-section">🧼 Гигиена</div>`;
    html += Object.values(CARE_WASH).map((w) => {
      const n = (c.wash && c.wash[w.id]) || 0;
      return shopCard(w.icon, w.name, `${w.desc} В запасе: ${n}`, w.price, state.coins >= w.price, "buy-care-wash", w.id, "Купить");
    }).join("");
    els.shopList.innerHTML = html;
    return;
  }
  if (shopTab === "looks" || shopEquipFilter === "head") {
    const skins = Object.values(SKINS).map((s) => {
      const owned = state.shop.skins.includes(s.id);
      const on = state.shop.skin === s.id;
      const action = owned ? (on ? "on" : "equip-skin") : "buy-skin";
      const label = on ? "Надет" : owned ? "Надеть" : "Купить";
      const formMark = s.form === "cat" ? "🐱" : s.form === "hedgehog" ? "🦔" : "";
      const ico = `<span class="skin-dot" style="background:${s.body}">${formMark ? `<span class="skin-form">${formMark}</span>` : ""}</span>`;
      return shopCard(ico, s.name, owned ? (s.form === "blob" ? "Цвет персонажа" : "Зверёк-облик") : "Новый окрас", s.price, owned || state.coins >= s.price, action, s.id, label, on);
    });
    const hats = Object.values(HATS).map((h) => {
      const owned = state.shop.hats.includes(h.id);
      const on = eq.head === h.id;
      const action = owned ? (on ? "on" : "equip-hat") : "buy-hat";
      const label = on ? "Надета" : owned ? "Надеть" : "Купить";
      return shopCard(h.icon, h.name, "Слот: голова", h.price, owned || state.coins >= h.price, action, h.id, label, on);
    });
    els.shopList.innerHTML = (shopTab === "looks" ? skins.join("") : "") + hats.join("");
    return;
  }
  if (shopTab === "gear" || shopEquipFilter === "body" || shopEquipFilter === "weapon") {
    const bodies = Object.values(BODIES).concat(RELICS.ironShield ? [RELICS.ironShield] : []).map((b) => {
      const id = b.id;
      const owned = (state.shop.bodies || []).includes(id) || id === "none";
      const on = eq.body === id;
      const rankMin = b.rankMin || 0;
      const rankOpen = state.stars >= rankMin;
      const action = owned ? (on ? "on" : "equip-body") : "buy-body";
      const label = on ? "Надето" : owned ? "Надеть" : "Купить";
      const can = owned || (rankOpen && state.coins >= (b.price || 0));
      return shopCard(b.icon, b.name, `${b.desc || "Слот: тело"}${b.battle ? " · бой" : ""}`, b.price || 0, can, action, id, label, on);
    });
    const weapons = Object.values(WEAPONS).map((w) => {
      const owned = (state.shop.weapons || []).includes(w.id) || w.id === "none";
      const on = eq.weapon === w.id;
      const rankMin = w.rankMin || 0;
      const rankOpen = state.stars >= rankMin;
      const action = owned ? (on ? "on" : "equip-weapon") : "buy-weapon";
      const label = on ? "В руках" : owned ? "Взять" : "Купить";
      const can = owned || (rankOpen && state.coins >= (w.price || 0));
      return shopCard(w.icon, w.name, `${w.desc || "Слот: оружие"}${w.battle ? " · бой" : ""}`, w.price || 0, can, action, w.id, label, on);
    });
    let html = "";
    if (shopTab === "gear" || shopEquipFilter === "body") html += `<div class="shop-section">Броня / тело</div>` + bodies.join("");
    if (shopTab === "gear" || shopEquipFilter === "weapon") html += `<div class="shop-section">Оружие</div>` + weapons.join("");
    els.shopList.innerHTML = html;
    return;
  }
  if (shopTab === "fx") {
    els.shopList.innerHTML = Object.values(FX).map((f) => {
      const owned = state.shop.fxOwned.includes(f.id);
      const on = state.shop.fx === f.id;
      const action = owned ? (on ? "on" : "equip-fx") : "buy-fx";
      const label = on ? "Включено" : owned ? "Включить" : "Купить";
      const ico = `<span class="fx-shop-ico fx-ico-${f.id}"></span>`;
      const priceNote = f.price >= 200 ? " · супердорого" : f.price >= 80 ? " · дорого" : "";
      return shopCard(ico, f.name, `${f.desc}${priceNote}`, f.price, owned || state.coins >= f.price, action, f.id, label, on);
    }).join("");
    return;
  }
  if (shopTab === "relics" || shopEquipFilter === "relic") {
    const myRank = rankFor(state.stars);
    els.shopList.innerHTML = Object.values(RELICS).filter((r) => r.slot !== "body" && r.id !== "ironShield").map((r) => {
      const owned = state.shop.relics.includes(r.id);
      const on = eq.relic === r.id;
      const rankOpen = state.stars >= r.rankMin;
      const canBuy = rankOpen && (owned || state.coins >= r.price);
      const action = owned ? (on ? "on" : "equip-relic") : "buy-relic";
      const label = on ? "Активен" : owned ? "Включить" : "Купить";
      const price = owned ? 0 : r.price;
      const rankNeed = rankOpen ? `<span class="rank-need">доступно (${myRank.name})</span>` : `<span class="rank-need">нужно: ${r.rank}</span>`;
      return `<article class="shop-card ${rankOpen ? "" : "locked-rank"}">
        <div class="ico"><span class="relic-ico">${r.icon}</span></div>
        <div class="name">${r.name}${rankNeed}</div>
        <button type="button" class="buy ${(!canBuy && !owned) || !rankOpen ? "ghost" : ""}" data-act="${action}" data-id="${r.id}" ${(!canBuy && !owned) || !rankOpen || action === "on" ? "disabled" : ""}>${label}${price ? ` · ${price}&nbsp;<span class="coin sm" aria-hidden="true"></span>` : ""}</button>
        <div class="desc">${r.desc}${r.battle ? " · бой" : ""} · слот реликвии</div>
      </article>`;
    }).join("");
    return;
  }
  if (shopTab === "skies") {
    unlockSkiesByRank();
    const myRank = rankFor(state.stars);
    els.shopList.innerHTML = Object.values(SKIES).filter((sky) => sky.rankMin < 99999 || state.shop.skies.includes(sky.id)).map((sky) => {
      const owned = state.shop.skies.includes(sky.id);
      const on = state.shop.sky === sky.id;
      const rankOpen = state.stars >= sky.rankMin;
      const action = owned ? (on ? "on" : "equip-sky") : "claim-sky";
      const label = on ? "Включено" : owned ? "Включить" : rankOpen ? "Открыть" : "Закрыто";
      const rankNeed = rankOpen
        ? `<span class="rank-need">за звание (${sky.rank})</span>`
        : `<span class="rank-need">нужно: ${sky.rank}</span>`;
      return `<article class="shop-card ${rankOpen ? "" : "locked-rank"}">
        <div class="ico"><span class="relic-ico sky-ico">${sky.icon}</span></div>
        <div class="name">${sky.name}${rankNeed}</div>
        <button type="button" class="buy ${!rankOpen && !owned ? "ghost" : ""}" data-act="${action}" data-id="${sky.id}" ${(!rankOpen && !owned) || action === "on" ? "disabled" : ""}>${label}</button>
        <div class="desc">${sky.desc} · бесплатно за звание · сейчас: ${myRank.name}</div>
      </article>`;
    }).join("");
    return;
  }
  if (shopTab === "skills") {
    const myRank = rankFor(state.stars);
    const header = `<article class="shop-card skill-rules">
      <div class="ico"><span class="relic-ico skill-ico">⚡</span></div>
      <div class="name">Скиллы</div>
      <div class="desc">
        Купи скилл за монеты (нужно звание на карточке) и жми <strong>Надеть</strong>.<br>
        В игре появится кнопка скилла. Сейчас: <strong>${myRank.name}</strong> (${state.stars}⭐).
      </div>
    </article>`;
    const unequip = state.shop.skill && state.shop.skill !== "none"
      ? `<article class="shop-card">
          <div class="ico"><span class="relic-ico skill-ico">∅</span></div>
          <div class="name">Без скилла</div>
          <button type="button" class="buy ghost" data-act="equip-skill" data-id="none">Снять</button>
          <div class="desc">Убрать активный скилл</div>
        </article>`
      : "";
    els.shopList.innerHTML = header + unequip + Object.values(SKILLS).map((sk) => {
      const gate = skillGateOpen(sk);
      const owned = (state.shop.skills || []).includes(sk.id);
      const on = state.shop.skill === sk.id;
      const needRankMin = sk.rankMin || 0;
      const hasRank = state.stars >= needRankMin;
      const canPurchase = !owned && gate && hasRank && state.coins >= sk.price;
      let action;
      let label;
      let disabled;
      if (owned) {
        action = on ? "on" : "equip-skill";
        label = on ? "Надет" : "Надеть";
        disabled = on; // купленный всегда можно надеть
      } else {
        action = "buy-skill";
        label = "Купить";
        disabled = !canPurchase;
      }
      const price = owned ? 0 : sk.price;
      let needGate = "";
      let reqLine = "";
      if (sk.battleOnly) {
        needGate = `<span class="rank-need ok">босс</span>`;
        reqLine = "<br>Только в бою с боссом.";
      } else if (sk.needProfession) {
        const profName = Object.values(PROFESSIONS).flat().find((p) => p.id === sk.needProfession)?.name || sk.needProfession;
        needGate = gate
          ? `<span class="rank-need ok">«${profName}» ✓</span>`
          : `<span class="rank-need">нужна «${profName}»</span>`;
      } else if (sk.secretMode) {
        const secretName = sk.secretMode === MODE_CHAIN ? "2 действия" : "База";
        needGate = gate
          ? `<span class="rank-need ok">секрет ✓</span>`
          : `<span class="rank-need">секрет «${secretName}» 10/10</span>`;
      }
      const needRank = hasRank
        ? `<span class="rank-need ok">${sk.rank || "OK"} ✓</span>`
        : `<span class="rank-need warn">${sk.rank || "ранг"} (${needRankMin}⭐)</span>`;
      const lockedLook = !owned && (!gate || !hasRank);
      return `<article class="shop-card ${lockedLook ? "locked-rank" : ""}${on ? " skill-on" : ""}">
        <div class="ico"><span class="relic-ico skill-ico">${sk.icon}</span></div>
        <div class="name">${sk.name}${needGate}${needRank}</div>
        <button type="button" class="buy ${disabled && !on ? "ghost" : ""}${on ? " ghost" : ""}" data-act="${action}" data-id="${sk.id}" ${disabled ? "disabled" : ""}>${label}${price ? ` · ${price}&nbsp;<span class="coin sm" aria-hidden="true"></span>` : ""}</button>
        <div class="desc">${sk.desc}${reqLine}</div>
      </article>`;
    }).join("");
    return;
  }
  if (shopTab === "inventory") {
    const rows = [];
    (state.shop.hats || []).filter((id) => id !== "none").forEach((id) => {
      const h = HATS[id]; if (!h) return;
      rows.push(shopCard(h.icon, h.name, "Инвентарь · голова", 0, true, eq.head === id ? "on" : "equip-hat", id, eq.head === id ? "Надето" : "Надеть", eq.head === id));
    });
    (state.shop.bodies || []).filter((id) => id !== "none").forEach((id) => {
      const b = bodyItem(id); if (!b) return;
      rows.push(shopCard(b.icon, b.name, "Инвентарь · тело", 0, true, eq.body === id ? "on" : "equip-body", id, eq.body === id ? "Надето" : "Надеть", eq.body === id));
    });
    (state.shop.weapons || []).filter((id) => id !== "none").forEach((id) => {
      const w = WEAPONS[id]; if (!w) return;
      rows.push(shopCard(w.icon, w.name, "Инвентарь · оружие", 0, true, eq.weapon === id ? "on" : "equip-weapon", id, eq.weapon === id ? "В руках" : "Взять", eq.weapon === id));
    });
    (state.shop.toys || []).forEach((id) => {
      const t = TOYS[id]; if (!t) return;
      const on = (eq.accessory || []).includes(id);
      rows.push(shopCard(t.icon, t.name, "Инвентарь · штучка", 0, true, on ? "off-toy" : "equip-toy", id, on ? "Снять" : "Надеть", on));
    });
    (state.shop.relics || []).forEach((id) => {
      const r = RELICS[id]; if (!r) return;
      rows.push(shopCard(r.icon, r.name, "Инвентарь · реликвия", 0, true, eq.relic === id ? "on" : "equip-relic", id, eq.relic === id ? "Активен" : "Включить", eq.relic === id));
    });
    els.shopList.innerHTML = rows.length
      ? rows.join("")
      : `<article class="shop-card"><div class="name">Пусто</div><div class="desc">Купи вещи во вкладках — они появятся здесь.</div></article>`;
    return;
  }
  // toys / accessory
  els.shopList.innerHTML = Object.values(TOYS).filter((t) => !t.secret || state.shop.toys.includes(t.id)).map((t) => {
    const owned = state.shop.toys.includes(t.id);
    const on = (eq.accessory || []).includes(t.id);
    const action = owned ? (on ? "off-toy" : "equip-toy") : "buy-toy";
    const label = on ? "Снять" : owned ? "Надеть" : "Купить";
    let ico = t.icon;
    if (t.id === "wand") {
      ico = `<span class="toy-shop-ico wand"><span class="wand-shaft"></span><span class="wand-star"></span></span>`;
    } else if (t.id === "mathbook" || t.id === "fiveplus" || t.id === "shades") {
      ico = `<span class="toy-shop-ico ${t.id}"></span>`;
    }
    const rarity = t.price >= 1200 ? " · самое дорогое" : t.price >= 250 ? " · редко" : "";
    return shopCard(
      ico,
      t.name,
      `${on ? "На персонаже" : "Слот: штучки (макс. 2)"}${rarity}`,
      t.price,
      owned || state.coins >= t.price,
      action,
      t.id,
      label,
      on
    );
  }).join("");
}

function shopCard(ico, name, desc, price, can, action, id, label, on) {
  const priceHtml = action.startsWith("buy")
    ? ` · ${price}&nbsp;<span class="coin sm" aria-hidden="true"></span>`
    : "";
  const disabled = action === "on" ? "disabled" : "";
  const ghost = action !== "on" && !action.startsWith("buy") ? "ghost" : "";
  const poor = action.startsWith("buy") && !can ? " ghost" : "";
  return `<article class="shop-card">
    <div class="ico">${ico}</div>
    <div class="name">${name}</div>
    <button type="button" class="buy ${ghost}${poor}" data-act="${action}" data-id="${id}" ${disabled}>${on && action === "on" ? "Надето" : `${label}${priceHtml}`}</button>
    <div class="desc">${desc}</div>
  </article>`;
}

function shopAction(act, id) {
  if (act === "buy-care-food") {
    buyCareFood(id);
    return;
  }
  if (act === "buy-care-room") {
    buyCareRoom(id);
    return;
  }
  if (act === "buy-care-wash") {
    buyCareWash(id);
    return;
  }
  if (act === "buy-boost") {
    const item = BOOSTS.find((b) => b.id === id);
    if (!item || state.coins < item.price) return notEnough();
    state.coins -= item.price;
    state.shop[id] = (state.shop[id] || 0) + 1;
    pingBuy(item.icon, item.name);
  } else if (act === "buy-skin") {
    const item = SKINS[id];
    if (!item || state.coins < item.price) return notEnough();
    state.coins -= item.price;
    if (!state.shop.skins.includes(id)) state.shop.skins.push(id);
    state.shop.skin = id;
    pingBuy("🎨", item.name);
  } else if (act === "equip-skin") {
    state.shop.skin = id;
  } else if (act === "buy-hat") {
    const item = HATS[id];
    if (!item || state.coins < item.price) return notEnough();
    state.coins -= item.price;
    if (!state.shop.hats.includes(id)) state.shop.hats.push(id);
    state.shop.equip = state.shop.equip || emptyEquip();
    state.shop.equip.head = id;
    syncEquipMirrors(state.shop);
    pingBuy(item.icon, item.name);
  } else if (act === "equip-hat") {
    state.shop.equip = state.shop.equip || emptyEquip();
    state.shop.equip.head = id;
    syncEquipMirrors(state.shop);
  } else if (act === "buy-body") {
    const item = bodyItem(id);
    if (!item || id === "none") return;
    if ((item.rankMin || 0) > state.stars) return;
    if (state.coins < (item.price || 0)) return notEnough();
    state.coins -= item.price || 0;
    if (!state.shop.bodies.includes(id)) state.shop.bodies.push(id);
    state.shop.equip = state.shop.equip || emptyEquip();
    state.shop.equip.body = id;
    syncEquipMirrors(state.shop);
    pingBuy(item.icon, item.name);
  } else if (act === "equip-body") {
    state.shop.equip = state.shop.equip || emptyEquip();
    state.shop.equip.body = id;
    syncEquipMirrors(state.shop);
  } else if (act === "buy-weapon") {
    const item = WEAPONS[id];
    if (!item || id === "none") return;
    if ((item.rankMin || 0) > state.stars) return;
    if (state.coins < (item.price || 0)) return notEnough();
    state.coins -= item.price || 0;
    if (!state.shop.weapons.includes(id)) state.shop.weapons.push(id);
    state.shop.equip = state.shop.equip || emptyEquip();
    state.shop.equip.weapon = id;
    syncEquipMirrors(state.shop);
    pingBuy(item.icon, item.name);
  } else if (act === "equip-weapon") {
    state.shop.equip = state.shop.equip || emptyEquip();
    state.shop.equip.weapon = id;
    syncEquipMirrors(state.shop);
  } else if (act === "buy-toy") {
    const item = TOYS[id];
    if (!item || state.coins < item.price) return notEnough();
    state.coins -= item.price;
    if (!state.shop.toys.includes(id)) state.shop.toys.push(id);
    state.shop.equip = state.shop.equip || emptyEquip();
    if ((state.shop.equip.accessory || []).length < ACCESSORY_MAX && !state.shop.equip.accessory.includes(id)) {
      state.shop.equip.accessory.push(id);
    }
    syncEquipMirrors(state.shop);
    pingBuy(item.icon, item.name);
  } else if (act === "equip-toy") {
    state.shop.equip = state.shop.equip || emptyEquip();
    const acc = state.shop.equip.accessory || [];
    if (acc.includes(id)) return;
    if (acc.length >= ACCESSORY_MAX) {
      showToasts([{ plain: true, icon: "🎒", name: "Много штучек", desc: `Сними одну (макс. ${ACCESSORY_MAX}).` }]);
      return;
    }
    acc.push(id);
    state.shop.equip.accessory = acc;
    syncEquipMirrors(state.shop);
  } else if (act === "off-toy") {
    state.shop.equip = state.shop.equip || emptyEquip();
    state.shop.equip.accessory = (state.shop.equip.accessory || []).filter((t) => t !== id);
    syncEquipMirrors(state.shop);
  } else if (act === "buy-fx") {
    const item = FX[id];
    if (!item || state.coins < item.price) return notEnough();
    state.coins -= item.price;
    if (!state.shop.fxOwned.includes(id)) state.shop.fxOwned.push(id);
    state.shop.fx = id;
    pingBuy(item.icon, item.name);
  } else if (act === "equip-fx") {
    if (!state.shop.fxOwned.includes(id)) return;
    state.shop.fx = id;
  } else if (act === "buy-relic") {
    const item = RELICS[id];
    if (!item) return;
    if (state.stars < item.rankMin) return;
    if (item.price > 0 && state.coins < item.price) return notEnough();
    if (item.price > 0) state.coins -= item.price;
    if (!state.shop.relics.includes(id)) state.shop.relics.push(id);
    state.shop.equip = state.shop.equip || emptyEquip();
    state.shop.equip.relic = id;
    syncEquipMirrors(state.shop);
    pingBuy(item.icon, item.name);
  } else if (act === "equip-relic") {
    if (!state.shop.relics.includes(id)) return;
    state.shop.equip = state.shop.equip || emptyEquip();
    state.shop.equip.relic = id;
    syncEquipMirrors(state.shop);
  } else if (act === "claim-sky") {
    const item = SKIES[id];
    if (!item) return;
    if (state.stars < item.rankMin) return;
    if (!state.shop.skies.includes(id)) state.shop.skies.push(id);
    state.shop.sky = id;
    pingBuy(item.icon, item.name);
  } else if (act === "equip-sky") {
    if (!state.shop.skies.includes(id)) return;
    state.shop.sky = id;
  } else if (act === "buy-skill") {
    const item = SKILLS[id];
    if (!item) return;
    if (!skillGateOpen(item)) {
      showToasts([{ plain: true, icon: "🔒", name: "Пока закрыто", desc: "Смотри требования на карточке скилла." }]);
      return;
    }
    if (state.stars < (item.rankMin || 0)) {
      showToasts([{ plain: true, icon: "👑", name: `Нужен ${item.rank || "ранг"}`, desc: `Скилл с ${item.rankMin || 0}⭐.` }]);
      return;
    }
    if (state.coins < item.price) return notEnough();
    state.coins -= item.price;
    if (!state.shop.skills) state.shop.skills = [];
    if (!state.shop.skills.includes(id)) state.shop.skills.push(id);
    state.shop.skill = id;
    pingBuy(item.icon, item.name);
    showToasts([{ plain: true, icon: item.icon, name: "Скилл надет!", desc: `${item.name} — кнопка в игре` }]);
  } else if (act === "equip-skill") {
    if (id === "none") {
      state.shop.skill = "none";
      showToasts([{ plain: true, icon: "∅", name: "Скилл снят", desc: "Можно надеть другой." }]);
    } else {
      if (!state.shop.skills) state.shop.skills = [];
      if (!state.shop.skills.includes(id)) {
        showToasts([{ plain: true, icon: "🔒", name: "Сначала купи", desc: "Скилл нужно купить." }]);
        return;
      }
      state.shop.skill = id;
      const item = SKILLS[id];
      showToasts([{ plain: true, icon: item?.icon || "⚡", name: "Надето!", desc: item?.name || id }]);
    }
  }
  saveState();
  renderShop();
  renderHome();
}



/* kingdom quiz + forge + retune helpers — injected into app.js */

function kingdomSoftHint(msg) {
  const hint = document.getElementById("kingdomHint");
  if (hint) hint.textContent = msg;
}

function kingdomHasModeProgress(modeId) {
  return state.runs.some((r) => (r.mode || MODE_BASIC) === modeId && (r.correct || 0) >= 5);
}

function kingdomHasPerfect(modeId, levelId) {
  return state.runs.some((r) =>
    (r.mode || MODE_BASIC) === modeId && (r.level || 1) === levelId && r.correct === 10
  );
}

/** Случайная задача из уже тронутого материала (закрепление). */
function makeKingdomDrill() {
  const options = [];
  if (kingdomHasModeProgress(MODE_BASIC) || kingdomHasModeProgress(MODE_CHAIN)) {
    options.push("math");
  }
  if (kingdomHasModeProgress(MODE_MUL)) options.push("mul");
  if (kingdomHasModeProgress(MODE_DIV)) options.push("div");
  if (kingdomHasModeProgress(MODE_ENG)) options.push("eng");
  if (kingdomHasModeProgress(MODE_CODE)) options.push("code");
  if (safeClearedCount() >= 1) options.push("safe");
  if (!options.length) options.push("math");

  const kind = options[rand(0, options.length - 1)];
  if (kind === "eng") {
    const prev = selectedMode;
    selectedMode = MODE_ENG;
    const lvl = [1, 2, 3, 4, 5].filter((l) => kingdomHasPerfect(MODE_ENG, l) || kingdomHasModeProgress(MODE_ENG)).pop() || 1;
    const p = generateEngProblem(Math.min(lvl, 3));
    selectedMode = prev;
    return { ...p, drillLabel: "Английский" };
  }
  if (kind === "code") {
    const prev = selectedMode;
    selectedMode = MODE_CODE;
    const p = generateCodeProblem(kingdomHasPerfect(MODE_CODE, 2) ? 2 : 1);
    selectedMode = prev;
    return { ...p, drillLabel: "ПК" };
  }
  if (kind === "safe") {
    const cleared = SAFE_SCENARIOS.filter((s) => state.safeCleared && state.safeCleared[s.id]);
    const bank = cleared.length ? cleared : SAFE_SCENARIOS.slice(0, 3);
    const sc = bank[rand(0, bank.length - 1)];
    const okIdx = sc.choices.findIndex((c) => c.ok);
    const choices = sc.choices.map((c) => c.text);
    return {
      text: `🛡 ${sc.scene}`,
      choice: true,
      choices,
      answer: okIdx + 1,
      hint: "Вспомни квест безопасности",
      drillLabel: "Безопасность",
    };
  }
  if (kind === "mul") {
    const prev = selectedMode;
    selectedMode = MODE_MUL;
    const p = generateMulProblem(kingdomHasPerfect(MODE_MUL, 2) ? 2 : 1);
    selectedMode = prev;
    return { ...p, text: p.text || `${p.a} × ${p.b} = ?`, drillLabel: "Умножение" };
  }
  if (kind === "div") {
    const prev = selectedMode;
    selectedMode = MODE_DIV;
    const p = generateDivProblem(kingdomHasPerfect(MODE_DIV, 2) ? 2 : 1);
    selectedMode = prev;
    return { ...p, text: p.text || `${p.a} ÷ ${p.b} = ?`, drillLabel: "Деление" };
  }
  // math default — лёгкий/средний из пройденного
  const hardEnough = kingdomHasPerfect(MODE_BASIC, 2) || kingdomHasPerfect(MODE_CHAIN, 2);
  const p = hardEnough ? generateMedium() : generateEasy();
  return {
    ...p,
    text: p.text || `${p.a} ${p.op} ${p.b} = ?`,
    drillLabel: "Счёт",
  };
}

let kingdomGate = null; // { action, drill, input }

function closeKingdomGate() {
  kingdomGate = null;
  const modal = document.getElementById("kingdomGate");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }
  document.body.classList.remove("kd-gate-open");
}

function openKingdomGate(action) {
  if (kingdomGate) return; // уже открыто — не плодим окна
  const drill = makeKingdomDrill();
  kingdomGate = { action, drill, input: "" };
  const modal = document.getElementById("kingdomGate");
  if (!modal) {
    // fallback без UI
    kingdomResolveGate(true);
    return;
  }
  document.getElementById("kdGateLabel").textContent = `Закрепление: ${drill.drillLabel || "задача"}`;
  document.getElementById("kdGateProblem").innerHTML = escapeHtml(drill.text || "").replace(/\n/g, "<br>");
  const hint = document.getElementById("kdGateHint");
  if (hint) hint.textContent = drill.hint || "Ответь верно — и действие выполнится.";
  const choices = document.getElementById("kdGateChoices");
  const numRow = document.getElementById("kdGateNum");
  if (drill.choice && Array.isArray(drill.choices)) {
    choices.classList.remove("hidden");
    numRow.classList.add("hidden");
    choices.innerHTML = drill.choices.map((c, i) =>
      `<button type="button" class="kd-gate-choice" data-kd-ans="${i + 1}"><span>${i + 1}</span> ${escapeHtml(String(c))}</button>`
    ).join("");
  } else {
    choices.classList.add("hidden");
    numRow.classList.remove("hidden");
    document.getElementById("kdGateAnswer").textContent = "?";
  }
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("kd-gate-open");
}

function kingdomGateSetInput(v) {
  if (!kingdomGate || kingdomGate.drill.choice) return;
  kingdomGate.input = String(v).slice(0, 4);
  const el = document.getElementById("kdGateAnswer");
  if (el) el.textContent = kingdomGate.input || "?";
}

function kingdomGateSubmitChoice(n) {
  if (!kingdomGate) return;
  const ok = Number(n) === Number(kingdomGate.drill.answer);
  kingdomResolveGate(ok);
}

function kingdomGateSubmitNum() {
  if (!kingdomGate || kingdomGate.drill.choice) return;
  const ok = Number(kingdomGate.input) === Number(kingdomGate.drill.answer);
  kingdomResolveGate(ok);
}

function kingdomResolveGate(ok) {
  const action = kingdomGate && kingdomGate.action;
  closeKingdomGate();
  if (!ok) {
    // при провале — короткая отсечка на рубку, чтобы не спамить задачи
    if (action && action.type === "gather" && action.slot != null) {
      const k = ensureKingdom();
      const left = kingdomGatherLeft(action.slot);
      if (left < KINGDOM_GATHER_FAIL_CD_MS) {
        k.gatherAt[action.slot] = Date.now() + KINGDOM_GATHER_FAIL_CD_MS;
        saveState();
      }
    }
    kingdomSoftHint("Неверно — подожди и попробуй ещё раз.");
    showToasts([{ plain: true, icon: "❌", name: "Мимо", desc: "Реши задачу верно. На ресурс — пауза." }]);
    renderKingdom();
    return;
  }
  if (!action) return;
  let done = false;
  if (action.type === "collect") {
    collectKingdom(false, true);
    done = true;
  } else if (action.type === "gather") {
    kingdomGather(action.slot, true);
    done = true;
  } else if (action.type === "place") {
    done = kingdomPlace(action.slot, true, action.buildingId);
  } else if (action.type === "upgrade") {
    done = kingdomPlace(action.slot, true);
  } else if (action.type === "forge") {
    kingdomForge(action.recipeId, true);
    done = true;
  } else if (action.type === "clear") {
    kingdomClearNature(action.slot, true);
    done = true;
  }
  kingdomSoftHint(done === false ? "Действие не выполнено (проверь ресурсы)." : "Верно! Действие выполнено.");
}

const KINGDOM_FORGE = {
  brick: {
    id: "brick",
    name: "Кирпич",
    ico: "🧱",
    need: { stone: 5, wood: 0, coins: 0 },
    desc: "Из камня. +1 к защите построек (скидка апгрейда 5%).",
  },
  gem: {
    id: "gem",
    name: "Самоцвет",
    ico: "💎",
    need: { stone: 10, wood: 4, coins: 8 },
    desc: "Ковка. Каждый даёт +3% монет с королевства (макс. 5).",
  },
  charm: {
    id: "charm",
    name: "Амулет двора",
    ico: "🔮",
    need: { stone: 6, wood: 6, coins: 15 },
    desc: "В инвентарь маскота (штучка). Красиво и +1★ при сборе, если надет.",
  },
};

function kingdomForgeBonus() {
  const k = ensureKingdom();
  const gems = Math.min(5, k.forge?.gem || 0);
  const bricks = k.forge?.brick || 0;
  return {
    coinMul: 1 + gems * 0.03,
    upgradeDisc: Math.min(0.25, bricks * 0.05),
    charmOn: ((k.equipCharm) || (state.shop?.equip?.accessory || []).includes("kdCharm")),
  };
}

function kingdomForge(recipeId, unlocked = false) {
  const recipe = KINGDOM_FORGE[recipeId];
  if (!recipe) return;
  if (!unlocked) {
    openKingdomGate({ type: "forge", recipeId });
    return;
  }
  const k = ensureKingdom();
  const need = recipe.need;
  if (state.coins < need.coins || (k.wood || 0) < need.wood || (k.stone || 0) < need.stone) {
    kingdomSoftHint(`Мало ресурсов для ковки: нужно ${kingdomFormatCost(need)}`);
    return;
  }
  state.coins -= need.coins;
  k.wood -= need.wood;
  k.stone -= need.stone;
  if (!k.forge) k.forge = { brick: 0, gem: 0, charm: 0 };
  k.forge[recipeId] = (k.forge[recipeId] || 0) + 1;
  if (recipeId === "charm") {
    if (!state.shop.toys.includes("kdCharm")) state.shop.toys.push("kdCharm");
    state.shop.equip = state.shop.equip || emptyEquip();
    const acc = state.shop.equip.accessory || [];
    if (acc.length < ACCESSORY_MAX && !acc.includes("kdCharm")) {
      acc.push("kdCharm");
      state.shop.equip.accessory = acc;
      syncEquipMirrors(state.shop);
    }
    k.equipCharm = true;
  }
  saveState();
  showToasts([{ plain: true, icon: recipe.ico, name: "Выковано!", desc: recipe.name }]);
  unlockAchievements();
  renderKingdom();
}

/* ——— Королевство маскота ——— */
let kingdomBuildPick = null;
let kingdomTimerId = 0;

function emptyKingdom() {
  const slots = Array(KINGDOM_SLOTS).fill(null);
  slots[KINGDOM_CASTLE_SLOT] = "castle";
  slots[0] = "tree";
  slots[2] = "tree";
  slots[3] = "bush";
  slots[8] = "rock";
  slots[10] = "rock";
  slots[11] = "tree";
  return {
    slots,
    lastCollectAt: Date.now(),
    levels: {},
    wood: 6,
    stone: 4,
    gatherAt: {},
    forge: { brick: 0, gem: 0, charm: 0 },
  };
}

function normalizeKingdom(raw) {
  const base = emptyKingdom();
  if (!raw || typeof raw !== "object") return base;
  let slots = Array.isArray(raw.slots) ? raw.slots.slice(0, KINGDOM_SLOTS) : base.slots.slice();
  while (slots.length < KINGDOM_SLOTS) slots.push(null);
  slots = slots.map((id) => {
    if (!id) return null;
    if (KINGDOM_BUILDINGS[id] || KINGDOM_NATURE[id]) return id;
    return null;
  });
  if (slots[KINGDOM_CASTLE_SLOT] !== "castle") slots[KINGDOM_CASTLE_SLOT] = "castle";
  const levels = (raw.levels && typeof raw.levels === "object") ? { ...raw.levels } : {};
  const gatherAt = (raw.gatherAt && typeof raw.gatherAt === "object") ? { ...raw.gatherAt } : {};
  // migrate old 9-slot saves: keep known tiles, pad nature if empty map
  const built = slots.filter((id) => id && id !== "castle").length;
  if (built === 0 && !raw.wood && !raw.stone) {
    return base;
  }
  const forgeRaw = (raw.forge && typeof raw.forge === "object") ? raw.forge : {};
  return {
    slots,
    lastCollectAt: Math.max(0, Number(raw.lastCollectAt) || Date.now()),
    levels,
    wood: Math.max(0, Number(raw.wood) || 0),
    stone: Math.max(0, Number(raw.stone) || 0),
    gatherAt,
    forge: {
      brick: Math.max(0, Number(forgeRaw.brick) || 0),
      gem: Math.max(0, Number(forgeRaw.gem) || 0),
      charm: Math.max(0, Number(forgeRaw.charm) || 0),
    },
  };
}

function ensureKingdom() {
  if (!state.kingdom) state.kingdom = emptyKingdom();
  state.kingdom = normalizeKingdom(state.kingdom);
  return state.kingdom;
}

function kingdomBuildingCount() {
  const k = ensureKingdom();
  return k.slots.filter((id) => id && KINGDOM_BUILDINGS[id] && id !== "castle").length;
}

function kingdomLevelOf(slotIndex) {
  const k = ensureKingdom();
  const lv = Number(k.levels[slotIndex]);
  return Math.max(1, Number.isFinite(lv) ? lv : 1);
}

function kingdomRates() {
  const k = ensureKingdom();
  let coinPerHour = 0;
  let starPerHour = 0;
  let woodPerHour = 0;
  let stonePerHour = 0;
  k.slots.forEach((id, i) => {
    const b = KINGDOM_BUILDINGS[id];
    if (!b) return;
    const lv = kingdomLevelOf(i);
    coinPerHour += (b.rate || 0) * lv;
    starPerHour += (b.starRate || 0) * lv;
    woodPerHour += (b.woodRate || 0) * lv;
    stonePerHour += (b.stoneRate || 0) * lv;
  });
  const bonus = kingdomForgeBonus();
  coinPerHour = Math.floor(coinPerHour * bonus.coinMul);
  return { coinPerHour, starPerHour, woodPerHour, stonePerHour };
}

function kingdomPending() {
  const k = ensureKingdom();
  const now = Date.now();
  const elapsed = Math.min(KINGDOM_COLLECT_CAP_MS, Math.max(0, now - (k.lastCollectAt || now)));
  const hours = elapsed / (60 * 60 * 1000);
  const rates = kingdomRates();
  return {
    coins: Math.floor(rates.coinPerHour * hours),
    stars: Math.floor(rates.starPerHour * hours),
    wood: Math.floor(rates.woodPerHour * hours),
    stone: Math.floor(rates.stonePerHour * hours),
    elapsed,
    rates,
    capped: elapsed >= KINGDOM_COLLECT_CAP_MS,
  };
}

function collectKingdom(silent = false, unlocked = false) {
  const k0 = ensureKingdom();
  const since = Date.now() - (Number(k0.lastCollectAt) || 0);
  if (!unlocked) {
    if (since < KINGDOM_COLLECT_MIN_MS) {
      const sec = Math.ceil((KINGDOM_COLLECT_MIN_MS - since) / 1000);
      kingdomSoftHint(`Сбор подожди ещё ${sec}с — нельзя кликать без паузы.`);
      return kingdomPending();
    }
    const pend = kingdomPending();
    if (pend.coins < 1 && pend.stars < 1 && pend.wood < 1 && pend.stone < 1) {
      kingdomSoftHint("Пока копить нечего — построй здания или подожди.");
      return pend;
    }
    openKingdomGate({ type: "collect" });
    return pend;
  }
  const pend = kingdomPending();
  const k = ensureKingdom();
  if (pend.coins < 1 && pend.stars < 1 && pend.wood < 1 && pend.stone < 1) {
    kingdomSoftHint("Пока копить нечего — построй здания или подожди.");
    return pend;
  }
  let starsGain = pend.stars;
  if (kingdomForgeBonus().charmOn) starsGain += 1;
  state.coins += pend.coins;
  state.stars += starsGain;
  k.wood = (k.wood || 0) + pend.wood;
  k.stone = (k.stone || 0) + pend.stone;
  k.lastCollectAt = Date.now();
  saveState();
  const fresh = unlockAchievements();
  const bits = [];
  if (pend.coins) bits.push(`+${pend.coins}🪙`);
  if (pend.wood) bits.push(`+${pend.wood}🪵`);
  if (pend.stone) bits.push(`+${pend.stone}🪨`);
  if (starsGain) bits.push(`+${starsGain}★`);
  if (!silent) showToasts([{ plain: true, icon: "📦", name: "Склад пополнен!", desc: bits.join(" · ") }]);
  if (fresh.length) showToasts(fresh.slice(0, 2).map((a) => ({ icon: a.icon, name: a.name, desc: a.desc })));
  renderKingdom();
  if (els.totalCoins) els.totalCoins.textContent = String(state.coins);
  if (els.totalStars) els.totalStars.textContent = String(state.stars);
  return pend;
}

function kingdomUpgradePrice(slotIndex) {
  const k = ensureKingdom();
  const id = k.slots[slotIndex];
  const b = KINGDOM_BUILDINGS[id];
  if (!b || b.fixed) return kingdomCostOf(b || {}, 0);
  const lv = kingdomLevelOf(slotIndex);
  const disc = 1 - kingdomForgeBonus().upgradeDisc;
  return kingdomCostOf(b, (0.75 + lv * 0.6) * disc);
}

function kingdomHasForgeBuilding() {
  return ensureKingdom().slots.some((id) => id === "forge");
}

function kingdomGatherReady(slotIndex) {
  const k = ensureKingdom();
  const at = Number(k.gatherAt[slotIndex] || 0);
  return Date.now() >= at;
}

function kingdomGatherLeft(slotIndex) {
  const k = ensureKingdom();
  const at = Number(k.gatherAt[slotIndex] || 0);
  return Math.max(0, at - Date.now());
}

function kingdomGather(slotIndex, unlocked = false) {
  const k = ensureKingdom();
  const id = k.slots[slotIndex];
  const nat = KINGDOM_NATURE[id];
  if (!nat) return false;
  if (!kingdomGatherReady(slotIndex)) {
    const sec = Math.ceil(kingdomGatherLeft(slotIndex) / 1000);
    kingdomSoftHint(`${nat.name}: подожди ещё ${sec} сек.`);
    return false;
  }
  if (!unlocked) {
    // короткая блокировка на время задачи — нельзя спамить кликами
    k.gatherAt[slotIndex] = Date.now() + KINGDOM_GATHER_FAIL_CD_MS;
    saveState();
    openKingdomGate({ type: "gather", slot: slotIndex });
    renderKingdom();
    return false;
  }
  const amt = nat.amount || 1;
  if (nat.gather === "wood") k.wood = (k.wood || 0) + amt;
  if (nat.gather === "stone") k.stone = (k.stone || 0) + amt;
  // полный кулдаун уже стоит с открытия гейта; продлим от момента успеха
  k.gatherAt[slotIndex] = Date.now() + KINGDOM_GATHER_CD_MS;
  saveState();
  showToasts([{
    plain: true,
    icon: nat.ico,
    name: nat.gather === "wood" ? "Дерево!" : "Камень!",
    desc: `+${amt} · следующая рубка через ${Math.round(KINGDOM_GATHER_CD_MS / 60000)} мин`,
  }]);
  unlockAchievements();
  renderKingdom();
  return true;
}

function renderKingdom() {
  const map = document.getElementById("kingdomMap");
  const shop = document.getElementById("kingdomShop");
  const stats = document.getElementById("kingdomStats");
  const pendEl = document.getElementById("kingdomPending");
  const bag = document.getElementById("kingdomBag");
  if (!map || !shop) return;
  const k = ensureKingdom();
  const pend = kingdomPending();
  const rates = pend.rates;

  const m = document.getElementById("kingdomMascot");
  if (m) paintStage("kingdomStage", m, 96, "happy", "");

  if (bag) {
    const f = k.forge || {};
    bag.innerHTML = `
      <span title="Монеты">🪙 <strong>${state.coins}</strong></span>
      <span title="Дерево">🪵 <strong>${k.wood || 0}</strong></span>
      <span title="Камень">🪨 <strong>${k.stone || 0}</strong></span>
      <span title="Кирпичи">🧱 <strong>${f.brick || 0}</strong></span>
      <span title="Самоцветы">💎 <strong>${f.gem || 0}</strong></span>
      <span title="Опыт">★ <strong>${state.stars}</strong></span>`;
  }
  if (stats) {
    stats.innerHTML = `
      <div><strong>${rates.coinPerHour}</strong><span>🪙/час</span></div>
      <div><strong>${rates.woodPerHour}</strong><span>🪵/час</span></div>
      <div><strong>${rates.stonePerHour}</strong><span>🪨/час</span></div>
      <div><strong>${kingdomBuildingCount()}</strong><span>домов</span></div>`;
  }
  if (pendEl) {
    const bits = [];
    if (pend.coins) bits.push(`🪙${pend.coins}`);
    if (pend.wood) bits.push(`🪵${pend.wood}`);
    if (pend.stone) bits.push(`🪨${pend.stone}`);
    if (pend.stars) bits.push(`★${pend.stars}`);
    const cap = pend.capped ? " · склад полон (8ч)" : "";
    pendEl.textContent = bits.length
      ? `Готово к сбору: ${bits.join(" ")}${cap}`
      : `Копится… 🪙${rates.coinPerHour} 🪵${rates.woodPerHour} 🪨${rates.stonePerHour} /час${cap}`;
  }

  map.innerHTML = k.slots.map((id, i) => {
    const nat = KINGDOM_NATURE[id];
    const b = KINGDOM_BUILDINGS[id];
    const pick = kingdomBuildPick && !id ? " can-build" : "";
    const mid = i === KINGDOM_CASTLE_SLOT ? " throne" : "";
    if (!id) {
      return `<button type="button" class="kd-slot empty${pick}" data-kd-slot="${i}">
        <span class="kd-ico">➕</span>
        <span class="kd-name">${kingdomBuildPick ? "Сюда!" : "Пусто"}</span>
      </button>`;
    }
    if (nat) {
      const ready = kingdomGatherReady(i);
      const sec = Math.ceil(kingdomGatherLeft(i) / 1000);
      return `<button type="button" class="kd-slot nature ${nat.gather}${ready ? " ready" : " cd"}" data-kd-slot="${i}">
        <span class="kd-ico">${nat.ico}</span>
        <span class="kd-name">${nat.name}</span>
        <span class="kd-rate">${ready ? `+${nat.amount} ${nat.gather === "wood" ? "🪵" : "🪨"}` : `${sec}с`}</span>
      </button>`;
    }
    const lv = kingdomLevelOf(i);
    const rateBits = [];
    if (b.rate) rateBits.push(`🪙${b.rate * lv}`);
    if (b.woodRate) rateBits.push(`🪵${b.woodRate * lv}`);
    if (b.stoneRate) rateBits.push(`🪨${b.stoneRate * lv}`);
    return `<button type="button" class="kd-slot filled${mid}" data-kd-slot="${i}">
      <span class="kd-ico">${b.ico}</span>
      <span class="kd-name">${b.name}${lv > 1 ? ` L${lv}` : ""}</span>
      <span class="kd-rate">${rateBits.length ? `${rateBits.join(" ")}/ч` : "декор"}</span>
    </button>`;
  }).join("");

  shop.innerHTML = KINGDOM_SHOP_ORDER.map((id) => {
    const b = KINGDOM_BUILDINGS[id];
    const cost = kingdomCostOf(b);
    const on = kingdomBuildPick === id ? " selected" : "";
    const can = kingdomCanAfford(cost);
    const rateBits = [];
    if (b.rate) rateBits.push(`+${b.rate}🪙`);
    if (b.woodRate) rateBits.push(`+${b.woodRate}🪵`);
    if (b.stoneRate) rateBits.push(`+${b.stoneRate}🪨`);
    if (b.starRate) rateBits.push(`+${b.starRate}★`);
    return `<button type="button" class="kd-shop-card${on}${can ? "" : " poor"}" data-kd-buy="${id}">
      <span class="kd-ico">${b.ico}</span>
      <span class="kd-name">${b.name}</span>
      <span class="kd-price">${kingdomFormatCost(cost)}</span>
      <span class="kd-rate">${rateBits.join(" ") || "декор"}/ч</span>
      <span class="kd-desc">${b.desc}</span>
    </button>`;
  }).join("");

  const hint = document.getElementById("kingdomHint");
  if (hint && !kingdomGate) {
    hint.textContent = kingdomBuildPick
      ? `Выбрано: ${KINGDOM_BUILDINGS[kingdomBuildPick].name} (${kingdomFormatCost(kingdomCostOf(KINGDOM_BUILDINGS[kingdomBuildPick]))}). Жми пустую клетку — будет задача.`
      : "Стройка/сбор — через задачу. Рубка/камень: пауза ~3 мин на клетку. 🌳🪨";
  }
  const forgeEl = document.getElementById("kingdomForge");
  if (forgeEl) {
    const open = kingdomHasForgeBuilding();
    forgeEl.classList.toggle("locked", !open);
    forgeEl.innerHTML = open
      ? Object.values(KINGDOM_FORGE).map((r) => {
        const have = (k.forge && k.forge[r.id]) || 0;
        return `<button type="button" class="kd-forge-card" data-kd-forge="${r.id}">
          <span class="kd-ico">${r.ico}</span>
          <span class="kd-name">${r.name} ×${have}</span>
          <span class="kd-price">${kingdomFormatCost(r.need)}</span>
          <span class="kd-desc">${r.desc}</span>
        </button>`;
      }).join("")
      : `<p class="kd-forge-lock">Построй <strong>🔥 Кузницу</strong>, чтобы ковать кирпичи и самоцветы в инвентарь.</p>`;
  }
}

function openKingdom() {
  ensureKingdom();
  kingdomBuildPick = null;
  showScreen("kingdom");
  renderKingdom();
  clearInterval(kingdomTimerId);
  kingdomTimerId = setInterval(() => {
    if (screens.kingdom && !screens.kingdom.classList.contains("hidden")) renderKingdom();
  }, 3000);
}

function kingdomPlace(slotIndex, unlocked = false, buildingId = null) {
  const k = ensureKingdom();
  if (slotIndex < 0 || slotIndex >= KINGDOM_SLOTS) return false;
  if (slotIndex === KINGDOM_CASTLE_SLOT) return false;
  if (KINGDOM_NATURE[k.slots[slotIndex]]) {
    kingdomSoftHint("Тут природа — собери ресурс или расчисти клетку.");
    return false;
  }
  if (k.slots[slotIndex]) {
    const id = k.slots[slotIndex];
    const b = KINGDOM_BUILDINGS[id];
    if (!b || b.fixed) return false;
    if (!unlocked) {
      const price = kingdomUpgradePrice(slotIndex);
      if (!kingdomCanAfford(price)) {
        kingdomSoftHint(`Мало ресурсов на апгрейд: ${kingdomFormatCost(price)}`);
        return false;
      }
      openKingdomGate({ type: "upgrade", slot: slotIndex });
      return false;
    }
    const price = kingdomUpgradePrice(slotIndex);
    if (!kingdomCanAfford(price)) {
      kingdomSoftHint(`Мало ресурсов на апгрейд: ${kingdomFormatCost(price)}`);
      return false;
    }
    kingdomPay(price);
    k.levels[slotIndex] = kingdomLevelOf(slotIndex) + 1;
    saveState();
    showToasts([{ plain: true, icon: b.ico, name: `${b.name} Lv${k.levels[slotIndex]}!`, desc: `− ${kingdomFormatCost(price)}` }]);
    unlockAchievements();
    renderKingdom();
    return true;
  }
  const pickId = buildingId || kingdomBuildPick;
  if (!pickId) {
    kingdomSoftHint("Сначала выбери здание в каталоге «Строить».");
    return false;
  }
  const b = KINGDOM_BUILDINGS[pickId];
  if (!b || b.fixed) return false;
  const cost = kingdomCostOf(b);
  if (!kingdomCanAfford(cost)) {
    kingdomSoftHint(`Мало ресурсов: ${kingdomFormatCost(cost)}`);
    return false;
  }
  if (!unlocked) {
    openKingdomGate({ type: "place", slot: slotIndex, buildingId: pickId });
    return false;
  }
  kingdomPay(cost);
  k.slots[slotIndex] = b.id;
  k.levels[slotIndex] = 1;
  kingdomBuildPick = null;
  saveState();
  const fresh = unlockAchievements();
  showToasts([{ plain: true, icon: b.ico, name: "Построено!", desc: b.name }]);
  if (fresh.length) showToasts(fresh.slice(0, 2).map((a) => ({ icon: a.icon, name: a.name, desc: a.desc })));
  renderKingdom();
  return true;
}

function kingdomClearNature(slotIndex, unlocked = false) {
  const k = ensureKingdom();
  const nat = KINGDOM_NATURE[k.slots[slotIndex]];
  if (!nat) return;
  if (!unlocked) {
    openKingdomGate({ type: "clear", slot: slotIndex });
    return;
  }
  if (state.coins < 5) {
    kingdomSoftHint("Нужно 5 монет, чтобы расчистить клетку.");
    return;
  }
  state.coins -= 5;
  k.slots[slotIndex] = null;
  delete k.gatherAt[slotIndex];
  saveState();
  kingdomSoftHint("Клетка расчищена — можно строить.");
  renderKingdom();
}

function kingdomSell(slotIndex) {
  const k = ensureKingdom();
  const id = k.slots[slotIndex];
  const b = KINGDOM_BUILDINGS[id];
  if (!b || b.fixed || slotIndex === KINGDOM_CASTLE_SLOT) return;
  const lv = kingdomLevelOf(slotIndex);
  const base = kingdomCostOf(b);
  const refundCoins = Math.floor(base.coins * 0.4 * lv);
  const refundWood = Math.floor(base.wood * 0.4 * lv);
  const refundStone = Math.floor(base.stone * 0.4 * lv);
  k.slots[slotIndex] = null;
  delete k.levels[slotIndex];
  state.coins += refundCoins;
  k.wood = (k.wood || 0) + refundWood;
  k.stone = (k.stone || 0) + refundStone;
  saveState();
  showToasts([{
    plain: true,
    icon: "🧹",
    name: "Снесено",
    desc: `Вернули ${kingdomFormatCost({ coins: refundCoins, wood: refundWood, stone: refundStone })}`,
  }]);
  renderKingdom();
}

/* ——— Безопасность: 8-бит квесты ——— */
let safeRun = null;

function renderSafeBanner() {
  let bar = document.getElementById("safeMustBanner");
  if (!bar) {
    bar = document.createElement("button");
    bar.type = "button";
    bar.id = "safeMustBanner";
    bar.className = "safe-must-banner";
    const host = document.getElementById("home");
    const tabs = document.getElementById("themeTabs");
    if (host && tabs) host.insertBefore(bar, tabs);
    else if (host) host.prepend(bar);
    bar.addEventListener("click", () => selectTheme(THEME_SAFE));
  }
  const done = isSafeAllCleared();
  bar.classList.toggle("hidden", done || selectedTheme === THEME_SAFE);
  bar.innerHTML = done
    ? ""
    : `<span class="safe-must-pix">!</span> Обязательно: квесты безопасности (${safeClearedCount()}/${SAFE_SCENARIOS.length}) — нажми`;
}

function renderSafeHub() {
  let hub = document.getElementById("safeHub");
  if (!hub) {
    hub = document.createElement("div");
    hub.id = "safeHub";
    hub.className = "safe-hub";
    const levels = document.getElementById("levels");
    if (levels && levels.parentNode) levels.parentNode.insertBefore(hub, levels);
  }
  const show = selectedTheme === THEME_SAFE;
  hub.classList.toggle("hidden", !show);
  if (!show) return;
  hub.innerHTML = `
    <div class="safe-hub-lead bit-font">QUEST LOG · INFOSEC</div>
    <p class="safe-hub-note">Выбери сценарий. Верный ответ = защита. Ошибка = красный экран (это учёба, не по-настоящему).</p>
    <div class="safe-quest-grid">
      ${SAFE_SCENARIOS.map((s) => {
        const ok = !!(state.safeCleared && state.safeCleared[s.id]);
        return `<button type="button" class="safe-quest-card ${ok ? "cleared" : ""}" data-safe-id="${s.id}">
          <span class="sq-ico">${s.ico}</span>
          <span class="sq-title">${escapeHtml(s.title)}</span>
          <span class="sq-tag">${escapeHtml(s.tag)}</span>
          <span class="sq-status">${ok ? "CLEAR" : "PLAY"}</span>
        </button>`;
      }).join("")}
    </div>
  `;
}

function openSafeScenario(id) {
  const sc = SAFE_SCENARIOS.find((s) => s.id === id);
  if (!sc) return;
  safeRun = { id: sc.id, sc };
  const stage = document.getElementById("safeStage");
  const title = document.getElementById("safeTitle");
  const scene = document.getElementById("safeScene");
  const choices = document.getElementById("safeChoices");
  const result = document.getElementById("safeResult");
  if (!stage || !choices) return;
  document.body.classList.remove("safe-fail", "safe-win");
  if (title) title.textContent = sc.title;
  if (scene) scene.textContent = sc.scene;
  if (result) {
    result.classList.add("hidden");
    result.innerHTML = "";
  }
  choices.classList.remove("hidden");
  choices.innerHTML = sc.choices.map((c, i) =>
    `<button type="button" class="safe-choice bit-btn" data-safe-choice="${i}">
      <span class="safe-choice-n">${i + 1}</span>${escapeHtml(c.text)}
    </button>`
  ).join("");
  const face = document.getElementById("safePcFace");
  if (face) face.dataset.mood = "idle";
  showScreen("safe");
}

function resolveSafeChoice(index) {
  if (!safeRun) return;
  const sc = safeRun.sc;
  const choice = sc.choices[index];
  if (!choice) return;
  const choices = document.getElementById("safeChoices");
  const result = document.getElementById("safeResult");
  const face = document.getElementById("safePcFace");
  if (choices) choices.classList.add("hidden");
  const ok = !!choice.ok;
  document.body.classList.toggle("safe-fail", !ok);
  document.body.classList.toggle("safe-win", ok);
  if (face) face.dataset.mood = ok ? "happy" : "panic";
  if (ok) {
    if (!state.safeCleared) state.safeCleared = {};
    state.safeCleared[sc.id] = true;
    state.coins += 8;
    state.stars += 2;
    saveState();
    const fresh = unlockAchievements();
    if (result) {
      result.classList.remove("hidden");
      result.innerHTML = `
        <div class="safe-result-box win">
          <div class="safe-result-kicker bit-font">PROTECTED!</div>
          <p class="safe-result-story">${escapeHtml(sc.win)}</p>
          <p class="safe-result-explain">+8 монет · +2 опыта</p>
          <button type="button" class="btn primary bit-btn" id="safeBackBtn">К списку квестов</button>
        </div>`;
    }
    if (fresh.length) showToasts(fresh.slice(0, 3).map((a) => ({ icon: a.icon, name: a.name, desc: a.desc })));
  } else {
    if (result) {
      result.classList.remove("hidden");
      result.innerHTML = `
        <div class="safe-result-box fail">
          <div class="safe-result-kicker bit-font">${escapeHtml(sc.failTitle)}</div>
          <p class="safe-result-story">${escapeHtml(sc.failStory)}</p>
          <p class="safe-result-explain"><strong>Важно:</strong> ${escapeHtml(sc.explain)}</p>
          <button type="button" class="btn primary bit-btn" id="safeRetryBtn">Попробовать снова</button>
          <button type="button" class="btn ghost-btn bit-btn" id="safeBackBtn">К списку</button>
        </div>`;
    }
  }
  document.getElementById("safeRetryBtn")?.addEventListener("click", () => openSafeScenario(sc.id));
  document.getElementById("safeBackBtn")?.addEventListener("click", () => {
    safeRun = null;
    document.body.classList.remove("safe-fail", "safe-win");
    showScreen("home");
    renderHome();
  });
}

document.getElementById("home")?.addEventListener("click", (e) => {
  const card = e.target.closest("[data-safe-id]");
  if (!card) return;
  openSafeScenario(card.dataset.safeId);
});

document.getElementById("safe")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-safe-choice]");
  if (!btn || !safeRun) return;
  resolveSafeChoice(Number(btn.dataset.safeChoice));
});

document.getElementById("safeHomeBtn")?.addEventListener("click", () => {
  safeRun = null;
  document.body.classList.remove("safe-fail", "safe-win");
  showScreen("home");
  renderHome();
});

// Ачивки Английский / Код / профессии
ACHIEVEMENTS.push(
  {
    id: "kd_first",
    icon: "🏰",
    name: "Первый кирпич",
    desc: "Построй любое здание в королевстве маскота",
    check: () => kingdomBuildingCount() >= 1,
    progress: () => ({ current: kingdomBuildingCount(), target: 1 }),
  },
  {
    id: "kd_five",
    icon: "🏘️",
    name: "Маленький город",
    desc: "Поставь 5 построек (кроме замка)",
    check: () => kingdomBuildingCount() >= 5,
    progress: () => ({ current: Math.min(kingdomBuildingCount(), 5), target: 5 }),
  },
  {
    id: "kd_rate",
    icon: "📈",
    name: "Экономика",
    desc: "Доход королевства ≥ 60 монет/час",
    check: () => kingdomRates().coinPerHour >= 60,
    progress: () => ({ current: Math.min(kingdomRates().coinPerHour, 60), target: 60 }),
  },
  {
    id: "kd_wood",
    icon: "🪵",
    name: "Дровосек",
    desc: "Накопи 30 дерева на складе",
    check: () => (ensureKingdom().wood || 0) >= 30,
    progress: () => ({ current: Math.min(ensureKingdom().wood || 0, 30), target: 30 }),
  },
  {
    id: "kd_stone",
    icon: "🪨",
    name: "Каменотёс",
    desc: "Накопи 25 камня на складе",
    check: () => (ensureKingdom().stone || 0) >= 25,
    progress: () => ({ current: Math.min(ensureKingdom().stone || 0, 25), target: 25 }),
  },
  {
    id: "kd_forge",
    icon: "🔥",
    name: "Кузнец",
    desc: "Выкуй кирпич или самоцвет",
    check: () => {
      const f = ensureKingdom().forge || {};
      return (f.brick || 0) + (f.gem || 0) + (f.charm || 0) >= 1;
    },
    progress: () => {
      const f = ensureKingdom().forge || {};
      return { current: Math.min(1, (f.brick || 0) + (f.gem || 0) + (f.charm || 0)), target: 1 };
    },
  },
  {
    id: "pet_heal",
    icon: "💉",
    name: "Доктор",
    desc: "Вылечи маскота укольчиком",
    check: () => (ensureCare().heals || 0) >= 1,
    progress: () => ({ current: Math.min(ensureCare().heals || 0, 1), target: 1 }),
  },
  {
    id: "pet_room",
    icon: "🛌",
    name: "Уютный дом",
    desc: "Купи 2 предмета для комнаты",
    check: () => (ensureCare().room || []).length >= 2,
    progress: () => ({ current: Math.min((ensureCare().room || []).length, 2), target: 2 }),
  },
  {
    id: "pet_feed5",
    icon: "🍎",
    name: "Заботливый",
    desc: "Покорми маскота 5 раз",
    check: () => (ensureCare().feeds || 0) >= 5,
    progress: () => ({ current: Math.min(ensureCare().feeds || 0, 5), target: 5 }),
  },
  {
    id: "pet_happy",
    icon: "😊",
    name: "Лучший друг",
    desc: "Держи счастье маскота ≥ 80",
    check: () => ensureCare().happiness >= 80,
    progress: () => ({ current: Math.min(Math.floor(ensureCare().happiness), 80), target: 80 }),
  },
  {
    id: "pet_play10",
    icon: "🎾",
    name: "Игроман",
    desc: "Поиграй с маскотом 10 раз",
    check: () => (ensureCare().plays || 0) >= 10,
    progress: () => ({ current: Math.min(ensureCare().plays || 0, 10), target: 10 }),
  },
  {
    id: "safe_first",
    icon: "🛡️",
    name: "Первая защита",
    desc: "Пройди любой квест безопасности верно",
    check: () => safeClearedCount() >= 1,
    progress: () => ({ current: safeClearedCount(), target: 1 }),
  },
  {
    id: "safe_all",
    icon: "🦸",
    name: "Кибер-герой",
    desc: "Пройди все обязательные квесты безопасности",
    gold: true,
    check: () => isSafeAllCleared(),
    progress: () => ({ current: safeClearedCount(), target: SAFE_SCENARIOS.length }),
  },
  {
    id: "safe_download",
    icon: "🚫",
    name: "Не качаю всё подряд",
    desc: "Пройди квесты про ссылку и файл из чата",
    check: (s) => !!(s.safeCleared && s.safeCleared.weird_link && s.safeCleared.chat_apk),
    progress: (s) => ({
      current: [s.safeCleared?.weird_link, s.safeCleared?.chat_apk].filter(Boolean).length,
      target: 2,
    }),
  },
  {
    id: "eng_open",
    icon: "🇬🇧",
    name: "Hello!",
    desc: "Пройди любой этап английского",
    check: (s) => s.runs.some((r) => r.mode === MODE_ENG),
    progress: (s) => ({ current: s.runs.filter((r) => r.mode === MODE_ENG).length, target: 1 }),
  },
  {
    id: "eng_words",
    icon: "🐱",
    name: "Словарик",
    desc: "10/10 на этапе «Слова»",
    check: (s) => s.runs.some((r) => r.mode === MODE_ENG && (r.level || 1) === 1 && r.correct === 10),
    progress: (s) => ({ current: s.runs.filter((r) => r.mode === MODE_ENG && (r.level || 1) === 1).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }),
  },
  {
    id: "eng_all",
    icon: "🌍",
    name: "Вся лестница EN",
    desc: "10/10 на всех 5 этапах английского",
    check: (s) => [1, 2, 3, 4, 5].every((lvl) => s.runs.some((r) => r.mode === MODE_ENG && (r.level || 1) === lvl && r.correct === 10)),
    progress: (s) => ({ current: [1, 2, 3, 4, 5].filter((lvl) => s.runs.some((r) => r.mode === MODE_ENG && (r.level || 1) === lvl && r.correct === 10)).length, target: 5 }),
  },
  {
    id: "eng_poly",
    icon: "🗣️",
    name: "Полиглот",
    desc: "Получи профессию «Полиглот»",
    check: () => professionUnlocked("eng_poly"),
    progress: () => {
      const p = professionFor(THEME_ENG);
      return { current: Math.min(p.score, 5), target: 5 };
    },
  },
  {
    id: "code_open",
    icon: "💻",
    name: "Первый ПК-урок",
    desc: "Пройди любой этап про ПК",
    check: (s) => s.runs.some((r) => r.mode === MODE_CODE),
    progress: (s) => ({ current: s.runs.filter((r) => r.mode === MODE_CODE).length, target: 1 }),
  },
  {
    id: "code_seq",
    icon: "📁",
    name: "Сундуки-папки",
    desc: "10/10 на этапе «Папки»",
    check: (s) => s.runs.some((r) => r.mode === MODE_CODE && (r.level || 1) === 1 && r.correct === 10),
    progress: (s) => ({ current: s.runs.filter((r) => r.mode === MODE_CODE && (r.level || 1) === 1).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }),
  },
  {
    id: "code_all",
    icon: "🖥️",
    name: "Вся лестница ПК",
    desc: "10/10 на всех 5 этапах ПК",
    check: (s) => [1, 2, 3, 4, 5].every((lvl) => s.runs.some((r) => r.mode === MODE_CODE && (r.level || 1) === lvl && r.correct === 10)),
    progress: (s) => ({ current: [1, 2, 3, 4, 5].filter((lvl) => s.runs.some((r) => r.mode === MODE_CODE && (r.level || 1) === lvl && r.correct === 10)).length, target: 5 }),
  },
  {
    id: "code_arch",
    icon: "🎮",
    name: "Админ игрового ПК",
    desc: "Получи профессию «Админ игрового ПК»",
    check: () => professionUnlocked("code_arch"),
    progress: () => {
      const p = professionFor(THEME_CODE);
      return { current: Math.min(p.score, 5), target: 5 };
    },
  },
  {
    id: "math_arch",
    icon: "🧙",
    name: "Архимаг математики",
    desc: "Получи профессию «Архимаг математики»",
    check: () => professionUnlocked("math_arch"),
    progress: () => {
      const p = professionFor(THEME_MATH);
      return { current: Math.min(p.score, 18), target: 18 };
    },
  },
  {
    id: "triple_scholar",
    icon: "🎓",
    name: "Три академика",
    desc: "Есть профессия в каждой из трёх обучалок",
    gold: true,
    check: () => [THEME_MATH, THEME_ENG, THEME_CODE].every((t) => professionFor(t).current),
    progress: () => ({
      current: [THEME_MATH, THEME_ENG, THEME_CODE].filter((t) => professionFor(t).current).length,
      target: 3,
    }),
  }
);

// Дополнительные ачивки для режима "2 действия"
ACHIEVEMENTS.push(
  {
    id: "chain_open",
    icon: "🧠",
    name: "Два шага",
    desc: "Пройди любой уровень в режиме 2 действия",
    check: (s) => s.runs.some((r) => (r.mode || MODE_BASIC) === MODE_CHAIN),
    progress: (s) => ({ current: s.runs.filter((r) => (r.mode || MODE_BASIC) === MODE_CHAIN).length, target: 1 }),
  },
  {
    id: "chain_easy",
    icon: "🌱",
    name: "Комбо-лёгкий",
    desc: "10/10 на лёгком в режиме 2 действия",
    check: (s) => s.runs.some((r) => (r.mode || MODE_BASIC) === MODE_CHAIN && (r.level || 1) === 1 && r.correct === 10),
    progress: (s) => ({ current: s.runs.filter((r) => (r.mode || MODE_BASIC) === MODE_CHAIN && (r.level || 1) === 1).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }),
  },
  {
    id: "chain_mid",
    icon: "➕",
    name: "Комбо-счёт",
    desc: "10/10 на среднем в режиме 2 действия",
    check: (s) => s.runs.some((r) => (r.mode || MODE_BASIC) === MODE_CHAIN && r.level === 2 && r.correct === 10),
    progress: (s) => ({ current: s.runs.filter((r) => (r.mode || MODE_BASIC) === MODE_CHAIN && r.level === 2).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }),
  },
  {
    id: "chain_sharp",
    icon: "⚡",
    name: "Комбо-сложный",
    desc: "10/10 на сложном в режиме 2 действия",
    check: (s) => s.runs.some((r) => (r.mode || MODE_BASIC) === MODE_CHAIN && r.level === 3 && r.correct === 10),
    progress: (s) => ({ current: s.runs.filter((r) => (r.mode || MODE_BASIC) === MODE_CHAIN && r.level === 3).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }),
  },
  {
    id: "chain_hard",
    icon: "⚙️",
    name: "Комбо-хард",
    desc: "10/10 на харде в режиме 2 действия вовремя",
    check: (s) => s.runs.some((r) => (r.mode || MODE_BASIC) === MODE_CHAIN && r.level === 4 && r.correct === 10 && !r.timedOut),
    progress: (s) => ({ current: s.runs.filter((r) => (r.mode || MODE_BASIC) === MODE_CHAIN && r.level === 4 && !r.timedOut).reduce((m, r) => Math.max(m, r.correct || 0), 0), target: 10 }),
  },
  {
    id: "chain_exam5",
    icon: "📚",
    name: "Комбо-отличник",
    desc: "Оценка 5 на экзамене 2 шага",
    check: (s) => s.runs.some((r) => (r.mode || MODE_BASIC) === MODE_CHAIN && r.level === 5 && r.grade === 5 && !r.timedOut),
    progress: (s) => ({ current: s.runs.some((r) => (r.mode || MODE_BASIC) === MODE_CHAIN && r.level === 5 && r.grade === 5 && !r.timedOut) ? 1 : 0, target: 1 }),
  },
  {
    id: "chain_all",
    icon: "🧩",
    name: "Двойной комплект",
    desc: "10/10 на всех 5 уровнях в режиме 2 действия",
    check: (s) => [1, 2, 3, 4, 5].every((lvl) => s.runs.some((r) => (r.mode || MODE_BASIC) === MODE_CHAIN && (r.level || 1) === lvl && r.correct === 10 && (lvl < 4 || !r.timedOut))),
    progress: (s) => ({
      current: [1, 2, 3, 4, 5].filter((lvl) => s.runs.some((r) => (r.mode || MODE_BASIC) === MODE_CHAIN && (r.level || 1) === lvl && r.correct === 10 && (lvl < 4 || !r.timedOut))).length,
      target: 5,
    }),
  }
);

function pingBuy(icon, name) {
  showToasts([{ plain: true, icon, name: "Куплено!", desc: name }]);
}

document.getElementById("levels").addEventListener("click", (e) => {
  const card = e.target.closest(".map-node, .level-card");
  if (!card) return;
  const id = Number(card.dataset.level);
  if (!isLevelOpen(id)) {
    card.classList.remove("shake");
    void card.offsetWidth;
    card.classList.add("shake");
    const meta = MODE_META[selectedMode] || MODE_META[MODE_BASIC];
    let desc = "Ещё рано";
    if (isBattleLevel(id)) {
      if (id === 8) desc = "Сначала победи в Бою 1";
      else if (id === 9) desc = "Сначала победи в Бою 2";
      else desc = "Сначала пройди все обычные уровни на 10/10";
    } else if (selectedMode === MODE_UNITS && id === 1) {
      desc = "Сначала 10/10 на «Сложный» в Базе или 2 действиях";
    } else if (id === SECRET_LEVEL) {
      const gate = secretGateProgress();
      desc = `Все режимы 10/10 быстрее 40 сек (${gate.current}/${gate.target})`;
    } else {
      const prevName = meta.levelNames[id - 2];
      if (prevName) desc = `Сначала 10/10 на «${prevName}»`;
    }
    showToasts([{ plain: true, icon: "🔒", name: "Пока закрыто", desc }]);
    return;
  }
  selectedLevel = id;
  state.lastLevel = isBattleLevel(selectedLevel) ? maxOpenLevel() : selectedLevel;
  saveState();
  applyTheme(isBattleLevel(selectedLevel) ? 5 : selectedLevel);
  renderLevels();
  placeMapToken(id, true);
});

function saveMode() {
  try {
    localStorage.setItem(`${STORAGE_KEY}-mode`, selectedMode);
  } catch {
    /* ignore */
  }
}

function parseModeId(raw) {
  if (raw === MODE_CHAIN) return MODE_CHAIN;
  if (raw === MODE_UNITS) return MODE_UNITS;
  if (raw === MODE_MUL) return MODE_MUL;
  if (raw === MODE_DIV) return MODE_DIV;
  if (raw === MODE_ENG) return MODE_ENG;
  if (raw === MODE_CODE) return MODE_CODE;
  if (raw === MODE_SAFE) return MODE_SAFE;
  return MODE_BASIC;
}

document.getElementById("modeTabs").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-mode]");
  if (!btn) return;
  const nextMode = parseModeId(btn.dataset.mode);
  if (nextMode === selectedMode) return;
  selectedMode = nextMode;
  selectedTheme = themeOfMode(selectedMode);
  saveMode();
  saveTheme();
  selectedLevel = maxOpenLevel();
  state.lastLevel = selectedLevel;
  saveState();
  renderHome();
});

document.getElementById("themeTabs")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-theme]");
  if (!btn) return;
  selectTheme(btn.dataset.theme);
});

document.getElementById("professionRow")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-theme]");
  if (!btn) return;
  selectTheme(btn.dataset.theme);
});

document.getElementById("choicePad")?.addEventListener("click", onChoicePadClick);
document.addEventListener("click", (e) => {
  const btn = e.target.closest("#choicePad [data-choice]");
  if (!btn || !run) return;
  onChoicePadClick(e);
});

function onChoicePadClick(e) {
  const btn = e.target.closest("[data-choice]");
  if (!btn || !run || run.done) return;
  pressKey(String(btn.dataset.choice));
  document.querySelectorAll("#choicePad .choice-btn").forEach((b) => {
    b.classList.toggle("picked", b === btn);
  });
}

document.getElementById("boardModeFilters").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-board-mode]");
  if (!btn) return;
  boardMode = parseModeId(btn.dataset.boardMode);
  document.querySelectorAll("#boardModeFilters .filter-btn").forEach((b) => {
    b.classList.toggle("selected", b === btn);
  });
  renderBoard();
});

els.openShopBtn.addEventListener("click", () => {
  renderShop();
  showScreen("shop");
});

document.getElementById("openKingdomBtn")?.addEventListener("click", () => {
  openKingdom();
});

document.getElementById("kingdomCollectBtn")?.addEventListener("click", () => {
  collectKingdom(false, false);
});

document.getElementById("kingdom")?.addEventListener("click", (e) => {
  if (kingdomGate) return;
  const forgeBtn = e.target.closest("[data-kd-forge]");
  if (forgeBtn) {
    kingdomForge(forgeBtn.dataset.kdForge, false);
    return;
  }
  const buy = e.target.closest("[data-kd-buy]");
  if (buy) {
    const id = buy.dataset.kdBuy;
    kingdomBuildPick = kingdomBuildPick === id ? null : id;
    const panel = document.getElementById("kingdomSlotActions");
    if (panel) {
      panel.classList.add("hidden");
      delete panel.dataset.keep;
    }
    renderKingdom();
    return;
  }
  const up = e.target.closest("[data-kd-up]");
  if (up) {
    e.stopPropagation();
    kingdomPlace(Number(up.dataset.kdUp), false);
    return;
  }
  const sellBtn = e.target.closest("[data-kd-sell]");
  if (sellBtn) {
    e.stopPropagation();
    kingdomSell(Number(sellBtn.dataset.kdSell));
    return;
  }
  const clearBtn = e.target.closest("[data-kd-clear]");
  if (clearBtn) {
    e.stopPropagation();
    kingdomClearNature(Number(clearBtn.dataset.kdClear), false);
    return;
  }
  const slot = e.target.closest("[data-kd-slot]");
  if (!slot) return;
  const i = Number(slot.dataset.kdSlot);
  const id = ensureKingdom().slots[i];
  if (!id) {
    kingdomPlace(i, false);
    return;
  }
  if (id === "castle") {
    kingdomSoftHint("Замок маскота — центр королевства.");
    return;
  }
  if (KINGDOM_NATURE[id]) {
    if (kingdomGatherReady(i)) {
      kingdomGather(i, false);
    } else {
      const panel = document.getElementById("kingdomSlotActions");
      if (panel) {
        panel.classList.remove("hidden");
        panel.dataset.keep = "1";
        const nat = KINGDOM_NATURE[id];
        const sec = Math.ceil(kingdomGatherLeft(i) / 1000);
        panel.innerHTML = `
          <strong>${nat.ico} ${nat.name}</strong>
          <span>Восстановление: ${sec}с</span>
          <button type="button" class="btn ghost-btn" data-kd-clear="${i}">Расчистить · 5🪙 (задача)</button>`;
      }
      kingdomSoftHint(`${KINGDOM_NATURE[id].name}: ещё ${Math.ceil(kingdomGatherLeft(i) / 1000)}с.`);
    }
    return;
  }
  document.querySelectorAll(".kd-slot").forEach((n) => n.classList.remove("focus"));
  slot.classList.add("focus");
  const panel = document.getElementById("kingdomSlotActions");
  if (panel) {
    const b = KINGDOM_BUILDINGS[id];
    const price = kingdomUpgradePrice(i);
    panel.classList.remove("hidden");
    panel.dataset.keep = "1";
    panel.innerHTML = `
      <strong>${b.ico} ${b.name} Lv${kingdomLevelOf(i)}</strong>
      <button type="button" class="btn primary" data-kd-up="${i}">Улучшить · ${kingdomFormatCost(price)}</button>
      <button type="button" class="btn ghost-btn" data-kd-sell="${i}">Снести (−40%)</button>`;
  }
});

document.getElementById("kingdomGate")?.addEventListener("click", (e) => {
  if (e.target.id === "kingdomGate" || e.target.closest("[data-kd-gate-close]")) {
    const action = kingdomGate && kingdomGate.action;
    if (action && action.type === "gather" && action.slot != null) {
      const k = ensureKingdom();
      k.gatherAt[action.slot] = Date.now() + KINGDOM_GATHER_FAIL_CD_MS;
      saveState();
    }
    closeKingdomGate();
    kingdomSoftHint("Задача отменена.");
    renderKingdom();
    return;
  }
  const ans = e.target.closest("[data-kd-ans]");
  if (ans) {
    kingdomGateSubmitChoice(Number(ans.dataset.kdAns));
    return;
  }
  const key = e.target.closest("[data-kd-gate-key]");
  if (key) {
    const k = key.dataset.kdGateKey;
    if (k === "ok") kingdomGateSubmitNum();
    else if (k === "back") kingdomGateSetInput((kingdomGate?.input || "").slice(0, -1));
    else kingdomGateSetInput((kingdomGate?.input || "") + k);
  }
});


document.getElementById("petCare")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-pet]");
  if (!btn) return;
  const act = btn.dataset.pet;
  if (act === "feed") openPetFoodPicker();
  else if (act === "play") petPlay();
  else if (act === "sleep") petSleep();
  else if (act === "toilet") petToilet();
  else if (act === "wash") openPetWashPicker();
  else if (act === "heal") openShotGame();
});

document.getElementById("petFoodModal")?.addEventListener("click", (e) => {
  if (e.target.id === "petFoodModal" || e.target.closest("[data-pet-food-close]")) {
    closePetFoodPicker();
    return;
  }
  const food = e.target.closest("[data-pet-food]");
  if (food) petFeed(food.dataset.petFood);
});

document.getElementById("petWashModal")?.addEventListener("click", (e) => {
  if (e.target.id === "petWashModal" || e.target.closest("[data-pet-wash-close]")) {
    closePetWashPicker();
    return;
  }
  const wash = e.target.closest("[data-pet-wash]");
  if (wash) petWash(wash.dataset.petWash);
});

document.getElementById("petShotModal")?.addEventListener("click", (e) => {
  if (e.target.closest("[data-pet-shot-close]")) {
    closeShotGame();
    return;
  }
  if (e.target.closest("#petShotFire") || e.target.closest("[data-pet-shot-fire]")) {
    fireShotGame();
  }
});

els.dailyBoxBtn?.addEventListener("click", () => {
  openDailyModal();
});
els.dailyClaimBtn?.addEventListener("click", () => {
  claimDailyBox();
});
els.dailyCloseBtn?.addEventListener("click", () => {
  closeDailyModal();
});
els.dailyModal?.addEventListener("click", (e) => {
  if (e.target === els.dailyModal && !isDailyReady()) closeDailyModal();
});

document.getElementById("shopTabs").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-tab]");
  if (!btn) return;
  shopTab = btn.dataset.tab;
  shopEquipFilter = "";
  document.querySelectorAll("#shopTabs .filter-btn").forEach((b) => b.classList.toggle("selected", b === btn));
  renderShop();
});

document.getElementById("shop")?.addEventListener("click", (e) => {
  const slotBtn = e.target.closest("[data-equip-slot]");
  if (!slotBtn) return;
  const slot = slotBtn.dataset.equipSlot;
  shopEquipFilter = shopEquipFilter === slot ? "" : slot;
  if (slot === "head") shopTab = "looks";
  else if (slot === "body" || slot === "weapon") shopTab = "gear";
  else if (slot === "accessory") shopTab = "toys";
  else if (slot === "relic") shopTab = "relics";
  document.querySelectorAll("#shopTabs .filter-btn").forEach((b) => {
    b.classList.toggle("selected", b.dataset.tab === shopTab);
  });
  renderShop();
});

els.shopList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn || btn.disabled) return;
  shopAction(btn.dataset.act, btn.dataset.id);
});

els.boostBar.addEventListener("click", (e) => {
  const skillBtn = e.target.closest("[data-skill]");
  if (skillBtn && !skillBtn.disabled) {
    useSkill(skillBtn.dataset.skill);
    return;
  }
  const btn = e.target.closest("[data-boost]");
  if (!btn || btn.disabled) return;
  useBoost(btn.dataset.boost);
});

els.startBtn.addEventListener("click", startGame);
els.againBtn.addEventListener("click", startGame);
els.homeBtn.addEventListener("click", () => {
  stopTimer();
  stopFireworks();
  stopFxLayer();
  document.body.classList.remove("slow-mo");
  run = null;
  showScreen("home");
  renderHome();
});
els.nextBtn.addEventListener("click", goNext);
els.openGalleryBtn.addEventListener("click", () => {
  renderGallery();
  showScreen("gallery");
});
els.openSessionsBtn.addEventListener("click", () => {
  renderSessions();
  showScreen("sessions");
});
els.openBoardBtn.addEventListener("click", () => {
  showScreen("board");
  renderBoard();
});
els.boardRefreshBtn.addEventListener("click", () => {
  scoresCache = { key: "", at: 0, rows: [] };
  syncScoreQueue({ quiet: false }).finally(() => renderBoard());
});
if (els.syncNowBtn) {
  els.syncNowBtn.addEventListener("click", () => {
    syncScoreQueue({ quiet: false }).then(() => renderHome());
  });
}
els.nickSaveBtn.addEventListener("click", () => {
  const nick = saveNick(els.nickInput.value);
  if (!isNickOk(nick)) {
    showToasts([{ plain: true, icon: "🏷️", name: "Короткий ник", desc: "Нужно от 2 до 16 символов." }]);
    renderNickCard(true);
    return;
  }
  showToasts([{ plain: true, icon: "✅", name: "Ник сохранён", desc: `Привет, ${nick}! Больше спрашивать не будем.` }]);
  renderHome();
});
els.nickChangeBtn.addEventListener("click", () => {
  renderNickCard(true);
  if (els.nickInput) {
    els.nickInput.value = playerNick;
    els.nickInput.focus();
  }
});
els.nickInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.nickSaveBtn.click();
});
els.achGrid.addEventListener("click", () => {
  renderGallery();
  showScreen("gallery");
});

document.querySelectorAll("[data-back]").forEach((btn) => {
  btn.addEventListener("click", () => {
    showScreen(btn.dataset.back);
    renderHome();
  });
});

document.getElementById("sessionFilters").addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  sessionFilter = btn.dataset.filter;
  document.querySelectorAll("#sessionFilters .filter-btn").forEach((b) => {
    b.classList.toggle("selected", b === btn);
  });
  renderSessions();
});

document.getElementById("boardFilters").addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  boardFilter = btn.dataset.board;
  document.querySelectorAll("#boardFilters .filter-btn").forEach((b) => {
    b.classList.toggle("selected", b === btn);
  });
  renderBoard();
});

document.querySelectorAll(".key[data-key]").forEach((btn) => {
  btn.addEventListener("click", () => pressKey(btn.dataset.key));
});

document.addEventListener("keydown", (e) => {
  if (screens.game.classList.contains("hidden")) return;
  if (e.key === "Enter") {
    e.preventDefault();
    goNext();
    return;
  }
  if (e.key === "Backspace") {
    e.preventDefault();
    pressKey("back");
    return;
  }
  if (/^\d$/.test(e.key)) pressKey(e.key);
});

window.addEventListener("resize", () => {
  if (fw.canvas.classList.contains("on")) fwResize();
});

window.addEventListener("online", () => {
  syncScoreQueue({ quiet: true }).then(({ sent }) => {
    if (sent > 0) renderHome();
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    syncScoreQueue({ quiet: true });
    tickCare(true);
    if (screens.home && !screens.home.classList.contains("hidden")) {
      renderPetCare();
      paintMascots();
    }
  }
});

renderHome();
queueLocalUnsyncedRuns();
updateSyncHint();
syncScoreQueue({ quiet: true });
refreshCoopStats();
setInterval(() => {
  if (pendingScoreCount() > 0) syncScoreQueue({ quiet: true });
}, 45000);
setInterval(() => refreshCoopStats(), 120000);

const WELCOME_KEY = "schet-do-20-welcome-v1";

function showWelcomePopup() {
  if (!els.welcomeModal) return;
  try {
    if (sessionStorage.getItem(WELCOME_KEY) === "1") return;
  } catch {
    /* ignore */
  }
  els.welcomeModal.classList.remove("hidden");
}

function hideWelcomePopup() {
  if (!els.welcomeModal) return;
  els.welcomeModal.classList.add("hidden");
  try {
    sessionStorage.setItem(WELCOME_KEY, "1");
  } catch {
    /* ignore */
  }
}

function showSixSevenEgg() {
  if (!els.sixSevenModal) return;
  els.sixSevenModal.classList.remove("hidden");
  spawnConfetti(true);
  spawnVictoryFx(true, true);
}

function hideSixSevenEgg() {
  if (!els.sixSevenModal) return;
  els.sixSevenModal.classList.add("hidden");
}

if (els.welcomeOkBtn) els.welcomeOkBtn.addEventListener("click", hideWelcomePopup);
if (els.welcomeModal) {
  els.welcomeModal.addEventListener("click", (e) => {
    if (e.target === els.welcomeModal) hideWelcomePopup();
  });
}
if (els.sixSevenOkBtn) els.sixSevenOkBtn.addEventListener("click", hideSixSevenEgg);
if (els.sixSevenModal) {
  els.sixSevenModal.addEventListener("click", (e) => {
    if (e.target === els.sixSevenModal) hideSixSevenEgg();
  });
}

document.addEventListener("click", (e) => {
  const ach = e.target.closest("[data-ach='six_seven']");
  if (!ach) return;
  if (state.achievements.includes("six_seven") || perfectedLevelsCount(state) >= 5) {
    showSixSevenEgg();
  }
});

showWelcomePopup();

// если уже открыта пасхалка раньше — подтянуть ачивку
if (perfectedLevelsCount(state) >= 5) {
  const eggFresh = unlockAchievements().filter((a) => a.id === "six_seven");
  if (eggFresh.length) {
    saveState();
    renderHome();
    setTimeout(() => showSixSevenEgg(), 500);
  }
}
