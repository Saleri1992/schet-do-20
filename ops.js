/**
 * OPS DRILL — личный тренажёр (CMD/PS + SQL + Java + Parse + HTTP + docs).
 * Вход: Ctrl+Shift+O или кнопка ⌘ на главной → код `sys.ops`
 */
(function () {
  const OPS_KEY = "schet-ops-drill-v1";
  const UNLOCK_CODE = "sys.ops";
  const TOTAL = 10;
  const IDLE_LIMIT_MS = 60 * 1000;
  const TRACE_LABELS = ["TRACED", "WATCHING", "IDLE LOCK", "LATENCY HIGH", "SIGNAL LOCK", "PROBE ON", "EYES ON", "TRACKED"];

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
      intro: "Работа с папками и файлами в CMD и PowerShell. В PS многие привычные команды — алиасы на Verb-Noun командлеты.",
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
      intro: "Процесс — запущенная программа. Смотри список, ищи по имени, завершай по PID.",
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
      intro: "Служба — фоновый сервис Windows. Можно смотреть статус, стартовать и останавливать.",
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
      intro: "Базовая диагностика сети: IP, ping, DNS, порты, маршруты. Сначала ipconfig/ping, потом глубже.",
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
      intro: "Кто залогинен, какие локальные пользователи и группы, права на файлы (ACL).",
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
      intro: "Имя машины, сводка железа/ОС, переменные среды, диски, журнал событий, планировщик.",
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
      intro: "CMD работает с текстом. PowerShell — с объектами и конвейером. Имена: Verb-Noun (Get-Process).",
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
      intro: "SQL — язык запросов к таблицам. Ниже теория с нуля и шпаргалка команд для закрепления.",
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
      intro: "Java: классы, типы, if/циклы, методы. Читай блоки по порядку — потом drill.",
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
      intro: "Парсинг: JSON, CSV, regex, ConvertFrom-Json / Select-String. Сырой текст → удобные объекты.",
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
      intro: "HTTP: методы, коды ответа, Invoke-RestMethod / curl. Как клиент просит данные у сервера.",
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
        { ask: "Тип тела JSON в заголовке Content-Type", answer: "application/json", alts: ["application/json; charset=utf-8"], tip: "Content-Type: application/json", why: "Это учебный момент — не страшно. Правильно: application/json. Так сервер понимает, что тело — JSON." },
      ],
    },
    {
      id: "inst_cmd",
      name: "Install·CMD",
      blurb: "Установка софта · CMD",
      learn: true,
      intro: "Установка программ из командной строки Windows (CMD): winget, msiexec, chocolatey. Только официальные источники.",
      lessons: [
        {
          title: "Зачем ставить из CMD",
          points: [
            "Удобно повторять установку, скрипты, серверы без «кликов».",
            "Главное правило: брать пакеты из официальных репозиториев (winget/Microsoft Store, проверенный Chocolatey).",
            "Не запускай случайные .exe/.bat из чатов — это не «ускорение», а риск.",
          ],
          tip: "Сначала поиск пакета, потом install.",
        },
        {
          title: "winget — современный способ",
          points: [
            "winget search имя — найти пакет.",
            "winget install Id.Пакета — установить.",
            "winget upgrade --all — обновить всё, что умеет winget.",
            "winget uninstall Id — удалить.",
          ],
          tip: "winget есть в новых Windows 10/11.",
        },
        {
          title: "msiexec и классика",
          points: [
            "msiexec /i setup.msi — установка MSI.",
            "msiexec /x setup.msi — удаление MSI.",
            "where программа — где лежит exe в PATH.",
          ],
          tip: "MSI — формат установщика Windows.",
        },
      ],
      drills: [
        { ask: "Поиск пакета через winget (CMD)", answer: "winget search", shell: "cmd", tip: "winget search chrome", why: "Учебный момент. Правильно: winget search. Сначала ищем пакет, потом ставим." },
        { ask: "Установка через winget (CMD)", answer: "winget install", shell: "cmd", tip: "winget install Package.Id" },
        { ask: "Обновить все пакеты winget", answer: "winget upgrade --all", shell: "cmd", alts: ["winget upgrade -all", "winget upgrade --all"] },
        { ask: "Удалить пакет winget", answer: "winget uninstall", shell: "cmd", alts: ["winget remove"] },
        { ask: "Список установленных (winget)", answer: "winget list", shell: "cmd" },
        { ask: "Установка MSI-файла", answer: "msiexec /i", shell: "cmd", alts: ["msiexec /i"], tip: "msiexec /i setup.msi" },
        { ask: "Удаление MSI", answer: "msiexec /x", shell: "cmd" },
        { ask: "Где лежит программа в PATH (CMD)", answer: "where", shell: "cmd", tip: "where notepad" },
        { ask: "Установка через Chocolatey (если установлен)", answer: "choco install", shell: "cmd", tip: "choco install git -y" },
        { ask: "Тихая установка choco (флаг yes)", answer: "choco install -y", shell: "cmd", alts: ["choco install --yes"] },
        { ask: "Показать справку winget", answer: "winget --help", shell: "cmd", alts: ["winget -?", "winget help"] },
        { ask: "Обновить источники winget", answer: "winget source update", shell: "cmd", alts: ["winget source update"] },
      ],
    },
    {
      id: "inst_ps",
      name: "Install·PS",
      blurb: "Установка · PowerShell",
      learn: true,
      intro: "Установка из PowerShell: winget/iwr, модули Install-Module, пакеты. Те же правила безопасности — только доверенные источники.",
      lessons: [
        {
          title: "PS и установщики",
          points: [
            "Из PowerShell можно вызывать winget так же, как из CMD.",
            "Для модулей PS: Install-Module Имя (часто из PSGallery).",
            "Invoke-WebRequest / iwr — скачать файл (осторожно с URL!).",
          ],
          tip: "Модуль ≠ программа: модуль расширяет сам PowerShell.",
        },
        {
          title: "Модули и выполнение",
          points: [
            "Find-Module имя — найти в галерее.",
            "Install-Module имя — поставить модуль.",
            "Import-Module имя — загрузить в сессию.",
            "Get-InstalledModule — что уже стоит.",
          ],
          tip: "ExecutionPolicy может мешать скриптам — не отключай её «навсегда» без понимания.",
        },
        {
          title: "Пакеты и процессы",
          points: [
            "Start-Process путь\\setup.exe — запустить установщик.",
            "Install-Package (с провайдером) — другой слой пакетного менеджера.",
            "Get-PackageProvider — какие провайдеры доступны.",
          ],
          tip: "Для большинства софта на Win11 достаточно winget.",
        },
      ],
      drills: [
        { ask: "Установить модуль PowerShell", answer: "install-module", shell: "ps", tip: "Install-Module PSReadLine" },
        { ask: "Найти модуль в галерее", answer: "find-module", shell: "ps" },
        { ask: "Импортировать модуль в сессию", answer: "import-module", shell: "ps", alts: ["ipmo"] },
        { ask: "Список установленных модулей", answer: "get-installedmodule", shell: "ps" },
        { ask: "Скачать файл по URL (PS)", answer: "invoke-webrequest", shell: "ps", alts: ["iwr"], tip: "только доверенные URL" },
        { ask: "Запустить установщик .exe (PS)", answer: "start-process", shell: "ps", alts: ["saps"] },
        { ask: "Провайдеры пакетов (PS)", answer: "get-packageprovider", shell: "ps" },
        { ask: "Установка пакета (PS PackageManagement)", answer: "install-package", shell: "ps" },
        { ask: "Политика выполнения скриптов — посмотреть", answer: "get-executionpolicy", shell: "ps" },
        { ask: "winget из PowerShell: установка", answer: "winget install", shell: "ps" },
        { ask: "Обновить справку/справку модулей часто через", answer: "update-help", shell: "ps", tip: "Update-Help" },
        { ask: "Удалить модуль", answer: "uninstall-module", shell: "ps" },
      ],
    },
    {
      id: "inst_linux",
      name: "Install·Linux",
      blurb: "Установка · Linux",
      learn: true,
      intro: "Пакетные менеджеры Linux: apt (Debian/Ubuntu), dnf (Fedora), pacman (Arch), плюс snap/flatpak. sudo — права администратора.",
      lessons: [
        {
          title: "Идея пакетного менеджера",
          points: [
            "Репозиторий = каталог проверенных пакетов дистрибутива.",
            "Сначала обновить список пакетов, потом ставить.",
            "sudo — «сделай от имени администратора» (нужен пароль).",
          ],
          tip: "Команда зависит от дистрибутива.",
        },
        {
          title: "apt (Ubuntu/Debian)",
          points: [
            "sudo apt update — обновить индекс.",
            "sudo apt install имя — поставить.",
            "sudo apt remove имя — убрать.",
            "sudo apt upgrade — обновить установленное.",
          ],
          tip: "update ≠ upgrade: update — списки, upgrade — сами пакеты.",
        },
        {
          title: "dnf / pacman / snap",
          points: [
            "Fedora: sudo dnf install имя",
            "Arch: sudo pacman -S имя",
            "snap install имя · flatpak install … — универсальные магазины поверх дистра.",
          ],
          tip: "Не мешай три способа без нужды — выбери один основной.",
        },
      ],
      drills: [
        { ask: "Ubuntu: обновить списки пакетов", answer: "sudo apt update", shell: "linux", alts: ["apt update"] },
        { ask: "Ubuntu: установить пакет", answer: "sudo apt install", shell: "linux", alts: ["apt install"] },
        { ask: "Ubuntu: удалить пакет", answer: "sudo apt remove", shell: "linux", alts: ["apt remove"] },
        { ask: "Ubuntu: обновить установленные пакеты", answer: "sudo apt upgrade", shell: "linux", alts: ["apt upgrade"] },
        { ask: "Ubuntu: поиск пакета", answer: "apt search", shell: "linux", alts: ["apt-cache search"] },
        { ask: "Fedora: установить пакет", answer: "sudo dnf install", shell: "linux", alts: ["dnf install"] },
        { ask: "Arch: установить пакет", answer: "sudo pacman -s", shell: "linux", alts: ["pacman -s", "sudo pacman -S"] },
        { ask: "Права админа в Linux — команда-префикс", answer: "sudo", shell: "linux", tip: "superuser do" },
        { ask: "Snap: установить", answer: "snap install", shell: "linux", alts: ["sudo snap install"] },
        { ask: "Flatpak: установить", answer: "flatpak install", shell: "linux" },
        { ask: "Показать путь к команде (Linux)", answer: "which", shell: "linux", alts: ["command -v"] },
        { ask: "Инфо о пакете apt", answer: "apt show", shell: "linux", alts: ["apt-cache show"] },
      ],
    },
    {
      id: "device",
      name: "Device",
      blurb: "Устройство, не файлы",
      learn: true,
      intro: "Управление самим устройством: питание, диски как железо, PnP-устройства, сводка ПК. Не путать с копированием файлов.",
      lessons: [
        {
          title: "Устройство ≠ папка",
          points: [
            "Файловая система — файлы и каталоги.",
            "Устройство — железо и службы ОС: диск, батарея, адаптеры, перезагрузка.",
            "Опасные действия (формат диска, отключение устройств) — только осознанно и с бэкапом.",
          ],
          tip: "Сначала смотри (Get-*), потом меняй.",
        },
        {
          title: "Питание и перезагрузка",
          points: [
            "CMD: shutdown /r /t 0 — перезагрузка сейчас.",
            "CMD: shutdown /s /t 0 — выключение.",
            "PS: Restart-Computer · Stop-Computer.",
          ],
          tip: "Сохрани работу перед reboot.",
        },
        {
          title: "Диски и PnP",
          points: [
            "Get-Disk / Get-PhysicalDisk — диски как устройства.",
            "Get-PnpDevice — Plug and Play (USB, сетевые и т.д.).",
            "devmgmt.msc — классический «Диспетчер устройств».",
            "msinfo32 / systeminfo — сводка о машине.",
          ],
          tip: "Get-Volume — тома (буквы); Get-Disk — физика/логика дисков.",
        },
      ],
      drills: [
        { ask: "Перезагрузка сейчас (CMD)", answer: "shutdown /r /t 0", shell: "cmd", alts: ["shutdown /r /t 0"] },
        { ask: "Выключение сейчас (CMD)", answer: "shutdown /s /t 0", shell: "cmd" },
        { ask: "Перезагрузка (PowerShell)", answer: "restart-computer", shell: "ps" },
        { ask: "Выключение (PowerShell)", answer: "stop-computer", shell: "ps" },
        { ask: "Список PnP-устройств (PS)", answer: "get-pnpdevice", shell: "ps" },
        { ask: "Список дисков (PS)", answer: "get-disk", shell: "ps" },
        { ask: "Физические диски (PS)", answer: "get-physicaldisk", shell: "ps" },
        { ask: "Диспетчер устройств (оснастка)", answer: "devmgmt.msc", shell: "cmd", alts: ["devmgmt.msc"] },
        { ask: "Сводка системы (GUI info)", answer: "msinfo32", shell: "cmd" },
        { ask: "Сводка системы (CMD текст)", answer: "systeminfo", shell: "cmd" },
        { ask: "Имя компьютера", answer: "hostname", shell: "both" },
        { ask: "Инфо о ПК (современный PS)", answer: "get-computerinfo", shell: "ps" },
        { ask: "Отчёт батареи (CMD powercfg)", answer: "powercfg /batteryreport", shell: "cmd", alts: ["powercfg /batteryreport"] },
      ],
    },
    {
      id: "backup",
      name: "Backup",
      blurb: "Резервные копии",
      learn: true,
      intro: "Бэкап — копия данных «на потом». Правило 3-2-1: 3 копии, 2 носителя, 1 вне дома. Сначала план, потом команды.",
      lessons: [
        {
          title: "Зачем бэкап",
          points: [
            "Случайное удаление, поломка диска, шифровальщик — без копии больно.",
            "Бэкап ≠ просто «ещё одна папка на том же диске» (диск умер — обе копии умерли).",
            "Проверяй восстановление: копия бесполезна, если не открывается.",
          ],
          tip: "Это учебный раздел — на реальной машине бэкапь важное с взрослыми/по политике.",
        },
        {
          title: "Windows: копирование и архив",
          points: [
            "robocopy источник назначение /E — надёжное копирование деревьев.",
            "Compress-Archive / Expand-Archive — zip в PowerShell.",
            "Copy-Item -Recurse — простое копирование в PS.",
            "wbadmin — встроенный Windows Server Backup (часто на серверах).",
          ],
          tip: "robocopy лучше xcopy для больших зеркал.",
        },
        {
          title: "Linux: tar и rsync",
          points: [
            "tar -czf backup.tar.gz папка — архив gzip.",
            "rsync -a источник/ назначение/ — умная синхронизация.",
            "Timeshift (GUI/CLI) — снимки системы в некоторых дистрах.",
          ],
          tip: "Храни бэкап на другом диске или в облаке.",
        },
      ],
      drills: [
        { ask: "Надёжное копирование дерева (CMD)", answer: "robocopy", shell: "cmd", tip: "robocopy src dst /E" },
        { ask: "Сжать в zip (PowerShell)", answer: "compress-archive", shell: "ps" },
        { ask: "Распаковать zip (PowerShell)", answer: "expand-archive", shell: "ps" },
        { ask: "Копировать папку рекурсивно (PS)", answer: "copy-item -recurse", shell: "ps", alts: ["copy-item -rec", "cpi -recurse"] },
        { ask: "Встроенный бэкап Windows (утилита)", answer: "wbadmin", shell: "cmd", tip: "wbadmin start backup …" },
        { ask: "Linux: создать tar.gz архив", answer: "tar -czf", shell: "linux", alts: ["tar -czf"] },
        { ask: "Linux: умная синхронизация копий", answer: "rsync", shell: "linux", tip: "rsync -a src/ dst/" },
        { ask: "Правило бэкапа: сколько копий минимум в схеме 3-2-1", answer: "3", shell: "concept", tip: "3 копии · 2 носителя · 1 offsite" },
        { ask: "История файлов Windows (понятие)", answer: "file history", alts: ["история файлов"], shell: "concept" },
        { ask: "Снимки системы Linux (часто пакет)", answer: "timeshift", shell: "linux", alts: ["timeshift"] },
        { ask: "Проверка, что бэкап живой — это…", answer: "restore test", alts: ["restore", "тест восстановления", "проверка восстановления"], shell: "concept", tip: "Без проверки копия может быть битой" },
        { ask: "Зеркало папки robocopy (осторожный ключ)", answer: "robocopy /mir", shell: "cmd", alts: ["/mir"], tip: "/MIR удаляет лишнее в назначении — опасно без понимания" },
      ],
    },
    {
      id: "macro_win",
      name: "Macro·Win",
      blurb: "Горячие клавиши Windows",
      learn: true,
      intro: "«Макросы» здесь — сочетания клавиш (hotkeys). Ускоряют работу без мыши. Ответ пиши как Win+E или Ctrl+C.",
      lessons: [
        {
          title: "Что такое макрос/hotkey",
          points: [
            "Hotkey — готовое сочетание клавиш ОС или программы.",
            "Макрос в редакторах — записанная последовательность; в этом тренажёре учим системные сочетания.",
            "Win — клавиша с флагом Windows между Ctrl и Alt.",
          ],
          tip: "Пиши: Win+L · Ctrl+Shift+Esc",
        },
        {
          title: "Окна и система",
          points: [
            "Win+L — блокировка.",
            "Win+D — показать рабочий стол.",
            "Win+E — Проводник.",
            "Win+R — Выполнить.",
            "Win+I — Параметры.",
            "Alt+Tab — переключение окон.",
            "Alt+F4 — закрыть окно.",
            "Win+Tab — представление задач.",
          ],
          tip: "Блокировка Win+L — привычка №1 уходя от ПК.",
        },
        {
          title: "Правка и инструменты",
          points: [
            "Ctrl+C/V/X/Z/A — копировать/вставить/вырезать/отмена/выделить всё.",
            "Ctrl+Shift+Esc — Диспетчер задач напрямую.",
            "Ctrl+Alt+Del — экран безопасности (смена пароля, диспетчер…).",
            "Win+Shift+S — ножницы/фрагмент экрана.",
            "Win+V — журнал буфера обмена.",
            "Win+X — меню опытного пользователя.",
            "Win+Ctrl+D — новый виртуальный рабочий стол.",
          ],
          tip: "Диспетчер задач: Ctrl+Shift+Esc быстрее, чем Ctrl+Alt+Del.",
        },
      ],
      drills: [
        { ask: "Блокировка ПК", answer: "win+l", alts: ["win + l", "windows+l"], tip: "Lock" },
        { ask: "Проводник", answer: "win+e", alts: ["win + e"] },
        { ask: "Окно «Выполнить»", answer: "win+r", alts: ["win + r"] },
        { ask: "Параметры Windows", answer: "win+i", alts: ["win + i"] },
        { ask: "Показать рабочий стол", answer: "win+d", alts: ["win + d"] },
        { ask: "Переключение окон", answer: "alt+tab", alts: ["alt + tab"] },
        { ask: "Закрыть активное окно", answer: "alt+f4", alts: ["alt + f4"] },
        { ask: "Диспетчер задач напрямую", answer: "ctrl+shift+esc", alts: ["ctrl + shift + esc"] },
        { ask: "Снимок области экрана", answer: "win+shift+s", alts: ["win + shift + s"] },
        { ask: "Журнал буфера обмена", answer: "win+v", alts: ["win + v"] },
        { ask: "Копировать", answer: "ctrl+c", alts: ["ctrl + c"] },
        { ask: "Вставить", answer: "ctrl+v", alts: ["ctrl + v"] },
        { ask: "Вырезать", answer: "ctrl+x", alts: ["ctrl + x"] },
        { ask: "Отменить", answer: "ctrl+z", alts: ["ctrl + z"] },
        { ask: "Выделить всё", answer: "ctrl+a", alts: ["ctrl + a"] },
        { ask: "Меню Win+X (power user)", answer: "win+x", alts: ["win + x"] },
        { ask: "Представление задач", answer: "win+tab", alts: ["win + tab"] },
        { ask: "Новый виртуальный стол", answer: "win+ctrl+d", alts: ["win + ctrl + d"] },
        { ask: "Закрыть виртуальный стол", answer: "win+ctrl+f4", alts: ["win + ctrl + f4"] },
        { ask: "Поиск / Пуск быстро", answer: "win", alts: ["win key", "клавиша win"], tip: "одно нажатие Win" },
        { ask: "Закрепить окно слева", answer: "win+left", alts: ["win + left", "win+стрелка влево"] },
        { ask: "Экран безопасности (смена пароля и др.)", answer: "ctrl+alt+del", alts: ["ctrl + alt + del", "ctrl+alt+delete"] },
      ],
    },
    {
      id: "macro_linux",
      name: "Macro·Linux",
      blurb: "Горячие клавиши Linux",
      learn: true,
      intro: "Hotkeys в GNOME/KDE/типичных дистрах. Super = клавиша Win. Ответ: Ctrl+Alt+T и т.п.",
      lessons: [
        {
          title: "Super и терминал",
          points: [
            "Super — аналог Win-клавиши.",
            "Ctrl+Alt+T — терминал (очень часто в Ubuntu/GNOME).",
            "Alt+F2 — командная строка «выполнить» (GNOME).",
            "Super+L или Ctrl+Alt+L — блокировка (зависит от DE).",
          ],
          tip: "DE (GNOME/KDE/XFCE) могут чуть отличаться — учим самые частые.",
        },
        {
          title: "Окна и рабочие столы",
          points: [
            "Alt+Tab — окна.",
            "Super+A / Super — обзор приложений (GNOME).",
            "Ctrl+Alt+←/→ — смена рабочего стола (часто).",
            "Alt+F4 — закрыть окно (как в Windows).",
            "Print / Shift+Print — скриншот.",
          ],
          tip: "Виртуальные столы в Linux — обычная привычка.",
        },
        {
          title: "Терминал: сигналы",
          points: [
            "Ctrl+C — прервать текущую команду (SIGINT).",
            "Ctrl+D — конец ввода / выход из shell (EOF).",
            "Ctrl+L — очистить экран терминала (как clear).",
            "Ctrl+Shift+C/V — копировать/вставить в терминале (не Ctrl+C!).",
            "Ctrl+Z — пауза процесса (SIGTSTP) — потом fg/bg.",
          ],
          tip: "В терминале Ctrl+C ≠ копировать.",
        },
      ],
      drills: [
        { ask: "Открыть терминал (Ubuntu/GNOME часто)", answer: "ctrl+alt+t", alts: ["ctrl + alt + t"] },
        { ask: "Переключение окон", answer: "alt+tab", alts: ["alt + tab"] },
        { ask: "Закрыть окно", answer: "alt+f4", alts: ["alt + f4"] },
        { ask: "Выполнить команду (GNOME)", answer: "alt+f2", alts: ["alt + f2"] },
        { ask: "Блокировка (часто Super+L)", answer: "super+l", alts: ["win+l", "ctrl+alt+l", "super + l"] },
        { ask: "Прервать команду в терминале", answer: "ctrl+c", alts: ["ctrl + c"], tip: "SIGINT — не копирование" },
        { ask: "EOF / выход из shell", answer: "ctrl+d", alts: ["ctrl + d"] },
        { ask: "Очистить экран терминала", answer: "ctrl+l", alts: ["ctrl + l", "clear"] },
        { ask: "Копировать в терминале (GNOME)", answer: "ctrl+shift+c", alts: ["ctrl + shift + c"] },
        { ask: "Вставить в терминале (GNOME)", answer: "ctrl+shift+v", alts: ["ctrl + shift + v"] },
        { ask: "Пауза процесса в терминале", answer: "ctrl+z", alts: ["ctrl + z"] },
        { ask: "Обзор приложений GNOME (часто)", answer: "super+a", alts: ["super + a", "win+a"] },
        { ask: "Скриншот всего экрана (клавиша)", answer: "print", alts: ["prtSc", "prtsc", "printscreen", "print screen"] },
        { ask: "Скриншот области (часто)", answer: "shift+print", alts: ["shift+prtsc", "shift + print"] },
        { ask: "Рабочий стол влево (часто)", answer: "ctrl+alt+left", alts: ["ctrl + alt + left", "ctrl+alt+←"] },
        { ask: "Показать рабочие столы (GNOME часто Super)", answer: "super", alts: ["win", "super key"] },
        { ask: "Тильде: следующий терминал в некоторых DE", answer: "ctrl+alt+t", tip: "главное — запомнить терминал" },
        { ask: "Убить X/сессию жёстко (осторожно, учебный факт)", answer: "ctrl+alt+backspace", alts: ["ctrl + alt + backspace"], tip: "не везде включено; не злоупотреблять" },
      ],
    },
    {
      id: "tech_en",
      name: "Tech·EN",
      blurb: "Технический английский",
      learn: true,
      intro: "Отдельный блок: читать man/docs, логи, ошибки и писать ответы на английском. Без «школьной» грамматики — только IT-лексика и устойчивые фразы.",
      lessons: [
        {
          title: "Зачем Tech English",
          points: [
            "Документация, ошибки, Stack Overflow, GitHub Issues — почти всё на английском.",
            "Команды и флаги сами по себе английские глаголы: copy, remove, list, install.",
            "Цель блока: узнавать слово в логе и уметь сказать короткий ответ по-английски.",
          ],
          tip: "Учи слово + где его встретишь (лог / команда / UI).",
        },
        {
          title: "Глаголы команд",
          points: [
            "list / get / show — показать список.",
            "create / make / new — создать.",
            "remove / delete / erase — удалить.",
            "move / rename / copy — переместить / переименовать / копировать.",
            "install / update / upgrade / uninstall — поставить / обновить / удалить пакет.",
            "start / stop / restart — служба или процесс.",
          ],
          tip: "В PowerShell: Verb-Noun → Get-Process = get + process.",
        },
        {
          title: "Файлы, пути, права",
          points: [
            "file / folder (directory) — файл / папка.",
            "path / directory / root — путь / каталог / корень.",
            "permission / access denied — право / доступ запрещён.",
            "read / write / execute — читать / писать / выполнять.",
            "owner / group / user — владелец / группа / пользователь.",
          ],
          tip: "Access denied = нет прав, не «сломался интернет».",
        },
        {
          title: "Сеть и HTTP",
          points: [
            "host / server / client — хост / сервер / клиент.",
            "request / response — запрос / ответ.",
            "timeout / unreachable / connection refused — таймаут / недоступен / отказ в соединении.",
            "port / firewall / DNS — порт / файрвол / DNS.",
            "upload / download — загрузить на сервер / скачать.",
          ],
          tip: "refused ≠ timeout: отказали сразу vs не дождались.",
        },
        {
          title: "Ошибки и статус",
          points: [
            "error / warning / failed / success — ошибка / предупреждение / сбой / успех.",
            "not found (404) / unauthorized (401) / forbidden (403).",
            "invalid / missing / required — неверно / отсутствует / обязательно.",
            "deprecated — устарело (ещё работает, но лучше не использовать).",
            "issue / bug / fix / workaround — проблема / баг / исправление / обходной путь.",
          ],
          tip: "В логах сначала ищи ERROR / FAILED / denied.",
        },
        {
          title: "Короткие фразы ops",
          points: [
            "Please reboot the server. — Перезагрузите сервер.",
            "Check the logs. — Проверьте логи.",
            "Permission denied. — Недостаточно прав.",
            "Service is down. — Служба не работает.",
            "Disk is full. — Диск заполнен.",
            "Works on my machine. — «У меня работает» (мем, но частая фраза).",
          ],
          tip: "В ответах drill пиши английское слово/фразу.",
        },
      ],
      drills: [
        { ask: "EN: список / показать (глагол команд)", answer: "list", alts: ["get", "show"], tip: "list / get / show", why: "Учебный момент. Часто list, get или show — «показать»." },
        { ask: "EN: удалить", answer: "delete", alts: ["remove", "erase"], tip: "delete / remove" },
        { ask: "EN: создать", answer: "create", alts: ["make", "new"], tip: "create / make" },
        { ask: "EN: скопировать", answer: "copy", tip: "copy" },
        { ask: "EN: переместить", answer: "move", tip: "move" },
        { ask: "EN: переименовать", answer: "rename", tip: "rename" },
        { ask: "EN: установить (пакет/программу)", answer: "install", tip: "install" },
        { ask: "EN: обновить (пакеты/систему)", answer: "update", alts: ["upgrade"], tip: "update / upgrade" },
        { ask: "EN: папка (синоним directory)", answer: "folder", alts: ["directory"], tip: "folder = directory" },
        { ask: "EN: путь к файлу", answer: "path", tip: "path" },
        { ask: "EN: доступ запрещён (частая ошибка)", answer: "access denied", alts: ["permission denied"], tip: "Access denied / Permission denied" },
        { ask: "EN: право / разрешение", answer: "permission", alts: ["permissions"], tip: "permission" },
        { ask: "EN: запрос (HTTP/API)", answer: "request", tip: "request → response" },
        { ask: "EN: ответ (HTTP/API)", answer: "response", tip: "response" },
        { ask: "EN: таймаут (не дождались)", answer: "timeout", tip: "timeout" },
        { ask: "EN: соединение отклонено", answer: "connection refused", alts: ["refused"], tip: "connection refused" },
        { ask: "EN: не найдено (HTTP 404)", answer: "not found", alts: ["404", "404 not found"], tip: "Not Found" },
        { ask: "EN: нужна авторизация (HTTP 401)", answer: "unauthorized", alts: ["401", "401 unauthorized"], tip: "Unauthorized" },
        { ask: "EN: запрещено (HTTP 403)", answer: "forbidden", alts: ["403", "403 forbidden"], tip: "Forbidden" },
        { ask: "EN: ошибка", answer: "error", tip: "error" },
        { ask: "EN: сбой / не удалось", answer: "failed", alts: ["failure"], tip: "failed" },
        { ask: "EN: успех", answer: "success", alts: ["successful", "ok"], tip: "success" },
        { ask: "EN: предупреждение", answer: "warning", tip: "warning" },
        { ask: "EN: журнал / логи", answer: "log", alts: ["logs"], tip: "check the logs" },
        { ask: "EN: перезагрузить", answer: "reboot", alts: ["restart"], tip: "reboot / restart" },
        { ask: "EN: служба не работает (коротко)", answer: "service is down", alts: ["service down", "down"], tip: "Service is down" },
        { ask: "EN: диск заполнен", answer: "disk is full", alts: ["disk full"], tip: "Disk is full" },
        { ask: "EN: скачать с сервера/сети", answer: "download", tip: "download ≠ upload" },
        { ask: "EN: загрузить на сервер", answer: "upload", tip: "upload" },
        { ask: "EN: файрвол / межсетевой экран", answer: "firewall", tip: "firewall" },
        { ask: "EN: порт (сетевой)", answer: "port", tip: "port" },
        { ask: "EN: устаревшее API/функция", answer: "deprecated", tip: "deprecated" },
        { ask: "EN: обходной путь (временный)", answer: "workaround", tip: "workaround" },
        { ask: "EN: исправление бага", answer: "fix", alts: ["bugfix", "patch"], tip: "fix / patch" },
        { ask: "Перевод: Permission denied → RU (кратко)", answer: "доступ запрещен", alts: ["нет прав", "отказано в доступе", "доступ запрещён", "permission denied"], tip: "нет прав" },
        { ask: "Перевод: Check the logs → RU", answer: "проверьте логи", alts: ["проверь логи", "смотрите логи", "посмотри логи"], tip: "проверьте логи" },
      ],
    },
    {
      id: "scen_ssh",
      name: "Scen·SSH",
      blurb: "Сценарий: SSH по ключу",
      learn: true,
      scenario: true,
      intro: "Пошаговый сценарий: ключ → копирование на remote → вход. Учебный playbook для своего сервера/лабы.",
      lessons: [
        {
          title: "Цель сценария",
          points: [
            "Сделать вход по SSH-ключу без пароля на каждый раз.",
            "Порядок: сгенерировать пару → отдать публичный ключ на сервер → проверить ssh user@host.",
            "Приватный ключ (~/.ssh/id_*) никому не отправляй. На remote кладётся только .pub.",
          ],
          tip: "Шаги идут по порядку — это не случайный drill.",
        },
        {
          title: "Права и служба",
          points: [
            "~/.ssh → обычно 700, authorized_keys → 600.",
            "На сервере должен работать sshd (OpenSSH Server).",
            "Windows: OpenSSH Client/Server можно поставить через Optional Features / winget.",
          ],
          tip: "Permission denied на ключе — почти всегда права или owner.",
        },
      ],
      drills: [
        { ask: "Шаг 1. Сгенерировать ключ Ed25519", answer: "ssh-keygen -t ed25519", alts: ["ssh-keygen -t ed25519 -c", "ssh-keygen"], shell: "linux", tip: "ssh-keygen -t ed25519" },
        { ask: "Шаг 2. Показать публичный ключ (Linux)", answer: "cat ~/.ssh/id_ed25519.pub", alts: ["cat ~/.ssh/id_rsa.pub", "cat .ssh/id_ed25519.pub"], shell: "linux" },
        { ask: "Шаг 3. Скопировать ключ на remote (удобная утилита)", answer: "ssh-copy-id", alts: ["ssh-copy-id user@host", "ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host"], shell: "linux", tip: "ssh-copy-id user@host" },
        { ask: "Шаг 4. Войти на remote по SSH", answer: "ssh user@host", alts: ["ssh", "ssh user@server"], shell: "linux", tip: "ssh user@host" },
        { ask: "Шаг 5. Права на каталог .ssh (числовой режим)", answer: "chmod 700 ~/.ssh", alts: ["chmod 700 .ssh", "chmod 700 ~/.ssh"], shell: "linux" },
        { ask: "Шаг 6. Права на authorized_keys", answer: "chmod 600 ~/.ssh/authorized_keys", alts: ["chmod 600 .ssh/authorized_keys"], shell: "linux" },
        { ask: "Шаг 7. Статус sshd (systemd)", answer: "systemctl status ssh", alts: ["systemctl status sshd", "sudo systemctl status ssh", "sudo systemctl status sshd"], shell: "linux" },
        { ask: "Шаг 8. Запустить sshd (systemd)", answer: "sudo systemctl start ssh", alts: ["sudo systemctl start sshd", "systemctl start ssh", "systemctl start sshd"], shell: "linux" },
        { ask: "Шаг 9. Подключение с подробным логом", answer: "ssh -v user@host", alts: ["ssh -v", "ssh -vv user@host"], shell: "linux", tip: "-v = verbose" },
        { ask: "Шаг 10. Файл локальных алиасов хостов SSH", answer: "~/.ssh/config", alts: [".ssh/config", "ssh config"], shell: "linux", tip: "Host myserver → HostName/User/IdentityFile" },
      ],
    },
    {
      id: "scen_backup",
      name: "Scen·Backup",
      blurb: "Сценарий: бэкап папки",
      learn: true,
      scenario: true,
      intro: "Простой playbook: куда копируем → архив/robocopy → проверка.",
      lessons: [
        {
          title: "План бэкапа",
          points: [
            "Выбери источник и назначение на другом диске/хосте.",
            "Сделай копию (robocopy / rsync / Compress-Archive).",
            "Проверь, что файлы на месте (dir / ls / Expand test).",
          ],
          tip: "Копия на том же единственном диске — слабый бэкап.",
        },
      ],
      drills: [
        { ask: "Шаг 1. Надёжное копирование дерева (Windows)", answer: "robocopy", shell: "cmd", tip: "robocopy src dst /E" },
        { ask: "Шаг 2. Ключ robocopy: включая подпапки", answer: "robocopy /e", alts: ["/e", "robocopy src dst /e"], shell: "cmd" },
        { ask: "Шаг 3. Сжать папку в zip (PS)", answer: "compress-archive", shell: "ps" },
        { ask: "Шаг 4. Linux: архив tar.gz", answer: "tar -czf", alts: ["tar -czf backup.tar.gz folder"], shell: "linux" },
        { ask: "Шаг 5. Linux: синхронизация копии", answer: "rsync", alts: ["rsync -a src/ dst/"], shell: "linux" },
        { ask: "Шаг 6. Распаковать zip (PS) для проверки", answer: "expand-archive", shell: "ps" },
        { ask: "Шаг 7. Правило: сколько копий в схеме 3-2-1", answer: "3", shell: "concept" },
        { ask: "Шаг 8. Обязательная проверка бэкапа — термин EN", answer: "restore test", alts: ["restore", "тест восстановления"], shell: "concept" },
      ],
    },
    {
      id: "scen_net",
      name: "Scen·Net",
      blurb: "Сценарий: сеть не работает",
      learn: true,
      scenario: true,
      intro: "Триаж сети по порядку: IP → ping → DNS → порт.",
      lessons: [
        {
          title: "Порядок диагностики",
          points: [
            "1) Есть ли IP (ipconfig / Get-NetIPAddress).",
            "2) Пинг шлюза/интернета.",
            "3) DNS (nslookup / Resolve-DnsName).",
            "4) Порт/маршрут (Test-NetConnection / tracert).",
          ],
          tip: "Не прыгай сразу в «переустановить Windows».",
        },
      ],
      drills: [
        { ask: "Шаг 1. IP-конфиг (CMD)", answer: "ipconfig", alts: ["ipconfig /all"], shell: "cmd" },
        { ask: "Шаг 2. Проверка связи (CMD)", answer: "ping", shell: "cmd" },
        { ask: "Шаг 3. DNS-запрос (CMD)", answer: "nslookup", shell: "cmd" },
        { ask: "Шаг 4. Трассировка (CMD)", answer: "tracert", shell: "cmd" },
        { ask: "Шаг 5. Открытые соединения (CMD)", answer: "netstat", alts: ["netstat -ano"], shell: "cmd" },
        { ask: "Шаг 6. Проверка хоста/порта (PS)", answer: "test-netconnection", alts: ["tnc"], shell: "ps" },
        { ask: "Шаг 7. DNS в PowerShell", answer: "resolve-dnsname", shell: "ps" },
        { ask: "Шаг 8. IP-адреса (PS)", answer: "get-netipaddress", shell: "ps" },
      ],
    },
    {
      id: "scen_svc",
      name: "Scen·Svc",
      blurb: "Сценарий: служба упала",
      learn: true,
      scenario: true,
      intro: "Найти службу → статус → старт/рестарт → проверить процессы/логи.",
      lessons: [
        {
          title: "Безопасный рестарт",
          points: [
            "Сначала Get-Service / sc query — понять имя и статус.",
            "Restart-Service или Stop + Start.",
            "Если снова падает — смотри логи, не крути рестарт в цикле.",
          ],
          tip: "Имя службы ≠ отображаемое DisplayName.",
        },
      ],
      drills: [
        { ask: "Шаг 1. Список служб (PS)", answer: "get-service", alts: ["gsv"], shell: "ps" },
        { ask: "Шаг 2. Статус через sc (CMD)", answer: "sc query", shell: "cmd" },
        { ask: "Шаг 3. Запустить службу (PS)", answer: "start-service", alts: ["sasv"], shell: "ps" },
        { ask: "Шаг 4. Остановить службу (PS)", answer: "stop-service", alts: ["spsv"], shell: "ps" },
        { ask: "Шаг 5. Перезапустить службу (PS)", answer: "restart-service", shell: "ps" },
        { ask: "Шаг 6. Список процессов (PS)", answer: "get-process", alts: ["gps"], shell: "ps" },
        { ask: "Шаг 7. Журнал событий (современный PS)", answer: "get-winevent", shell: "ps" },
        { ask: "Шаг 8. Запущенные службы через net", answer: "net start", shell: "cmd" },
      ],
    },
    {
      id: "scen_web",
      name: "Scen·Web",
      blurb: "Сценарий: запрос + JSON",
      learn: true,
      scenario: true,
      intro: "Склееный сценарий HTTP + Parse: запрос → статус → JSON → поле.",
      lessons: [
        {
          title: "Мини-пайплайн",
          points: [
            "Invoke-RestMethod / curl → получить данные.",
            "Смотри код 200 / 401 / 404.",
            "ConvertFrom-Json если пришёл текст.",
            "Достань поле объекта ($j.name).",
          ],
          tip: "Для API удобнее irm, для «сырого» ответа — iwr.",
        },
      ],
      drills: [
        { ask: "Шаг 1. Метод «получить данные»", answer: "get", shell: "concept" },
        { ask: "Шаг 2. PS: API с разбором JSON", answer: "invoke-restmethod", alts: ["irm"], shell: "ps" },
        { ask: "Шаг 3. Успешный HTTP-код", answer: "200", alts: ["200 ok"], shell: "concept" },
        { ask: "Шаг 4. CLI-утилита HTTP", answer: "curl", shell: "both" },
        { ask: "Шаг 5. Текст JSON → объект (PS)", answer: "convertfrom-json", shell: "ps" },
        { ask: "Шаг 6. Объект → JSON-текст (PS)", answer: "convertto-json", shell: "ps" },
        { ask: "Шаг 7. Content-Type для JSON", answer: "application/json", shell: "concept" },
        { ask: "Шаг 8. Заголовок с токеном", answer: "authorization", alts: ["authorization:"], shell: "concept" },
      ],
    },
  ];

  const FX_STYLE = [
    { t: "ACCESS GRANTED", sub: "session unlocked" },
    { t: "PASSWORD FOUND", sub: "auth bypass" },
    { t: "CRACKED ★", sub: "cipher broken" },
    { t: "HASH MATCH 100%", sub: "digest ok" },
    { t: "DECRYPT OK", sub: "payload clear" },
    { t: "ROOT SHELL", sub: "uid=0" },
    { t: "KEYCHECK PASS", sub: "license ok" },
    { t: "TRACE COMPLETE", sub: "route mapped" },
    { t: "FIREWALL OPEN", sub: "port clear" },
    { t: "PAYLOAD READY", sub: "stage 2" },
  ];

  const FX_ACTION_RULES = [
    { re: /copy|скопир|xcopy|robocopy|copy-item|\bcpi\b/, t: "COPIED", sub: "object duplicated" },
    { re: /delete|удал|erase|remove-item|\bri\b|\brm\b|\bdel\b/, t: "DELETED", sub: "object removed" },
    { re: /move|перемест|move-item|\bmi\b|\bmv\b/, t: "MOVED", sub: "path updated" },
    { re: /rename|переимен|\bren\b|rename-item|\brni\b/, t: "RENAMED", sub: "name updated" },
    { re: /mkdir|\bmd\b|new-item.*directory|создать папк/, t: "CREATED", sub: "directory ok" },
    { re: /install|winget install|apt install|choco install|install-module|install-package|dnf install|pacman -s|snap install|flatpak install/, t: "INSTALLED", sub: "package ok" },
    { re: /uninstall|apt remove|msiexec \/x|winget uninstall|remove package|удалить пакет/, t: "UNINSTALLED", sub: "package gone" },
    { re: /upgrade|обнов/, t: "UPGRADED", sub: "packages fresh" },
    { re: /backup|бэкап|compress-archive|rsync|tar -czf|wbadmin|file history|timeshift/, t: "BACKED UP", sub: "copy secured" },
    { re: /expand-archive|распак/, t: "EXTRACTED", sub: "archive open" },
    { re: /restart|reboot|перезагруз|shutdown \/r/, t: "REBOOTED", sub: "system restart" },
    { re: /shutdown \/s|выключ|stop-computer|power off/, t: "POWER OFF", sub: "system halt" },
    { re: /ping|test-connection|test-netconnection|проверк.*связ/, t: "REACHABLE", sub: "host alive" },
    { re: /ipconfig|get-netip|nslookup|resolve-dns|tracert|netstat|get-nettcp/, t: "NET OK", sub: "link checked" },
    { re: /tasklist|get-process|список процесс/, t: "LISTED", sub: "process table" },
    { re: /taskkill|stop-process|\bkill\b/, t: "TERMINATED", sub: "pid stopped" },
    { re: /start-service|запустить служб/, t: "SERVICE UP", sub: "daemon running" },
    { re: /stop-service|остановить служб/, t: "SERVICE DOWN", sub: "daemon stopped" },
    { re: /restart-service/, t: "SERVICE RESTART", sub: "daemon cycled" },
    { re: /\bselect\b|\bfrom\b|order by|\bwhere\b|\bjoin\b/, t: "QUERY OK", sub: "rows returned" },
    { re: /\binsert\b|\bupdate\b|\bdelete from\b/, t: "COMMITTED", sub: "rows changed" },
    { re: /invoke-restmethod|invoke-webrequest|\bcurl\b|\bget\b.*http|\bpost\b|authorization|application\/json/, t: "200 OK", sub: "response in" },
    { re: /convertfrom-json|convertto-json|import-csv|select-string|parse|regex|json/, t: "PARSED", sub: "structure ok" },
    { re: /win\+|ctrl\+|alt\+|super\+|hotkey|macro|блокиров|проводн|диспетчер задач/, t: "HOTKEY OK", sub: "shortcut matched" },
    { re: /get-content|\btype\b|прочитать файл|содержим/, t: "READ", sub: "stream open" },
    { re: /cd\b|set-location|chdir|сменить каталог/, t: "CD OK", sub: "cwd changed" },
    { re: /\bdir\b|get-childitem|\bgci\b|\bls\b|список файл/, t: "LISTED", sub: "directory listing" },
    { re: /whoami|get-localuser|net user|get-acl|icacls/, t: "IDENTITY OK", sub: "principal known" },
    { re: /hostname|systeminfo|get-computerinfo|msinfo32|get-disk|get-pnpdevice|devmgmt/, t: "DEVICE OK", sub: "hardware seen" },
    { re: /\bmain\b|\bint\b|string|boolean|\bfor\b|\bwhile\b|java/, t: "COMPILE OK", sub: "syntax clear" },
    { re: /sudo apt update|apt update|source update/, t: "INDEX UPDATED", sub: "repos synced" },
    { re: /tech·en|tech_en|tech english|permission denied|access denied|workaround|deprecated/, t: "TERM OK", sub: "lexicon hit" },
  ];

  const FX_CAT_DEFAULT = {
    files: { t: "FILE OPS", sub: "io complete" },
    proc: { t: "PROC OK", sub: "process layer" },
    svc: { t: "SVC OK", sub: "service layer" },
    net: { t: "NET OPS", sub: "link layer" },
    users: { t: "ACL OK", sub: "identity layer" },
    sys: { t: "SYS OK", sub: "host layer" },
    diff: { t: "MAPPED", sub: "cmd ↔ ps" },
    sql: { t: "SQL OK", sub: "query layer" },
    java: { t: "JAVA OK", sub: "jvm ready" },
    parse: { t: "PARSE OK", sub: "data shaped" },
    http: { t: "HTTP OK", sub: "request done" },
    inst_cmd: { t: "PKG OK", sub: "cmd install" },
    inst_ps: { t: "PKG OK", sub: "ps install" },
    inst_linux: { t: "PKG OK", sub: "linux install" },
    device: { t: "DEVICE OK", sub: "hardware layer" },
    backup: { t: "BACKUP OK", sub: "copy secured" },
    macro_win: { t: "HOTKEY OK", sub: "win shortcut" },
    macro_linux: { t: "HOTKEY OK", sub: "linux shortcut" },
    tech_en: { t: "TERM OK", sub: "tech english" },
    scen_ssh: { t: "SSH OK", sub: "key path done" },
    scen_backup: { t: "BACKUP OK", sub: "playbook done" },
    scen_net: { t: "NET OK", sub: "triage done" },
    scen_svc: { t: "SVC OK", sub: "service path" },
    scen_web: { t: "HTTP OK", sub: "pipeline done" },
  };

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
    { id: "inst1", name: "pkg.install", desc: "Прогон любой Install·*", check: (s) => ["inst_cmd", "inst_ps", "inst_linux"].some((id) => (s.catRuns || {})[id] >= 1) },
    { id: "dev1", name: "device.ops", desc: "Прогон Device", check: (s) => (s.catRuns || {}).device >= 1 },
    { id: "bak1", name: "backup.ok", desc: "Прогон Backup", check: (s) => (s.catRuns || {}).backup >= 1 },
    { id: "mac1", name: "macro.keys", desc: "Прогон Macro·Win или Linux", check: (s) => ["macro_win", "macro_linux"].some((id) => (s.catRuns || {})[id] >= 1) },
    { id: "en1", name: "tech.en", desc: "Прогон Tech·EN", check: (s) => (s.catRuns || {}).tech_en >= 1 },
    { id: "scen1", name: "playbook.ok", desc: "Любой сценарий Scen·*", check: (s) => ["scen_ssh", "scen_backup", "scen_net", "scen_svc", "scen_web"].some((id) => (s.catRuns || {})[id] >= 1) },
    { id: "ssh1", name: "ssh.key", desc: "Сценарий SSH", check: (s) => (s.catRuns || {}).scen_ssh >= 1 },
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
      .replace(/\s*\+\s*/g, "+")
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
    if (cat.scenario) {
      return {
        cat,
        items: cat.drills.map((d) => ({ ...d, cat: cat.id })),
      };
    }
    const pool = shuffle(cat.drills);
    const items = [];
    let i = 0;
    while (items.length < TOTAL) {
      items.push({ ...pool[i % pool.length], cat: cat.id });
      i += 1;
    }
    return { cat, items: shuffle(items).slice(0, TOTAL) };
  }

  function runTotal() {
    return (run && run.items && run.items.length) ? run.items.length : TOTAL;
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
      docs: document.getElementById("opsDocs"),
      docsToc: document.getElementById("opsDocsToc"),
      docsBody: document.getElementById("opsDocsBody"),
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
      explain: document.getElementById("opsExplain"),
      fx: document.getElementById("opsFx"),
      fxBanner: document.getElementById("opsFxBanner"),
      fxSub: document.getElementById("opsFxSub"),
      traceBar: document.getElementById("opsTraceBar"),
      traceLabel: document.getElementById("opsTraceLabel"),
      idleTimer: document.getElementById("opsIdleTimer"),
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
    clearTraceMode();
  }

  function clearTraceMode() {
    const e = els();
    if (e.shell) e.shell.classList.remove("ops-slow");
    if (e.traceBar) e.traceBar.classList.add("hidden");
    if (run) run.traced = false;
  }

  function updateTraceMode() {
    const e = els();
    if (!run || run.done || run.awaitContinue) {
      clearTraceMode();
      return;
    }
    const idle = Date.now() - (run.qStartedAt || run.startedAt);
    if (idle < IDLE_LIMIT_MS) {
      clearTraceMode();
      return;
    }
    if (!run.traced) {
      run.traced = true;
      run.traceLabelAt = Date.now();
    }
    if (e.shell) e.shell.classList.add("ops-slow");
    if (e.traceBar) e.traceBar.classList.remove("hidden");
    if (e.idleTimer) e.idleTimer.textContent = formatMs(idle);
    if (e.traceLabel) {
      const idx = Math.floor((Date.now() - (run.traceLabelAt || Date.now())) / 2500) % TRACE_LABELS.length;
      e.traceLabel.textContent = TRACE_LABELS[idx];
    }
  }

  function startTimer() {
    stopTimer();
    const e = els();
    const tick = () => {
      if (!run || run.done) return;
      if (e.timer) e.timer.textContent = formatMs(Date.now() - run.startedAt);
      updateTraceMode();
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
    if (e.docs) e.docs.classList.add("hidden");
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

  function showDocs() {
    stopTimer();
    hidePanels();
    const e = els();
    if (e.docs) e.docs.classList.remove("hidden");
  }

  function shellLabel(shell) {
    if (shell === "cmd") return "CMD";
    if (shell === "ps") return "PS";
    if (shell === "both") return "CMD/PS";
    if (shell === "linux") return "Linux";
    if (shell === "concept") return "concept";
    return shell || "";
  }

  function renderDocs(focusId) {
    const e = els();
    if (e.docsToc) {
      e.docsToc.innerHTML = CATEGORIES.map((c) =>
        `<button type="button" data-ops-doc="${c.id}" class="${focusId === c.id ? "on" : ""}">${escapeHtml(c.name)}</button>`
      ).join("");
    }
    if (e.docsBody) {
      e.docsBody.innerHTML = CATEGORIES.map((c) => {
        const lessonsHtml = Array.isArray(c.lessons) && c.lessons.length
          ? c.lessons.map((lesson) => `
              <h3>${escapeHtml(lesson.title)}</h3>
              <ul>${lesson.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
              ${lesson.tip ? `<p class="ops-doc-tip">tip: ${escapeHtml(lesson.tip)}</p>` : ""}
            `).join("")
          : "";
        const sheetHtml = `
          <h3>${c.scenario ? "шаги сценария" : "шпаргалка · drill"}</h3>
          <div class="ops-doc-sheet">
            ${c.drills.map((d) => `
              <div class="ops-doc-row">
                <div class="ops-doc-q">${escapeHtml(d.ask)}${d.shell ? ` · ${escapeHtml(shellLabel(d.shell))}` : ""}</div>
                <div class="ops-doc-a">${escapeHtml(d.answer)}${(d.alts && d.alts.length) ? ` · alt: ${escapeHtml(d.alts.join(" | "))}` : ""}</div>
                ${d.tip ? `<div class="ops-doc-note">${escapeHtml(d.tip)}</div>` : ""}
                ${d.why ? `<div class="ops-doc-note">${escapeHtml(d.why)}</div>` : ""}
              </div>
            `).join("")}
          </div>`;
        return `
          <article class="ops-doc-article" id="ops-doc-${c.id}">
            <h2>${escapeHtml(c.name)} <span class="ops-doc-note">· ${escapeHtml(c.blurb)}</span></h2>
            ${c.intro ? `<p class="ops-doc-intro">${escapeHtml(c.intro)}</p>` : ""}
            ${lessonsHtml}
            ${sheetHtml}
          </article>`;
      }).join("");
    }
    showDocs();
    if (focusId) {
      const node = document.getElementById(`ops-doc-${focusId}`);
      if (node && e.docsBody) {
        e.docsBody.scrollTop = Math.max(0, node.offsetTop - e.docsBody.offsetTop - 8);
      }
    } else if (e.docsBody) {
      e.docsBody.scrollTop = 0;
    }
  }

  function renderHub() {
    const e = els();
    const rank = rankFor(state.xp);
    if (e.rank) e.rank.textContent = rank.name;
    if (e.xp) e.xp.textContent = String(state.xp);
    if (e.cats) {
      e.cats.innerHTML = CATEGORIES.map((c) => {
        const n = (state.catRuns || {})[c.id] || 0;
        const tag = c.scenario ? "scenario" : c.learn ? "learn+drill" : "drill";
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
      const last = lessonIndex >= cat.lessons.length - 1;
      nextBtn.textContent = last
        ? (cat.scenario ? "к сценарию →" : "к закреплению →")
        : "далее →";
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
    renderQuestion();
    startTimer();
  }

  function explainWrong(item) {
    if (item.why) return item.why;
    const tip = item.tip ? ` ${item.tip}` : "";
    return `Это учебный момент — не страшно и ничего не сломалось. Правильно: ${item.answer}.${tip}`;
  }

  function showExplain(text) {
    const e = els();
    if (!e.explain) return;
    e.explain.innerHTML = `<strong>Важно:</strong> ${escapeHtml(text)}`;
    e.explain.classList.remove("hidden");
  }

  function hideExplain() {
    const e = els();
    if (!e.explain) return;
    e.explain.textContent = "";
    e.explain.classList.add("hidden");
  }

  function pickFxLine(item, intense) {
    if (intense) {
      return Math.random() < 0.5
        ? { t: "CLEAN EXIT", sub: "10/10 perfect" }
        : FX_STYLE[Math.floor(Math.random() * FX_STYLE.length)];
    }
    const hay = [
      item && item.ask,
      item && item.answer,
      item && (item.alts || []).join(" "),
      item && item.tip,
      item && item.cat,
      run && run.cat && run.cat.id,
      run && run.cat && run.cat.name,
    ].filter(Boolean).join(" ").toLowerCase();
    for (let i = 0; i < FX_ACTION_RULES.length; i += 1) {
      if (FX_ACTION_RULES[i].re.test(hay)) {
        return { t: FX_ACTION_RULES[i].t, sub: FX_ACTION_RULES[i].sub };
      }
    }
    const catId = (item && item.cat) || (run && run.cat && run.cat.id);
    if (catId && FX_CAT_DEFAULT[catId]) return FX_CAT_DEFAULT[catId];
    return FX_STYLE[Math.floor(Math.random() * FX_STYLE.length)];
  }

  function flashFx(intense, item) {
    const e = els();
    if (!e.fx || !e.fxBanner) return;
    const line = pickFxLine(item || {}, intense);
    e.fxBanner.textContent = line.t;
    if (e.fxSub) e.fxSub.textContent = intense && line.t !== "CLEAN EXIT" ? `PERFECT · ${line.sub}` : line.sub;
    e.fx.classList.remove("hidden", "ops-fx-boom");
    void e.fx.offsetWidth;
    e.fx.classList.add("ops-fx-on");
    if (intense) e.fx.classList.add("ops-fx-boom");
    clearTimeout(flashFx._t);
    flashFx._t = setTimeout(() => {
      e.fx.classList.remove("ops-fx-on", "ops-fx-boom");
      e.fx.classList.add("hidden");
    }, intense ? 1600 : 900);
  }

  function advanceQuestion() {
    if (!run || run.done) return;
    if (run.index + 1 >= runTotal()) {
      finishRun();
      return;
    }
    run.index += 1;
    run.awaitContinue = false;
    renderQuestion();
  }

  function renderQuestion() {
    const e = els();
    if (!run || run.done) return;
    const item = run.items[run.index];
    const n = runTotal();
    run.hintLevel = 0;
    run.awaitContinue = false;
    run.qStartedAt = Date.now();
    run.traced = false;
    clearTraceMode();
    hideExplain();
    if (e.ask) e.ask.textContent = item.ask;
    if (e.tip) {
      const sh = shellLabel(item.shell || "");
      const bits = [];
      if (item.tip) bits.push(item.tip);
      if (sh) bits.push(sh);
      if (run.cat && run.cat.scenario) bits.push(`step ${run.index + 1}/${n}`);
      e.tip.textContent = bits.length ? bits.join(" · ") : "введи ответ и Enter";
    }
    if (e.hintBox) {
      e.hintBox.textContent = "";
      e.hintBox.classList.add("hidden");
    }
    if (e.meta) {
      const kind = run.cat && run.cat.scenario ? "SCEN" : "DRILL";
      e.meta.textContent = `${kind} · ${run.cat.name} · ${run.index + 1}/${n} · ok ${run.correct}`;
    }
    if (e.progress) e.progress.style.width = `${(run.index / n) * 100}%`;
    if (e.input) {
      e.input.value = "";
      e.input.disabled = false;
      e.input.focus();
    }
    const hintBtn = document.getElementById("opsHintBtn");
    if (hintBtn) hintBtn.textContent = "hint";
    const submitBtn = document.getElementById("opsSubmit");
    if (submitBtn) submitBtn.textContent = "enter";
  }

  function revealHint() {
    if (!run || run.done || run.awaitContinue) return;
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
    if (run.awaitContinue) {
      advanceQuestion();
      return;
    }
    const e = els();
    const item = run.items[run.index];
    const typed = (e.input && e.input.value) || "";
    const ok = matchAnswer(typed, item);
    if (ok) run.correct += 1;
    run.log.push({ ask: item.ask, given: typed, answer: item.answer, ok });
    appendLog(`${ok ? "OK" : "NO"} › ${typed || "∅"}${ok ? "" : ` ← ${item.answer}`}`, ok);
    if (ok) {
      flashFx(false, item);
      if (run.index + 1 >= runTotal()) {
        finishRun();
        return;
      }
      run.index += 1;
      renderQuestion();
      return;
    }
    run.awaitContinue = true;
    showExplain(explainWrong(item));
    if (e.input) {
      e.input.value = "";
      e.input.disabled = true;
    }
    const submitBtn = document.getElementById("opsSubmit");
    if (submitBtn) submitBtn.textContent = "понял →";
    if (e.tip) e.tip.textContent = "Enter / «понял» — дальше. Это только тренировка.";
  }

  function finishRun() {
    stopTimer();
    const ms = Date.now() - run.startedAt;
    const n = runTotal();
    const perfect = run.correct === n;
    const hintPenalty = Math.min(6, run.hintsUsed || 0);
    const gained = Math.max(1, run.correct * 2 + (perfect ? 8 : 0) - hintPenalty);
    state.xp += gained;
    state.runs += 1;
    if (perfect) {
      state.perfects += 1;
      if (state.bestMs == null || ms < state.bestMs) state.bestMs = ms;
      flashFx(true);
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
    run.awaitContinue = false;
    const e = els();
    hideExplain();
    if (e.timer) e.timer.textContent = formatMs(ms);
    if (e.meta) e.meta.textContent = `DONE · ${run.correct}/${n} · ${formatMs(ms)} · +${gained} XP`;
    if (e.progress) e.progress.style.width = "100%";
    if (e.ask) {
      e.ask.textContent = perfect ? `clean.exit — ${run.cat.name}` : `session.end — ${run.correct}/${n}`;
    }
    if (e.tip) {
      e.tip.textContent = fresh.length
        ? `ACH: ${fresh.map((a) => a.name).join(", ")}`
        : "Enter → hub · время шло без лимита";
    }
    if (e.hintBox) e.hintBox.classList.add("hidden");
    if (e.input) e.input.disabled = false;
    const submitBtn = document.getElementById("opsSubmit");
    if (submitBtn) submitBtn.textContent = "hub";
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

    document.getElementById("opsDocsOpen")?.addEventListener("click", () => renderDocs());
    document.getElementById("opsDocsBack")?.addEventListener("click", () => {
      showHub();
      renderHub();
    });
    e.docsToc?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-ops-doc]");
      if (!btn) return;
      renderDocs(btn.dataset.opsDoc);
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
