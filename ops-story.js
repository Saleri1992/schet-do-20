/**
 * OPS STORY — сюжетная кампания (имитация терминала, без реальной сети/файлов).
 * Fiction / lab sim. IP из TEST-NET (RFC 5737).
 */
(function () {
  const KEY = "schet-ops-story-v2";
  const HOST_IP = "203.0.113.77";
  const DECOY_IP = "203.0.113.12";
  const VPN_IP = "198.51.100.23";
  const WEB_IP = "198.51.100.40";
  const BACKUP_PASS = "RESTORE-OK-991";
  const ALIAS_CODE = "NEON-7741";

  const SHOP = [
    { id: "mobo", name: "MOBO·basic", price: 40, slot: "mobo", need: true },
    { id: "cpu", name: "CPU·4c", price: 55, slot: "cpu", need: true },
    { id: "ram", name: "RAM·16G", price: 35, slot: "ram", need: true },
    { id: "gpu", name: "GPU·entry", price: 80, slot: "gpu", need: true },
    { id: "psu", name: "PSU·500W", price: 30, slot: "psu", need: true },
    { id: "ssd", name: "SSD·1T", price: 45, slot: "ssd", boost: 1 },
    { id: "cool", name: "COOL·tower", price: 25, slot: "cool", boost: 1 },
    { id: "nic", name: "NIC·2.5G", price: 35, slot: "nic", boost: 1 },
    { id: "gpu_pro", name: "GPU·pro", price: 140, slot: "gpu_pro", boost: 3 },
  ];

  const FS = {
    router: {
      "/": { type: "dir", kids: ["var", "tmp", "etc"] },
      "/etc": { type: "dir", kids: ["banner.txt"] },
      "/etc/banner.txt": {
        type: "file",
        body: "HOME-ROUTER LAB SIM\nNo real packets. Commands: ls cd cat grep find pwd help\n",
      },
      "/tmp": { type: "dir", kids: ["scratch.txt"] },
      "/tmp/scratch.txt": { type: "file", body: "empty buffer\n" },
      "/var": { type: "dir", kids: ["log"] },
      "/var/log": { type: "dir", kids: ["connections.log", "auth.log", "dhcp.log", "readme.txt", "alerts.json"] },
      "/var/log/readme.txt": {
        type: "file",
        body: "Forensics tip: grep SSH, DATA_OUT, Accepted.\nThen: track <ip>\n",
      },
      "/var/log/connections.log": {
        type: "file",
        body:
          "08:11 accept 192.168.1.10 → wan\n" +
          "08:14 accept 192.168.1.14 → wan\n" +
          `08:19 probe from ${DECOY_IP} (noise)\n` +
          `08:22 SSH_SESSION from ${HOST_IP} user=unknown\n` +
          "08:25 accept 192.168.1.10 → wan\n" +
          `08:31 DATA_OUT large → ${HOST_IP} label=backup_stream\n` +
          "08:40 dhcp renew 192.168.1.14\n" +
          `08:44 keepalive ${HOST_IP}\n`,
      },
      "/var/log/auth.log": {
        type: "file",
        body:
          "sshd: Failed password for root from 198.51.100.9\n" +
          `sshd: Accepted password for admin from ${HOST_IP}\n` +
          `sshd: session opened for admin from ${HOST_IP}\n` +
          "sshd: session closed\n",
      },
      "/var/log/dhcp.log": {
        type: "file",
        body: "DHCPACK 192.168.1.10 laptop\nDHCPACK 192.168.1.14 phone\n",
      },
      "/var/log/alerts.json": {
        type: "file",
        body:
          "{\n" +
          `  "top_talker": "${HOST_IP}",\n` +
          `  "decoy": "${DECOY_IP}",\n` +
          '  "severity": "exfil_suspected"\n' +
          "}\n",
      },
    },
    remote: {
      "/": { type: "dir", kids: ["home", "etc", "tmp", "var"] },
      "/home": { type: "dir", kids: ["admin"] },
      "/home/admin": { type: "dir", kids: ["notes.txt", "loot", ".secret", "tools", "mail", "work"] },
      "/home/admin/notes.txt": {
        type: "file",
        body:
          "ops journal (stolen target)\n" +
          "- wipe disk\n- stash vault\n- leave decoy traffic on other IP\n" +
          "vault pass is NOT here.\n" +
          "try .secret / grep / find pass\n",
      },
      "/home/admin/loot": { type: "dir", kids: ["backup_hint.txt", "system_backup.vault", "fake_pass.txt", "readme.md"] },
      "/home/admin/loot/backup_hint.txt": {
        type: "file",
        body: "hint: filename contains 'pass'\nhint: hidden dir starts with .\nhint: also check mail/\n",
      },
      "/home/admin/loot/fake_pass.txt": {
        type: "file",
        body: "password=hunter2\n(note: decoy, do not use)\n",
      },
      "/home/admin/loot/readme.md": {
        type: "file",
        body: "# loot\nvault is encrypted. need real backup_pass.\n",
      },
      "/home/admin/loot/system_backup.vault": {
        type: "file",
        body: "[binary vault simulation — unlock with backup_pass from .secret]\n",
      },
      "/home/admin/.secret": { type: "dir", kids: ["backup_pass.txt", "alias.txt"] },
      "/home/admin/.secret/backup_pass.txt": {
        type: "file",
        body: `backup_password=${BACKUP_PASS}\nowner=ops-lab\nrotate: never :)\n`,
      },
      "/home/admin/.secret/alias.txt": {
        type: "file",
        body: `drop_alias=${ALIAS_CODE}\nuse later in report\n`,
      },
      "/home/admin/tools": {
        type: "dir",
        kids: ["mining_guide.txt", "vpn_cheatsheet.txt", "ids_notes.txt", "nginx_lab.txt", "monitor.txt"],
      },
      "/home/admin/tools/mining_guide.txt": {
        type: "file",
        body:
          "BONUS · RIG BUILD\n" +
          "need: mobo cpu ram gpu psu\n" +
          "optional boost: ssd cool nic gpu_pro\n" +
          "assemble → mine-start\n",
      },
      "/home/admin/tools/vpn_cheatsheet.txt": {
        type: "file",
        body:
          "VPN LAB\nsudo apt install wireguard\n" +
          "sudo systemctl enable wg-quick@wg0\n" +
          "sudo systemctl start wg-quick@wg0\n",
      },
      "/home/admin/tools/ids_notes.txt": {
        type: "file",
        body:
          "DEFENSE LAB\nsudo ufw enable\n" +
          `sudo ufw deny from ${HOST_IP}\n` +
          "sudo apt install fail2ban\n" +
          "sudo systemctl enable fail2ban\n" +
          "sudo systemctl start fail2ban\n" +
          "sudo systemctl start suricata   # IDS flavor\n",
      },
      "/home/admin/tools/nginx_lab.txt": {
        type: "file",
        body:
          "WEB LAB\nsudo apt install nginx\n" +
          "sudo systemctl enable nginx\n" +
          "sudo systemctl start nginx\n" +
          "echo ok | sudo tee /var/www/html/index.html\n",
      },
      "/home/admin/tools/monitor.txt": {
        type: "file",
        body: "MONITOR\nsystemctl status nginx\njournalctl -u nginx -n 20\ndf -h\nfree -m\n",
      },
      "/home/admin/mail": { type: "dir", kids: ["inbox.txt", "draft_ransom.txt"] },
      "/home/admin/mail/inbox.txt": {
        type: "file",
        body:
          "From: fence@dark.lab\n" +
          "vault still locked? check .secret\n" +
          `also burn decoy ${DECOY_IP}\n`,
      },
      "/home/admin/mail/draft_ransom.txt": {
        type: "file",
        body: "(unsent) pay me coins — ignored in this story. We restore & defend.\n",
      },
      "/home/admin/work": { type: "dir", kids: ["events.json", "todo.csv"] },
      "/home/admin/work/events.json": {
        type: "file",
        body:
          "[\n" +
          `  {"ts":"08:22","ev":"ssh_in","ip":"${HOST_IP}"},\n` +
          `  {"ts":"08:31","ev":"exfil","ip":"${HOST_IP}"},\n` +
          `  {"ts":"08:19","ev":"noise","ip":"${DECOY_IP}"}\n` +
          "]\n",
      },
      "/home/admin/work/todo.csv": {
        type: "file",
        body: "task,done\nwipe,yes\nstash,yes\nclean_logs,no\n",
      },
      "/etc": { type: "dir", kids: ["hostname", "motd"] },
      "/etc/hostname": { type: "file", body: "shadow-vps-lab\n" },
      "/etc/motd": { type: "file", body: "Authorized fiction only. Welcome, admin.\n" },
      "/tmp": { type: "dir", kids: ["keysmash.txt"] },
      "/tmp/keysmash.txt": { type: "file", body: "asdfasdf\n" },
      "/var": { type: "dir", kids: ["log"] },
      "/var/log": { type: "dir", kids: ["syslog"] },
      "/var/log/syslog": {
        type: "file",
        body: "cron: noop\nkernel: lab-sim\n",
      },
    },
  };

  const CHAPTERS = [
    {
      id: "intro",
      title: "PROLOGUE · neon freelancers",
      narrative:
        "Неоновый район Grid-7. Ты — ops-фрилансер: ставишь Linux, чинишь сервисы, пишешь короткие отчёты.\n" +
        "Это ИСТОРИЯ-СИМУЛЯТОР: нет реальной сети и файлов, только учебный терминал и сюжет.\n" +
        "План: собрать базу → викторины → заказы за $ → инцидент → расследование → защита → контракты (VPN/web) → гараж и idle-майнинг.",
      mode: "continue",
      reward: 25,
    },
    {
      id: "linux",
      title: "CH.01 · bootstrap linux",
      narrative:
        "Чистый ПК. Подними базу:\n" +
        "1) sudo apt update\n" +
        "2) sudo apt upgrade -y\n" +
        "3) sudo apt install curl git htop net-tools\n" +
        "4) hostnamectl set-hostname neon-ops",
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        { id: "upd", match: /^sudo\s+apt\s+update$/, out: "Get: lab mirrors… Done.", pay: 10 },
        { id: "upg", match: /^sudo\s+apt\s+upgrade\s+-y$/, out: "0 upgraded (lab). System fresh.", pay: 12 },
        { id: "ins", match: /^sudo\s+apt\s+install\s+curl\s+git\s+htop\s+net-tools$/, out: "Setting up curl git htop net-tools… done.", pay: 28 },
        { id: "host", match: /^hostnamectl\s+set-hostname\s+neon-ops$/, out: "Static hostname: neon-ops", pay: 15 },
      ],
    },
    {
      id: "quiz1",
      title: "CH.02 · quiz · packages",
      narrative: "Закрепление. Это не тест ради теста — слова всплывут в заказах и инциденте.",
      mode: "quiz",
      questions: [
        { q: "apt update делает…", options: ["обновляет списки пакетов", "сразу ставит все обновления", "удаляет пакеты"], ok: 0 },
        { q: "apt upgrade делает…", options: ["только чистит кэш", "обновляет установленные пакеты", "меняет hostname"], ok: 1 },
        { q: "sudo нужно чтобы…", options: ["ускорить Wi‑Fi", "выполнить команду с правами администратора", "сжать логи"], ok: 1 },
        { q: "htop — это…", options: ["веб-сервер", "монитор процессов", "файрвол"], ok: 1 },
        { q: "net-tools обычно даёт…", options: ["ifconfig/netstat (классика)", "только Docker", "майнер"], ok: 0 },
      ],
      reward: 40,
    },
    {
      id: "gigs1",
      title: "CH.03 · gigs · files",
      narrative:
        "Биржа · пакет FILE-OPS:\n" +
        "1) mkdir -p ~/projects/client-a\n" +
        "2) echo ready > ~/projects/client-a/status.txt\n" +
        "3) cp ~/projects/client-a/status.txt ~/projects/client-a/status.bak\n" +
        "4) cat ~/projects/client-a/status.txt",
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        { id: "g1", match: /^mkdir\s+-p\s+~\/projects\/client-a$/, out: "ok: tree created", pay: 12 },
        { id: "g2", match: /^echo\s+ready\s+>\s+~\/projects\/client-a\/status\.txt$/, out: "ok: wrote status.txt", pay: 12 },
        { id: "g3", match: /^cp\s+~\/projects\/client-a\/status\.txt\s+~\/projects\/client-a\/status\.bak$/, out: "ok: backup copy", pay: 14 },
        { id: "g4", match: /^cat\s+~\/projects\/client-a\/status\.txt$/, out: "ready", pay: 16 },
      ],
    },
    {
      id: "gigs2",
      title: "CH.04 · gigs · service hygiene",
      narrative:
        "Заказ · SERVICE-LITE (имитация):\n" +
        "1) sudo systemctl status ssh\n" +
        "2) sudo systemctl enable ssh\n" +
        "3) sudo systemctl restart ssh\n" +
        "4) journalctl -u ssh -n 20",
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        { id: "s1", match: /^sudo\s+systemctl\s+status\s+ssh$/, out: "ssh.service · active (lab)", pay: 12 },
        { id: "s2", match: /^sudo\s+systemctl\s+enable\s+ssh$/, out: "Created symlink… enabled", pay: 12 },
        { id: "s3", match: /^sudo\s+systemctl\s+restart\s+ssh$/, out: "restarted ok", pay: 14 },
        { id: "s4", match: /^journalctl\s+-u\s+ssh\s+-n\s+20$/, out: "-- Logs begin (lab) --\nsshd: Server listening", pay: 18 },
      ],
    },
    {
      id: "quiz2",
      title: "CH.05 · quiz · logs & remote",
      narrative: "Перед ночным инцидентом — слова: grep, ssh, ufw, journalctl.",
      mode: "quiz",
      questions: [
        { q: "grep ищет…", options: ["процессы GPU", "строки по шаблону в тексте", "только JSON"], ok: 1 },
        { q: "SSH нужен чтобы…", options: ["рисовать обои", "удалённо работать в терминале", "форматировать диск всегда"], ok: 1 },
        { q: "UFW — это…", options: ["пакетный менеджер", "простой файрвол (Ubuntu)", "редактор"], ok: 1 },
        { q: "journalctl смотрит…", options: ["журналы systemd", "только браузерную историю", "магазин"], ok: 0 },
        { q: "systemctl enable делает службу…", options: ["удалённой", "автозапуск при загрузке", "скрытой от логов"], ok: 1 },
      ],
      reward: 45,
    },
    {
      id: "netlab",
      title: "CH.06 · net drill",
      narrative:
        "Клиент просит «проверить сеть» (lab):\n" +
        "1) ip a\n2) ping -c 3 1.1.1.1\n3) dig example.com\n4) curl -I https://example.com",
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        { id: "n1", match: /^ip\s+a$/, out: "eth0: UP · 192.168.1.50/24 (lab)", pay: 10 },
        { id: "n2", match: /^ping\s+-c\s+3\s+1\.1\.1\.1$/, out: "3 packets transmitted, 3 received (lab)", pay: 12 },
        { id: "n3", match: /^dig\s+example\.com$/, out: "ANSWER: 93.184.216.34 (lab fiction)", pay: 12 },
        { id: "n4", match: /^curl\s+-I\s+https:\/\/example\.com$/, out: "HTTP/2 200 · server: lab", pay: 16 },
      ],
    },
    {
      id: "night",
      title: "CH.07 · 03:17 AM",
      narrative:
        "Сообщение на бирже: «Срочно. У клиента диск пустой, сайты молчат. Платим за восстановление + отчёт».\n" +
        "Ты ещё не знаешь: кто-то уже унёс бэкап.\nЖми далее — начнётся BLACKOUT.",
      mode: "continue",
      reward: 20,
    },
    {
      id: "incident",
      title: "CH.08 · BLACKOUT",
      narrative:
        `Рабочий ПК клиента «обнулён». Записка в tty: «бэкап у меня».\n` +
        `Железа нет — только консоль домашнего роутера (СИМУЛЯЦИЯ).\n` +
        `Задача: найти IP эксфильтрации. В логах будет шум (${DECOY_IP}) и цель (${HOST_IP}).\n` +
        `Не вестись на decoy.`,
      mode: "continue",
      reward: 20,
    },
    {
      id: "router",
      title: "CH.09 · router forensics",
      narrative:
        "Роутер lab. Исследуй /var/log (ls, cd, cat, grep, find).\n" +
        "Полезно: grep SSH /var/log/connections.log · cat alerts.json\n" +
        `Когда уверен в IP эксфильтрации — track ${HOST_IP}\n` +
        `(track decoy не засчитается.)`,
      mode: "term",
      host: "router",
      cwd: "/",
      goals: [
        {
          id: "track",
          match: new RegExp(`^track\\s+${HOST_IP.replace(/\./g, "\\.")}$`),
          out: `TRACE LOCK · ${HOST_IP} · exfil path marked`,
          pay: 50,
          needFlag: "sawHostIp",
        },
      ],
    },
    {
      id: "osint",
      title: "CH.10 · label the host",
      narrative:
        "«OSINT» в рамках lab — без реального интернета:\n" +
        `1) whois ${HOST_IP}\n` +
        `2) dig -x ${HOST_IP}\n` +
        `3) echo shadow-vps-lab > ~/case/host.txt`,
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        {
          id: "w1",
          match: new RegExp(`^whois\\s+${HOST_IP.replace(/\./g, "\\.")}$`),
          out: "Org: TEST-NET-3 · status: documentation (RFC5737)",
          pay: 15,
        },
        {
          id: "w2",
          match: new RegExp(`^dig\\s+-x\\s+${HOST_IP.replace(/\./g, "\\.")}$`),
          out: "PTR: shadow-vps-lab.example.test (fiction)",
          pay: 15,
        },
        { id: "w3", match: /^echo\s+shadow-vps-lab\s+>\s+~\/case\/host\.txt$/, out: "case note saved", pay: 18 },
      ],
    },
    {
      id: "ssh",
      title: "CH.11 · shadow shell",
      narrative:
        `Fiction: «забытый lab-VPS» ${HOST_IP}, клише admin/admin — только сюжет, не инструкция для чужих систем.\n` +
        `ssh admin@${HOST_IP}\nзатем пароль: admin`,
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
      title: "CH.12 · vault & breadcrumbs",
      narrative:
        "Внутри (имитация ФС). Старт: /home/admin\n" +
        "Есть notes, loot (есть decoy fake_pass), .secret, tools, mail, work.\n" +
        `Найди реальный пароль бэкапа и: unlock-vault ${BACKUP_PASS}\n` +
        "Бонус: прочитай tools/* и .secret/alias.txt — пригодится в отчёте и гараже.",
      mode: "term",
      host: "remote",
      cwd: "/home/admin",
      goals: [
        {
          id: "unlock",
          match: new RegExp(`^unlock-vault\\s+${BACKUP_PASS}$`, "i"),
          out: "VAULT OPEN · snapshot staged for restore",
          pay: 70,
          needFlag: "sawPass",
        },
      ],
    },
    {
      id: "parse",
      title: "CH.13 · parse the timeline",
      narrative:
        "На том же хосте собери картину:\n" +
        "1) grep exfil /home/admin/work/events.json\n" +
        "2) grep top_talker — нет, это на роутере… здесь: cat /home/admin/work/todo.csv\n" +
        "3) find pass   (или find backup)\n" +
        `4) confirm-case ${HOST_IP}`,
      mode: "term",
      host: "remote",
      cwd: "/home/admin",
      goals: [
        { id: "p1", match: /^grep\s+exfil\s+\/home\/admin\/work\/events\.json$/, out: '{"ts":"08:31","ev":"exfil",...}', pay: 15 },
        { id: "p2", match: /^cat\s+\/home\/admin\/work\/todo\.csv$/, out: "task,done\nwipe,yes\nstash,yes\nclean_logs,no", pay: 12 },
        { id: "p3", match: /^find\s+(pass|backup)$/, out: "(paths listed in lab fs)", pay: 12 },
        {
          id: "p4",
          match: new RegExp(`^confirm-case\\s+${HOST_IP.replace(/\./g, "\\.")}$`),
          out: "CASE CONFIRMED · ready to restore & defend",
          pay: 25,
        },
      ],
    },
    {
      id: "restore",
      title: "CH.14 · restore snapshot",
      narrative:
        "Верни клиенту систему (lab):\n" +
        `1) restore-backup --pass ${BACKUP_PASS}\n` +
        "2) sudo systemctl reboot\n" +
        "3) (после «ребута») hostnamectl",
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        {
          id: "r1",
          match: new RegExp(`^restore-backup\\s+--pass\\s+${BACKUP_PASS}$`, "i"),
          out: "Restoring neon-ops snapshot…… OK",
          pay: 40,
        },
        { id: "r2", match: /^sudo\s+systemctl\s+reboot$/, out: "Reboot scheduled (lab fade)…", pay: 10 },
        { id: "r3", match: /^hostnamectl$/, out: "Static hostname: neon-ops\nBoot: restored", pay: 20 },
      ],
    },
    {
      id: "quiz3",
      title: "CH.15 · quiz · defense",
      narrative: "Перед периметром — короткая викторина.",
      mode: "quiz",
      questions: [
        { q: "fail2ban обычно…", options: ["рисует графики", "банит IP после грубых попыток входа", "ставит пакеты"], ok: 1 },
        { q: "ufw deny from IP…", options: ["разрешает IP", "блокирует трафик с IP", "меняет DNS"], ok: 1 },
        { q: "IDS вроде Suricata…", options: ["смотрит подозрительный трафик по правилам", "заменяет SSH", "это файловый менеджер"], ok: 0 },
        { q: "После restore важно…", options: ["сразу выключить бэкапы навсегда", "закрыть дыру (firewall/IDS) и сменить секреты", "удалить journalctl"], ok: 1 },
      ],
      reward: 40,
    },
    {
      id: "defense",
      title: "CH.16 · fence & IDS",
      narrative:
        "Закрой дверь (lab):\n" +
        "1) sudo ufw enable\n" +
        `2) sudo ufw deny from ${HOST_IP}\n` +
        "3) sudo apt install fail2ban\n" +
        "4) sudo systemctl enable fail2ban\n" +
        "5) sudo systemctl start fail2ban\n" +
        "6) sudo systemctl start suricata",
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        { id: "d1", match: /^sudo\s+ufw\s+enable$/, out: "Firewall is active.", pay: 12 },
        {
          id: "d2",
          match: new RegExp(`^sudo\\s+ufw\\s+deny\\s+from\\s+${HOST_IP.replace(/\./g, "\\.")}$`),
          out: `Rule added: deny ${HOST_IP}`,
          pay: 20,
        },
        { id: "d3", match: /^sudo\s+apt\s+install\s+fail2ban$/, out: "fail2ban installed", pay: 12 },
        { id: "d4", match: /^sudo\s+systemctl\s+enable\s+fail2ban$/, out: "enabled", pay: 10 },
        { id: "d5", match: /^sudo\s+systemctl\s+start\s+fail2ban$/, out: "fail2ban started", pay: 14 },
        { id: "d6", match: /^sudo\s+systemctl\s+start\s+suricata$/, out: "suricata: IDS online · INTRUDER FLAGGED", pay: 30 },
      ],
    },
    {
      id: "report",
      title: "CH.17 · incident report",
      narrative:
        "Клиент хочет отчёт:\n" +
        `1) echo "attacker ${HOST_IP}" > ~/case/report.txt\n` +
        `2) echo "alias ${ALIAS_CODE}" >> ~/case/report.txt\n` +
        "3) cat ~/case/report.txt\n" +
        `(alias — из .secret/alias.txt, если нашёл; иначе подставь ${ALIAS_CODE})`,
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        {
          id: "rp1",
          match: new RegExp(`^echo\\s+"attacker\\s+${HOST_IP.replace(/\./g, "\\.")}"\\s+>\\s+~\/case\/report\\.txt$`),
          out: "report created",
          pay: 15,
        },
        {
          id: "rp2",
          match: new RegExp(`^echo\\s+"alias\\s+${ALIAS_CODE}"\\s+>>\\s+~\/case\/report\\.txt$`),
          out: "alias appended",
          pay: 20,
        },
        { id: "rp3", match: /^cat\s+~\/case\/report\.txt$/, out: `attacker ${HOST_IP}\nalias ${ALIAS_CODE}`, pay: 20 },
      ],
    },
    {
      id: "offer",
      title: "CH.18 · inbox · NeonOps hire",
      narrative:
        "MAIL · NeonOps GmbH\n" +
        "«Отчёт по BLACKOUT видели. Оффер: VPN для филиала + позже витрина nginx.\n" +
        `VPN host: ${VPN_IP}\nuser: admin\npass: admin\n` +
        "Стек: WireGuard. Чеклисты могли остаться в notes с shadow-хоста.»",
      mode: "continue",
      reward: 35,
      setNotes: true,
    },
    {
      id: "corpquiz",
      title: "CH.19 · quiz · corp onboarding",
      narrative: "Онбординг NeonOps — 4 вопроса.",
      mode: "quiz",
      questions: [
        { q: "WireGuard — это…", options: ["текстовый редактор", "современный VPN", "антивирус"], ok: 1 },
        { q: "wg-quick@wg0 в systemd…", options: ["юнит интерфейса WireGuard", "имя пользователя", "пакет apt"], ok: 0 },
        { q: "nginx чаще всего…", options: ["веб-сервер/прокси", "СУБД", "BIOS"], ok: 0 },
        { q: "Перед стартом сервиса в проде полезно…", options: ["выключить логи навсегда", "enable + status/journal после start", "удалить ufw"], ok: 1 },
      ],
      reward: 40,
    },
    {
      id: "vpn",
      title: "CH.20 · VPN deploy",
      narrative:
        `ssh admin@${VPN_IP} → пароль admin\n` +
        "sudo apt install wireguard\n" +
        "sudo systemctl enable wg-quick@wg0\n" +
        "sudo systemctl start wg-quick@wg0\n" +
        "sudo systemctl status wg-quick@wg0",
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
        { id: "wgins", match: /^sudo\s+apt\s+install\s+wireguard$/, out: "wireguard installed.", pay: 18, needFlag: "vpnIn" },
        { id: "wgen", match: /^sudo\s+systemctl\s+enable\s+wg-quick@wg0$/, out: "enabled.", pay: 14, needFlag: "vpnIn" },
        { id: "wgst", match: /^sudo\s+systemctl\s+start\s+wg-quick@wg0$/, out: "wg0 up", pay: 28, needFlag: "vpnIn" },
        { id: "wgs", match: /^sudo\s+systemctl\s+status\s+wg-quick@wg0$/, out: "active (running) · VPN READY · paid", pay: 22, needFlag: "vpnIn" },
      ],
    },
    {
      id: "web",
      title: "CH.21 · shopfront nginx",
      narrative:
        `Второй хост витрины ${WEB_IP} (те же admin/admin в письме):\n` +
        `1) ssh admin@${WEB_IP}\n` +
        "2) sudo apt install nginx\n" +
        "3) sudo systemctl enable nginx\n" +
        "4) sudo systemctl start nginx\n" +
        "5) echo neon > /var/www/html/index.html\n" +
        "6) curl http://localhost",
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        {
          id: "wssh",
          match: new RegExp(`^ssh\\s+admin@${WEB_IP.replace(/\./g, "\\.")}$`),
          out: `admin@${WEB_IP}'s password:`,
          pay: 10,
          set: { awaitWebPass: true },
        },
        { id: "ni", match: /^sudo\s+apt\s+install\s+nginx$/, out: "nginx installed", pay: 16, needFlag: "webIn" },
        { id: "ne", match: /^sudo\s+systemctl\s+enable\s+nginx$/, out: "enabled", pay: 12, needFlag: "webIn" },
        { id: "ns", match: /^sudo\s+systemctl\s+start\s+nginx$/, out: "started", pay: 14, needFlag: "webIn" },
        { id: "nw", match: /^echo\s+neon\s+>\s+\/var\/www\/html\/index\.html$/, out: "index written", pay: 14, needFlag: "webIn" },
        { id: "nc", match: /^curl\s+http:\/\/localhost$/, out: "neon", pay: 24, needFlag: "webIn" },
      ],
    },
    {
      id: "monitor",
      title: "CH.22 · keep the lights on",
      narrative:
        "Смена мониторинга:\n" +
        "1) systemctl status nginx\n" +
        "2) journalctl -u nginx -n 20\n" +
        "3) df -h\n" +
        "4) free -m\n" +
        "5) uptime",
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        { id: "m1", match: /^systemctl\s+status\s+nginx$/, out: "active (running)", pay: 12 },
        { id: "m2", match: /^journalctl\s+-u\s+nginx\s+-n\s+20$/, out: "-- nginx access ok (lab) --", pay: 12 },
        { id: "m3", match: /^df\s+-h$/, out: "Filesystem Size Used … / 42G 12G", pay: 10 },
        { id: "m4", match: /^free\s+-m$/, out: "Mem: 15923 …", pay: 10 },
        { id: "m5", match: /^uptime$/, out: "up 3 days · load 0.12 (lab)", pay: 14 },
      ],
    },
    {
      id: "garage",
      title: "CH.23 · garage · tune & mine",
      narrative:
        "Гараж Grid-7: магазин железа, сборка, idle-майнинг.\n" +
        "Команды: shop · buy <id> · inv · assemble · mine-start · mine-stop · status · rate\n" +
        "Обязательно: mobo cpu ram gpu psu. Буст: ssd cool nic gpu_pro.\n" +
        "Гайды — в notes, если читал tools/ на shadow-хосте.",
      mode: "garage",
      reward: 50,
    },
    {
      id: "epilogue",
      title: "EPILOGUE · contract open",
      narrative:
        "Клиент онлайн, VPN поднят, витрина отвечает, периметр закрыт.\n" +
        "Биржа шлёт новые тикеты — можешь крутить гараж (майнинг) или reset сюжета.\n" +
        "Это был учебный кибернуар без реальных взломов: только команды, логи и история.",
      mode: "continue",
      reward: 60,
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
    state.flags.awaitWebPass = false;

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
      if (e.continueBtn) {
        e.continueBtn.classList.remove("hidden");
        e.continueBtn.textContent = "к эпилогу →";
      }
      renderShop();
      updatePrompt();
      appendOut("garage online · shop | buy <id> | assemble | mine-start | rate", "dim");
      if (!state.doneGoals.garage_unlock) {
        state.doneGoals.garage_unlock = true;
        pay(ch.reward || 0, "garage unlock");
        addNote("Garage unlocked · mine when PC assembled");
        save();
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
      addNote(`Web job host ${WEB_IP} · admin/admin`);
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
    if (/fail2ban|ufw deny|suricata/i.test(text)) addNote("Defense: ufw + fail2ban + suricata");
    if (/nginx/i.test(text)) addNote("Web: apt install nginx → enable → start → index.html");
    if (text.includes(ALIAS_CODE) || /drop_alias=/i.test(text)) addNote(`Report alias: ${ALIAS_CODE}`);
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
    const need = SHOP.filter((x) => x.need).map((x) => x.slot);
    const ok = need.every((s) => state.parts[s]);
    if (!ok) {
      appendOut(`missing: ${need.filter((s) => !state.parts[s]).join(", ")}`, "bad");
      return;
    }
    state.assembled = true;
    pay(25, "assemble bonus");
    appendOut(`PC ASSEMBLED · rate ${mineRate()}/tick · mine-start`, "ok");
    addNote("PC assembled");
    save();
  }

  function mineRate() {
    let r = 2;
    SHOP.forEach((item) => {
      if (item.boost && state.parts[item.slot] === item.id) r += item.boost;
    });
    return r;
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
    const rate = mineRate();
    appendOut(`MINER ONLINE · +$${rate} / 4s`, "ok");
    if (mineTimer) clearInterval(mineTimer);
    mineTimer = setInterval(() => {
      if (!state.mining) return;
      const gain = mineRate();
      state.money += gain;
      state.mined += gain;
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

    if (state.flags.awaitWebPass) {
      if (line === "admin") {
        state.flags.awaitWebPass = false;
        state.flags.webIn = true;
        appendOut(`WEB-host ${WEB_IP} · shell ready`, "ok");
        const g = ch.goals.find((x) => x.id === "wssh");
        if (g && !state.doneGoals[`${ch.id}:${g.id}`]) markGoal(ch, { ...g, pay: 15, set: undefined });
        else pay(15, "web login");
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
        if (g.set && (g.set.awaitPass || g.set.awaitVpnPass || g.set.awaitWebPass)) {
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
      appendOut(`$:${state.money} assembled:${state.assembled} mining:${state.mining} mined:${state.mined} rate:${mineRate()}`);
      return;
    }
    if (low === "rate") {
      appendOut(`mine rate: $${mineRate()} / 4s · assembled:${state.assembled}`);
      return;
    }
    if (low.startsWith("track ")) {
      const ip = low.slice(6).trim();
      if (ip === DECOY_IP) {
        appendOut("NOISE · decoy IP · not the exfil path", "bad");
        return;
      }
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
