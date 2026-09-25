/**
 * OPS STORY — сюжетная кампания (имитация терминала, без реальной сети/файлов).
 * Fiction / lab sim. IP из TEST-NET (RFC 5737).
 */
(function () {
  const KEY = "schet-ops-story-v3";
  const HOST_IP = "203.0.113.77";
  const DECOY_IP = "203.0.113.12";
  const VPN_IP = "198.51.100.23";
  const WEB_IP = "198.51.100.40";
  const SMTP_IP = "198.51.100.55";
  const BACKUP_PASS = "RESTORE-OK-991";
  const ALIAS_CODE = "NEON-7741";

  const PC_SLOTS = ["mobo", "cpu", "ram", "gpu", "psu", "hdd", "ssd", "nic", "cool"];

  /** Каталог комплектующих: слоты + зависимости + вклад в specs. */
  const PARTS = [
    { id: "mobo_b", slot: "mobo", name: "MOBO·B450", price: 40, tier: 1, need: true, specs: { wattsNeed: 0 } },
    { id: "mobo_x", slot: "mobo", name: "MOBO·X570", price: 90, tier: 2, need: true, specs: { wattsNeed: 0 } },
    { id: "cpu_4", slot: "cpu", name: "CPU·4c", price: 55, tier: 1, need: true, specs: { cores: 4 }, reqSlots: ["mobo"] },
    { id: "cpu_8", slot: "cpu", name: "CPU·8c", price: 110, tier: 2, need: true, specs: { cores: 8 }, reqSlots: ["mobo"] },
    { id: "ram_8", slot: "ram", name: "RAM·8G", price: 25, tier: 1, need: true, specs: { ramGb: 8 }, reqSlots: ["mobo"] },
    { id: "ram_16", slot: "ram", name: "RAM·16G", price: 45, tier: 2, need: true, specs: { ramGb: 16 }, reqSlots: ["mobo"] },
    { id: "ram_32", slot: "ram", name: "RAM·32G", price: 85, tier: 3, need: true, specs: { ramGb: 32 }, reqSlots: ["mobo"] },
    { id: "gpu_e", slot: "gpu", name: "GPU·entry", price: 70, tier: 1, need: true, specs: { gpu: 60, wattsNeed: 150 }, reqSlots: ["mobo", "psu"], minPsu: 400 },
    { id: "gpu_m", slot: "gpu", name: "GPU·mid", price: 130, tier: 2, need: true, specs: { gpu: 120, wattsNeed: 220 }, reqSlots: ["mobo", "psu"], minPsu: 550, boost: 2 },
    { id: "gpu_p", slot: "gpu", name: "GPU·pro", price: 200, tier: 3, need: true, specs: { gpu: 200, wattsNeed: 320 }, reqSlots: ["mobo", "psu"], minPsu: 650, boost: 4 },
    { id: "psu_4", slot: "psu", name: "PSU·450W", price: 30, tier: 1, need: true, specs: { psuW: 450 } },
    { id: "psu_6", slot: "psu", name: "PSU·650W", price: 55, tier: 2, need: true, specs: { psuW: 650 } },
    { id: "psu_8", slot: "psu", name: "PSU·850W", price: 80, tier: 3, need: true, specs: { psuW: 850 } },
    { id: "hdd_1", slot: "hdd", name: "HDD·1T", price: 30, tier: 1, specs: { storageGb: 1000 } },
    { id: "hdd_2", slot: "hdd", name: "HDD·2T", price: 50, tier: 2, specs: { storageGb: 2000 } },
    { id: "ssd_5", slot: "ssd", name: "SSD·512", price: 40, tier: 1, specs: { storageGb: 512, boost: 1 }, boost: 1 },
    { id: "ssd_1", slot: "ssd", name: "SSD·1T", price: 70, tier: 2, specs: { storageGb: 1000, boost: 1 }, boost: 2 },
    { id: "nic_1", slot: "nic", name: "NIC·1G", price: 20, tier: 1, specs: { nicMbps: 1000 } },
    { id: "nic_25", slot: "nic", name: "NIC·2.5G", price: 40, tier: 2, specs: { nicMbps: 2500 }, boost: 1 },
    { id: "nic_10", slot: "nic", name: "NIC·10G", price: 90, tier: 3, specs: { nicMbps: 10000 }, boost: 2 },
    { id: "cool_a", slot: "cool", name: "COOL·air", price: 20, tier: 1, boost: 1 },
    { id: "cool_l", slot: "cool", name: "COOL·aio", price: 55, tier: 2, boost: 2 },
    { id: "cpu_16", slot: "cpu", name: "CPU·16c", price: 180, tier: 3, need: true, specs: { cores: 16 }, reqSlots: ["mobo"] },
    { id: "ram_64", slot: "ram", name: "RAM·64G", price: 160, tier: 4, need: true, specs: { ramGb: 64 }, reqSlots: ["mobo"] },
    { id: "gpu_u", slot: "gpu", name: "GPU·ultra", price: 320, tier: 4, need: true, specs: { gpu: 320, wattsNeed: 450 }, reqSlots: ["mobo", "psu"], minPsu: 850, boost: 6 },
    { id: "psu_1k", slot: "psu", name: "PSU·1000W", price: 120, tier: 4, need: true, specs: { psuW: 1000 } },
    { id: "ssd_2", slot: "ssd", name: "SSD·2T", price: 130, tier: 3, specs: { storageGb: 2000 }, boost: 3 },
  ];

  const SERVERS = [
    { id: "srv_proxy", role: "proxy", name: "Node·Proxy", price: 110, blurb: "прокси / reverse-proxy lab", specs: { ramGb: 4, nicMbps: 1000, storageGb: 40 } },
    { id: "srv_vpn", role: "vpn", name: "Node·VPN", price: 140, blurb: "WireGuard / VPN lab", specs: { ramGb: 8, nicMbps: 1000, storageGb: 20 } },
    { id: "srv_smtp", role: "smtp", name: "Node·SMTP", price: 160, blurb: "почта кампании (lab)", specs: { ramGb: 8, nicMbps: 1000, storageGb: 80 } },
    { id: "srv_web", role: "web", name: "Node·Web", price: 120, blurb: "nginx витрина", specs: { ramGb: 4, nicMbps: 1000, storageGb: 40 } },
    { id: "srv_dns", role: "dns", name: "Node·DNS", price: 100, blurb: "bind/unbound lab", specs: { ramGb: 2, nicMbps: 1000, storageGb: 20 } },
    { id: "srv_db", role: "db", name: "Node·DB", price: 170, blurb: "postgres lab", specs: { ramGb: 16, nicMbps: 1000, storageGb: 200 } },
    { id: "srv_bastion", role: "bastion", name: "Node·Bastion", price: 130, blurb: "jump-host lab", specs: { ramGb: 4, nicMbps: 1000, storageGb: 20 } },
    { id: "srv_rack", role: "multi", name: "Rack·AllInOne", price: 320, blurb: "все роли одним узлом", specs: { ramGb: 32, nicMbps: 10000, storageGb: 500 } },
  ];

  const SKILLS = [
    { id: "linux", name: "Linux", max: 5, hint: "+pay за гиги, быстрее bootstrap" },
    { id: "net", name: "Network", max: 5, hint: "DNS/прокси миссии, +NIC efficacy" },
    { id: "forensics", name: "Forensics", max: 5, hint: "расследования, бонус к case-pay" },
    { id: "defense", name: "Defense", max: 5, hint: "IDS/firewall главы, +к защите" },
    { id: "devops", name: "DevOps", max: 5, hint: "docker/ssl/cron, +mine soft" },
  ];

  const CAPS = [
    { id: "workstation", label: "Workstation собрана", hint: "mobo+cpu+ram+gpu+psu+nic+(hdd|ssd)" },
    { id: "mine", label: "Idle mining", hint: "GPU ≥ 60" },
    { id: "mine_fast", label: "Fast mining", hint: "GPU ≥ 120 + cool" },
    { id: "mine_ultra", label: "Ultra mining", hint: "GPU ≥ 300 + cool + devops≥2" },
    { id: "vpn", label: "VPN-миссии", hint: "сервер VPN/Rack или ПК: RAM≥8 + NIC≥1G" },
    { id: "proxy", label: "Proxy-миссии", hint: "сервер Proxy/Rack или net≥2 + web-сервер" },
    { id: "smtp", label: "SMTP-миссии", hint: "сервер SMTP/Rack" },
    { id: "web", label: "Web-миссии", hint: "сервер Web/Rack или ПК: NIC + диск" },
    { id: "dns", label: "DNS-миссии", hint: "сервер DNS/Rack или net≥3" },
    { id: "db", label: "DB-миссии", hint: "сервер DB/Rack" },
    { id: "docker", label: "Container-миссии", hint: "devops≥2 и (web-сервер или workstation)" },
    { id: "bastion", label: "Bastion-миссии", hint: "сервер Bastion/Rack или defense≥2+vpn" },
  ];

  // совместимость со старым shop-API в гараже
  const SHOP = PARTS;

  const LOAD_LABELS = [
    "sync", "probe", "hash", "link", "mount", "resolve", "apply", "commit", "scan", "handshake",
  ];
  const FLAVOR_OK = [
    "ok.", "done.", "acked.", "stable.", "clean exit.", "cache warm.", "no warnings.",
    "latency low.", "checksum ok.", "session holds.", "write complete.", "link green.",
  ];
  const FLAVOR_BUSY = [
    "working", "hold on", "one moment", "processing", "please wait",
  ];

  /** chapterId → секрет (не документировать в UI) */
  const EGGS = {
    intro: { re: /^coffee$/, msg: "steam rises · +chip", pay: 7 },
    linux: { re: /^neofetch$/, msg: "ascii fox flickers", pay: 8 },
    quiz1: { re: /^42$/, msg: "hitchhiker nod", pay: 6 },
    gigs1: { re: /^todo$/, msg: "sticky note peels", pay: 7 },
    gigs2: { re: /^systemctl\s+cat\s+ssh$/, msg: "unit file whispers", pay: 8 },
    quiz2: { re: /^grep\s+-r\s+needle$/, msg: "haystack laughs", pay: 6 },
    netlab: { re: /^traceroute\s+moon$/, msg: "packets dream of lagrange", pay: 9 },
    night: { re: /^insomniac$/, msg: "03:17 blinks twice", pay: 7 },
    incident: { re: /^blackout$/, msg: "crt fades to snow", pay: 8 },
    router: { re: /^arp\s+-a$/, msg: "ghost mac de:ad:be:ef", pay: 9 },
    osint: { re: /^whoami$/, msg: "you are the operator", pay: 7 },
    ssh: { re: /^ssh-keygen\s+-l$/, msg: "fingerprint hums", pay: 8 },
    explore: { re: /^tree$/, msg: "branches of .secret sway", pay: 9 },
    parse: { re: /^jq\s+\.$/, msg: "json purrs", pay: 8 },
    restore: { re: /^fsck$/, msg: "filesystem smiles", pay: 7 },
    quiz3: { re: /^fail2ban-client\s+ping$/, msg: "pong from jail", pay: 6 },
    defense: { re: /^iptables\s+-L$/, msg: "legacy chain rattles", pay: 8 },
    report: { re: /^fortune$/, msg: "report writes itself", pay: 7 },
    offer: { re: /^neonops$/, msg: "contract seals in wax", pay: 10 },
    corpquiz: { re: /^onboard$/, msg: "badge prints warm", pay: 6 },
    vpn: { re: /^wg$/, msg: "tunnel breathes", pay: 8 },
    web: { re: /^curl\s+-I\s+localhost$/, msg: "headers wink 200", pay: 7 },
    smtp: { re: /^mailq$/, msg: "queue empty · good", pay: 8 },
    monitor: { re: /^top$/, msg: "load average dreams", pay: 7 },
    skill_brief: { re: /^chip$/, msg: "skill chip clicks", pay: 9 },
    proxy: { re: /^nginx\s+-V$/, msg: "modules parade", pay: 8 },
    ssl: { re: /^openssl\s+version$/, msg: "cipher garden", pay: 8 },
    cronbak: { re: /^crontab\s+-l$/, msg: "night shift listed", pay: 7 },
    docker: { re: /^docker\s+images$/, msg: "layers stack quiet", pay: 8 },
    dns: { re: /^host\s+neon\.test$/, msg: "name resolves soft", pay: 8 },
    db: { re: /^\\dt$/, msg: "tables bow", pay: 7 },
    insider: { re: /^whisper$/, msg: "bastion eavesdrops", pay: 9 },
    bastion: { re: /^w$/, msg: "who is logged · shadows", pay: 8 },
    quiz4: { re: /^senior$/, msg: "board nods once", pay: 10 },
    finale_mail: { re: /^signed$/, msg: "wax crest cools", pay: 11 },
    garage: { re: /^vroom$/, msg: "fans spool up", pay: 8 },
    epilogue: { re: /^grid-7$/, msg: "city keeps your echo", pay: 12 },
  };

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
        `Нужен CAP «VPN-миссии» (вкладка Rig: Node·VPN / Rack или ПК RAM≥8+NIC≥1G).\n` +
        `ssh admin@${VPN_IP} → пароль admin\n` +
        "sudo apt install wireguard\n" +
        "sudo systemctl enable wg-quick@wg0\n" +
        "sudo systemctl start wg-quick@wg0\n" +
        "sudo systemctl status wg-quick@wg0",
      mode: "term",
      host: "local",
      cwd: "~",
      requireCap: "vpn",
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
        `Нужен CAP «Web-миссии» (Node·Web / Rack или ПК с NIC+диском).\n` +
        `1) ssh admin@${WEB_IP}\n` +
        "2) sudo apt install nginx\n" +
        "3) sudo systemctl enable nginx\n" +
        "4) sudo systemctl start nginx\n" +
        "5) echo neon > /var/www/html/index.html\n" +
        "6) curl http://localhost",
      mode: "term",
      host: "local",
      cwd: "~",
      requireCap: "web",
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
      id: "smtp",
      title: "CH.22 · company mail",
      narrative:
        `Нужен CAP «SMTP-миссии» — купи Node·SMTP или Rack во вкладке Rig.\n` +
        `Хост ${SMTP_IP} · admin/admin\n` +
        "1) ssh admin@" + SMTP_IP + "\n" +
        "2) sudo apt install postfix\n" +
        "3) sudo systemctl enable postfix\n" +
        "4) sudo systemctl start postfix\n" +
        "5) echo test | mail -s lab ops@neon.test\n" +
        "6) systemctl status postfix",
      mode: "term",
      host: "local",
      cwd: "~",
      requireCap: "smtp",
      goals: [
        {
          id: "sssh",
          match: new RegExp(`^ssh\\s+admin@${SMTP_IP.replace(/\./g, "\\.")}$`),
          out: `admin@${SMTP_IP}'s password:`,
          pay: 10,
          set: { awaitSmtpPass: true },
        },
        { id: "si", match: /^sudo\s+apt\s+install\s+postfix$/, out: "postfix installed", pay: 18, needFlag: "smtpIn" },
        { id: "se", match: /^sudo\s+systemctl\s+enable\s+postfix$/, out: "enabled", pay: 12, needFlag: "smtpIn" },
        { id: "sst", match: /^sudo\s+systemctl\s+start\s+postfix$/, out: "started", pay: 14, needFlag: "smtpIn" },
        { id: "sm", match: /^echo\s+test\s+\|\s+mail\s+-s\s+lab\s+ops@neon\.test$/, out: "mail queued (lab)", pay: 20, needFlag: "smtpIn" },
        { id: "ss", match: /^systemctl\s+status\s+postfix$/, out: "active (running) · SMTP READY", pay: 24, needFlag: "smtpIn" },
      ],
    },
    {
      id: "monitor",
      title: "CH.23 · keep the lights on",
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
      id: "skill_brief",
      title: "CH.24 · skill chip",
      narrative:
        "NeonOps выдаёт skill-chip: очки навыков копятся с XP за заказы.\n" +
        "Rig → Skills: Linux / Network / Forensics / Defense / DevOps.\n" +
        "Прокачка открывает контракты и бусты.",
      mode: "continue",
      reward: 30,
      skillPts: 2,
    },
    {
      id: "proxy",
      title: "CH.25 · reverse proxy",
      narrative:
        "CAP «Proxy»:\n" +
        "1) sudo apt install nginx\n" +
        "2) echo proxy_pass ok > /etc/nginx/sites-available/app\n" +
        "3) sudo ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app\n" +
        "4) sudo nginx -t\n" +
        "5) sudo systemctl reload nginx",
      mode: "term",
      host: "local",
      cwd: "~",
      requireCap: "proxy",
      goals: [
        { id: "px1", match: /^sudo\s+apt\s+install\s+nginx$/, out: "nginx ready", pay: 12 },
        { id: "px2", match: /^echo\s+proxy_pass\s+ok\s+>\s+\/etc\/nginx\/sites-available\/app$/, out: "site file written", pay: 14 },
        { id: "px3", match: /^sudo\s+ln\s+-s\s+\/etc\/nginx\/sites-available\/app\s+\/etc\/nginx\/sites-enabled\/app$/, out: "enabled link", pay: 14 },
        { id: "px4", match: /^sudo\s+nginx\s+-t$/, out: "syntax is ok", pay: 16 },
        { id: "px5", match: /^sudo\s+systemctl\s+reload\s+nginx$/, out: "reloaded · PROXY OK", pay: 24 },
      ],
    },
    {
      id: "ssl",
      title: "CH.26 · TLS lipstick",
      narrative:
        "TLS lab (нужен CAP web):\n" +
        "1) sudo apt install certbot\n" +
        "2) sudo certbot --nginx -d shop.neon.test\n" +
        "3) sudo systemctl reload nginx\n" +
        "4) echo tls_ok > ~/case/ssl.txt",
      mode: "term",
      host: "local",
      cwd: "~",
      requireCap: "web",
      goals: [
        { id: "t1", match: /^sudo\s+apt\s+install\s+certbot$/, out: "certbot installed", pay: 12 },
        { id: "t2", match: /^sudo\s+certbot\s+--nginx\s+-d\s+shop\.neon\.test$/, out: "Certificate (lab) issued", pay: 22 },
        { id: "t3", match: /^sudo\s+systemctl\s+reload\s+nginx$/, out: "nginx reloaded TLS", pay: 12 },
        { id: "t4", match: /^echo\s+tls_ok\s+>\s+~\/case\/ssl\.txt$/, out: "note saved", pay: 14 },
      ],
    },
    {
      id: "cronbak",
      title: "CH.27 · night backup cron",
      narrative:
        "Автобэкап:\n" +
        "1) echo '0 3 * * * root tar -czf /backup/night.tgz /var/www' > /tmp/bak.cron\n" +
        "2) sudo cp /tmp/bak.cron /etc/cron.d/neon-backup\n" +
        "3) sudo systemctl reload cron\n" +
        "4) grep neon-backup /etc/cron.d/neon-backup",
      mode: "term",
      host: "local",
      cwd: "~",
      goals: [
        { id: "c1", match: /^echo\s+'0\s+3\s+\*\s+\*\s+\*\s+root\s+tar\s+-czf\s+\/backup\/night\.tgz\s+\/var\/www'\s+>\s+\/tmp\/bak\.cron$/, out: "cron line staged", pay: 16 },
        { id: "c2", match: /^sudo\s+cp\s+\/tmp\/bak\.cron\s+\/etc\/cron\.d\/neon-backup$/, out: "installed cron.d", pay: 14 },
        { id: "c3", match: /^sudo\s+systemctl\s+reload\s+cron$/, out: "cron reloaded", pay: 12 },
        { id: "c4", match: /^grep\s+neon-backup\s+\/etc\/cron\.d\/neon-backup$/, out: "0 3 * * * root tar …", pay: 18 },
      ],
    },
    {
      id: "docker",
      title: "CH.28 · container bay",
      narrative:
        "CAP «Container» (devops≥2 + web/workstation):\n" +
        "1) sudo apt install docker.io\n" +
        "2) sudo systemctl enable docker\n" +
        "3) sudo systemctl start docker\n" +
        "4) sudo docker run -d --name neon-web -p 8080:80 nginx:alpine\n" +
        "5) sudo docker ps\n" +
        "6) curl http://localhost:8080",
      mode: "term",
      host: "local",
      cwd: "~",
      requireCap: "docker",
      goals: [
        { id: "dk1", match: /^sudo\s+apt\s+install\s+docker\.io$/, out: "docker.io installed", pay: 14 },
        { id: "dk2", match: /^sudo\s+systemctl\s+enable\s+docker$/, out: "enabled", pay: 10 },
        { id: "dk3", match: /^sudo\s+systemctl\s+start\s+docker$/, out: "started", pay: 10 },
        { id: "dk4", match: /^sudo\s+docker\s+run\s+-d\s+--name\s+neon-web\s+-p\s+8080:80\s+nginx:alpine$/, out: "container started", pay: 24 },
        { id: "dk5", match: /^sudo\s+docker\s+ps$/, out: "neon-web … Up", pay: 12 },
        { id: "dk6", match: /^curl\s+http:\/\/localhost:8080$/, out: "Welcome to nginx! (lab)", pay: 20 },
      ],
    },
    {
      id: "dns",
      title: "CH.29 · company DNS",
      narrative:
        "CAP «DNS»:\n" +
        "1) sudo apt install unbound\n" +
        "2) sudo systemctl enable unbound\n" +
        "3) sudo systemctl start unbound\n" +
        "4) dig @127.0.0.1 neon.test\n" +
        "5) echo 'nameserver 127.0.0.1' > /tmp/resolv.lab",
      mode: "term",
      host: "local",
      cwd: "~",
      requireCap: "dns",
      goals: [
        { id: "dn1", match: /^sudo\s+apt\s+install\s+unbound$/, out: "unbound installed", pay: 14 },
        { id: "dn2", match: /^sudo\s+systemctl\s+enable\s+unbound$/, out: "enabled", pay: 10 },
        { id: "dn3", match: /^sudo\s+systemctl\s+start\s+unbound$/, out: "started", pay: 12 },
        { id: "dn4", match: /^dig\s+@127\.0\.0\.1\s+neon\.test$/, out: "ANSWER: 198.51.100.40 (lab)", pay: 18 },
        { id: "dn5", match: /^echo\s+'nameserver\s+127\.0\.0\.1'\s+>\s+\/tmp\/resolv\.lab$/, out: "resolv staged", pay: 12 },
      ],
    },
    {
      id: "db",
      title: "CH.30 · postgres pocket",
      narrative:
        "CAP «DB»:\n" +
        "1) sudo apt install postgresql\n" +
        "2) sudo systemctl enable postgresql\n" +
        "3) sudo systemctl start postgresql\n" +
        "4) sudo -u postgres psql -c 'SELECT 1'\n" +
        "5) echo db_ok > ~/case/db.txt",
      mode: "term",
      host: "local",
      cwd: "~",
      requireCap: "db",
      goals: [
        { id: "db1", match: /^sudo\s+apt\s+install\s+postgresql$/, out: "postgresql installed", pay: 16 },
        { id: "db2", match: /^sudo\s+systemctl\s+enable\s+postgresql$/, out: "enabled", pay: 10 },
        { id: "db3", match: /^sudo\s+systemctl\s+start\s+postgresql$/, out: "started", pay: 12 },
        { id: "db4", match: /^sudo\s+-u\s+postgres\s+psql\s+-c\s+'SELECT\s+1'$/, out: " ?column? \n----------\n        1", pay: 22 },
        { id: "db5", match: /^echo\s+db_ok\s+>\s+~\/case\/db\.txt$/, out: "note saved", pay: 12 },
      ],
    },
    {
      id: "insider",
      title: "CH.31 · whisper on bastion",
      narrative:
        "Тикет: ночные логины с bastion. Нужен CAP Bastion — потом аудит.",
      mode: "continue",
      reward: 25,
    },
    {
      id: "bastion",
      title: "CH.32 · bastion audit",
      narrative:
        "CAP Bastion:\n" +
        "1) last -a\n" +
        "2) grep Accepted /var/log/auth.log\n" +
        "3) sudo ufw allow from 10.0.0.0/8 to any port 22\n" +
        "4) sudo systemctl restart ssh\n" +
        "5) echo bastion_hardened > ~/case/bastion.txt",
      mode: "term",
      host: "local",
      cwd: "~",
      requireCap: "bastion",
      goals: [
        { id: "b1", match: /^last\s+-a$/, out: "admin pts/0 … still logged in (lab)", pay: 12 },
        { id: "b2", match: /^grep\s+Accepted\s+\/var\/log\/auth\.log$/, out: "Accepted publickey for admin …", pay: 14 },
        { id: "b3", match: /^sudo\s+ufw\s+allow\s+from\s+10\.0\.0\.0\/8\s+to\s+any\s+port\s+22$/, out: "Rule added", pay: 16 },
        { id: "b4", match: /^sudo\s+systemctl\s+restart\s+ssh$/, out: "ssh restarted", pay: 12 },
        { id: "b5", match: /^echo\s+bastion_hardened\s+>\s+~\/case\/bastion\.txt$/, out: "case updated", pay: 18 },
      ],
    },
    {
      id: "quiz4",
      title: "CH.33 · quiz · senior ops",
      narrative: "Совет директоров проверяет уровень.",
      mode: "quiz",
      questions: [
        { q: "reverse-proxy обычно…", options: ["принимает снаружи и проксирует на бэкенд", "форматирует диск", "заменяет DNS"], ok: 0 },
        { q: "certbot чаще выдаёт…", options: ["TLS-сертификаты", "RAM", "GPU-драйверы"], ok: 0 },
        { q: "cron '0 3 * * *' значит…", options: ["каждый час", "каждый день в 03:00", "раз в месяц"], ok: 1 },
        { q: "docker run -p 8080:80 …", options: ["порт хоста 8080 → 80 в контейнере", "удаляет образ", "выключает ufw"], ok: 0 },
        { q: "bastion/jump-host — это…", options: ["игрушка", "вход во внутреннюю сеть через промежуточный хост", "только SMTP"], ok: 1 },
      ],
      reward: 55,
      skillPts: 1,
    },
    {
      id: "finale_mail",
      title: "CH.34 · board letter",
      narrative:
        "MAIL · NeonOps Board\n" +
        "«Инфра жива. Дальше — Rig + Skills. Контракты на бирже.»",
      mode: "continue",
      reward: 80,
      skillPts: 2,
    },
    {
      id: "garage",
      title: "CH.35 · garage → Rig tab",
      narrative:
        "Rig: железо, серверы (DNS/DB/Bastion), Skills, Caps.\n" +
        "Терминал shop/buy/assemble/mine-* · UI — «rig · железо».",
      mode: "garage",
      reward: 50,
    },
    {
      id: "epilogue",
      title: "EPILOGUE · city still hums",
      narrative:
        "Grid-7 гудит. Качай Skills, апгрейди GPU, бери Rack, сейвь в cloud nick.",
      mode: "continue",
      reward: 70,
    },
  ];

  function defaultState() {
    return {
      chapter: 0,
      money: 80,
      doneGoals: {},
      flags: {},
      notes: [],
      parts: {},
      servers: {},
      assembled: false,
      mining: false,
      mined: 0,
      quizIndex: 0,
      quizOk: 0,
      finished: false,
      rigTab: "pc",
      opsXp: 0,
      skillPts: 0,
      skills: { linux: 0, net: 0, forensics: 0, defense: 0, devops: 0 },
      eggs: {},
    };
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!raw || typeof raw !== "object") return defaultState();
      return {
        ...defaultState(),
        ...raw,
        flags: raw.flags || {},
        doneGoals: raw.doneGoals || {},
        parts: raw.parts || {},
        servers: raw.servers || {},
        notes: raw.notes || [],
        skills: { linux: 0, net: 0, forensics: 0, defense: 0, devops: 0, ...(raw.skills || {}) },
        opsXp: Number(raw.opsXp) || 0,
        skillPts: Number(raw.skillPts) || 0,
        eggs: raw.eggs && typeof raw.eggs === "object" ? raw.eggs : {},
      };
    } catch {
      return defaultState();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch { /* ignore */ }
    if (window.OpsCloud && typeof window.OpsCloud.schedulePush === "function") {
      window.OpsCloud.schedulePush();
    }
  }

  let state = load();
  let termCwd = "/";
  let termHost = "local";
  let mineTimer = 0;
  let open = false;
  let animBusy = false;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

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

  function partById(id) {
    return PARTS.find((p) => p.id === id);
  }

  function installedPart(slot) {
    const id = state.parts[slot];
    return id ? partById(id) : null;
  }

  function computeSpecs() {
    const s = { cores: 0, ramGb: 0, gpu: 0, psuW: 0, storageGb: 0, nicMbps: 0, wattsNeed: 0, boost: 0 };
    PC_SLOTS.forEach((slot) => {
      const p = installedPart(slot);
      if (!p) return;
      const sp = p.specs || {};
      s.cores += sp.cores || 0;
      s.ramGb += sp.ramGb || 0;
      s.gpu += sp.gpu || 0;
      s.psuW += sp.psuW || 0;
      s.storageGb += sp.storageGb || 0;
      s.nicMbps += sp.nicMbps || 0;
      s.wattsNeed += sp.wattsNeed || 0;
      s.boost += p.boost || sp.boost || 0;
    });
    return s;
  }

  function skill(id) {
    return (state.skills && state.skills[id]) || 0;
  }

  function opsLevel() {
    return Math.floor(Math.sqrt((state.opsXp || 0) / 35)) + 1;
  }

  function gainXp(n) {
    const before = opsLevel();
    state.opsXp = (state.opsXp || 0) + Math.max(0, n);
    const after = opsLevel();
    if (after > before) {
      const gained = after - before;
      state.skillPts = (state.skillPts || 0) + gained;
      appendOut(`LEVEL UP · ops L${after} · +${gained} skill pt`, "ok");
      rigLog(`LEVEL UP L${after}`);
    }
  }

  function payMult() {
    return 1 + skill("linux") * 0.06 + skill("forensics") * 0.04;
  }

  function hasServerRole(role) {
    if (state.servers.multi || state.servers.srv_rack) return true;
    if (role === "proxy") return !!(state.servers.proxy || state.servers.srv_proxy);
    if (role === "vpn") return !!(state.servers.vpn || state.servers.srv_vpn);
    if (role === "smtp") return !!(state.servers.smtp || state.servers.srv_smtp);
    if (role === "web") return !!(state.servers.web || state.servers.srv_web);
    if (role === "dns") return !!(state.servers.dns || state.servers.srv_dns);
    if (role === "db") return !!(state.servers.db || state.servers.srv_db);
    if (role === "bastion") return !!(state.servers.bastion || state.servers.srv_bastion);
    return !!state.servers[role];
  }

  function hasCap(id) {
    const sp = computeSpecs();
    if (id === "workstation") return !!state.assembled;
    if (id === "mine") return state.assembled && sp.gpu >= 60;
    if (id === "mine_fast") return state.assembled && sp.gpu >= 120 && !!state.parts.cool;
    if (id === "mine_ultra") return state.assembled && sp.gpu >= 300 && !!state.parts.cool && skill("devops") >= 2;
    if (id === "vpn") return hasServerRole("vpn") || (state.assembled && sp.ramGb >= 8 && sp.nicMbps >= 1000);
    if (id === "proxy") return hasServerRole("proxy") || (skill("net") >= 2 && hasServerRole("web"));
    if (id === "smtp") return hasServerRole("smtp");
    if (id === "web") return hasServerRole("web") || (state.assembled && sp.nicMbps >= 1000 && sp.storageGb >= 40);
    if (id === "dns") return hasServerRole("dns") || skill("net") >= 3;
    if (id === "db") return hasServerRole("db");
    if (id === "docker") return skill("devops") >= 2 && (hasServerRole("web") || state.assembled);
    if (id === "bastion") return hasServerRole("bastion") || (skill("defense") >= 2 && hasCap("vpn"));
    return false;
  }

  function capHint(id) {
    const c = CAPS.find((x) => x.id === id);
    return c ? `${c.label} (${c.hint})` : id;
  }

  function buySkill(id) {
    const def = SKILLS.find((s) => s.id === id);
    if (!def) return;
    const cur = skill(id);
    if (cur >= def.max) {
      rigLog("skill max");
      return;
    }
    if ((state.skillPts || 0) < 1) {
      rigLog("нет skill pts · качай XP заказами");
      return;
    }
    state.skillPts -= 1;
    state.skills[id] = cur + 1;
    gainXp(5);
    rigLog(`${def.name} → L${state.skills[id]}`);
    save();
    renderRig();
    renderChrome();
  }

  function pay(n, why) {
    const gained = Math.max(1, Math.round(n * payMult()));
    state.money += gained;
    gainXp(Math.max(1, Math.floor(gained / 4)));
    save();
    appendOut(`+$ ${gained}${why ? ` · ${why}` : ""}${gained !== n ? ` (x${payMult().toFixed(2)})` : ""}`, "ok");
    renderChrome();
    renderRigMoney();
  }

  function appendOut(text, cls) {
    const e = els();
    if (!e.out) return null;
    const lines = String(text).split("\n");
    let last = null;
    lines.forEach((line) => {
      const div = document.createElement("div");
      div.className = `ops-story-line${cls ? ` ${cls}` : ""}`;
      div.textContent = line || " ";
      e.out.appendChild(div);
      last = div;
    });
    e.out.scrollTop = e.out.scrollHeight;
    return last;
  }

  async function animateLoader(label) {
    const e = els();
    if (!e.out) return;
    const div = document.createElement("div");
    div.className = "ops-story-line dim ops-story-load";
    e.out.appendChild(div);
    const base = label || pick(LOAD_LABELS);
    for (let i = 0; i < 7; i += 1) {
      div.textContent = `${base}${".".repeat((i % 3) + 1)}`;
      e.out.scrollTop = e.out.scrollHeight;
      await sleep(85 + (i % 3) * 28);
    }
    div.textContent = `${base}… ok`;
    await sleep(70);
    div.remove();
  }

  async function withLoader(label, fn) {
    const input = els().input;
    const submit = document.getElementById("opsStorySubmit");
    if (animBusy) {
      if (fn) fn();
      return;
    }
    animBusy = true;
    if (input) input.disabled = true;
    if (submit) submit.disabled = true;
    await animateLoader(label || pick(LOAD_LABELS));
    if (fn) fn();
    if (input) input.disabled = false;
    if (submit) submit.disabled = false;
    animBusy = false;
    if (input) input.focus();
  }

  async function playActionFx(outText, opts) {
    const o = opts || {};
    const input = els().input;
    const submit = document.getElementById("opsStorySubmit");
    if (animBusy) {
      appendOut(outText, o.cls || "ok");
      if (o.after) o.after();
      return;
    }
    animBusy = true;
    if (input) input.disabled = true;
    if (submit) submit.disabled = true;
    await animateLoader(o.label || pick(LOAD_LABELS));
    if (o.busy) appendOut(`${pick(FLAVOR_BUSY)}${".".repeat(1 + (Date.now() % 3))}`, "dim");
    appendOut(outText, o.cls || "ok");
    if (o.flavor !== false) appendOut(pick(FLAVOR_OK), "dim");
    if (o.after) o.after();
    if (input) input.disabled = false;
    if (submit) submit.disabled = false;
    animBusy = false;
    if (input) input.focus();
  }

  function tryEgg(line) {
    const ch = chapter();
    const egg = EGGS[ch.id];
    if (!egg || !egg.re.test(line)) return false;
    if (!state.eggs) state.eggs = {};
    if (state.eggs[ch.id]) {
      appendOut("…", "dim");
      return true;
    }
    state.eggs[ch.id] = true;
    playActionFx(egg.msg || "…", {
      label: "glitch",
      flavor: false,
      after: () => {
        if (egg.pay) pay(egg.pay, "???");
        save();
      },
    });
    return true;
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
        ? `COMPLETE · L${opsLevel()} · mined:${state.mined}`
        : `ch ${state.chapter + 1}/${CHAPTERS.length} · L${opsLevel()} xp:${state.opsXp} pts:${state.skillPts} · ${termHost}`;
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
    document.getElementById("opsStoryRigGate")?.classList.add("hidden");
  }

  function renderChapter() {
    const e = els();
    const ch = chapter();
    hideStoryUiBits();
    clearOut();
    termHost = ch.host || "local";
    termCwd = ch.cwd || (termHost === "remote" ? "/home/admin" : termHost === "router" ? "/" : "~");
    state.flags.awaitPass = false;
    state.flags.awaitVpnPass = false;
    state.flags.awaitWebPass = false;
    state.flags.awaitSmtpPass = false;

    if (ch.requireCap && !hasCap(ch.requireCap)) {
      if (e.narrative) {
        e.narrative.textContent =
          `${ch.narrative}\n\n⚠ CAP locked: ${capHint(ch.requireCap)}\n` +
          "Открой вкладку «rig · железо», докупи ПК/сервер, затем вернись в сюжет.";
      }
      if (e.continueBtn) {
        e.continueBtn.classList.remove("hidden");
        e.continueBtn.textContent = "проверить CAP →";
      }
      const gate = document.getElementById("opsStoryRigGate");
      if (gate) gate.classList.remove("hidden");
      renderChrome();
      save();
      return;
    }
    document.getElementById("opsStoryRigGate")?.classList.add("hidden");

    if (e.narrative) e.narrative.textContent = ch.narrative;

    if (ch.mode === "continue") {
      if (e.term) e.term.classList.remove("hidden");
      updatePrompt();
      appendOut(`link · ${ch.id}`, "dim");
      if (e.continueBtn) {
        e.continueBtn.classList.remove("hidden");
        e.continueBtn.textContent = state.chapter >= CHAPTERS.length - 1 ? "в hub / Rig" : "далее →";
      }
    } else if (ch.mode === "quiz") {
      state.quizIndex = 0;
      state.quizOk = 0;
      if (e.term) e.term.classList.remove("hidden");
      if (e.quiz) e.quiz.classList.remove("hidden");
      updatePrompt();
      appendOut(`quiz channel · ${ch.id}`, "dim");
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
      appendOut("garage · или открой вкладку Rig на хабе", "dim");
      if (!state.doneGoals.garage_unlock) {
        state.doneGoals.garage_unlock = true;
        pay(ch.reward || 0, "garage unlock");
        addNote("Rig tab: тюнинг ПК + серверы под CAP миссий");
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
    const next = () => {
      state.quizIndex += 1;
      save();
      renderQuiz();
    };
    if (i === item.ok) {
      state.quizOk += 1;
      playActionFx("OK", {
        label: "check",
        after: () => {
          pay(8, "quiz hit");
          next();
        },
      });
    } else {
      playActionFx(`NO · верно: ${item.options[item.ok]}`, {
        label: "check",
        cls: "bad",
        flavor: false,
        after: next,
      });
    }
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
    if (ch.skillPts && !state.doneGoals[`skpts_${ch.id}`]) {
      state.doneGoals[`skpts_${ch.id}`] = true;
      state.skillPts = (state.skillPts || 0) + ch.skillPts;
      appendOut(`+${ch.skillPts} skill pt`, "ok");
    }
    if (ch.setNotes) {
      addNote(`VPN job host ${VPN_IP} · admin/admin`);
      addNote(`Web job host ${WEB_IP} · admin/admin`);
      addNote(`SMTP job host ${SMTP_IP} · admin/admin`);
      addNote("WireGuard: apt install → enable → start wg-quick@wg0");
      addNote("Rig → Skills + Nodes DNS/DB/Bastion");
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
      playActionFx("CHAPTER CLEAR", {
        label: "commit",
        after: () => setTimeout(() => advanceChapter(), 280),
      });
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
    e.shop.innerHTML = PARTS.map((item) => {
      const cur = state.parts[item.slot];
      const owned = cur === item.id;
      const better = cur && partById(cur) && partById(cur).tier > item.tier;
      return `<button type="button" class="ops-btn ${owned ? "ghost" : ""}" data-buy="${item.id}" ${owned || better ? "disabled" : ""}>${item.name} · $${item.price}${owned ? " · ON" : ""}</button>`;
    }).join("");
  }

  function canInstall(item) {
    if (item.reqSlots) {
      for (let i = 0; i < item.reqSlots.length; i += 1) {
        if (!state.parts[item.reqSlots[i]]) return `нужен слот ${item.reqSlots[i]}`;
      }
    }
    if (item.minPsu) {
      const psu = installedPart("psu");
      const w = (psu && psu.specs && psu.specs.psuW) || 0;
      if (w < item.minPsu) return `PSU ≥ ${item.minPsu}W (сейчас ${w || 0})`;
    }
    const sp = computeSpecs();
    const extraNeed = (item.specs && item.specs.wattsNeed) || 0;
    if (item.slot === "gpu" && state.parts.psu) {
      const psuW = (installedPart("psu").specs || {}).psuW || 0;
      const otherNeed = PARTS.filter((p) => state.parts[p.slot] === p.id && p.slot !== "gpu")
        .reduce((a, p) => a + ((p.specs && p.specs.wattsNeed) || 0), 0);
      if (psuW < otherNeed + extraNeed) return `не хватает питания PSU (${psuW}W)`;
    }
    void sp;
    return null;
  }

  function buyPart(id) {
    const item = partById(id);
    if (!item) {
      appendOut("unknown part", "bad");
      return;
    }
    const block = canInstall(item);
    if (block) {
      appendOut(`dep: ${block}`, "bad");
      rigLog(`dep: ${block}`);
      return;
    }
    const cur = installedPart(item.slot);
    if (cur && cur.id === item.id) {
      appendOut("already installed", "dim");
      return;
    }
    if (cur && cur.tier > item.tier) {
      appendOut("уже стоит тир выше", "dim");
      return;
    }
    if (state.money < item.price) {
      appendOut("not enough $", "bad");
      rigLog("not enough $");
      return;
    }
    state.money -= item.price;
    state.parts[item.slot] = item.id;
    state.assembled = false;
    playActionFx(`INSTALLED ${item.name}`, { label: "mount" });
    rigLog(`bought ${item.name}`);
    save();
    renderShop();
    renderChrome();
    renderRig();
  }

  function buyServer(id) {
    const srv = SERVERS.find((s) => s.id === id);
    if (!srv) {
      rigLog("unknown server");
      return;
    }
    if (state.servers[srv.id] || state.servers[srv.role]) {
      rigLog("already owned");
      return;
    }
    if (state.money < srv.price) {
      rigLog("not enough $");
      return;
    }
    state.money -= srv.price;
    state.servers[srv.id] = true;
    state.servers[srv.role] = true;
    if (srv.role === "multi") {
      ["proxy", "vpn", "smtp", "web", "dns", "db", "bastion"].forEach((r) => { state.servers[r] = true; });
    }
    rigLog(`SERVER ONLINE · ${srv.name}`);
    save();
    renderRig();
    renderChrome();
  }

  function tryAssemble() {
    const need = ["mobo", "cpu", "ram", "gpu", "psu"];
    const miss = need.filter((s) => !state.parts[s]);
    if (miss.length) {
      appendOut(`missing: ${miss.join(", ")}`, "bad");
      rigLog(`missing: ${miss.join(", ")}`);
      return;
    }
    if (!state.parts.hdd && !state.parts.ssd) {
      appendOut("нужен HDD или SSD", "bad");
      rigLog("нужен HDD или SSD");
      return;
    }
    if (!state.parts.nic) {
      appendOut("нужен NIC (сеть)", "bad");
      rigLog("нужен NIC");
      return;
    }
    const sp = computeSpecs();
    if (sp.psuW < sp.wattsNeed) {
      appendOut(`PSU ${sp.psuW}W < need ${sp.wattsNeed}W`, "bad");
      return;
    }
    state.assembled = true;
    pay(25, "assemble bonus");
    playActionFx(`PC ASSEMBLED · ${sp.cores}c/${sp.ramGb}G gpu${sp.gpu} · rate ${mineRate()}`, { label: "boot" });
    addNote("Workstation assembled");
    save();
    renderRig();
  }

  function mineRate() {
    const sp = computeSpecs();
    let r = 2 + (sp.boost || 0) + skill("devops");
    if (sp.gpu >= 120) r += 2;
    if (sp.gpu >= 200) r += 3;
    if (sp.gpu >= 300) r += 4;
    if (hasCap("mine_fast")) r += 2;
    if (hasCap("mine_ultra")) r += 4;
    return Math.max(1, r);
  }

  function startMine() {
    if (!hasCap("mine")) {
      appendOut("нужен CAP mine (собрать ПК с GPU)", "bad");
      return;
    }
    if (state.mining) {
      appendOut("already mining", "dim");
      return;
    }
    state.mining = true;
    save();
    const rate = mineRate();
    playActionFx(`MINER ONLINE · +$${rate} / 4s`, { label: "hash" });
    rigLog(`mining +$${rate}/4s`);
    if (mineTimer) clearInterval(mineTimer);
    mineTimer = setInterval(() => {
      if (!state.mining) return;
      const gain = mineRate();
      state.money += gain;
      state.mined += gain;
      save();
      renderChrome();
      renderRigMoney();
    }, 4000);
  }

  function renderRigMoney() {
    const m = document.getElementById("opsRigMoney");
    if (m) m.textContent = String(state.money);
    const sm = document.getElementById("opsStoryMoney");
    if (sm) sm.textContent = String(state.money);
  }

  function rigLog(msg) {
    const el = document.getElementById("opsRigLog");
    if (el) el.textContent = msg;
  }

  function renderRig() {
    const body = document.getElementById("opsRigBody");
    if (!body) return;
    renderRigMoney();
    const tab = state.rigTab || "pc";
    document.querySelectorAll("[data-rig-tab]").forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.rigTab === tab);
    });
    const sp = computeSpecs();

    if (tab === "pc") {
      body.innerHTML = `
        <div class="ops-rig-specs">cores:${sp.cores} · RAM:${sp.ramGb}G · GPU:${sp.gpu} · PSU:${sp.psuW}W · disk:${sp.storageGb}G · NIC:${sp.nicMbps}M · needW:${sp.wattsNeed}</div>
        <div class="ops-rig-slots">
          ${PC_SLOTS.map((slot) => {
            const p = installedPart(slot);
            return `<div class="ops-rig-slot"><span class="ops-rig-slot-id">${slot}</span><strong>${p ? escapeHtml(p.name) : "— empty —"}</strong></div>`;
          }).join("")}
        </div>
        <div class="ops-gate-actions">
          <button type="button" class="ops-btn" id="opsRigAssemble">assemble</button>
          <button type="button" class="ops-btn" id="opsRigMine">${state.mining ? "mine-stop" : "mine-start"}</button>
        </div>
        <p class="ops-lead">Сборка: mobo+cpu+ram+gpu+psu+nic+(hdd|ssd). PSU должен тянуть GPU.</p>`;
      document.getElementById("opsRigAssemble")?.addEventListener("click", tryAssemble);
      document.getElementById("opsRigMine")?.addEventListener("click", () => {
        if (state.mining) stopMine();
        else startMine();
        renderRig();
      });
    } else if (tab === "servers") {
      body.innerHTML = `
        <p class="ops-lead">Серверы: proxy/VPN/SMTP/web/DNS/DB/bastion. Rack = все роли.</p>
        <div class="ops-rig-shop">
          ${SERVERS.map((s) => {
            const own = !!(state.servers[s.id] || state.servers[s.role]);
            return `<button type="button" class="ops-btn ${own ? "ghost" : ""}" data-buy-srv="${s.id}" ${own ? "disabled" : ""}">
              <span class="ops-cat-id">${escapeHtml(s.name)}</span>
              <span class="ops-cat-blurb">${escapeHtml(s.blurb)} · $${s.price}</span>
              <span class="ops-cat-stat">${own ? "OWNED" : "buy"}</span>
            </button>`;
          }).join("")}
        </div>`;
      body.querySelectorAll("[data-buy-srv]").forEach((btn) => {
        btn.addEventListener("click", () => buyServer(btn.dataset.buySrv));
      });
    } else if (tab === "shop") {
      const bySlot = {};
      PARTS.forEach((p) => {
        if (!bySlot[p.slot]) bySlot[p.slot] = [];
        bySlot[p.slot].push(p);
      });
      body.innerHTML = PC_SLOTS.map((slot) => `
        <h3 class="ops-h">${slot}</h3>
        <div class="ops-rig-shop">
          ${(bySlot[slot] || []).map((item) => {
            const cur = state.parts[item.slot];
            const owned = cur === item.id;
            return `<button type="button" class="ops-btn ${owned ? "ghost" : ""}" data-buy-part="${item.id}">${escapeHtml(item.name)} · $${item.price}${owned ? " · ON" : ""}</button>`;
          }).join("")}
        </div>`).join("");
      body.querySelectorAll("[data-buy-part]").forEach((btn) => {
        btn.addEventListener("click", () => buyPart(btn.dataset.buyPart));
      });
    } else if (tab === "skills") {
      body.innerHTML = `
        <div class="ops-rig-specs">ops L${opsLevel()} · XP ${state.opsXp} · skill pts ${state.skillPts || 0} · pay x${payMult().toFixed(2)}</div>
        <div class="ops-rig-caps">
          ${SKILLS.map((s) => {
            const lv = skill(s.id);
            const maxed = lv >= s.max;
            return `<div class="ops-rig-cap ${lv ? "on" : ""}">
              <strong>${escapeHtml(s.name)} L${lv}/${s.max}</strong>
              <span>${escapeHtml(s.hint)}</span>
              <button type="button" class="ops-btn" data-skill-up="${s.id}" ${maxed || !(state.skillPts > 0) ? "disabled" : ""}>${maxed ? "MAX" : "upgrade · 1 pt"}</button>
            </div>`;
          }).join("")}
        </div>
        <p class="ops-lead">XP за заказы и главы → level-up → skill pts. Skills открывают CAP (dns/docker/bastion…).</p>`;
      body.querySelectorAll("[data-skill-up]").forEach((btn) => {
        btn.addEventListener("click", () => buySkill(btn.dataset.skillUp));
      });
    } else if (tab === "caps") {
      body.innerHTML = `
        <div class="ops-rig-caps">
          ${CAPS.map((c) => {
            const on = hasCap(c.id);
            return `<div class="ops-rig-cap ${on ? "on" : ""}"><strong>${on ? "ON" : "OFF"}</strong> ${escapeHtml(c.label)}<span>${escapeHtml(c.hint)}</span></div>`;
          }).join("")}
        </div>
        <p class="ops-lead">Сюжетные главы VPN / Web / SMTP проверяют эти CAP перед стартом терминала.</p>`;
    }
  }

  function showRig(on) {
    const panel = document.getElementById("opsRig");
    if (!panel) return;
    panel.classList.toggle("hidden", !on);
    if (on) {
      document.getElementById("opsHub")?.classList.add("hidden");
      document.getElementById("opsStory")?.classList.add("hidden");
      document.getElementById("opsDocs")?.classList.add("hidden");
      document.getElementById("opsLesson")?.classList.add("hidden");
      document.getElementById("opsDrill")?.classList.add("hidden");
      renderRig();
    }
  }

  function stopMine() {
    state.mining = false;
    save();
    if (mineTimer) {
      clearInterval(mineTimer);
      mineTimer = 0;
    }
    appendOut("miner stopped", "dim");
    rigLog("miner stopped");
  }

  function handleGoalLine(line) {
    const ch = chapter();
    if (ch.mode !== "term" || !ch.goals) return false;

    if (state.flags.awaitPass) {
      if (line === "admin") {
        state.flags.awaitPass = false;
        state.flags.sshIn = true;
        playActionFx(`Welcome to shadow-vps-lab (${HOST_IP})`, {
          label: "handshake",
          after: () => {
            const g = ch.goals.find((x) => x.id === "sshcmd");
            if (g && !state.doneGoals[`${ch.id}:${g.id}`]) markGoal(ch, { ...g, pay: 20, set: undefined });
            else {
              pay(20, "login");
              setTimeout(() => advanceChapter(), 400);
            }
          },
        });
        return true;
      }
      appendOut("Access denied (try admin)", "bad");
      return true;
    }

    if (state.flags.awaitVpnPass) {
      if (line === "admin") {
        state.flags.awaitVpnPass = false;
        state.flags.vpnIn = true;
        playActionFx(`VPN-host ${VPN_IP} · shell ready`, {
          label: "handshake",
          after: () => {
            const g = ch.goals.find((x) => x.id === "vpnssh");
            if (g && !state.doneGoals[`${ch.id}:${g.id}`]) markGoal(ch, { ...g, pay: 15, set: undefined });
            else pay(15, "vpn login");
          },
        });
        return true;
      }
      appendOut("Access denied", "bad");
      return true;
    }

    if (state.flags.awaitWebPass) {
      if (line === "admin") {
        state.flags.awaitWebPass = false;
        state.flags.webIn = true;
        playActionFx(`WEB-host ${WEB_IP} · shell ready`, {
          label: "handshake",
          after: () => {
            const g = ch.goals.find((x) => x.id === "wssh");
            if (g && !state.doneGoals[`${ch.id}:${g.id}`]) markGoal(ch, { ...g, pay: 15, set: undefined });
            else pay(15, "web login");
          },
        });
        return true;
      }
      appendOut("Access denied", "bad");
      return true;
    }

    if (state.flags.awaitSmtpPass) {
      if (line === "admin") {
        state.flags.awaitSmtpPass = false;
        state.flags.smtpIn = true;
        playActionFx(`SMTP-host ${SMTP_IP} · shell ready`, {
          label: "handshake",
          after: () => {
            const g = ch.goals.find((x) => x.id === "sssh");
            if (g && !state.doneGoals[`${ch.id}:${g.id}`]) markGoal(ch, { ...g, pay: 15, set: undefined });
            else pay(15, "smtp login");
          },
        });
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
        playActionFx(g.out || "ok", {
          label: pick(LOAD_LABELS),
          after: () => {
            if (g.set) Object.assign(state.flags, g.set);
            if (g.set && (g.set.awaitPass || g.set.awaitVpnPass || g.set.awaitWebPass || g.set.awaitSmtpPass)) {
              if (g.pay) pay(g.pay, g.id);
              save();
              return;
            }
            markGoal(ch, g);
          },
        });
        return true;
      }
    }
    return false;
  }

  function onCommand(raw) {
    const line = String(raw || "").trim();
    if (!line) return;
    if (animBusy) return;
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
      appendOut(PARTS.map((x) => `${x.id} $${x.price}`).join(" · "));
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

    if (tryEgg(line)) return;

    if (handleGoalLine(line)) return;

    // filesystem commands when on router/remote
    if (termHost === "router" || termHost === "remote") {
      const cmd = line.split(/\s+/)[0].toLowerCase();
      if (["pwd", "ls", "cd", "cat", "less", "more", "grep", "find"].includes(cmd)) {
        withLoader(cmd, () => runFsCommand(line));
        return;
      }
    }

    // local soft echoes for flavor
    if (/^sudo\s+apt\s+update/.test(line) || /^sudo\s+apt\s+install/.test(line)) {
      playActionFx("ok (lab echo) — проверь точную цель главы", { label: "apt", cls: "dim", flavor: false });
      return;
    }

    playActionFx("unknown / not the next story step · help | hint", { label: "miss", cls: "bad", flavor: false });
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
      document.getElementById("opsRig")?.classList.add("hidden");
      renderChapter();
      setTimeout(() => e.input && e.input.focus(), 40);
    }
  }

  function bind() {
    const e = els();
    if (!e.panel) return;

    document.getElementById("opsStoryOpen")?.addEventListener("click", () => show(true));
    document.getElementById("opsRigOpen")?.addEventListener("click", () => showRig(true));
    document.getElementById("opsStoryBack")?.addEventListener("click", () => {
      show(false);
      document.getElementById("opsHub")?.classList.remove("hidden");
      if (window.OpsTerminal && typeof window.OpsTerminal.renderHub === "function") window.OpsTerminal.renderHub();
    });
    document.getElementById("opsRigBack")?.addEventListener("click", () => {
      showRig(false);
      document.getElementById("opsHub")?.classList.remove("hidden");
      if (window.OpsTerminal && typeof window.OpsTerminal.renderHub === "function") window.OpsTerminal.renderHub();
    });
    document.getElementById("opsStoryRigGate")?.addEventListener("click", () => {
      show(false);
      showRig(true);
    });
    document.querySelectorAll("[data-rig-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.rigTab = btn.dataset.rigTab;
        save();
        renderRig();
      });
    });
    document.getElementById("opsStoryReset")?.addEventListener("click", () => {
      if (!confirm("Сбросить сюжет, деньги и железо?")) return;
      stopMine();
      state = defaultState();
      save();
      renderChapter();
      renderRig();
    });
    e.continueBtn?.addEventListener("click", () => {
      const ch = chapter();
      if (ch.requireCap && !hasCap(ch.requireCap)) {
        renderChapter();
        return;
      }
      if (state.chapter >= CHAPTERS.length - 1 && ch.mode === "continue") {
        show(false);
        document.getElementById("opsHub")?.classList.remove("hidden");
        return;
      }
      withLoader("next", () => {
        appendOut(pick(FLAVOR_OK), "dim");
        advanceChapter();
      });
    });
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

    if (state.mining && hasCap("mine")) startMine();
  }

  window.OpsStory = {
    open: () => show(true),
    close: () => show(false),
    isOpen: () => open,
    openRig: () => showRig(true),
    getState: () => JSON.parse(JSON.stringify(state)),
    applyState: (incoming) => {
      if (!incoming || typeof incoming !== "object") return;
      stopMine();
      state = {
        ...defaultState(),
        ...incoming,
        flags: incoming.flags || {},
        doneGoals: incoming.doneGoals || {},
        parts: incoming.parts || {},
        servers: incoming.servers || {},
        notes: incoming.notes || [],
        skills: { linux: 0, net: 0, forensics: 0, defense: 0, devops: 0, ...(incoming.skills || {}) },
        opsXp: Number(incoming.opsXp) || 0,
        skillPts: Number(incoming.skillPts) || 0,
        eggs: incoming.eggs && typeof incoming.eggs === "object" ? incoming.eggs : {},
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch { /* ignore */ }
      if (open) renderChapter();
      if (!document.getElementById("opsRig")?.classList.contains("hidden")) renderRig();
      renderChrome();
      renderRigMoney();
      if (state.mining && hasCap("mine")) startMine();
    },
    hide: () => {
      const e = els();
      if (e.panel) e.panel.classList.add("hidden");
      open = false;
      document.getElementById("opsRig")?.classList.add("hidden");
    },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
