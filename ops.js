/**
 * OPS DRILL — личный тренажёр sysadmin (CMD ↔ PowerShell).
 * Вход: Ctrl+Shift+O → код `sys.ops`
 * Прогресс в localStorage отдельно от детской игры.
 */
(function () {
  const OPS_KEY = "schet-ops-drill-v1";
  const UNLOCK_CODE = "sys.ops";
  const TOTAL = 10;

  const RANKS = [
    { min: 0, name: "console.rookie" },
    { min: 40, name: "operator" },
    { min: 120, name: "sysadmin" },
    { min: 280, name: "senior.ops" },
    { min: 500, name: "root.shell" },
  ];

  const CATEGORIES = [
    {
      id: "files",
      name: "Files",
      blurb: "Каталоги и файлы",
      drills: [
        { ask: "Список файлов в текущей папке (CMD)", answer: "dir", shell: "cmd", alts: ["dir /b"] },
        { ask: "Список файлов (PowerShell)", answer: "get-childitem", shell: "ps", alts: ["gci", "ls"] },
        { ask: "Сменить каталог (CMD)", answer: "cd", shell: "cmd", alts: ["chdir"] },
        { ask: "Сменить каталог (PowerShell)", answer: "set-location", shell: "ps", alts: ["cd", "sl"] },
        { ask: "Создать папку (CMD)", answer: "mkdir", shell: "cmd", alts: ["md"] },
        { ask: "Создать папку (PowerShell)", answer: "new-item -itemtype directory", shell: "ps", alts: ["mkdir", "ni -itemtype directory", "new-item -type directory"] },
        { ask: "Скопировать файл (CMD)", answer: "copy", shell: "cmd", alts: ["xcopy", "robocopy"] },
        { ask: "Скопировать (PowerShell)", answer: "copy-item", shell: "ps", alts: ["cpi", "copy"] },
        { ask: "Удалить файл (CMD)", answer: "del", shell: "cmd", alts: ["erase"] },
        { ask: "Удалить (PowerShell)", answer: "remove-item", shell: "ps", alts: ["ri", "rm", "del"] },
        { ask: "Показать содержимое текстового файла (CMD)", answer: "type", shell: "cmd" },
        { ask: "Прочитать файл (PowerShell)", answer: "get-content", shell: "ps", alts: ["gc", "cat"] },
        { ask: "Переименовать (CMD)", answer: "ren", shell: "cmd", alts: ["rename"] },
        { ask: "Переименовать (PowerShell)", answer: "rename-item", shell: "ps", alts: ["rni", "ren"] },
        { ask: "Переместить (PowerShell)", answer: "move-item", shell: "ps", alts: ["mi", "move", "mv"] },
      ],
    },
    {
      id: "proc",
      name: "Processes",
      blurb: "Процессы",
      drills: [
        { ask: "Список процессов (CMD)", answer: "tasklist", shell: "cmd" },
        { ask: "Список процессов (PowerShell)", answer: "get-process", shell: "ps", alts: ["gps", "ps"] },
        { ask: "Завершить процесс по PID (CMD)", answer: "taskkill /pid", shell: "cmd", alts: ["taskkill"] },
        { ask: "Остановить процесс (PowerShell)", answer: "stop-process", shell: "ps", alts: ["spps", "kill"] },
        { ask: "Найти процесс по имени (PowerShell)", answer: "get-process -name", shell: "ps", alts: ["get-process"] },
        { ask: "Сортировать процессы по CPU (PowerShell)", answer: "get-process | sort-object cpu", shell: "ps", alts: ["get-process | sort cpu", "gps | sort cpu"] },
      ],
    },
    {
      id: "svc",
      name: "Services",
      blurb: "Службы",
      drills: [
        { ask: "Список служб (CMD/net)", answer: "net start", shell: "cmd" },
        { ask: "Список служб (PowerShell)", answer: "get-service", shell: "ps", alts: ["gsv"] },
        { ask: "Статус службы через sc (CMD)", answer: "sc query", shell: "cmd" },
        { ask: "Запустить службу (PowerShell)", answer: "start-service", shell: "ps", alts: ["sasv"] },
        { ask: "Остановить службу (PowerShell)", answer: "stop-service", shell: "ps", alts: ["spsv"] },
        { ask: "Перезапустить службу (PowerShell)", answer: "restart-service", shell: "ps" },
      ],
    },
    {
      id: "net",
      name: "Network",
      blurb: "Сеть",
      drills: [
        { ask: "IP-конфигурация (CMD)", answer: "ipconfig", shell: "cmd", alts: ["ipconfig /all"] },
        { ask: "IP-адреса (PowerShell)", answer: "get-netipaddress", shell: "ps", alts: ["get-netipconfiguration"] },
        { ask: "Проверка связи (CMD)", answer: "ping", shell: "cmd" },
        { ask: "Проверка связи (PowerShell)", answer: "test-connection", shell: "ps", alts: ["tnc"] },
        { ask: "Открытые порты / соединения (CMD)", answer: "netstat", shell: "cmd", alts: ["netstat -ano"] },
        { ask: "TCP-соединения (PowerShell)", answer: "get-nettcpconnection", shell: "ps" },
        { ask: "DNS-запрос (CMD)", answer: "nslookup", shell: "cmd" },
        { ask: "DNS-запрос (PowerShell)", answer: "resolve-dnsname", shell: "ps", alts: ["nslookup"] },
        { ask: "Трассировка (CMD)", answer: "tracert", shell: "cmd" },
        { ask: "Маршрут/проверка хоста (PowerShell)", answer: "test-netconnection", shell: "ps", alts: ["tnc"] },
        { ask: "Таблица маршрутов (CMD)", answer: "route print", shell: "cmd" },
        { ask: "ARP-таблица (CMD)", answer: "arp -a", shell: "cmd", alts: ["arp"] },
      ],
    },
    {
      id: "users",
      name: "Users",
      blurb: "Учётки и группы",
      drills: [
        { ask: "Кто я (CMD/PS)", answer: "whoami", shell: "both" },
        { ask: "Группы текущего пользователя", answer: "whoami /groups", shell: "cmd", alts: ["whoami /group"] },
        { ask: "Локальные пользователи (CMD)", answer: "net user", shell: "cmd" },
        { ask: "Локальные пользователи (PowerShell)", answer: "get-localuser", shell: "ps" },
        { ask: "Члены группы Administrators (CMD)", answer: "net localgroup administrators", shell: "cmd" },
        { ask: "Члены локальной группы (PowerShell)", answer: "get-localgroupmember", shell: "ps" },
        { ask: "Права на файл/папку (CMD)", answer: "icacls", shell: "cmd" },
        { ask: "ACL объекта (PowerShell)", answer: "get-acl", shell: "ps" },
      ],
    },
    {
      id: "sys",
      name: "System",
      blurb: "Система и логи",
      drills: [
        { ask: "Имя компьютера (CMD)", answer: "hostname", shell: "cmd" },
        { ask: "Сводка о системе (CMD)", answer: "systeminfo", shell: "cmd" },
        { ask: "Инфо о системе (PowerShell)", answer: "get-computerinfo", shell: "ps" },
        { ask: "Переменные среды (CMD)", answer: "set", shell: "cmd" },
        { ask: "Переменная среды PATH (PowerShell)", answer: "$env:path", shell: "ps", alts: ["$env:path", "echo $env:path"] },
        { ask: "Диски (PowerShell)", answer: "get-psdrive", shell: "ps", alts: ["get-volume", "get-disk"] },
        { ask: "Свободное место (CMD)", answer: "wmic logicaldisk get size,freespace,caption", shell: "cmd", alts: ["fsutil volume diskfree"] },
        { ask: "Журнал событий (современный PS)", answer: "get-winevent", shell: "ps" },
        { ask: "Планировщик: список задач (CMD)", answer: "schtasks /query", shell: "cmd", alts: ["schtasks"] },
      ],
    },
    {
      id: "diff",
      name: "CMD vs PS",
      blurb: "Отличия и привычки",
      drills: [
        {
          ask: "PowerShell-эквивалент команды dir",
          answer: "get-childitem",
          shell: "ps",
          alts: ["gci", "ls"],
          tip: "dir в PS — часто алиас Get-ChildItem",
        },
        {
          ask: "Ключевое отличие PS от CMD: вывод — это…",
          answer: "objects",
          shell: "concept",
          alts: ["объекты", "object"],
          tip: "CMD — текст; PowerShell — объекты .NET",
        },
        {
          ask: "Соглашение имён командлетов PowerShell",
          answer: "verb-noun",
          shell: "concept",
          alts: ["verb/noun", "глагол-существительное"],
        },
        {
          ask: "Конвейер PS передаёт…",
          answer: "objects",
          shell: "concept",
          alts: ["объекты", "object"],
        },
        {
          ask: "CMD-команда для очистки экрана",
          answer: "cls",
          shell: "cmd",
          alts: ["clear"],
        },
        {
          ask: "Очистка экрана в PowerShell",
          answer: "clear-host",
          shell: "ps",
          alts: ["cls", "clear"],
        },
        {
          ask: "Справка по команде в CMD",
          answer: "help",
          shell: "cmd",
          alts: ["/?"],
        },
        {
          ask: "Справка по командлету (PowerShell)",
          answer: "get-help",
          shell: "ps",
          alts: ["help", "man"],
        },
        {
          ask: "История команд в PowerShell",
          answer: "get-history",
          shell: "ps",
          alts: ["h", "history"],
        },
        {
          ask: "Выполнить команду CMD из PowerShell явно",
          answer: "cmd /c",
          shell: "ps",
          alts: ["cmd.exe /c"],
        },
      ],
    },
  ];

  const ACHIEVEMENTS = [
    { id: "boot", name: "boot.ok", desc: "Первый вход в OPS", check: (s) => (s.runs || 0) >= 1 },
    { id: "warm", name: "warm.cache", desc: "5 прогонов", check: (s) => (s.runs || 0) >= 5 },
    { id: "perfect", name: "clean.exit", desc: "Идеальный 10/10", check: (s) => (s.perfects || 0) >= 1 },
    { id: "perfect3", name: "triple.clean", desc: "3 идеальных прогона", check: (s) => (s.perfects || 0) >= 3 },
    { id: "cats", name: "full.map", desc: "Пройти все категории (≥1 раз)", check: (s) => CATEGORIES.every((c) => (s.catRuns || {})[c.id] >= 1) },
    { id: "speed", name: "fast.path", desc: "10/10 быстрее 75 сек", check: (s) => !!(s.bestMs && s.bestMs < 75000 && (s.perfects || 0) >= 1) },
    { id: "xp200", name: "xp.200", desc: "Набрать 200 XP", check: (s) => (s.xp || 0) >= 200 },
    { id: "senior", name: "senior.ops", desc: "Ранг senior.ops", check: (s) => rankFor(s.xp || 0).name === "senior.ops" || rankFor(s.xp || 0).min >= 280 },
  ];

  let state = loadState();
  let run = null;
  let unlocked = false;

  try {
    unlocked = localStorage.getItem(`${OPS_KEY}-on`) === "1";
  } catch {
    unlocked = false;
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(OPS_KEY) || "{}");
      return {
        xp: Number(raw.xp) || 0,
        runs: Number(raw.runs) || 0,
        perfects: Number(raw.perfects) || 0,
        bestMs: raw.bestMs == null ? null : Number(raw.bestMs),
        catRuns: raw.catRuns && typeof raw.catRuns === "object" ? raw.catRuns : {},
        achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
        lastCat: raw.lastCat || "files",
      };
    } catch {
      return { xp: 0, runs: 0, perfects: 0, bestMs: null, catRuns: {}, achievements: [], lastCat: "files" };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(OPS_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }

  function rankFor(xp) {
    let cur = RANKS[0];
    RANKS.forEach((r) => {
      if (xp >= r.min) cur = r;
    });
    return cur;
  }

  function norm(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/['"]/g, "");
  }

  function matchAnswer(typed, drill) {
    const t = norm(typed);
    if (!t) return false;
    const pool = [drill.answer, ...(drill.alts || [])].map(norm);
    return pool.some((a) => t === a || t.startsWith(`${a} `));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickDrills(catId) {
    const cat = CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0];
    const pool = shuffle(cat.drills);
    const items = [];
    let i = 0;
    while (items.length < TOTAL) {
      items.push({ ...pool[i % pool.length], cat: cat.id });
      i += 1;
    }
    return { cat, items: shuffle(items).slice(0, TOTAL) };
  }

  function els() {
    return {
      shell: document.getElementById("opsShell"),
      gate: document.getElementById("opsGate"),
      gateInput: document.getElementById("opsGateInput"),
      gateErr: document.getElementById("opsGateErr"),
      hub: document.getElementById("opsHub"),
      drill: document.getElementById("opsDrill"),
      cats: document.getElementById("opsCats"),
      rank: document.getElementById("opsRank"),
      xp: document.getElementById("opsXp"),
      ach: document.getElementById("opsAch"),
      ask: document.getElementById("opsAsk"),
      tip: document.getElementById("opsTip"),
      input: document.getElementById("opsInput"),
      meta: document.getElementById("opsMeta"),
      log: document.getElementById("opsLog"),
      progress: document.getElementById("opsProgress"),
    };
  }

  function setUnlocked(v) {
    unlocked = !!v;
    try {
      localStorage.setItem(`${OPS_KEY}-on`, unlocked ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function showGate(show) {
    const e = els();
    if (!e.gate) return;
    e.gate.classList.toggle("hidden", !show);
    if (show && e.gateInput) {
      e.gateInput.value = "";
      if (e.gateErr) e.gateErr.textContent = "";
      setTimeout(() => e.gateInput.focus(), 50);
    }
  }

  function openShell() {
    const e = els();
    if (!e.shell) return;
    document.body.classList.add("ops-on");
    e.shell.classList.remove("hidden");
    showGate(false);
    showHub();
    renderHub();
  }

  function closeShell() {
    const e = els();
    document.body.classList.remove("ops-on");
    if (e.shell) e.shell.classList.add("hidden");
    run = null;
  }

  function showHub() {
    const e = els();
    if (e.hub) e.hub.classList.remove("hidden");
    if (e.drill) e.drill.classList.add("hidden");
  }

  function showDrill() {
    const e = els();
    if (e.hub) e.hub.classList.add("hidden");
    if (e.drill) e.drill.classList.remove("hidden");
  }

  function renderHub() {
    const e = els();
    const rank = rankFor(state.xp);
    if (e.rank) e.rank.textContent = rank.name;
    if (e.xp) e.xp.textContent = String(state.xp);
    if (e.cats) {
      e.cats.innerHTML = CATEGORIES.map((c) => {
        const n = (state.catRuns || {})[c.id] || 0;
        return `<button type="button" class="ops-cat" data-ops-cat="${c.id}">
          <span class="ops-cat-id">${c.name}</span>
          <span class="ops-cat-blurb">${c.blurb}</span>
          <span class="ops-cat-stat">runs:${n}</span>
        </button>`;
      }).join("");
    }
    if (e.ach) {
      e.ach.innerHTML = ACHIEVEMENTS.map((a) => {
        const on = state.achievements.includes(a.id);
        return `<div class="ops-ach ${on ? "on" : ""}"><strong>${a.name}</strong><span>${a.desc}</span></div>`;
      }).join("");
    }
  }

  function unlockAchievements() {
    const fresh = [];
    ACHIEVEMENTS.forEach((a) => {
      if (state.achievements.includes(a.id)) return;
      if (a.check(state)) {
        state.achievements.push(a.id);
        fresh.push(a);
      }
    });
    return fresh;
  }

  function startCategory(catId) {
    const pack = pickDrills(catId);
    state.lastCat = catId;
    saveState();
    run = {
      cat: pack.cat,
      items: pack.items,
      index: 0,
      correct: 0,
      startedAt: Date.now(),
      log: [],
    };
    showDrill();
    renderQuestion();
  }

  function renderQuestion() {
    const e = els();
    if (!run) return;
    const item = run.items[run.index];
    if (e.ask) e.ask.textContent = item.ask;
    if (e.tip) e.tip.textContent = item.tip || `shell: ${item.shell || "cmd|ps"}`;
    if (e.meta) e.meta.textContent = `${run.cat.name} · ${run.index + 1}/${TOTAL} · ok ${run.correct}`;
    if (e.progress) e.progress.style.width = `${((run.index) / TOTAL) * 100}%`;
    if (e.input) {
      e.input.value = "";
      e.input.focus();
    }
  }

  function appendLog(line, ok) {
    const e = els();
    if (!e.log) return;
    const div = document.createElement("div");
    div.className = `ops-log-line ${ok ? "ok" : "bad"}`;
    div.textContent = line;
    e.log.prepend(div);
  }

  function submitAnswer() {
    if (!run) return;
    const e = els();
    const item = run.items[run.index];
    const typed = (e.input && e.input.value) || "";
    const ok = matchAnswer(typed, item);
    if (ok) run.correct += 1;
    run.log.push({ ask: item.ask, given: typed, answer: item.answer, ok });
    appendLog(`${ok ? "OK" : "NO"} › ${typed || "∅"} ${ok ? "" : `← ${item.answer}`}`, ok);
    if (run.index + 1 >= TOTAL) {
      finishRun();
      return;
    }
    run.index += 1;
    renderQuestion();
  }

  function finishRun() {
    const ms = Date.now() - run.startedAt;
    const perfect = run.correct === TOTAL;
    const gained = run.correct * 2 + (perfect ? 8 : 0) + Math.max(0, 6 - Math.floor(ms / 15000));
    state.xp += gained;
    state.runs += 1;
    if (perfect) {
      state.perfects += 1;
      if (state.bestMs == null || ms < state.bestMs) state.bestMs = ms;
    }
    if (!state.catRuns) state.catRuns = {};
    state.catRuns[run.cat.id] = (state.catRuns[run.cat.id] || 0) + 1;
    const fresh = unlockAchievements();
    saveState();
    const e = els();
    if (e.meta) {
      e.meta.textContent = `DONE · ${run.correct}/${TOTAL} · ${Math.round(ms / 1000)}s · +${gained} XP`;
    }
    if (e.progress) e.progress.style.width = "100%";
    if (e.ask) {
      e.ask.textContent = perfect
        ? `clean.exit — ${run.cat.name}`
        : `session.end — ${run.correct}/${TOTAL}`;
    }
    if (e.tip) {
      e.tip.textContent = fresh.length
        ? `ACH: ${fresh.map((a) => a.name).join(", ")}`
        : "Enter / ESC → hub";
    }
    run = { ...run, done: true };
    renderHub();
  }

  function tryUnlock(code) {
    if (norm(code) === norm(UNLOCK_CODE)) {
      setUnlocked(true);
      openShell();
      return true;
    }
    return false;
  }

  function promptUnlock() {
    if (unlocked) {
      openShell();
      return;
    }
    showGate(true);
  }

  function bind() {
    const e = els();
    if (!e.shell) return;

    document.addEventListener("keydown", (ev) => {
      if (ev.ctrlKey && ev.shiftKey && (ev.key === "O" || ev.key === "o")) {
        ev.preventDefault();
        promptUnlock();
      }
    });

    document.getElementById("opsGateGo")?.addEventListener("click", () => {
      const code = e.gateInput ? e.gateInput.value : "";
      if (!tryUnlock(code)) {
        if (e.gateErr) e.gateErr.textContent = "access denied";
      }
    });
    e.gateInput?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") document.getElementById("opsGateGo")?.click();
      if (ev.key === "Escape") showGate(false);
    });
    document.getElementById("opsGateClose")?.addEventListener("click", () => showGate(false));

    document.getElementById("opsExit")?.addEventListener("click", closeShell);
    document.getElementById("opsBackHub")?.addEventListener("click", () => {
      run = null;
      showHub();
      renderHub();
    });

    e.cats?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-ops-cat]");
      if (!btn) return;
      startCategory(btn.dataset.opsCat);
    });

    document.getElementById("opsSubmit")?.addEventListener("click", () => {
      if (run && run.done) {
        showHub();
        renderHub();
        return;
      }
      submitAnswer();
    });
    e.input?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        if (run && run.done) {
          showHub();
          renderHub();
          return;
        }
        submitAnswer();
      }
      if (ev.key === "Escape") {
        run = null;
        showHub();
        renderHub();
      }
    });
  }

  window.OpsTerminal = {
    promptUnlock,
    open: () => (unlocked ? openShell() : promptUnlock()),
    close: closeShell,
    tryUnlock,
    isUnlocked: () => unlocked,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
