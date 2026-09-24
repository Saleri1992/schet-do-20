/**
 * OPS DRILL — личный тренажёр (CMD/PS + SQL + Java + Parse + HTTP).
 * Вход: Ctrl+Shift+O или кнопка ⌘ на главной → код `sys.ops`
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
        { ask: "Список файлов в текущей папке (CMD)", answer: "dir", shell: "cmd", alts: ["dir /b"], tip: "dir = directory listing" },
        { ask: "Список файлов (PowerShell)", answer: "get-childitem", shell: "ps", alts: ["gci", "ls"], tip: "GCI — алиас Get-ChildItem" },
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
        { ask: "Список процессов (CMD)", answer: "tasklist", shell: "cmd", tip: "tasklist — все процессы" },
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
        { ask: "Список запущенных служб (CMD/net)", answer: "net start", shell: "cmd" },
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
        { ask: "Проверка хоста/порта (PowerShell)", answer: "test-netconnection", shell: "ps", alts: ["tnc"] },
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
        { ask: "Переменная среды PATH (PowerShell)", answer: "$env:path", shell: "ps", alts: ["echo $env:path"] },
        { ask: "Диски (PowerShell)", answer: "get-psdrive", shell: "ps", alts: ["get-volume", "get-disk"] },
        { ask: "Журнал событий (современный PS)", answer: "get-winevent", shell: "ps" },
        { ask: "Планировщик: список задач (CMD)", answer: "schtasks /query", shell: "cmd", alts: ["schtasks"] },
      ],
    },
    {
      id: "diff",
      name: "CMD vs PS",
      blurb: "Отличия",
      drills: [
        { ask: "PowerShell-эквивалент dir", answer: "get-childitem", shell: "ps", alts: ["gci", "ls"], tip: "dir в PS часто алиас Get-ChildItem" },
        { ask: "Ключевое отличие PS от CMD: вывод — это…", answer: "objects", shell: "concept", alts: ["объекты", "object"], tip: "CMD — текст; PS — объекты" },
        { ask: "Соглашение имён командлетов PowerShell", answer: "verb-noun", shell: "concept", alts: ["verb/noun", "глагол-существительное"] },
        { ask: "Конвейер PS передаёт…", answer: "objects", shell: "concept", alts: ["объекты", "object"] },
        { ask: "Очистка экрана (CMD)", answer: "cls", shell: "cmd", alts: ["clear"] },
        { ask: "Очистка экрана (PowerShell)", answer: "clear-host", shell: "ps", alts: ["cls", "clear"] },
        { ask: "Справка по командлету (PowerShell)", answer: "get-help", shell: "ps", alts: ["help", "man"] },
        { ask: "История команд в PowerShell", answer: "get-history", shell: "ps", alts: ["h", "history"] },
        { ask: "Выполнить CMD из PowerShell явно", answer: "cmd /c", shell: "ps", alts: ["cmd.exe /c"] },
      ],
    },
    {
      id: "sql",
      name: "SQL",
      blurb: "С нуля → закрепление",
      learn: true,
      lessons: [
        {
          title: "Что такое SQL",
          points: [
            "SQL — язык запросов к базам данных (таблицы как Excel).",
            "Таблица = набор строк. Строка = одна запись. Столбец = поле (имя, цена…).",
            "Запрос читает/меняет данные. Самый частый: SELECT.",
          ],
          tip: "Думай: «покажи мне … из таблицы …».",
        },
        {
          title: "SELECT и FROM",
          points: [
            "SELECT столбцы FROM таблица;",
            "SELECT * — все столбцы (удобно учиться, в проде осторожнее).",
            "Пример: SELECT name FROM users;",
          ],
          tip: "Порядок: SELECT → FROM.",
        },
        {
          title: "WHERE — фильтр",
          points: [
            "WHERE оставляет только нужные строки.",
            "SELECT * FROM users WHERE age > 18;",
            "Сравнение: = <> != < > <= >= ; текст в кавычках: WHERE name = 'Ann'",
          ],
          tip: "WHERE = «при условии».",
        },
        {
          title: "ORDER BY, LIMIT",
          points: [
            "ORDER BY col ASC|DESC — сортировка.",
            "LIMIT n — сколько строк вернуть (MySQL/SQLite/Postgres).",
            "SELECT * FROM scores ORDER BY ms ASC LIMIT 10;",
          ],
          tip: "Сначала WHERE, потом ORDER BY.",
        },
        {
          title: "INSERT / UPDATE / DELETE",
          points: [
            "INSERT INTO t (a,b) VALUES (1,'x'); — добавить.",
            "UPDATE t SET a=2 WHERE id=1; — изменить (всегда думай про WHERE!).",
            "DELETE FROM t WHERE id=1; — удалить строки (без WHERE опасно).",
          ],
          tip: "UPDATE/DELETE без WHERE = беда.",
        },
      ],
      drills: [
        { ask: "Ключевое слово: выбрать данные", answer: "select", tip: "SELECT … FROM …" },
        { ask: "Ключевое слово: из какой таблицы", answer: "from", tip: "SELECT * FROM users" },
        { ask: "Все столбцы из таблицы users", answer: "select * from users", alts: ["select * from users;"], tip: "* = все поля" },
        { ask: "Фильтр строк — ключевое слово", answer: "where", tip: "WHERE условие" },
        { ask: "Пользователи старше 18 (таблица users, поле age)", answer: "select * from users where age > 18", alts: ["select * from users where age >= 19", "select * from users where age>18"] },
        { ask: "Сортировка — ключевое слово", answer: "order by", alts: ["order by"] },
        { ask: "Сортировать scores по ms по возрастанию", answer: "select * from scores order by ms asc", alts: ["select * from scores order by ms", "select * from scores order by ms asc;"] },
        { ask: "Добавить строку — ключевое слово", answer: "insert", tip: "INSERT INTO … VALUES …" },
        { ask: "Изменить строку — ключевое слово", answer: "update", tip: "UPDATE … SET … WHERE …" },
        { ask: "Удалить строки — ключевое слово", answer: "delete", tip: "DELETE FROM … WHERE …" },
        { ask: "Первичный ключ (термин по-английски)", answer: "primary key", alts: ["pk", "primarykey"], tip: "Уникальный id строки" },
        { ask: "Связать таблицы — ключевое слово JOIN", answer: "join", tip: "FROM a JOIN b ON …" },
      ],
    },
    {
      id: "java",
      name: "Java",
      blurb: "База → закрепление",
      learn: true,
      lessons: [
        {
          title: "Что такое Java",
          points: [
            "Java — язык: пишешь код → компилятор → программа на JVM.",
            "Код живёт в классах. Точка входа: public static void main(String[] args).",
            "Файл обычно называется как публичный класс: Hello.java → class Hello.",
          ],
          tip: "Класс = чертёж, объект = экземпляр.",
        },
        {
          title: "Переменные и типы",
          points: [
            "int n = 5; — целое. double x = 1.5; — дробь. boolean ok = true;",
            "String name = \"Ann\"; — текст (заглавная S — класс).",
            "Тип пишется слева: тип имя = значение;",
          ],
          tip: "String — не «string» с маленькой в Java.",
        },
        {
          title: "if и циклы",
          points: [
            "if (n > 0) { ... } else { ... }",
            "for (int i = 0; i < 10; i++) { ... }",
            "while (ok) { ... } — пока условие истинно.",
          ],
          tip: "Условие в круглых скобках, тело в { }.",
        },
        {
          title: "Методы и массивы",
          points: [
            "Метод: int sum(int a, int b) { return a + b; }",
            "Массив: int[] a = new int[3]; или int[] a = {1,2,3};",
            "Длина массива: a.length (без скобок).",
          ],
          tip: "return отдаёт результат из метода.",
        },
      ],
      drills: [
        { ask: "Точка входа программы — имя метода", answer: "main", tip: "public static void main(...)" },
        { ask: "Целочисленный тип (маленькое целое)", answer: "int", tip: "int n = 5;" },
        { ask: "Тип для текста", answer: "string", alts: ["String"], tip: "String s = \"hi\";" },
        { ask: "Логический тип true/false", answer: "boolean", tip: "boolean ok = true;" },
        { ask: "Ключевое слово условия", answer: "if", tip: "if (cond) { }" },
        { ask: "Цикл со счётчиком — ключевое слово", answer: "for", tip: "for (int i=0; i<n; i++)" },
        { ask: "Цикл «пока» — ключевое слово", answer: "while", tip: "while (cond) { }" },
        { ask: "Вернуть значение из метода", answer: "return", tip: "return a + b;" },
        { ask: "Создать объект/массив — ключевое слово", answer: "new", tip: "new int[3]" },
        { ask: "Длина массива arr", answer: "arr.length", alts: ["a.length", "length"], tip: "без ()" },
        { ask: "Модификатор «видно везде»", answer: "public", tip: "public class …" },
        { ask: "Модификатор «без объекта, у класса»", answer: "static", tip: "public static void main" },
      ],
    },
    {
      id: "parse",
      name: "Parse",
      blurb: "Текст → структура",
      learn: true,
      lessons: [
        {
          title: "Что такое парсинг",
          points: [
            "Парсинг — разобрать сырой текст/байты в понятную структуру.",
            "Пример: строка JSON → объект с полями name, age.",
            "Частые форматы: JSON, CSV, XML, HTML, лог-строки.",
          ],
          tip: "Сначала узнай формат, потом разбирай.",
        },
        {
          title: "JSON — база",
          points: [
            "Объект: { \"name\": \"Ann\", \"age\": 10 }",
            "Массив: [1, 2, 3] или [ {…}, {…} ]",
            "Ключи в кавычках. Типы: строка, число, true/false, null, объект, массив.",
          ],
          tip: "JSON — самый частый ответ API.",
        },
        {
          title: "PowerShell: JSON",
          points: [
            "Текст → объект: $j | ConvertFrom-Json",
            "Объект → текст: $obj | ConvertTo-Json",
            "Потом обращайся к полям: $j.name",
          ],
          tip: "ConvertFrom-Json — «сделай объект из JSON».",
        },
        {
          title: "CSV и поиск в тексте",
          points: [
            "CSV — таблица в тексте: столбцы через запятую, строки через Enter.",
            "Import-Csv file.csv — строки как объекты.",
            "Select-String -Pattern \"error\" — найти строки по шаблону (regex).",
          ],
          tip: "CSV удобен для отчётов и экспорта.",
        },
        {
          title: "Regex — минимум",
          points: [
            "Regex = шаблон поиска: цифры \\d, слово \\w, любое . , повтор + *",
            "Пример: \\d{3} — ровно 3 цифры.",
            "Не гонись за сложностью: сначала простой паттерн, потом уточняй.",
          ],
          tip: "Regex ищет/вырезает куски из текста.",
        },
      ],
      drills: [
        { ask: "Разбор текста в структуру — термин", answer: "parse", alts: ["parsing", "парсинг"], tip: "parse = разобрать" },
        { ask: "Формат API: объект в фигурных скобках", answer: "json", tip: "{ \"key\": \"value\" }" },
        { ask: "PS: JSON-текст → объект", answer: "convertfrom-json", alts: ["convertfrom-json"], tip: "$s | ConvertFrom-Json" },
        { ask: "PS: объект → JSON-текст", answer: "convertto-json", tip: "$obj | ConvertTo-Json" },
        { ask: "Таблица в тексте через запятые — формат", answer: "csv", tip: "name,age" },
        { ask: "PS: прочитать CSV в объекты", answer: "import-csv", tip: "Import-Csv file.csv" },
        { ask: "PS: поиск по шаблону в тексте", answer: "select-string", alts: ["sls"], tip: "Select-String -Pattern …" },
        { ask: "Шаблон поиска в тексте — термин", answer: "regex", alts: ["regexp", "regular expression"], tip: "\\d = цифра" },
        { ask: "В JSON: список значений в квадратных скобках", answer: "array", alts: ["массив"], tip: "[1, 2, 3]" },
        { ask: "В JSON: null означает…", answer: "null", alts: ["пусто", "ничего", "none"], tip: "явное «нет значения»" },
        { ask: "Ключи в JSON обычно в…", answer: "quotes", alts: ["кавычки", "двойные кавычки", "\"\""], tip: "\"name\": …" },
        { ask: "XML/HTML: кусок между тегами называют…", answer: "element", alts: ["элемент", "tag", "тег"], tip: "<name>Ann</name>" },
      ],
    },
    {
      id: "http",
      name: "HTTP",
      blurb: "Веб-запросы",
      learn: true,
      lessons: [
        {
          title: "Что такое HTTP-запрос",
          points: [
            "Клиент (браузер/скрипт) шлёт запрос → сервер отвечает.",
            "URL: схема + хост + путь, напр. https://api.example.com/users",
            "Ответ: статус (200/404…) + заголовки + тело (часто JSON).",
          ],
          tip: "Запрос = «что хочу», ответ = «что вернули».",
        },
        {
          title: "Методы: GET и POST",
          points: [
            "GET — прочитать/получить данные (без тела или с query ?id=1).",
            "POST — отправить данные на сервер (тело запроса).",
            "Ещё: PUT/PATCH — обновить, DELETE — удалить (как у REST API).",
          ],
          tip: "GET = взять, POST = отправить.",
        },
        {
          title: "Коды ответа",
          points: [
            "2xx — ок. 200 OK — успех.",
            "4xx — ошибка клиента: 404 не найдено, 401 нужна авторизация, 403 запрещено.",
            "5xx — ошибка сервера: 500 internal error.",
          ],
          tip: "Сначала смотри Status Code.",
        },
        {
          title: "PowerShell: веб-запросы",
          points: [
            "Invoke-WebRequest — полный ответ (статус, заголовки, Content).",
            "Invoke-RestMethod — сразу разберёт JSON в объект (удобно для API).",
            "Пример: Invoke-RestMethod -Uri https://api.example.com/users",
          ],
          tip: "iwr / irm — короткие алиасы.",
        },
        {
          title: "curl и заголовки",
          points: [
            "curl URL — простой GET из терминала (есть в Win10+).",
            "Заголовок Authorization часто несёт токен доступа.",
            "Content-Type: application/json — тело в формате JSON.",
          ],
          tip: "Заголовки = метаданные запроса/ответа.",
        },
      ],
      drills: [
        { ask: "Протокол веб-запросов браузера/API", answer: "http", alts: ["https"], tip: "HyperText Transfer Protocol" },
        { ask: "Метод: получить данные", answer: "get", tip: "GET /users" },
        { ask: "Метод: отправить данные на сервер", answer: "post", tip: "POST + body" },
        { ask: "Метод REST: удалить ресурс", answer: "delete", tip: "DELETE /users/1" },
        { ask: "Успешный код ответа", answer: "200", alts: ["200 ok"], tip: "2xx = ok" },
        { ask: "Код: страница/ресурс не найден", answer: "404", tip: "Not Found" },
        { ask: "Код: нужна авторизация", answer: "401", alts: ["401 unauthorized"], tip: "Unauthorized" },
        { ask: "PS: запрос к API с разбором JSON", answer: "invoke-restmethod", alts: ["irm"], tip: "Invoke-RestMethod -Uri …" },
        { ask: "PS: полный HTTP-ответ (статус, headers, content)", answer: "invoke-webrequest", alts: ["iwr"], tip: "Invoke-WebRequest -Uri …" },
        { ask: "Утилита CLI для HTTP-запроса", answer: "curl", tip: "curl https://…" },
        { ask: "Заголовок с токеном доступа часто называется", answer: "authorization", alts: ["authorization:", "auth"], tip: "Authorization: Bearer …" },
        { ask: "Тип тела JSON в заголовке Content-Type", answer: "application/json", alts: ["application/json; charset=utf-8"], tip: "Content-Type: application/json" },
      ],
    },
  ];

  const ACHIEVEMENTS = [
    { id: "boot", name: "boot.ok", desc: "Первый вход в OPS", check: (s) => (s.runs || 0) >= 1 },
    { id: "warm", name: "warm.cache", desc: "5 прогонов", check: (s) => (s.runs || 0) >= 5 },
    { id: "perfect", name: "clean.exit", desc: "Идеальный 10/10", check: (s) => (s.perfects || 0) >= 1 },
    { id: "perfect3", name: "triple.clean", desc: "3 идеальных прогона", check: (s) => (s.perfects || 0) >= 3 },
    { id: "cats", name: "full.map", desc: "Все категории ≥1 раз", check: (s) => CATEGORIES.every((c) => (s.catRuns || {})[c.id] >= 1) },
    { id: "sql1", name: "sql.select", desc: "Прогон SQL", check: (s) => (s.catRuns || {}).sql >= 1 },
    { id: "java1", name: "java.main", desc: "Прогон Java", check: (s) => (s.catRuns || {}).java >= 1 },
    { id: "parse1", name: "parse.json", desc: "Прогон Parse", check: (s) => (s.catRuns || {}).parse >= 1 },
    { id: "http1", name: "http.get", desc: "Прогон HTTP", check: (s) => (s.catRuns || {}).http >= 1 },
    { id: "xp200", name: "xp.200", desc: "Набрать 200 XP", check: (s) => (s.xp || 0) >= 200 },
    { id: "senior", name: "senior.ops", desc: "Ранг senior.ops+", check: (s) => (s.xp || 0) >= 280 },
  ];

  let state = loadState();
  let run = null;
  let unlocked = false;
  let timerId = 0;
  let lessonIndex = 0;
  let pendingCat = null;

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
        lessonsSeen: raw.lessonsSeen && typeof raw.lessonsSeen === "object" ? raw.lessonsSeen : {},
      };
    } catch {
      return {
        xp: 0, runs: 0, perfects: 0, bestMs: null, catRuns: {}, achievements: [], lastCat: "files", lessonsSeen: {},
      };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(OPS_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }

  function rankFor(xp) {
    let cur = RANKS[0];
    RANKS.forEach((r) => { if (xp >= r.min) cur = r; });
    return cur;
  }

  function norm(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/;/g, "")
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
      lesson: document.getElementById("opsLesson"),
      cats: document.getElementById("opsCats"),
      rank: document.getElementById("opsRank"),
      xp: document.getElementById("opsXp"),
      ach: document.getElementById("opsAch"),
      ask: document.getElementById("opsAsk"),
      tip: document.getElementById("opsTip"),
      hintBox: document.getElementById("opsHintBox"),
      input: document.getElementById("opsInput"),
      meta: document.getElementById("opsMeta"),
      timer: document.getElementById("opsTimer"),
      log: document.getElementById("opsLog"),
      progress: document.getElementById("opsProgress"),
      lessonTitle: document.getElementById("opsLessonTitle"),
      lessonBody: document.getElementById("opsLessonBody"),
      lessonTip: document.getElementById("opsLessonTip"),
      lessonStep: document.getElementById("opsLessonStep"),
    };
  }

  function setUnlocked(v) {
    unlocked = !!v;
    try { localStorage.setItem(`${OPS_KEY}-on`, unlocked ? "1" : "0"); } catch { /* ignore */ }
  }

  function formatMs(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = 0;
    }
  }

  function startTimer() {
    stopTimer();
    const e = els();
    const tick = () => {
      if (!run || run.done) return;
      if (e.timer) e.timer.textContent = formatMs(Date.now() - run.startedAt);
    };
    tick();
    timerId = setInterval(tick, 250);
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

  function hidePanels() {
    const e = els();
    if (e.hub) e.hub.classList.add("hidden");
    if (e.drill) e.drill.classList.add("hidden");
    if (e.lesson) e.lesson.classList.add("hidden");
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
    stopTimer();
    run = null;
    pendingCat = null;
    document.body.classList.remove("ops-on");
    if (e.shell) e.shell.classList.add("hidden");
  }

  function showHub() {
    stopTimer();
    hidePanels();
    const e = els();
    if (e.hub) e.hub.classList.remove("hidden");
  }

  function showDrill() {
    hidePanels();
    const e = els();
    if (e.drill) e.drill.classList.remove("hidden");
  }

  function showLesson() {
    hidePanels();
    const e = els();
    if (e.lesson) e.lesson.classList.remove("hidden");
  }

  function renderHub() {
    const e = els();
    const rank = rankFor(state.xp);
    if (e.rank) e.rank.textContent = rank.name;
    if (e.xp) e.xp.textContent = String(state.xp);
    if (e.cats) {
      e.cats.innerHTML = CATEGORIES.map((c) => {
        const n = (state.catRuns || {})[c.id] || 0;
        const tag = c.learn ? "learn+drill" : "drill";
        return `<button type="button" class="ops-cat" data-ops-cat="${c.id}">
          <span class="ops-cat-id">${c.name}</span>
          <span class="ops-cat-blurb">${c.blurb}</span>
          <span class="ops-cat-stat">${tag} · runs:${n}</span>
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

  function renderLesson() {
    const e = els();
    const cat = pendingCat;
    if (!cat || !cat.lessons) return;
    const lesson = cat.lessons[lessonIndex];
    if (e.lessonStep) e.lessonStep.textContent = `${lessonIndex + 1}/${cat.lessons.length}`;
    if (e.lessonTitle) e.lessonTitle.textContent = lesson.title;
    if (e.lessonBody) {
      e.lessonBody.innerHTML = lesson.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("");
    }
    if (e.lessonTip) e.lessonTip.textContent = lesson.tip || "";
    const nextBtn = document.getElementById("opsLessonNext");
    if (nextBtn) {
      nextBtn.textContent = lessonIndex >= cat.lessons.length - 1 ? "к закреплению →" : "далее →";
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openCategory(catId) {
    const cat = CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0];
    state.lastCat = catId;
    saveState();
    pendingCat = cat;
    if (cat.learn && Array.isArray(cat.lessons) && cat.lessons.length) {
      lessonIndex = 0;
      showLesson();
      renderLesson();
      return;
    }
    beginDrill(catId);
  }

  function beginDrill(catId) {
    const pack = pickDrills(catId);
    run = {
      cat: pack.cat,
      items: pack.items,
      index: 0,
      correct: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      hintLevel: 0,
      log: [],
      done: false,
    };
    if (els().log) els().log.innerHTML = "";
    showDrill();
    startTimer();
    renderQuestion();
  }

  function renderQuestion() {
    const e = els();
    if (!run || run.done) return;
    const item = run.items[run.index];
    run.hintLevel = 0;
    if (e.ask) e.ask.textContent = item.ask;
    if (e.tip) e.tip.textContent = `shell/lang: ${item.shell || item.cat || "—"}`;
    if (e.hintBox) {
      e.hintBox.textContent = "";
      e.hintBox.classList.add("hidden");
    }
    if (e.meta) e.meta.textContent = `${run.cat.name} · ${run.index + 1}/${TOTAL} · ok ${run.correct}`;
    if (e.progress) e.progress.style.width = `${(run.index / TOTAL) * 100}%`;
    if (e.input) {
      e.input.value = "";
      e.input.focus();
    }
    const hintBtn = document.getElementById("opsHintBtn");
    if (hintBtn) hintBtn.textContent = "hint";
  }

  function revealHint() {
    if (!run || run.done) return;
    const item = run.items[run.index];
    const e = els();
    run.hintLevel = Math.min(3, (run.hintLevel || 0) + 1);
    if (run.hintLevel === 1) run.hintsUsed += 1;
    let text = "";
    if (run.hintLevel === 1) {
      text = item.tip || "Подумай про ключевое слово / командлет.";
    } else if (run.hintLevel === 2) {
      const ans = String(item.answer);
      const soft = ans.length <= 3
        ? `${ans[0] || "?"}…`
        : `${ans.slice(0, Math.min(3, ans.length))}… (${ans.length} символов)`;
      text = `мягко: ${soft}`;
    } else {
      text = `ответ: ${item.answer}`;
      if (item.alts && item.alts.length) text += ` · также: ${item.alts.slice(0, 2).join(" | ")}`;
    }
    if (e.hintBox) {
      e.hintBox.textContent = text;
      e.hintBox.classList.remove("hidden");
    }
    const hintBtn = document.getElementById("opsHintBtn");
    if (hintBtn) {
      hintBtn.textContent = run.hintLevel >= 3 ? "hint×3" : `hint×${run.hintLevel}`;
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
    if (run.done) {
      showHub();
      renderHub();
      return;
    }
    const e = els();
    const item = run.items[run.index];
    const typed = (e.input && e.input.value) || "";
    const ok = matchAnswer(typed, item);
    if (ok) run.correct += 1;
    run.log.push({ ask: item.ask, given: typed, answer: item.answer, ok });
    appendLog(`${ok ? "OK" : "NO"} › ${typed || "∅"}${ok ? "" : ` ← ${item.answer}`}`, ok);
    if (run.index + 1 >= TOTAL) {
      finishRun();
      return;
    }
    run.index += 1;
    renderQuestion();
  }

  function finishRun() {
    stopTimer();
    const ms = Date.now() - run.startedAt;
    const perfect = run.correct === TOTAL;
    const hintPenalty = Math.min(6, run.hintsUsed || 0);
    const gained = Math.max(1, run.correct * 2 + (perfect ? 8 : 0) - hintPenalty);
    state.xp += gained;
    state.runs += 1;
    if (perfect) {
      state.perfects += 1;
      if (state.bestMs == null || ms < state.bestMs) state.bestMs = ms;
    }
    if (!state.catRuns) state.catRuns = {};
    state.catRuns[run.cat.id] = (state.catRuns[run.cat.id] || 0) + 1;
    if (run.cat.learn) {
      if (!state.lessonsSeen) state.lessonsSeen = {};
      state.lessonsSeen[run.cat.id] = true;
    }
    const fresh = unlockAchievements();
    saveState();
    run.done = true;
    const e = els();
    if (e.timer) e.timer.textContent = formatMs(ms);
    if (e.meta) e.meta.textContent = `DONE · ${run.correct}/${TOTAL} · ${formatMs(ms)} · +${gained} XP`;
    if (e.progress) e.progress.style.width = "100%";
    if (e.ask) {
      e.ask.textContent = perfect ? `clean.exit — ${run.cat.name}` : `session.end — ${run.correct}/${TOTAL}`;
    }
    if (e.tip) {
      e.tip.textContent = fresh.length
        ? `ACH: ${fresh.map((a) => a.name).join(", ")}`
        : "Enter → hub · время шло без лимита";
    }
    if (e.hintBox) e.hintBox.classList.add("hidden");
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

  function bindMobileEntry() {
    const btn = document.getElementById("opsMobileEntry");
    if (btn) {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        promptUnlock();
      });
    }
    const title = document.getElementById("homeTitle");
    if (title) {
      let taps = 0;
      let resetTimer = 0;
      title.addEventListener("click", () => {
        taps += 1;
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => { taps = 0; }, 900);
        if (taps >= 5) {
          taps = 0;
          promptUnlock();
        }
      });
    }
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
      stopTimer();
      run = null;
      showHub();
      renderHub();
    });

    e.cats?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-ops-cat]");
      if (!btn) return;
      openCategory(btn.dataset.opsCat);
    });

    document.getElementById("opsSubmit")?.addEventListener("click", submitAnswer);
    document.getElementById("opsHintBtn")?.addEventListener("click", revealHint);
    e.input?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        submitAnswer();
      }
      if (ev.key === "Escape") {
        stopTimer();
        run = null;
        showHub();
        renderHub();
      }
    });

    document.getElementById("opsLessonNext")?.addEventListener("click", () => {
      if (!pendingCat) return;
      if (lessonIndex < pendingCat.lessons.length - 1) {
        lessonIndex += 1;
        renderLesson();
      } else {
        beginDrill(pendingCat.id);
      }
    });
    document.getElementById("opsLessonSkip")?.addEventListener("click", () => {
      if (!pendingCat) return;
      beginDrill(pendingCat.id);
    });
    document.getElementById("opsLessonBack")?.addEventListener("click", () => {
      pendingCat = null;
      showHub();
      renderHub();
    });

    bindMobileEntry();
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
