const STORAGE_KEY = "schet-do-20";
const NICK_KEY = "schet-do-20-nick";
const SCORE_QUEUE_KEY = "schet-do-20-score-queue";
const DATA_VERSION = 3;
const TOTAL = 10;
const HARD_LIMIT_MS = 60 * 1000;

const SUPABASE_URL = "https://edetrdhgardsvhoomwto.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MBvrcDFCQlIcHcWEk8RygQ_zwW2bJ4M";

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra,
  };
}

async function fetchScores(levelFilter) {
  const makeParams = (withLook) => {
    const params = new URLSearchParams({
      select: withLook
        ? "nick,level,correct,ms,grade,timed_out,created_at,skin,hat"
        : "nick,level,correct,ms,grade,timed_out,created_at",
      order: "correct.desc,ms.asc",
      limit: "500",
    });
    if (levelFilter !== "all") params.set("level", `eq.${Number(levelFilter)}`);
    return params;
  };
  let res = await fetch(`${SUPABASE_URL}/rest/v1/scores?${makeParams(true)}`, {
    headers: supabaseHeaders(),
  });
  if (!res.ok) {
    res = await fetch(`${SUPABASE_URL}/rest/v1/scores?${makeParams(false)}`, {
      headers: supabaseHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  }
  return res.json();
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
    if (/skin|hat|column/i.test(text)) {
      delete payload.skin;
      delete payload.hat;
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
  return row.id || `${row.nick}|${row.level}|${row.correct}|${row.ms}|${row.local_at || ""}`;
}

function enqueueScore(row) {
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
    timed_out: Boolean(row.timed_out),
    skin: row.skin || null,
    hat: row.hat || null,
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
  (state.runs || []).forEach((r) => {
    if (r.synced || !r.correct || r.correct < 1) return;
    const before = loadScoreQueue().length;
    enqueueScore({
      id: `run:${r.startedAt || r.date || `${r.level}-${r.ms}-${r.correct}`}`,
      nick,
      level: r.level || 1,
      correct: r.correct,
      ms: r.ms || 0,
      grade: r.grade == null ? null : r.grade,
      timed_out: Boolean(r.timedOut),
      skin: (state.shop && state.shop.skin) || "honey",
      hat: (state.shop && state.shop.hat) || "none",
      local_at: r.date || r.startedAt || new Date().toISOString(),
    });
    if (loadScoreQueue().length > before) added += 1;
  });
  return added;
}

let syncInFlight = null;

async function syncScoreQueue({ quiet = true } = {}) {
  if (syncInFlight) return syncInFlight;
  queueLocalUnsyncedRuns();
  const queue = loadScoreQueue();
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
        showToasts([{ plain: true, icon: "🏆", name: "Топ обновлён", desc: `Отправлено результатов: ${sent}` }]);
      } else if (left.length) {
        showToasts([{ plain: true, icon: "☁️", name: "Сеть слабая", desc: `В очереди ещё ${left.length}. Попробуем снова.` }]);
      } else {
        showToasts([{ plain: true, icon: "☁️", name: "Очередь пуста", desc: "Все результаты уже в топе или ещё не сыграны." }]);
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
  none: { id: "none", name: "Без шляпы", price: 0, icon: "🙂" },
  party: { id: "party", name: "Праздник", price: 100, icon: "🎉" },
  crown: { id: "crown", name: "Корона", price: 250, icon: "👑" },
  wizard: { id: "wizard", name: "Волшебник", price: 180, icon: "🧙" },
  hero: { id: "hero", name: "Шлем", price: 160, icon: "🛡️" },
};

const TOYS = {
  bow: { id: "bow", name: "Бантик", price: 80, icon: "🎀", svg: true },
  glasses: { id: "glasses", name: "Умные очки", price: 100, icon: "👓", svg: true },
  clover: { id: "clover", name: "Клевер", price: 60, icon: "🍀" },
  duck: { id: "duck", name: "Уточка", price: 90, icon: "🦆" },
  wand: { id: "wand", name: "Палочка", price: 160, icon: "🪄", custom: true },
  crystal: { id: "crystal", name: "Кристалл", price: 140, icon: "💎" },
  rainbow: { id: "rainbow", name: "Радуга", price: 200, icon: "🌈" },
};

const FX = {
  classic: {
    id: "classic",
    name: "Классика",
    price: 0,
    icon: "🎆",
    desc: "Обычный салют при хорошем результате",
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
    desc: "Переливающееся небо — супердорогой эффект",
  },
  golden: {
    id: "golden",
    name: "Золотой шторм",
    price: 360,
    icon: "👑",
    desc: "Золотой ливень и мега-салют. Самое дорогое чудо!",
  },
};

const BOOSTS = [
  { id: "slow", icon: "🐌", name: "Улитка-время", desc: "На харде и реальном харде таймер ползёт в 2 раза медленнее. Один забег.", price: 800 },
  { id: "extra", icon: "⏳", name: "+15 секунд", desc: "Добавляет 15 секунд к харду / реальному харду. Один забег.", price: 100 },
  { id: "cheat", icon: "🕵️", name: "Читер", desc: "Только реальный хард: 1 ошибка не считается для оценки. Можно до 4 за забег. Один заряд = одна ошибка.", price: 120 },
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

const ACHIEVEMENTS = [
  { id: "first_step", icon: "👣", name: "Первый шаг", desc: "Заверши любой прогон", check: (s) => s.runs.length >= 1, progress: (s) => ({ current: s.runs.length, target: 1 }) },
  { id: "coins_10", icon: "🪙", name: "Копилка", desc: "Собери 10 монет", check: (s) => s.coins >= 10, progress: (s) => ({ current: s.coins, target: 10 }) },
  { id: "coins_50", icon: "💰", name: "Богач", desc: "Собери 50 монет", check: (s) => s.coins >= 50, progress: (s) => ({ current: s.coins, target: 50 }) },
  { id: "coins_100", icon: "🏦", name: "Сундук", desc: "Собери 100 монет", check: (s) => s.coins >= 100, progress: (s) => ({ current: s.coins, target: 100 }) },
  { id: "easy_perfect", icon: "🌱", name: "Лёгкий герой", desc: "10/10 на лёгком", check: (s) => s.runs.some((r) => (r.level || 1) === 1 && r.correct === 10), progress: (s) => ({ current: bestOn(s, 1), target: 10 }) },
  { id: "medium_go", icon: "⭐", name: "Смелее", desc: "Пройди средний уровень", check: (s) => s.runs.some((r) => r.level === 2), progress: (s) => ({ current: s.runs.filter((r) => r.level === 2).length, target: 1 }) },
  { id: "medium_perfect", icon: "🌟", name: "Двузначный", desc: "10/10 на среднем", check: (s) => s.runs.some((r) => r.level === 2 && r.correct === 10), progress: (s) => ({ current: bestOn(s, 2), target: 10 }) },
  { id: "sharp_go", icon: "⚡", name: "Через десяток", desc: "Пройди сложный уровень", check: (s) => s.runs.some((r) => r.level === 3), progress: (s) => ({ current: s.runs.filter((r) => r.level === 3).length, target: 1 }) },
  { id: "sharp_perfect", icon: "💥", name: "Ловкий счёт", desc: "10/10 на сложном", check: (s) => s.runs.some((r) => r.level === 3 && r.correct === 10), progress: (s) => ({ current: bestOn(s, 3), target: 10 }) },
  { id: "hard_go", icon: "🔥", name: "Огонёк", desc: "Пройди хард", check: (s) => s.runs.some((r) => r.level === 4), progress: (s) => ({ current: s.runs.filter((r) => r.level === 4).length, target: 1 }) },
  { id: "hard_time", icon: "⏱️", name: "Успел!", desc: "Хард до конца минуты", check: (s) => s.runs.some((r) => r.level === 4 && !r.timedOut), progress: (s) => ({ current: s.runs.filter((r) => r.level === 4 && !r.timedOut).length, target: 1 }) },
  { id: "hard_perfect", icon: "🏆", name: "Молния", desc: "10/10 на харде вовремя", check: (s) => s.runs.some((r) => r.level === 4 && r.correct === 10 && !r.timedOut), progress: (s) => ({ current: bestOn(s, 4, (r) => !r.timedOut), target: 10 }) },
  { id: "exam_go", icon: "📕", name: "К контрольной", desc: "Пройди реальный хард", check: (s) => s.runs.some((r) => r.level === 5), progress: (s) => ({ current: s.runs.filter((r) => r.level === 5).length, target: 1 }) },
  { id: "exam_pass", icon: "📗", name: "Сдал", desc: "Оценка 3+ на реальном харде", check: (s) => s.runs.some((r) => r.level === 5 && r.grade >= 3 && !r.failed), progress: (s) => ({ current: bestGradeOn(s, 5), target: 3 }) },
  { id: "exam_four", icon: "📘", name: "Хорошист", desc: "Оценка 4+ на реальном харде", check: (s) => s.runs.some((r) => r.level === 5 && r.grade >= 4), progress: (s) => ({ current: bestGradeOn(s, 5), target: 4 }) },
  { id: "exam_five", icon: "🏅", name: "Отличник школы", desc: "Оценка 5 на реальном харде вовремя", check: (s) => s.runs.some((r) => r.level === 5 && r.grade === 5 && !r.timedOut), progress: (s) => ({ current: bestGradeOn(s, 5, (r) => !r.timedOut), target: 5 }) },
  { id: "five_runs", icon: "🎯", name: "Тренировка", desc: "5 прогонов", check: (s) => s.runs.length >= 5, progress: (s) => ({ current: s.runs.length, target: 5 }) },
  { id: "stars_25", icon: "✨", name: "Звёздный", desc: "25 звёзд", check: (s) => s.stars >= 25, progress: (s) => ({ current: s.stars, target: 25 }) },
  { id: "coop_party", icon: "🤝", name: "Класс в сборе", desc: "Кооп: 5 разных ников в общем топе", coop: true, check: () => coopStats.players >= 5, progress: () => ({ current: coopStats.players, target: 5 }) },
  { id: "coop_runs", icon: "🌍", name: "Общий зачёт", desc: "Кооп: всего 40 прогонов у всех", coop: true, check: () => coopStats.runs >= 40, progress: () => ({ current: coopStats.runs, target: 40 }) },
  { id: "coop_perfects", icon: "🌟", name: "Россыпь десяток", desc: "Кооп: 25 идеальных 10/10 у всех", coop: true, check: () => coopStats.perfects >= 25, progress: () => ({ current: coopStats.perfects, target: 25 }) },
  { id: "coop_hard", icon: "🔥", name: "Огненная банда", desc: "Кооп: 8 ников играли хард/реальный", coop: true, check: () => coopStats.hardPlayers >= 8, progress: () => ({ current: coopStats.hardPlayers, target: 8 }) },
  { id: "coop_sum", icon: "🧮", name: "Сумма класса", desc: "Кооп: сумма верных ответов всех ≥ 300", coop: true, check: () => coopStats.sumCorrect >= 300, progress: () => ({ current: coopStats.sumCorrect, target: 300 }) },
];

async function refreshCoopStats() {
  try {
    const rows = await fetchScores("all");
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
      if (r.level >= 4) hardNicks.add(nick);
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
};

let state = loadState();
saveState();
let selectedLevel = state.lastLevel || 1;
let run = null;
let tickId = null;
let sessionFilter = "all";
let shopTab = "boosts";
let boardFilter = "all";
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

function emptyShop() {
  return {
    skins: ["honey"],
    hats: ["none"],
    toys: [],
    fxOwned: ["classic"],
    skin: "honey",
    hat: "none",
    toysOn: [],
    fx: "classic",
    slow: 0,
    extra: 0,
    cheat: 0,
  };
}

function normalizeShop(raw) {
  const base = emptyShop();
  if (!raw || typeof raw !== "object") return base;
  const skins = Array.isArray(raw.skins) ? raw.skins : base.skins;
  const hats = Array.isArray(raw.hats) ? raw.hats : base.hats;
  const toys = Array.isArray(raw.toys) ? raw.toys : base.toys;
  let fxOwned = Array.isArray(raw.fxOwned) ? raw.fxOwned.filter((id) => FX[id]) : ["classic"];
  if (!fxOwned.includes("classic")) fxOwned = ["classic", ...fxOwned];
  const fx = FX[raw.fx] ? raw.fx : "classic";
  return {
    skins: skins.includes("honey") ? skins : ["honey", ...skins],
    hats: hats.includes("none") ? hats : ["none", ...hats],
    toys,
    fxOwned,
    skin: SKINS[raw.skin] ? raw.skin : "honey",
    hat: HATS[raw.hat] ? raw.hat : "none",
    toysOn: Array.isArray(raw.toysOn) ? raw.toysOn.filter((id) => TOYS[id]) : [],
    fx: fxOwned.includes(fx) ? fx : "classic",
    slow: Number(raw.slow) || 0,
    extra: Number(raw.extra) || 0,
    cheat: Number(raw.cheat) || 0,
  };
}

function loadState() {
  const empty = { stars: 0, coins: 0, runs: [], achievements: [], lastLevel: 1, version: DATA_VERSION, shop: emptyShop() };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const data = JSON.parse(raw);
    const ver = Number(data.version);
    if (ver !== 2 && ver !== DATA_VERSION) {
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
    };
  } catch {
    return empty;
  }
}

function saveState() {
  state.version = DATA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function hasPerfect(levelId) {
  return state.runs.some((r) => (r.level || 1) === levelId && r.correct === 10);
}

function isLevelOpen(id) {
  if (id <= 1) return true;
  return hasPerfect(id - 1);
}

function maxOpenLevel() {
  let max = 1;
  for (let i = 2; i <= 5; i += 1) {
    if (isLevelOpen(i)) max = i;
    else break;
  }
  return max;
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

function renderLevels() {
  if (!isLevelOpen(selectedLevel)) selectedLevel = maxOpenLevel();
  document.querySelectorAll(".level-card").forEach((card) => {
    const id = Number(card.dataset.level);
    const open = isLevelOpen(id);
    card.classList.toggle("locked", !open);
    card.classList.toggle("selected", selectedLevel === id);
    const need = card.querySelector(".lvl-need");
    if (need) {
      const prev = LEVELS[id - 1];
      need.textContent = open || !prev ? "" : `🔒 10/10 «${prev.name}»`;
    }
  });
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

function generateMedium() {
  if (Math.random() < 0.5) {
    const sum = rand(10, 20);
    const a = rand(1, sum - 1);
    const b = sum - a;
    return { a, b, op: "+", answer: sum };
  }
  const a = rand(10, 20);
  const b = rand(1, a);
  return { a, b, op: "−", answer: a - b };
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

function generateProblem(level) {
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
    node.classList.toggle("hidden", key !== name);
  });
}

function applyTheme(level) {
  const cfg = LEVELS[level] || LEVELS[1];
  document.body.dataset.theme = cfg.theme;
  els.homeSubtitle.textContent = cfg.subtitle;
  [els.balloon1, els.balloon2, els.balloon3].forEach((node, i) => {
    node.textContent = cfg.balloons[i];
  });
  document.querySelectorAll(".level-card").forEach((card) => {
    card.classList.toggle("selected", Number(card.dataset.level) === cfg.id);
  });
  paintMascots();
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
  return "";
}

function mascotMarkup(size, smile, look = null) {
  const shop = look || state.shop || emptyShop();
  const skin = SKINS[shop.skin] || SKINS.honey;
  const form = skin.form || "blob";
  const toys = look ? [] : (shop.toysOn || []);
  const mouth = smile ? "M62 116 Q80 136 98 116" : "M68 116 Q80 128 92 116";
  const bow = toys.includes("bow")
    ? `<ellipse cx="38" cy="34" rx="11" ry="7" fill="#ff5d7a"/><ellipse cx="52" cy="34" rx="11" ry="7" fill="#ff5d7a"/><circle cx="45" cy="36" r="4" fill="#fff"/>`
    : "";
  const glasses = toys.includes("glasses")
    ? `<g fill="none" stroke="#3D3A4A" stroke-width="3"><circle cx="62" cy="82" r="13"/><circle cx="98" cy="82" r="13"/><path d="M75 82 H85"/></g>`
    : "";

  let body = "";
  if (form === "cat") {
    body = `
      <path d="M32 48 L48 18 L58 52 Z" fill="${skin.body}"/>
      <path d="M128 48 L112 18 L102 52 Z" fill="${skin.body}"/>
      <path d="M40 30 L48 18 L52 34 Z" fill="${skin.inner}"/>
      <path d="M120 30 L112 18 L108 34 Z" fill="${skin.inner}"/>
      <circle cx="80" cy="86" r="52" fill="${skin.body}"/>
      <ellipse cx="62" cy="82" rx="7" ry="11" fill="#3D3A4A"/>
      <ellipse cx="98" cy="82" rx="7" ry="11" fill="#3D3A4A"/>
      <circle cx="64" cy="78" r="2.5" fill="#fff"/>
      <circle cx="100" cy="78" r="2.5" fill="#fff"/>
      <ellipse cx="80" cy="100" rx="8" ry="5" fill="${skin.inner}"/>
      <path d="M28 100 H52 M28 108 H50 M108 100 H132 M110 108 H132" stroke="#3D3A4A" stroke-width="2" stroke-linecap="round"/>
      <path d="${mouth}" fill="none" stroke="#3D3A4A" stroke-width="4" stroke-linecap="round"/>
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
      <ellipse cx="62" cy="88" rx="7" ry="9" fill="#3D3A4A"/>
      <ellipse cx="98" cy="88" rx="7" ry="9" fill="#3D3A4A"/>
      <circle cx="64" cy="85" r="2.5" fill="#fff"/>
      <circle cx="100" cy="85" r="2.5" fill="#fff"/>
      <ellipse cx="80" cy="104" rx="9" ry="6" fill="#F07167"/>
      <path d="${smile ? "M64 118 Q80 132 96 118" : "M68 118 Q80 126 92 118"}" fill="none" stroke="#3D3A4A" stroke-width="4" stroke-linecap="round"/>
    `;
  } else {
    body = `
      <circle cx="80" cy="86" r="52" fill="${skin.body}"/>
      <circle cx="48" cy="42" r="18" fill="${skin.body}"/>
      <circle cx="112" cy="42" r="18" fill="${skin.body}"/>
      <circle cx="48" cy="42" r="8" fill="${skin.inner}"/>
      <circle cx="112" cy="42" r="8" fill="${skin.inner}"/>
      ${bow}
      <ellipse cx="62" cy="82" rx="8" ry="10" fill="#3D3A4A"/>
      <ellipse cx="98" cy="82" rx="8" ry="10" fill="#3D3A4A"/>
      <circle cx="65" cy="79" r="3" fill="#fff"/>
      <circle cx="101" cy="79" r="3" fill="#fff"/>
      ${glasses}
      <ellipse cx="80" cy="102" rx="10" ry="7" fill="#F07167"/>
      <path d="${mouth}" fill="none" stroke="#3D3A4A" stroke-width="4" stroke-linecap="round"/>
    `;
  }

  return `<svg viewBox="0 -12 160 172" width="${size}" height="${size}">
    ${hatSVG(shop.hat)}
    <ellipse cx="80" cy="145" rx="42" ry="8" fill="#000" opacity=".08"/>
    ${body}
  </svg>`;
}

function boardAvatarHtml(nick, skinId, hatId) {
  const look = { skin: SKINS[skinId] ? skinId : "honey", hat: HATS[hatId] ? hatId : "none", toysOn: [] };
  return `<span class="board-avatar" title="${escapeHtml(nick)}">${mascotMarkup(40, false, look)}</span>`;
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
  t.textContent = TOYS[id].icon;
  return t;
}

function paintStage(stageId, mascotEl, size, smile) {
  if (!mascotEl) return;
  mascotEl.innerHTML = mascotMarkup(size, smile);
  const stage = document.getElementById(stageId);
  if (!stage) return;
  stage.querySelectorAll(".toy").forEach((n) => n.remove());
  (state.shop.toysOn || []).forEach((id) => {
    if (!TOYS[id] || TOYS[id].svg) return;
    stage.appendChild(toyNode(id));
  });
}

function paintMascots() {
  paintStage("homeStage", els.homeMascot, 140, false);
  paintStage("gameStage", els.gameMascot, 88, false);
  paintStage("resultStage", els.resultMascot, 120, true);
  paintStage("shopStage", els.shopMascot, 120, false);
}

function achProgress(a) {
  const p = a.progress(state);
  const unlocked = state.achievements.includes(a.id) || a.check(state);
  const shown = unlocked ? Math.max(p.current, p.target) : Math.max(0, p.current);
  const pct = unlocked ? 100 : Math.min(100, Math.round((shown / p.target) * 100));
  return {
    current: Math.min(shown, p.target),
    raw: p.current,
    target: p.target,
    pct,
    unlocked,
  };
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
    return `<li class="${cls}">
      <span class="n">${i + 1}.</span>
      <span class="ex">${a.a} ${a.op} ${a.b} = ${kid}</span>
      <span class="mark">${mark}</span>
    </li>`;
  }).join("")}</ul>`;
}

function historyItemHtml(r, detailed) {
  const lvl = LEVELS[r.level] || LEVELS[1];
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
          <span><span class="hist-level l${r.level || 1}">${lvl.name}</span>${r.correct}/10${gradeBit}</span>
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

function renderHome() {
  if (!isLevelOpen(selectedLevel)) selectedLevel = maxOpenLevel();
  applyTheme(selectedLevel);
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
  if (!isLevelOpen(2)) {
    els.unlockHint.textContent = "10/10 на Лёгком откроет Средний";
  } else if (!isLevelOpen(3)) {
    els.unlockHint.textContent = "10/10 на Среднем откроет Сложный";
  } else if (!isLevelOpen(4)) {
    els.unlockHint.textContent = "10/10 на Сложном откроет Хард";
  } else if (!isLevelOpen(5)) {
    els.unlockHint.textContent = "10/10 на Харде откроет Реальный хард";
  } else {
    els.unlockHint.textContent = "Все уровни открыты. Можно выбирать любой!";
  }
  renderLevels();

  const done = unlockedCount();
  const total = ACHIEVEMENTS.length;
  els.homeAchCount.textContent = `${done}/${total}`;
  els.homeAchFill.style.width = `${Math.round((done / total) * 100)}%`;
  els.achGrid.innerHTML = ACHIEVEMENTS.map((a) => {
    const p = achProgress(a);
    return `<div class="ach ${p.unlocked ? "unlocked" : "locked"}${a.coop ? " coop" : ""}" data-open="gallery" title="${a.desc}">
      <span class="ico">${a.icon === "🪙" ? '<span class="coin sm"></span>' : a.icon}</span>
      <span class="ttl">${a.coop ? "🤝 " : ""}${a.name}</span>
      <div class="mini-bar"><i style="width:${p.pct}%"></i></div>
    </div>`;
  }).join("");

  els.homeHistCount.textContent = String(state.runs.length);
  if (!state.runs.length) {
    els.historyList.innerHTML = `<li class="empty">Пока нет сессий — нажми Старт!</li>`;
  } else {
    els.historyList.innerHTML = state.runs.slice(0, 3).map((r) => historyItemHtml(r, false)).join("");
  }

  renderGallery();
  renderSessions();
  paintMascots();
}

function renderGallery() {
  const done = unlockedCount();
  const total = ACHIEVEMENTS.length;
  els.galleryCount.textContent = `${done}/${total}`;
  els.galleryFill.style.width = `${Math.round((done / total) * 100)}%`;
  els.galleryList.innerHTML = ACHIEVEMENTS.map((a) => {
    const p = achProgress(a);
    const status = p.unlocked ? `<span class="done-tag">получено</span>` : `<span>${p.current} / ${p.target}</span>`;
    return `<article class="gallery-item ${p.unlocked ? "unlocked" : "locked"}${a.coop ? " coop" : ""}">
      <div class="g-ico">${a.icon === "🪙" ? '<span class="coin md"></span>' : a.icon}</div>
      <div>
        <div class="g-name">${a.name}${a.coop ? ' <span class="coop-tag">кооп</span>' : ""}</div>
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

function startGame() {
  stopFireworks();
  stopFxLayer();
  ensureNickFromInput();
  if (!isLevelOpen(selectedLevel)) selectedLevel = maxOpenLevel();
  renderLevels();
  const cfg = LEVELS[selectedLevel];
  const startedAt = Date.now();
  run = {
    items: generateRun(cfg.id),
    index: 0,
    input: "",
    answers: [],
    startedAt,
    startedIso: new Date(startedAt).toISOString(),
    level: cfg.id,
    limit: cfg.limit,
    done: false,
    gameMs: 0,
    lastTick: Date.now(),
    timeScale: 1,
    slowOn: false,
    extraOn: false,
    forgive: 0,
  };
  document.body.classList.remove("slow-mo");
  els.gameLevel.textContent = cfg.name;
  els.timer.classList.toggle("countdown", Boolean(cfg.limit));
  els.timer.classList.remove("danger");
  showScreen("game");
  paintMascots();
  renderBoostBar();
  renderProblem();
  startTimer();
}

function gameElapsed() {
  const now = Date.now();
  run.gameMs += (now - run.lastTick) * run.timeScale;
  run.lastTick = now;
  return run.gameMs;
}

function startTimer() {
  stopTimer();
  run.lastTick = Date.now();
  const update = () => {
    if (!run || run.done) return;
    if (run.limit) {
      const left = Math.max(0, run.limit - gameElapsed());
      els.timer.textContent = formatTime(left);
      els.timer.classList.toggle("danger", left <= 15000);
      if (left <= 0) finishRun({ timedOut: true });
    } else {
      els.timer.textContent = formatTime(Date.now() - run.startedAt);
    }
  };
  update();
  tickId = setInterval(update, 200);
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
  els.problem.textContent = `${item.a}  ${item.op}  ${item.b}  =  ?`;
  els.problemCard.classList.remove("pop");
  void els.problemCard.offsetWidth;
  els.problemCard.classList.add("pop");
  drawAnswer();
}

function drawAnswer() {
  const has = run.input.length > 0;
  els.answerBox.classList.toggle("has-value", has);
  els.answerText.textContent = run.input;
}

function pressKey(key) {
  if (!run || run.done) return;
  if (key === "back") {
    run.input = run.input.slice(0, -1);
    drawAnswer();
    return;
  }
  if (/^\d$/.test(key) && run.input.length < 3) {
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

function goNext() {
  if (!run || run.done) return;
  captureCurrent("—");
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
  const cfg = LEVELS[level];
  if (grade?.failed) return Math.max(0, correct);
  let coins = correct * cfg.coin;
  if (correct === 10) coins += 5;
  if ((level === 4 || level === 5) && !timedOut && correct >= 8) coins += 5;
  if (level === 5 && grade?.mark === 5 && !timedOut) coins += 5;
  return coins;
}

function unlockAchievements() {
  const before = new Set(state.achievements);
  const now = ACHIEVEMENTS.filter((a) => a.check(state)).map((a) => a.id);
  const fresh = now.filter((id) => !before.has(id));
  state.achievements = [...new Set([...state.achievements, ...now])];
  return ACHIEVEMENTS.filter((a) => fresh.includes(a.id));
}

function finishRun({ timedOut = false } = {}) {
  if (!run || run.done) return;
  run.done = true;
  stopTimer();

  if (timedOut && run.answers.length < TOTAL) {
    if (run.answers.length === run.index) captureCurrent("—");
    while (run.answers.length < TOTAL) {
      const item = run.items[run.answers.length];
      run.answers.push({ ...item, given: "—", ok: false });
    }
  }

  const ms = Date.now() - run.startedAt;
  const correct = run.answers.filter((a) => a.ok).length;
  const cfg = LEVELS[run.level] || LEVELS[1];
  const grade = cfg.school ? schoolGrade(correct, run.forgive || 0) : null;
  const openBefore = maxOpenLevel();
  const rankBefore = rankIndexOf(state.stars);
  const gainedStars = grade?.failed ? Math.max(0, Math.floor(correct / 2)) : correct;
  const gainedCoins = coinsFor(run.level, correct, timedOut, grade);
  state.stars += gainedStars;
  state.coins += gainedCoins;
  const openAfter = maxOpenLevel();
  const rankAfter = rankIndexOf(state.stars);
  state.lastLevel = isLevelOpen(run.level) ? run.level : maxOpenLevel();
  state.runs.unshift({
    startedAt: run.startedIso,
    date: new Date().toISOString(),
    correct,
    total: TOTAL,
    ms,
    level: run.level,
    timedOut,
    coins: gainedCoins,
    grade: grade ? grade.mark : undefined,
    failed: grade ? grade.failed : undefined,
    forgive: grade && grade.forgiven ? grade.forgiven : undefined,
    answers: run.answers.map((a) => ({
      a: a.a,
      op: a.op,
      b: a.b,
      answer: a.answer,
      given: a.given,
      ok: a.ok,
    })),
  });
  const fresh = unlockAchievements();
  saveState();

  const msg = encouragement(correct, timedOut, grade);
  els.resultTitle.textContent = msg.title;
  els.rewardLine.textContent = `${msg.text}  +${gainedStars} опыта  +${gainedCoins} монет`;
  els.correctCount.textContent = String(correct);
  els.resultTime.textContent = timedOut ? `${formatTime(ms)} (время)` : formatTime(ms);
  els.coinsGain.textContent = String(gainedCoins);
  els.starsGain.textContent = String(gainedStars);
  els.startTimePill.textContent = `Старт: ${formatStamp(run.startedIso)}`;
  if (els.gradeRow && els.gradeMark) {
    if (grade) {
      els.gradeRow.classList.remove("hidden");
      els.gradeMark.textContent = grade.failed ? "2 · провал" : String(grade.mark);
      els.gradePill.className = `score-pill grade g${grade.mark}${grade.failed ? " fail" : ""}`;
    } else {
      els.gradeRow.classList.add("hidden");
    }
  }
  els.starBurst.innerHTML = gainedStars
    ? Array.from({ length: Math.min(gainedStars, 10) }, (_, i) => `<span class="star-chip sm" style="animation-delay:${i * 0.08}s"></span>`).join("")
    : `<span>🌱</span>`;
  const extraBanners = [];
  if (openAfter > openBefore) {
    extraBanners.push(`<div class="ach-banner"><span class="lvl-medal m${openAfter}"></span><div>Новый уровень!<small>Открыт «${LEVELS[openAfter].name}»</small></div></div>`);
  }
  if (rankAfter > rankBefore) {
    extraBanners.push(`<div class="ach-banner"><span class="rank-medal r${rankAfter} on">${RANKS[rankAfter].icon}</span><div>${RANKS[rankAfter].name}<small>Новый ранг за опыт</small></div></div>`);
  }
  els.newAchs.innerHTML = extraBanners.join("") + fresh
    .map((a) => `<div class="ach-banner"><span class="ico">${a.icon === "🪙" ? '<span class="coin md"></span>' : a.icon}</span><div>${a.name}<small>${a.desc}</small></div></div>`)
    .join("");
  els.reviewList.innerHTML = answersReviewHtml(run.answers);

  const celebrate = grade ? !grade.failed && grade.mark >= 3 : correct >= 5 || correct === 10;
  const perfectWin = grade ? grade.mark === 5 && !timedOut : correct === 10;
  spawnConfetti(celebrate);
  spawnLoot(gainedStars, gainedCoins);
  spawnVictoryFx(celebrate, perfectWin);
  document.body.classList.remove("slow-mo");
  paintMascots();
  const toasts = [...fresh];
  if (openAfter > openBefore) {
    toasts.unshift({ icon: "🔓", name: `Открыт «${LEVELS[openAfter].name}»`, desc: "Можно играть новый уровень!" });
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
  showScreen("result");
  renderHome();
  submitOnlineScore({
    level: run.level,
    correct,
    ms,
    grade: grade ? grade.mark : null,
    timedOut,
    localId: run.startedIso,
  });
}

const FW_COLORS = ["#ffd166", "#ff7a59", "#4ecdc4", "#6bcb77", "#c084fc", "#ff6b9d"];
const FW_GOLD = ["#fff6c2", "#ffd24a", "#ffe566", "#ffb703", "#fff", "#ff9f1c"];

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
};

function fwResize() {
  fw.canvas.width = window.innerWidth;
  fw.canvas.height = window.innerHeight;
}

function ensureNickFromInput() {
  if (isNickOk(playerNick)) return playerNick;
  if (!els.nickInput) return "";
  return saveNick(els.nickInput.value);
}

function submitOnlineScore(payload) {
  const nick = ensureNickFromInput() || playerNick;
  if (!isNickOk(nick)) return;
  if (payload.correct < 1) return;
  const localId = payload.localId || `${Date.now()}`;
  enqueueScore({
    id: `run:${localId}`,
    nick,
    level: Number(payload.level),
    correct: Number(payload.correct),
    ms: Math.max(0, Math.round(payload.ms)),
    grade: payload.grade == null ? null : Number(payload.grade),
    timed_out: Boolean(payload.timedOut),
    skin: (state.shop && state.shop.skin) || "honey",
    hat: (state.shop && state.shop.hat) || "none",
    local_at: new Date().toISOString(),
  });
  updateSyncHint();
  syncScoreQueue({ quiet: true }).then(({ sent, left }) => {
    if (sent > 0 && left === 0) {
      showToasts([{ plain: true, icon: "🏆", name: "В топе!", desc: `«${nick}» · ${LEVELS[payload.level]?.name || ""} ${payload.correct}/10` }]);
      refreshCoopStats();
    } else if (left > 0) {
      showToasts([{
        plain: true,
        icon: "📦",
        name: "Сохранено локально",
        desc: "Сеть слабая — результат уйдёт в топ, когда появится интернет.",
      }]);
    }
  });
}

function scoreRankKey(row) {
  const gradeBoost = row.grade != null ? row.grade * 100000 : 0;
  return row.correct * 1e9 + gradeBoost - Math.min(row.ms || 0, 999999);
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
  els.boardStatus.textContent = "Синхронизация…";
  els.boardList.innerHTML = "";
  await syncScoreQueue({ quiet: true });
  els.boardStatus.textContent = "Загрузка…";
  try {
    const rows = await fetchScores(boardFilter);
    const list = Array.isArray(rows) ? rows : [];
    // обновить облики из свежих строк
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
      const lvlName = boardFilter === "all" ? "" : ` на «${LEVELS[Number(boardFilter)].name}»`;
      els.boardStatus.textContent = pending
        ? `Пока пусто${lvlName}. В очереди ${pending} — ждём сеть.`
        : `Пока пусто${lvlName}. Сыграй этот режим с ником — и появишься здесь!`;
      updateSyncHint();
      return;
    }
    els.boardStatus.textContent = boardFilter === "all"
      ? `Лучшие по режимам · ${top.length}${pending ? ` · очередь ${pending}` : ""}`
      : `Топ · ${LEVELS[Number(boardFilter)].name} · ${top.length}${pending ? ` · очередь ${pending}` : ""}`;
    els.boardList.innerHTML = top.map((row, i) => {
      const lvl = LEVELS[row.level] || LEVELS[1];
      const place = i + 1;
      const me = row.nick === playerNick ? " me" : "";
      const podium = place <= 3 ? ` podium p${place}` : "";
      const grade = row.grade != null ? ` · оценка ${row.grade}` : "";
      const timeOut = row.timed_out ? " · время" : "";
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
          <span class="board-meta"><span class="hist-level l${row.level}">${lvl.name}</span> ${row.correct}/10 · ${formatTime(row.ms)}${grade}${timeOut}</span>
        </div>
      </li>`;
    }).join("");
    refreshCoopStats();
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
  fw.stopAt = Date.now() + (perfect ? 7000 : 2800);
  fwResize();
  fw.ctx = fw.canvas.getContext("2d");
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

function fxBits(kind, count, make) {
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    parts.push(make(i));
  }
  return parts.join("");
}

function spawnFxLayer(id, perfect) {
  stopFxLayer();
  if (!els.fxLayer || id === "classic") return;
  const big = perfect ? " big" : "";
  els.fxLayer.className = `fx-layer on fx-${id}${big}`;
  if (id === "rainbow") {
    els.fxLayer.innerHTML = fxBits("ribbon", perfect ? 18 : 10, (i) =>
      `<i class="fx-ribbon r${i % 6}" style="left:${6 + (i * 5.2) % 88}%;animation-delay:${(i * 0.08).toFixed(2)}s;--rot:${-28 + (i % 7) * 8}deg"></i>`
    );
  } else if (id === "galaxy") {
    els.fxLayer.innerHTML = `
      <div class="fx-nebula"></div>
      <div class="fx-spin">
        ${fxBits("star", perfect ? 24 : 14, (i) =>
          `<i class="fx-star" style="--a:${(i * 37) % 360}deg;--d:${40 + (i % 8) * 18}px;animation-delay:${(i * 0.05).toFixed(2)}s"></i>`
        )}
      </div>
    `;
  } else if (id === "phoenix") {
    els.fxLayer.innerHTML = `
      <div class="fx-flame-ring a"></div>
      <div class="fx-flame-ring b"></div>
      <div class="fx-flame-ring c"></div>
      ${fxBits("ember", perfect ? 22 : 12, (i) =>
        `<i class="fx-ember" style="left:${10 + (i * 7) % 80}%;animation-delay:${(i * 0.07).toFixed(2)}s"></i>`
      )}
    `;
  } else if (id === "aurora") {
    els.fxLayer.innerHTML = `
      <div class="fx-aurora a"></div>
      <div class="fx-aurora b"></div>
      <div class="fx-aurora c"></div>
      ${fxBits("glint", perfect ? 16 : 8, (i) =>
        `<i class="fx-glint" style="left:${8 + (i * 11) % 84}%;top:${12 + (i * 9) % 50}%;animation-delay:${(i * 0.12).toFixed(2)}s"></i>`
      )}
    `;
  } else if (id === "golden") {
    els.fxLayer.innerHTML = `
      <div class="fx-gold-glow"></div>
      ${fxBits("coin", perfect ? 26 : 14, (i) =>
        `<i class="fx-gold" style="left:${4 + (i * 3.7) % 92}%;animation-delay:${(i * 0.06).toFixed(2)}s;--spin:${rand(-40, 40)}deg"></i>`
      )}
      ${fxBits("spark", perfect ? 20 : 10, (i) =>
        `<i class="fx-sparkle" style="left:${10 + (i * 8) % 80}%;top:${8 + (i * 13) % 55}%;animation-delay:${(i * 0.09).toFixed(2)}s"></i>`
      )}
    `;
  }
  fxTimer = setTimeout(stopFxLayer, perfect ? 6800 : 3400);
}

function spawnVictoryFx(celebrate, perfect) {
  stopFxLayer();
  if (!celebrate) {
    stopFireworks();
    return;
  }
  const fxId = state.shop.fx && FX[state.shop.fx] ? state.shop.fx : "classic";
  const mega = perfect || fxId === "golden" || fxId === "aurora";
  spawnFireworks(mega);
  if (fxId !== "classic") spawnFxLayer(fxId, perfect || fxId === "golden");
}

function stopFireworks() {
  cancelAnimationFrame(fw.raf);
  fw.rockets = [];
  fw.sparks = [];
  document.body.classList.remove("fw-perfect");
  if (fw.canvas) {
    fw.canvas.classList.remove("on");
    const ctx = fw.canvas.getContext("2d");
    ctx.clearRect(0, 0, fw.canvas.width, fw.canvas.height);
  }
}

function fwPick(list) {
  return list[rand(0, list.length - 1)];
}

function fwLaunch(x, targetY, color, power, style) {
  fw.rockets.push({
    x,
    y: fw.canvas.height + 8,
    vx: (Math.random() - 0.5) * 1.1,
    vy: - (11 + Math.random() * 4),
    targetY,
    color,
    power,
    style,
    trail: [],
  });
}

function fwBurst(x, y, color, power, style) {
  const n = power;
  if (style === "ring") {
    for (let i = 0; i < n; i += 1) {
      const a = (Math.PI * 2 * i) / n;
      const sp = 3.4 + Math.random() * 0.6;
      fw.sparks.push(fwSpark(x, y, Math.cos(a) * sp, Math.sin(a) * sp, color, 2.4, 0.008));
    }
    return;
  }
  if (style === "willow") {
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.2 + Math.random() * 3.8;
      fw.sparks.push(fwSpark(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 1.2, color, 1.6, 0.006));
    }
    return;
  }
  for (let i = 0; i < n; i += 1) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.25;
    const sp = (style === "gold" ? 2.2 : 1.8) + Math.random() * 3.4;
    fw.sparks.push(fwSpark(x, y, Math.cos(a) * sp, Math.sin(a) * sp, color, style === "gold" ? 2.8 : 2.1, 0.01));
  }
  if (style === "gold") {
    for (let i = 0; i < 18; i += 1) {
      fw.sparks.push(fwSpark(x, y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, "#fff", 1.2, 0.02));
    }
  }
}

function fwSpark(x, y, vx, vy, color, size, fade) {
  return { x, y, vx, vy, color, size, life: 1, fade, trail: [] };
}

function fwScheduleLaunches(now) {
  if (now < fw.nextLaunch || now > fw.stopAt - 400) return;
  const w = fw.canvas.width;
  const h = fw.canvas.height;
  if (fw.perfect) {
    const palette = Math.random() < 0.55 ? FW_GOLD : FW_COLORS;
    const styles = ["peony", "ring", "willow", "gold"];
    const count = fw.launched === 0 ? 3 : rand(2, 4);
    for (let i = 0; i < count; i += 1) {
      fwLaunch(
        w * (0.12 + Math.random() * 0.76),
        h * (0.16 + Math.random() * 0.32),
        fwPick(palette),
        rand(52, 86),
        fwPick(styles)
      );
    }
    fw.nextLaunch = now + (fw.launched < 2 ? 280 : 420);
    fw.launched += 1;
    if (fw.launched === 6) {
      const cx = w / 2;
      const cy = h * 0.28;
      fwBurst(cx, cy, "#ffd24a", 110, "gold");
      fwBurst(cx - 90, cy + 20, "#ff6b9d", 70, "ring");
      fwBurst(cx + 90, cy + 20, "#4ecdc4", 70, "ring");
    }
  } else {
    fwLaunch(
      w * (0.2 + Math.random() * 0.6),
      h * (0.22 + Math.random() * 0.22),
      fwPick(FW_COLORS),
      rand(36, 52),
      "peony"
    );
    fw.nextLaunch = now + 520;
    fw.launched += 1;
  }
}

function fwTick() {
  const ctx = fw.ctx;
  const now = Date.now();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(0, 0, fw.canvas.width, fw.canvas.height);
  ctx.globalCompositeOperation = "lighter";

  fwScheduleLaunches(now);

  fw.rockets = fw.rockets.filter((r) => {
    r.trail.push({ x: r.x, y: r.y });
    if (r.trail.length > 10) r.trail.shift();
    r.x += r.vx;
    r.y += r.vy;
    r.vy += 0.12;
    r.trail.forEach((p, i) => {
      ctx.fillStyle = r.color;
      ctx.globalAlpha = i / r.trail.length;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
    ctx.fill();
    if (r.vy >= 0 || r.y <= r.targetY) {
      fwBurst(r.x, r.y, r.color, r.power, r.style);
      if (fw.perfect) fwBurst(r.x, r.y, "#fff6c2", Math.floor(r.power * 0.35), "peony");
      return false;
    }
    return true;
  });

  fw.sparks = fw.sparks.filter((s) => {
    s.life -= s.fade;
    if (s.life <= 0) return false;
    s.trail.push({ x: s.x, y: s.y });
    if (s.trail.length > 6) s.trail.shift();
    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.035;
    s.vx *= 0.985;
    s.trail.forEach((p, i) => {
      ctx.globalAlpha = (s.life * i) / s.trail.length * 0.5;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = s.life;
    ctx.fillStyle = s.color;
    ctx.shadowBlur = fw.perfect ? 16 : 8;
    ctx.shadowColor = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    return true;
  });

  if (now < fw.stopAt || fw.rockets.length || fw.sparks.length) {
    fw.raf = requestAnimationFrame(fwTick);
  } else {
    stopFireworks();
  }
}

function spawnConfetti(many) {
  els.confetti.innerHTML = "";
  const n = many ? 28 : 10;
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
  if (!run || run.level < 4) {
    els.boostBar.innerHTML = "";
    return;
  }
  const slowN = state.shop.slow;
  const extraN = state.shop.extra;
  const cheatN = state.shop.cheat;
  const cheatUsed = run.forgive || 0;
  const cheatLeft = CHEAT_MAX_PER_RUN - cheatUsed;
  const canCheat = run.level === 5 && cheatN > 0 && cheatLeft > 0;
  let html = `
    <button type="button" class="boost-btn ${run.slowOn ? "on" : ""}" data-boost="slow" ${run.slowOn || slowN < 1 ? "disabled" : ""}>🐌 Замедлить${slowN ? ` ×${slowN}` : ""}</button>
    <button type="button" class="boost-btn ${run.extraOn ? "on" : ""}" data-boost="extra" ${run.extraOn || extraN < 1 ? "disabled" : ""}>⏳ +15 сек${extraN ? ` ×${extraN}` : ""}</button>
  `;
  if (run.level === 5) {
    html += `<button type="button" class="boost-btn ${cheatUsed ? "on" : ""}" data-boost="cheat" ${canCheat ? "" : "disabled"}>🕵️ Читер${cheatUsed ? ` +${cheatUsed}` : ""}${cheatN ? ` ×${cheatN}` : ""}</button>`;
  }
  els.boostBar.innerHTML = html;
}

function useBoost(id) {
  if (!run || run.done || run.level < 4) return;
  if (id === "slow" && !run.slowOn && state.shop.slow > 0) {
    gameElapsed();
    run.timeScale = 0.5;
    run.slowOn = true;
    state.shop.slow -= 1;
    document.body.classList.add("slow-mo");
    saveState();
    showToasts([{ plain: true, icon: "🐌", name: "Время замедлилось", desc: "Таймер ползёт, как улитка!" }]);
  }
  if (id === "extra" && !run.extraOn && state.shop.extra > 0) {
    run.limit += 15000;
    run.extraOn = true;
    state.shop.extra -= 1;
    saveState();
    showToasts([{ plain: true, icon: "⏳", name: "+15 секунд", desc: "Ещё чуть-чуть времени!" }]);
  }
  if (id === "cheat" && run.level === 5 && state.shop.cheat > 0 && (run.forgive || 0) < CHEAT_MAX_PER_RUN) {
    run.forgive = (run.forgive || 0) + 1;
    state.shop.cheat -= 1;
    saveState();
    showToasts([{
      plain: true,
      icon: "🕵️",
      name: `Читер +${run.forgive}`,
      desc: `Ещё ${run.forgive} ошибк${run.forgive === 1 ? "а не считается" : "и не считаются"} для оценки.`,
    }]);
  }
  renderBoostBar();
  renderHome();
}

function renderShop() {
  els.shopCoins.textContent = String(state.coins);
  paintMascots();
  if (shopTab === "boosts") {
    els.shopList.innerHTML = BOOSTS.map((b) => {
      const n = state.shop[b.id] || 0;
      const can = state.coins >= b.price;
      return shopCard(b.icon, b.name, `${b.desc} У тебя: ${n} шт.`, b.price, can, "buy-boost", b.id, "Купить");
    }).join("");
    return;
  }
  if (shopTab === "looks") {
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
      const on = state.shop.hat === h.id;
      const action = owned ? (on ? "on" : "equip-hat") : "buy-hat";
      const label = on ? "Надета" : owned ? "Надеть" : "Купить";
      return shopCard(h.icon, h.name, "Шляпа и шлем", h.price, owned || state.coins >= h.price, action, h.id, label, on);
    });
    els.shopList.innerHTML = skins.join("") + hats.join("");
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
      return shopCard(
        ico,
        f.name,
        `${f.desc}${priceNote}`,
        f.price,
        owned || state.coins >= f.price,
        action,
        f.id,
        label,
        on
      );
    }).join("");
    return;
  }
  els.shopList.innerHTML = Object.values(TOYS).map((t) => {
    const owned = state.shop.toys.includes(t.id);
    const on = state.shop.toysOn.includes(t.id);
    const action = owned ? (on ? "off-toy" : "equip-toy") : "buy-toy";
    const label = on ? "Снять" : owned ? "Надеть" : "Купить";
    const ico = t.custom
      ? `<span class="toy-shop-ico ${t.id}"><span class="wand-shaft"></span><span class="wand-star"></span></span>`
      : t.icon;
    return shopCard(ico, t.name, on ? "На персонаже" : "Безделушка", t.price, owned || state.coins >= t.price, action, t.id, label, on);
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
  if (act === "buy-boost") {
    const item = BOOSTS.find((b) => b.id === id);
    if (!item || state.coins < item.price) return notEnough();
    state.coins -= item.price;
    state.shop[id] += 1;
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
    state.shop.hat = id;
    pingBuy(item.icon, item.name);
  } else if (act === "equip-hat") {
    state.shop.hat = id;
  } else if (act === "buy-toy") {
    const item = TOYS[id];
    if (!item || state.coins < item.price) return notEnough();
    state.coins -= item.price;
    if (!state.shop.toys.includes(id)) state.shop.toys.push(id);
    if (state.shop.toysOn.length < 3 && !state.shop.toysOn.includes(id)) state.shop.toysOn.push(id);
    pingBuy(item.icon, item.name);
  } else if (act === "equip-toy") {
    if (state.shop.toysOn.includes(id)) return;
    if (state.shop.toysOn.length >= 3) {
      showToasts([{ plain: true, icon: "🎒", name: "Много штучек", desc: "Сними одну — можно надеть до 3 штук." }]);
      return;
    }
    state.shop.toysOn.push(id);
  } else if (act === "off-toy") {
    state.shop.toysOn = state.shop.toysOn.filter((t) => t !== id);
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
  }
  saveState();
  renderShop();
  renderHome();
}

function pingBuy(icon, name) {
  showToasts([{ plain: true, icon, name: "Куплено!", desc: name }]);
}

document.getElementById("levels").addEventListener("click", (e) => {
  const card = e.target.closest(".level-card");
  if (!card) return;
  const id = Number(card.dataset.level);
  if (!isLevelOpen(id)) {
    card.classList.remove("shake");
    void card.offsetWidth;
    card.classList.add("shake");
    const prev = LEVELS[id - 1];
    showToasts([{ plain: true, icon: "🔒", name: "Пока закрыто", desc: prev ? `Сначала 10/10 на «${prev.name}»` : "Ещё рано" }]);
    return;
  }
  selectedLevel = id;
  state.lastLevel = selectedLevel;
  saveState();
  applyTheme(selectedLevel);
  renderLevels();
});

els.openShopBtn.addEventListener("click", () => {
  renderShop();
  showScreen("shop");
});

document.getElementById("shopTabs").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-tab]");
  if (!btn) return;
  shopTab = btn.dataset.tab;
  document.querySelectorAll("#shopTabs .filter-btn").forEach((b) => b.classList.toggle("selected", b === btn));
  renderShop();
});

els.shopList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn || btn.disabled) return;
  shopAction(btn.dataset.act, btn.dataset.id);
});

els.boostBar.addEventListener("click", (e) => {
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
  if (document.visibilityState === "visible") syncScoreQueue({ quiet: true });
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
