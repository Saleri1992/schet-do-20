/**
 * OPS STORY — сюжетная кампания (имитация терминала, без реальной сети/файлов).
 * Fiction / lab sim. IP из TEST-NET (RFC 5737).
 */
(function () {
  const KEY = "schet-ops-story-v1";
  const HOST_IP = "203.0.113.77";
  const VPN_IP = "198.51.100.23";
  const BACKUP_PASS = "RESTORE-OK-991";

  const SHOP = [
    { id: "mobo", name: "MOBO·basic", price: 40, slot: "mobo" },
    { id: "cpu", name: "CPU·4c", price: 55, slot: "cpu" },
    { id: "ram", name: "RAM·16G", price: 35, slot: "ram" },
    { id: "gpu", name: "GPU·entry", price: 80, slot: "gpu" },
    { id: "psu", name: "PSU·500W", price: 30, slot: "psu" },
  ];

  const FS = {
    router: {
      "/": { type: "dir", kids: ["var"] },
      "/var": { type: "dir", kids: ["log"] },
      "/var/log": { type: "dir", kids: ["connections.log", "auth.log", "readme.txt"] },
      "/var/log/readme.txt": {
        type: "file",
        body: "ROUTER LAB SIM — not a real device.\nUse: ls, cd, cat, grep, pwd, help\n",
      },
      "/var/log/connections.log": {
        type: "file",
        body:
          "08:11 accept 192.168.1.10 → wan\n" +
          "08:14 accept 192.168.1.14 → wan\n" +
          `08:22 SSH_SESSION from ${HOST_IP} user=unknown\n` +
          "08:25 accept 192.168.1.10 → wan\n" +
          `08:31 DATA_OUT large → ${HOST_IP} (backup?\n` +
          "08:40 dhcp renew 192.168.1.14\n",
      },
      "/var/log/auth.log": {
        type: "file",
        body:
          "sshd: Failed password for root from 198.51.100.9\n" +
          `sshd: Accepted password for admin from ${HOST_IP}\n` +
          "sshd: session closed\n",
      },
    },
    remote: {
      "/": { type: "dir", kids: ["home", "etc", "tmp"] },
      "/home": { type: "dir", kids: ["admin"] },
      "/home/admin": { type: "dir", kids: ["notes.txt", "loot", ".secret", "tools"] },
      "/home/admin/notes.txt": {
        type: "file",
        body:
          "todo: wipe target, stash vault, leave.\n" +
          "vault pass is NOT in this file.\n" +
          "try .secret or grep -r pass .\n",
      },
      "/home/admin/loot": { type: "dir", kids: ["backup_hint.txt", "system_backup.vault"] },
      "/home/admin/loot/backup_hint.txt": {
        type: "file",
        body: "hint: password file name contains 'pass'\nhint: hidden dir starts with dot\n",
      },
      "/home/admin/loot/system_backup.vault": {
        type: "file",
        body: "[binary vault simulation — need password from .secret/backup_pass.txt]\n",
      },
      "/home/admin/.secret": { type: "dir", kids: ["backup_pass.txt"] },
      "/home/admin/.secret/backup_pass.txt": {
        type: "file",
        body: `backup_password=${BACKUP_PASS}\nowner=ops-lab\n`,
      },
      "/home/admin/tools": { type: "dir", kids: ["mining_guide.txt", "vpn_cheatsheet.txt", "ids_notes.txt"] },
      "/home/admin/tools/mining_guide.txt": {
        type: "file",
        body:
          "BONUS GUIDE (lab)\n" +
          "1) buy MOBO CPU RAM GPU PSU in shop\n" +
          "2) assemble\n" +
          "3) mine-start\n",
      },
      "/home/admin/tools/vpn_cheatsheet.txt": {
        type: "file",
        body:
          "VPN LAB\n" +
          "sudo apt install wireguard\n" +
          "sudo systemctl enable wg-quick@wg0\n" +
          "sudo systemctl start wg-quick@wg0\n",
      },
      "/home/admin/tools/ids_notes.txt": {
        type: "file",
        body:
          "DEFENSE LAB\n" +
          "sudo ufw enable\n" +
          `sudo ufw deny from ${HOST_IP}\n` +
          "sudo systemctl start fail2ban\n",
      },
      "/etc": { type: "dir", kids: ["hostname"] },
      "/etc/hostname": { type: "file", body: "shadow-vps-lab\n" },
      "/tmp": { type: "dir", kids: [] },
    },
  };

  const CHAPTERS = [
    {
      id: "intro",
      title: "PROLOGUE · ghost contract",
      narrative:
        "Ты — ops-фрилансер в неоновом городе. Это ИСТОРИЯ-СИМУЛЯТОР: никакой реальной сети, только учебный терминал.\n" +
        "Сначала подними свой «базовый ПК» на Linux и поставь пару пакетов. Потом пара викторин и оплачиваемые мини-заказы.\n" +
        "Дальше — инцидент, расследование, защита, оффер на VPN и лёгкий тюнинг/майнинг-лаба.",
      mode: "continue",
      reward: 20,
    },
    {
      id: "linux",
      title: "CH.01 · bootstrap linux",
      narrative:
        "Базовый ПК. Нужно обновить индексы и поставить curl, git, htop.\n" +
        "Команды (по одной): sudo apt update → sudo apt install curl git htop",
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        { id: "upd", match: /^sudo\s+apt\s+update$/, out: "Get: lab mirrors… Done.", pay: 10 },
        { id: "ins", match: /^sudo\s+apt\s+install\s+curl\s+git\s+htop$/, out: "Setting up curl git htop… done.", pay: 25 },
      ],
    },
    {
      id: "quiz1",
      title: "CH.02 · quiz · packages",
      narrative: "Закрепление перед заказами. Ответы помогут в следующих главах.",
      mode: "quiz",
      questions: [
        {
          q: "apt update делает…",
          options: ["обновляет списки пакетов", "сразу ставит все обновления", "удаляет пакеты"],
          ok: 0,
        },
        {
          q: "sudo нужно чтобы…",
          options: ["ускорить интернет", "выполнить команду с правами администратора", "очистить диск"],
          ok: 1,
        },
        {
          q: "htop — это…",
          options: ["веб-сервер", "монитор процессов", "файрвол"],
          ok: 1,
        },
      ],
      reward: 30,
    },
    {
      id: "gigs",
      title: "CH.03 · paid gigs",
      narrative:
        "Биржа заказов. Выполни 3 простых задания — получи кредиты.\n" +
        "1) mkdir ~/projects\n2) echo ready > ~/projects/status.txt\n3) cat ~/projects/status.txt",
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        { id: "g1", match: /^mkdir\s+~\/projects$/, out: "ok: ~/projects", pay: 15 },
        { id: "g2", match: /^echo\s+ready\s+>\s+~\/projects\/status\.txt$/, out: "ok: wrote status.txt", pay: 15 },
        { id: "g3", match: /^cat\s+~\/projects\/status\.txt$/, out: "ready", pay: 20 },
      ],
    },
    {
      id: "quiz2",
      title: "CH.04 · quiz · ops words",
      narrative: "Ещё викторина: логи, поиск, сеть — пригодится в расследовании.",
      mode: "quiz",
      questions: [
        {
          q: "grep ищет…",
          options: ["процессы", "строки по шаблону в тексте", "IP-адреса только в роутере"],
          ok: 1,
        },
        {
          q: "SSH обычно нужен чтобы…",
          options: ["рисовать обои", "удалённо работать в терминале на хосте", "майнить"],
          ok: 1,
        },
        {
          q: "UFW — это…",
          options: ["пакетный менеджер", "простой файрвол в Ubuntu", "редактор текста"],
          ok: 1,
        },
      ],
      reward: 30,
    },
    {
      id: "incident",
      title: "CH.05 · BLACKOUT",
      narrative:
        `УТРО. Твой рабочий ПК «стёрт». В записке от неизвестного: «бэкап у меня».\n` +
        `Системы нет — только веб-консоль домашнего роутера (СИМУЛЯЦИЯ).\n` +
        `Нужно найти, кто забирал данные. Потом «зайдём» на хост злоумышленника (lab fiction).\n` +
        `Известно: IP из диапазона документации ${HOST_IP}.`,
      mode: "continue",
      reward: 15,
    },
    {
      id: "router",
      title: "CH.06 · router forensics",
      narrative:
        "Роутер lab. Найди IP сессии в логах.\n" +
        "Подсказка: cd /var/log → ls → cat connections.log или grep SSH /var/log/connections.log\n" +
        `Когда увидишь IP ${HOST_IP}, введи: track ${HOST_IP}`,
      mode: "term",
      host: "router",
      cwd: "/",
      goals: [
        {
          id: "track",
          match: new RegExp(`^track\\s+${HOST_IP.replace(/\./g, "\\.")}$`),
          out: `TRACE LOCK · ${HOST_IP} marked. Open SSH path…`,
          pay: 40,
          needFlag: "sawHostIp",
        },
      ],
    },
    {
      id: "ssh",
      title: "CH.07 · shadow shell",
      narrative:
        `Fiction login на lab-хост ${HOST_IP}. В истории это «забытый VPS» со стандартным admin/admin — учебный клише, не рецепт.\n` +
        `Команда: ssh admin@${HOST_IP}\nПотом пароль: admin`,
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        {
          id: "sshcmd",
          match: new RegExp(`^ssh\\s+admin@${HOST_IP.replace(/\./g, "\\.")}$`),
          out: `Connecting to ${HOST_IP}…\nadmin@${HOST_IP}'s password:`,
          pay: 10,
          set: { awaitPass: true },
        },
      ],
    },
    {
      id: "explore",
      title: "CH.08 · find the vault pass",
      narrative:
        "Ты «внутри» (имитация). Найди пароль бэкапа через ls/cd/cat/grep/find.\n" +
        "Стартовая точка: /home/admin. Есть notes, loot, .secret, tools.\n" +
        `Когда найдёшь пароль, введи: unlock-vault ${BACKUP_PASS}`,
      mode: "term",
      host: "remote",
      cwd: "/home/admin",
      goals: [
        {
          id: "unlock",
          match: new RegExp(`^unlock-vault\\s+${BACKUP_PASS}$`, "i"),
          out: "VAULT OPEN · backup restored to lab snapshot. +loot notes saved.",
          pay: 60,
          needFlag: "sawPass",
        },
      ],
    },
    {
      id: "defense",
      title: "CH.09 · fence the door",
      narrative:
        "Разверни защиту и «поймай» нарушителя на периметре (lab):\n" +
        "1) sudo ufw enable\n" +
        `2) sudo ufw deny from ${HOST_IP}\n` +
        "3) sudo systemctl start fail2ban",
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        { id: "ufw", match: /^sudo\s+ufw\s+enable$/, out: "Firewall is active.", pay: 15 },
        {
          id: "deny",
          match: new RegExp(`^sudo\\s+ufw\\s+deny\\s+from\\s+${HOST_IP.replace(/\./g, "\\.")}$`),
          out: `Rule added: deny ${HOST_IP}`,
          pay: 25,
        },
        { id: "f2b", match: /^sudo\s+systemctl\s+start\s+fail2ban$/, out: "fail2ban.service: started · INTRUDER FLAGGED", pay: 30 },
      ],
    },
    {
      id: "offer",
      title: "CH.10 · inbox · hire",
      narrative:
        "СООБЩЕНИЕ · NeonOps GmbH\n" +
        "«Видели ваше lab-расследование. Оффер: развернуть VPN для филиала.\n" +
        `Хост: ${VPN_IP}\nЛогин: admin\nПароль: admin\n` +
        "Стек: WireGuard. Чеклист в tools/vpn_cheatsheet (если сняли на прошлом хосте) или ниже.»\n\n" +
        "Продолжай, когда готов.",
      mode: "continue",
      reward: 25,
      setNotes: true,
    },
    {
      id: "vpn",
      title: "CH.11 · VPN deploy",
      narrative:
        `Подключение к корпоративному хосту (sim): ssh admin@${VPN_IP} → пароль admin\n` +
        "Затем:\n" +
        "sudo apt install wireguard\n" +
        "sudo systemctl enable wg-quick@wg0\n" +
        "sudo systemctl start wg-quick@wg0",
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        {
          id: "vpnssh",
          match: new RegExp(`^ssh\\s+admin@${VPN_IP.replace(/\./g, "\\.")}$`),
          out: `admin@${VPN_IP}'s password:`,
          pay: 10,
          set: { awaitVpnPass: true },
        },
        { id: "wgins", match: /^sudo\s+apt\s+install\s+wireguard$/, out: "wireguard installed.", pay: 20, needFlag: "vpnIn" },
        { id: "wgen", match: /^sudo\s+systemctl\s+enable\s+wg-quick@wg0$/, out: "enabled.", pay: 15, needFlag: "vpnIn" },
        { id: "wgst", match: /^sudo\s+systemctl\s+start\s+wg-quick@wg0$/, out: "wg0 up · VPN READY · contract paid", pay: 50, needFlag: "vpnIn" },
      ],
    },
    {
      id: "garage",
      title: "CH.12 · garage · tune & mine",
      narrative:
        "Финальный слой: простой магазин железа, сборка ПК и «майнинг» как idle-доход в lab.\n" +
        "Команды: shop · buy <id> · inv · assemble · mine-start · mine-stop · status\n" +
        "Нужны все слоты: mobo cpu ram gpu psu. Гайд мог быть в /home/admin/tools/mining_guide.txt.",
      mode: "garage",
      reward: 40,
    },
  ];

  function defaultState() {
    return {
      chapter: 0,
      money: 0,
      doneGoals: {},
      flags: {},
      notes: [],
      parts: {},
      assembled: false,
      mining: false,
      mined: 0,
      quizIndex: 0,
      quizOk: 0,
      finished: false,
    };
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!raw || typeof raw !== "object") return defaultState();
      return { ...defaultState(), ...raw, flags: raw.flags || {}, doneGoals: raw.doneGoals || {}, parts: raw.parts || {}, notes: raw.notes || [] };
    } catch {
      return defaultState();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }

  let state = load();
  let termCwd = "/";
  let termHost = "local";
  let mineTimer = 0;
  let open = false;

  function chapter() {
    return CHAPTERS[Math.min(state.chapter, CHAPTERS.length - 1)];
  }

  function els() {
    return {
      panel: document.getElementById("opsStory"),
      title: document.getElementById("opsStoryTitle"),
      narrative: document.getElementById("opsStoryNarrative"),
      money: document.getElementById("opsStoryMoney"),
      meta: document.getElementById("opsStoryMeta"),
      term: document.getElementById("opsStoryTerm"),
      out: document.getElementById("opsStoryOut"),
      input: document.getElementById("opsStoryInput"),
      prompt: document.getElementById("opsStoryPrompt"),
      quiz: document.getElementById("opsStoryQuiz"),
      actions: document.getElementById("opsStoryActions"),
      shop: document.getElementById("opsStoryShop"),
      notes: document.getElementById("opsStoryNotes"),
      continueBtn: document.getElementById("opsStoryContinue"),
      garage: document.getElementById("opsStoryGarage"),
    };
  }

  function pay(n, why) {
    state.money += n;
    save();
    appendOut(`+$ ${n}${why ? ` · ${why}` : ""}`, "ok");
    renderChrome();
  }

  function appendOut(text, cls) {
    const e = els();
    if (!e.out) return;
    const lines = String(text).split("\n");
    lines.forEach((line) => {
      const div = document.createElement("div");
      div.className = `ops-story-line${cls ? ` ${cls}` : ""}`;
      div.textContent = line || " ";
      e.out.appendChild(div);
    });
    e.out.scrollTop = e.out.scrollHeight;
  }

  function clearOut() {
    const e = els();
    if (e.out) e.out.innerHTML = "";
  }

  function renderChrome() {
    const e = els();
    const ch = chapter();
    if (e.money) e.money.textContent = String(state.money);
    if (e.title) e.title.textContent = ch.title;
    if (e.meta) {
      e.meta.textContent = state.finished
        ? `COMPLETE · mined:${state.mined}`
        : `ch ${state.chapter + 1}/${CHAPTERS.length} · host:${termHost} · cwd:${termCwd}`;
    }
    if (e.notes) {
      e.notes.innerHTML = (state.notes || []).map((n) => `<li>${escapeHtml(n)}</li>`).join("") || "<li>—</li>";
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function hideStoryUiBits() {
    const e = els();
    if (e.term) e.term.classList.add("hidden");
    if (e.quiz) e.quiz.classList.add("hidden");
    if (e.garage) e.garage.classList.add("hidden");
    if (e.continueBtn) e.continueBtn.classList.add("hidden");
    if (e.shop) e.shop.classList.add("hidden");
  }

  function renderChapter() {
    const e = els();
    const ch = chapter();
    hideStoryUiBits();
    clearOut();
    if (e.narrative) e.narrative.textContent = ch.narrative;
    termHost = ch.host || "local";
    termCwd = ch.cwd || (termHost === "remote" ? "/home/admin" : termHost === "router" ? "/" : "~");
    state.flags.awaitPass = false;
    state.flags.awaitVpnPass = false;

    if (ch.mode === "continue") {
      if (e.continueBtn) {
        e.continueBtn.classList.remove("hidden");
        e.continueBtn.textContent = state.chapter >= CHAPTERS.length - 1 && state.finished ? "ещё раз garage" : "далее →";
      }
    } else if (ch.mode === "quiz") {
      state.quizIndex = 0;
      state.quizOk = 0;
      if (e.quiz) e.quiz.classList.remove("hidden");
      renderQuiz();
    } else if (ch.mode === "term") {
      if (e.term) e.term.classList.remove("hidden");
      updatePrompt();
      appendOut(`session · ${ch.id} · type help`, "dim");
    } else if (ch.mode === "garage") {
      if (e.term) e.term.classList.remove("hidden");
      if (e.garage) e.garage.classList.remove("hidden");
      if (e.shop) e.shop.classList.remove("hidden");
      renderShop();
      updatePrompt();
      appendOut("garage online · shop | buy <id> | assemble | mine-start", "dim");
      if (!state.finished) {
        state.finished = true;
        pay(ch.reward || 0, "garage unlock");
        addNote("Garage unlocked · mine when PC assembled");
      }
    }
    renderChrome();
    save();
  }

  function renderQuiz() {
    const e = els();
    const ch = chapter();
    if (!e.quiz || ch.mode !== "quiz") return;
    const qi = state.quizIndex;
    if (qi >= ch.questions.length) {
      pay(ch.reward || 0, "quiz clear");
      advanceChapter();
      return;
    }
    const item = ch.questions[qi];
    e.quiz.innerHTML = `
      <div class="ops-story-q">${escapeHtml(item.q)}</div>
      <div class="ops-story-opts">
        ${item.options.map((opt, i) => `<button type="button" class="ops-btn" data-quiz="${i}">${escapeHtml(opt)}</button>`).join("")}
      </div>
      <div class="ops-story-qmeta">${qi + 1}/${ch.questions.length}</div>`;
  }

  function onQuiz(i) {
    const ch = chapter();
    const item = ch.questions[state.quizIndex];
    if (!item) return;
    if (i === item.ok) {
      state.quizOk += 1;
      appendOut("OK", "ok");
      pay(8, "quiz hit");
    } else {
      appendOut(`NO · верно: ${item.options[item.ok]}`, "bad");
    }
    state.quizIndex += 1;
    save();
    renderQuiz();
  }

  function addNote(text) {
    if (!state.notes.includes(text)) state.notes.push(text);
    save();
    renderChrome();
  }

  function advanceChapter() {
    const ch = chapter();
    if (ch.mode === "continue" && ch.reward && !state.doneGoals[`chpay_${ch.id}`]) {
      state.doneGoals[`chpay_${ch.id}`] = true;
      pay(ch.reward, ch.id);
    }
    if (ch.setNotes) {
      addNote(`VPN job host ${VPN_IP} · admin/admin`);
      addNote("WireGuard: apt install → enable → start wg-quick@wg0");
    }
    if (state.chapter < CHAPTERS.length - 1) {
      state.chapter += 1;
      state.doneGoals = { ...state.doneGoals };
      // keep goal completions namespaced per chapter via ids - reset per chapter goals only for new chapter
      save();
      renderChapter();
    } else {
      state.finished = true;
      save();
      renderChapter();
    }
  }

  function goalsDone(ch) {
    return (ch.goals || []).every((g) => state.doneGoals[`${ch.id}:${g.id}`]);
  }

  function markGoal(ch, g) {
    state.doneGoals[`${ch.id}:${g.id}`] = true;
    if (g.set) Object.assign(state.flags, g.set);
    if (g.pay) pay(g.pay, g.id);
    save();
    if (goalsDone(ch)) {
      appendOut("CHAPTER CLEAR", "ok");
      setTimeout(() => advanceChapter(), 450);
    }
  }

  function updatePrompt() {
    const e = els();
    if (!e.prompt) return;
    const user = termHost === "remote" ? "admin" : termHost === "router" ? "router" : "ops";
    e.prompt.textContent = `${user}@${termHost}:${termCwd}$`;
  }

  function normPath(cwd, input) {
    let p = input || ".";
    if (p === "~") p = termHost === "remote" ? "/home/admin" : "/";
    if (!p.startsWith("/")) {
      const base = cwd === "~" ? "/" : cwd;
      p = (base.replace(/\/$/, "") + "/" + p).replace(/\/+/g, "/");
    }
    const parts = [];
    p.split("/").forEach((seg) => {
      if (!seg || seg === ".") return;
      if (seg === "..") parts.pop();
      else parts.push(seg);
    });
    return "/" + parts.join("/");
  }

  function fsTree() {
    if (termHost === "router") return FS.router;
    if (termHost === "remote") return FS.remote;
    return null;
  }

  function nodeAt(path) {
    const tree = fsTree();
    if (!tree) return null;
    const p = path === "" ? "/" : path;
    return tree[p] || null;
  }

  function listDir(path) {
    const n = nodeAt(path);
    if (!n || n.type !== "dir") return null;
    return n.kids || [];
  }

  function scanText(text) {
    if (!text) return;
    if (text.includes(HOST_IP)) state.flags.sawHostIp = true;
    if (text.includes(BACKUP_PASS) || /backup_password=/i.test(text)) {
      state.flags.sawPass = true;
      addNote(`Vault pass: ${BACKUP_PASS}`);
    }
    if (/mining_guide/i.test(text) || /mine-start/i.test(text)) addNote("Mining: assemble full PC then mine-start");
    if (/wireguard/i.test(text)) addNote("VPN cheat: wireguard + wg-quick@wg0");
    if (/fail2ban|ufw deny/i.test(text)) addNote("Defense: ufw enable + deny IP + fail2ban");
    save();
  }

  function cmdHelp() {
    return [
      "help · clear · pwd · ls [path] · cd [path] · cat <file>",
      "grep <pat> <file> · find <name> · shop · buy <id> · inv",
      "assemble · mine-start · mine-stop · status · hint",
      termHost === "router" ? `track ${HOST_IP}` : "",
      termHost === "remote" ? `unlock-vault <pass>` : "",
    ].filter(Boolean).join("\n");
  }

  function runFsCommand(raw) {
    const tree = fsTree();
    if (!tree) {
      appendOut("no filesystem on this host (local shell)", "dim");
      return;
    }
    const parts = raw.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const cmd = (parts[0] || "").toLowerCase();
    const arg1 = (parts[1] || "").replace(/^"|"$/g, "");
    const arg2 = (parts[2] || "").replace(/^"|"$/g, "");

    if (cmd === "pwd") {
      appendOut(termCwd);
      return;
    }
    if (cmd === "ls") {
      const target = normPath(termCwd, arg1 || ".");
      const kids = listDir(target);
      if (!kids) {
        appendOut("ls: not a directory", "bad");
        return;
      }
      const shown = kids.map((k) => {
        const full = normPath(target, k);
        const n = nodeAt(full);
        return n && n.type === "dir" ? `${k}/` : k;
      });
      appendOut(shown.join("  ") || "(empty)");
      return;
    }
    if (cmd === "cd") {
      const target = normPath(termCwd, arg1 || "/");
      const n = nodeAt(target);
      if (!n || n.type !== "dir") {
        appendOut("cd: no such directory", "bad");
        return;
      }
      termCwd = target;
      updatePrompt();
      return;
    }
    if (cmd === "cat" || cmd === "less" || cmd === "more") {
      if (!arg1) {
        appendOut("cat: missing file", "bad");
        return;
      }
      const target = normPath(termCwd, arg1);
      const n = nodeAt(target);
      if (!n || n.type !== "file") {
        appendOut("cat: no such file", "bad");
        return;
      }
      appendOut(n.body.replace(/\n$/, ""));
      scanText(n.body);
      return;
    }
    if (cmd === "grep") {
      if (!arg1 || !arg2) {
        appendOut("usage: grep <pat> <file>", "bad");
        return;
      }
      const target = normPath(termCwd, arg2);
      const n = nodeAt(target);
      if (!n || n.type !== "file") {
        appendOut("grep: no such file", "bad");
        return;
      }
      const re = new RegExp(arg1.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const hits = n.body.split("\n").filter((l) => re.test(l));
      appendOut(hits.join("\n") || "(no matches)");
      scanText(hits.join("\n"));
      scanText(n.body);
      return;
    }
    if (cmd === "find") {
      const name = arg1 || "pass";
      const hits = Object.keys(tree).filter((p) => tree[p].type === "file" && p.split("/").pop().includes(name));
      appendOut(hits.join("\n") || "(none)");
      hits.forEach((p) => scanText(tree[p].body || ""));
      return;
    }
    appendOut(`command not found in fs mode: ${cmd}`, "bad");
  }

  function renderShop() {
    const e = els();
    if (!e.shop) return;
    e.shop.innerHTML = SHOP.map((item) => {
      const owned = !!state.parts[item.slot];
      return `<button type="button" class="ops-btn ${owned ? "ghost" : ""}" data-buy="${item.id}" ${owned ? "disabled" : ""}>${item.name} · $${item.price}${owned ? " · OWNED" : ""}</button>`;
    }).join("");
  }

  function buyPart(id) {
    const item = SHOP.find((x) => x.id === id);
    if (!item) {
      appendOut("unknown item", "bad");
      return;
    }
    if (state.parts[item.slot]) {
      appendOut("already owned", "dim");
      return;
    }
    if (state.money < item.price) {
      appendOut("not enough $", "bad");
      return;
    }
    state.money -= item.price;
    state.parts[item.slot] = item.id;
    state.assembled = false;
    appendOut(`BOUGHT ${item.name}`, "ok");
    save();
    renderShop();
    renderChrome();
  }

  function tryAssemble() {
    const need = ["mobo", "cpu", "ram", "gpu", "psu"];
    const ok = need.every((s) => state.parts[s]);
    if (!ok) {
      appendOut(`missing: ${need.filter((s) => !state.parts[s]).join(", ")}`, "bad");
      return;
    }
    state.assembled = true;
    pay(25, "assemble bonus");
    appendOut("PC ASSEMBLED · ready for mine-start", "ok");
    addNote("PC assembled");
    save();
  }

  function startMine() {
    if (!state.assembled) {
      appendOut("assemble PC first", "bad");
      return;
    }
    if (state.mining) {
      appendOut("already mining", "dim");
      return;
    }
    state.mining = true;
    save();
    appendOut("MINER ONLINE · idle credits…", "ok");
    if (mineTimer) clearInterval(mineTimer);
    mineTimer = setInterval(() => {
      if (!state.mining) return;
      state.money += 2;
      state.mined += 2;
      save();
      renderChrome();
    }, 4000);
  }

  function stopMine() {
    state.mining = false;
    save();
    if (mineTimer) {
      clearInterval(mineTimer);
      mineTimer = 0;
    }
    appendOut("miner stopped", "dim");
  }

  function handleGoalLine(line) {
    const ch = chapter();
    if (ch.mode !== "term" || !ch.goals) return false;

    if (state.flags.awaitPass) {
      if (line === "admin") {
        state.flags.awaitPass = false;
        state.flags.sshIn = true;
        appendOut(`Welcome to shadow-vps-lab (${HOST_IP})`, "ok");
        const g = ch.goals.find((x) => x.id === "sshcmd");
        if (g && !state.doneGoals[`${ch.id}:${g.id}`]) markGoal(ch, { ...g, pay: 20, set: undefined });
        else {
          pay(20, "login");
          setTimeout(() => advanceChapter(), 400);
        }
        return true;
      }
      appendOut("Access denied (try admin)", "bad");
      return true;
    }

    if (state.flags.awaitVpnPass) {
      if (line === "admin") {
        state.flags.awaitVpnPass = false;
        state.flags.vpnIn = true;
        appendOut(`VPN-host ${VPN_IP} · shell ready`, "ok");
        const g = ch.goals.find((x) => x.id === "vpnssh");
        if (g && !state.doneGoals[`${ch.id}:${g.id}`]) markGoal(ch, { ...g, pay: 15, set: undefined });
        else pay(15, "vpn login");
        return true;
      }
      appendOut("Access denied", "bad");
      return true;
    }

    for (let i = 0; i < ch.goals.length; i += 1) {
      const g = ch.goals[i];
      if (state.doneGoals[`${ch.id}:${g.id}`]) continue;
      if (g.needFlag && !state.flags[g.needFlag]) continue;
      if (g.match.test(line)) {
        appendOut(g.out || "ok", "ok");
        if (g.set) Object.assign(state.flags, g.set);
        if (g.set && (g.set.awaitPass || g.set.awaitVpnPass)) {
          if (g.pay) pay(g.pay, g.id);
          save();
          return true;
        }
        markGoal(ch, g);
        return true;
      }
    }
    return false;
  }

  function onCommand(raw) {
    const line = String(raw || "").trim();
    if (!line) return;
    appendOut(`${els().prompt ? els().prompt.textContent : ">"} ${line}`, "cmd");

    const low = line.toLowerCase();
    if (low === "clear") {
      clearOut();
      return;
    }
    if (low === "help") {
      appendOut(cmdHelp(), "dim");
      return;
    }
    if (low === "hint") {
      appendOut(chapter().narrative.split("\n").slice(0, 3).join("\n"), "dim");
      return;
    }
    if (low === "status") {
      appendOut(`$:${state.money} assembled:${state.assembled} mining:${state.mining} mined:${state.mined}`);
      return;
    }
    if (low === "inv") {
      const slots = Object.keys(state.parts);
      appendOut(slots.length ? slots.map((s) => `${s}:${state.parts[s]}`).join(" · ") : "(empty)");
      return;
    }
    if (low === "shop") {
      renderShop();
      if (els().shop) els().shop.classList.remove("hidden");
      appendOut(SHOP.map((x) => `${x.id} $${x.price}`).join(" · "));
      return;
    }
    if (low.startsWith("buy ")) {
      buyPart(low.slice(4).trim());
      return;
    }
    if (low === "assemble") {
      tryAssemble();
      return;
    }
    if (low === "mine-start") {
      startMine();
      return;
    }
    if (low === "mine-stop") {
      stopMine();
      return;
    }

    if (handleGoalLine(line)) return;

    // filesystem commands when on router/remote
    if (termHost === "router" || termHost === "remote") {
      const cmd = line.split(/\s+/)[0].toLowerCase();
      if (["pwd", "ls", "cd", "cat", "less", "more", "grep", "find"].includes(cmd)) {
        runFsCommand(line);
        return;
      }
    }

    // local soft echoes for flavor
    if (/^sudo\s+apt\s+update/.test(line) || /^sudo\s+apt\s+install/.test(line)) {
      appendOut("ok (lab echo) — проверь точную цель главы", "dim");
      return;
    }

    appendOut("unknown / not the next story step · help | hint", "bad");
  }

  function show(on) {
    const e = els();
    if (!e.panel) return;
    open = !!on;
    e.panel.classList.toggle("hidden", !on);
    if (on) {
      document.getElementById("opsHub")?.classList.add("hidden");
      document.getElementById("opsDocs")?.classList.add("hidden");
      document.getElementById("opsLesson")?.classList.add("hidden");
      document.getElementById("opsDrill")?.classList.add("hidden");
      renderChapter();
      setTimeout(() => e.input && e.input.focus(), 40);
    } else if (state.mining) {
      // keep mining in background while in OPS
    }
  }

  function bind() {
    const e = els();
    if (!e.panel) return;

    document.getElementById("opsStoryOpen")?.addEventListener("click", () => show(true));
    document.getElementById("opsStoryBack")?.addEventListener("click", () => {
      show(false);
      document.getElementById("opsHub")?.classList.remove("hidden");
      if (window.OpsTerminal && typeof window.OpsTerminal.renderHub === "function") {
        window.OpsTerminal.renderHub();
      } else {
        // fallback: click path via custom event
        document.getElementById("opsHub")?.classList.remove("hidden");
      }
    });
    document.getElementById("opsStoryReset")?.addEventListener("click", () => {
      if (!confirm("Сбросить сюжет и деньги?")) return;
      stopMine();
      state = defaultState();
      save();
      renderChapter();
    });
    e.continueBtn?.addEventListener("click", () => advanceChapter());
    e.quiz?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-quiz]");
      if (!btn) return;
      onQuiz(Number(btn.dataset.quiz));
    });
    e.shop?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-buy]");
      if (!btn) return;
      buyPart(btn.dataset.buy);
    });
    document.getElementById("opsStorySubmit")?.addEventListener("click", () => {
      const v = e.input ? e.input.value : "";
      if (e.input) e.input.value = "";
      onCommand(v);
    });
    e.input?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        document.getElementById("opsStorySubmit")?.click();
      }
    });

    if (state.mining && state.assembled) startMine();
  }

  window.OpsStory = {
    open: () => show(true),
    close: () => show(false),
    isOpen: () => open,
    hide: () => {
      const e = els();
      if (e.panel) e.panel.classList.add("hidden");
      open = false;
    },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
