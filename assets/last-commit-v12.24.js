(function () {
  "use strict";

  var STORAGE_KEY = "last-commit-v7.6";
  var INTRO_KEY = "last-commit-v12-intro";
  var steps = [
    { text: "保存并关掉工作资料，给电脑接上充电", offset: 0 },
    { text: "离开工作区，想喝的话热杯牛奶", offset: 10 },
    { text: "调暗灯光，去洗漱", offset: 25 },
    { text: "把手机放远，上床准备睡觉", offset: 45 }
  ];
  var defaults = {
    wake: "07:30",
    bed: "23:30",
    off: "22:30",
    sleepGoal: 480,
    theme: "tide",
    dump: "",
    first: "",
    tasks: [],
    clearedTasks: [],
    handedOff: false,
    checks: [false, false, false, false],
    completed: false,
    records: [],
    night: ""
  };
  var themeCats = {
    tide: "assets/pixel-cat/theme-v12.1/pixel-cat-tide-v12.1.png",
    paper: "assets/pixel-cat/theme-v12.1/pixel-cat-paper-v12.1.png",
    plum: "assets/pixel-cat/theme-v12.1/pixel-cat-plum-v12.1.png",
    dawn: "assets/pixel-cat/theme-v12.1/pixel-cat-dawn-v12.1.png"
  };

  var searchParams = new URLSearchParams(location.search);
  var state = loadState();
  var activeReactionTimer = 0;
  var idleTimer = 0;
  var captureTimer = 0;
  var captureApproachTimer = 0;
  var videoHoldTimer = 0;
  var clickTimer = 0;
  var longPressTimer = 0;
  var pointerFrame = 0;
  var speechTimer = 0;
  var savedScrollY = 0;
  var BREATH_ROUNDS = 3;
  var BREATH_PHASES = [
    { id: "inhale", word: "吸", copy: "慢慢吸气", duration: 4000 },
    { id: "hold", word: "停", copy: "停一下", duration: 2000 },
    { id: "exhale", word: "呼", copy: "慢慢呼气", duration: 6000 }
  ];
  var BREATH_ROUND_DURATION = BREATH_PHASES.reduce(function (sum, phase) {
    return sum + phase.duration;
  }, 0);
  var BREATH_TOTAL_DURATION = BREATH_ROUND_DURATION * BREATH_ROUNDS;
  var breathFrame = 0;
  var breathClock = {
    status: "idle",
    elapsedBeforeRun: 0,
    runStartedAt: 0,
    round: 0,
    phase: "",
    remaining: 4
  };
  var messageCount = 0;
  var recentReactions = [];
  var reactionDeck = [];
  var focusDeck = [];
  var actionToken = 0;
  var currentAction = "";
  var currentPriority = 0;
  var longPressFired = false;
  var petReady = false;
  var timePickers = new Map();
  var openTimePicker = null;
  var calendarCursor = null;
  var calendarMoveLocked = false;
  var lastThreshold = "";
  var lastPhaseId = "";
  var lastWorkbenchContext = "";
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var qaMode = searchParams.has("qa");
  var forceMorning = searchParams.get("morning") === "1" || searchParams.get("view") === "morning";

  var petActions = {
    blink: { duration: 4042, priority: 20, status: "BLINK", detail: "one slow look", fx: "blink", lines: ["嗯？我看看。", "看见你啦。"] },
    nod: { duration: 980, priority: 30, status: "ACK", detail: "signal received", fx: "pulse", lines: ["好嘛，咪听见了。", "知道啦，尾巴替我点头。"] },
    walk: { duration: 1750, priority: 20, status: "PATROL", detail: "edge check", fx: "trail", lines: ["这里坐麻了，我去那边走两步。", "我去巡一圈，你接着忙。"] },
    paw: { duration: 4042, priority: 30, status: "PAW", detail: "soft screen tap", fx: "pixels", lines: ["喏，爪子给你碰一下。", "只许碰一下爪垫哦。"] },
    hop: { duration: 4042, priority: 30, status: "STARTLED", detail: "all paws up", fx: "impact", lines: ["鼠标点得好重呀，吓我一跳。", "哎呀，四只脚都被你吓起来了。"] },
    stretch: { duration: 5042, priority: 20, status: "STRETCH", detail: "paws in grid", fx: "wave", lines: ["咪在像素格里伸个懒腰。", "爪尖碰到格子边啦。"] },
    nap: { duration: 6042, priority: 20, status: "NAP", detail: "one short curl", fx: "sleep", lines: ["我先趴一会儿，你忙完叫我。", "咪一下。你还没收工我就醒。"] },
    hide: { duration: 1780, priority: 20, status: "HIDE", detail: "below viewport", fx: "trail", lines: ["我躲到页面下面啦，你找找。", "嘘，我的尾巴还露在外面。"] },
    peek: { duration: 5042, priority: 20, status: "PEEK", detail: "edge patrol", fx: "scan", lines: ["等一下，我去屏幕边上看看。", "边上没东西，我又回来啦。"] },
    glitch: { duration: 1080, priority: 30, status: "GLITCH", detail: "ear pixels loose", fx: "glitch", lines: ["风从屏幕缝里钻进来，毛毛炸了一下。", "耳朵抖太快，掉了两格像素。"] },
    turn: { duration: 1460, priority: 30, status: "TURN", detail: "checking behind", fx: "pixels", lines: ["后面好像有声音，我转过去看看。", "尾巴说那边有动静。"] },
    inspect: { duration: 5042, priority: 30, status: "LISTEN", detail: "tail hears ticks", fx: "scan", lines: ["嘘，秒针在走。我的尾巴听见了。", "刚才是不是又过去了一秒？"] },
    scrub: { duration: 1560, priority: 20, status: "GROOM", detail: "pixel on whisker", fx: "sparks", lines: ["等等，胡子上粘了个小方块。", "舔一下。刚才那格像素有点扎嘴。"] },
    compile: { duration: 1780, priority: 50, status: "TIME WALK", detail: "three stops", fx: "compile", lines: ["你把时间挪好啦，我沿着三格走了一遍。", "收工、睡觉、起床，咪都闻过了。"] },
    packet: { duration: 1420, priority: 50, status: "TASK +1", detail: "under one paw", fx: "packet", lines: ["明早又多一件事，我先拿爪子压住。", "放这儿吧，明早咪先看到它。"] },
    pass: { duration: 1280, priority: 50, status: "DONE", detail: "tail up", fx: "pass", lines: ["这一件打勾啦，尾巴可以翘一下。", "做完一件，爪垫轻松一格。"] },
    rollback: { duration: 1450, priority: 50, status: "BACK", detail: "carried back", fx: "rollback", lines: ["呀，又要做啦？我把它叼回来。", "好嘛，先放回来，别让它跑掉。"] },
    purge: { duration: 1460, priority: 50, status: "CLEAR", detail: "hidden nearby", fx: "purge", lines: ["清单先收起来啦，我藏在垫子底下。", "我先把这些叼走，想起来还能拿回来。"] },
    handoff: { duration: 2100, priority: 60, status: "SAVED", detail: "ready for morning", fx: "commit", lines: ["我记住啦，明早你一来，我就把这页翻给你。", "今晚停在这里，明早咪陪你接着做。"] },
    celebrate: { duration: 2300, priority: 65, status: "ALL DONE", detail: "head pats open", fx: "celebrate", lines: ["都做完啦！这次可以摸摸我的头。", "一件都没有了，咪要把尾巴翘高一点。"] },
    warning: { duration: 1900, priority: 70, status: "TIME", detail: "tail at stop line", fx: "warning", lines: ["到收工的点啦，先把手里这一下做完。", "时间走到脚边了，我来催你收尾。"] },
    theme: { duration: 1450, priority: 45, status: "NEW FUR", detail: "light changed", fx: "theme", lines: ["咦，光变了，我的毛也换了颜色。", "这身新毛好看吗？"] },
    purr: { duration: 2600, priority: 60, status: "PURR", detail: "hold to feel", fx: "purr", lines: ["听见了吗？这是屏幕里最小声的呼噜。", "再按一会儿嘛，咪还没呼噜够。"] },
    reboot: { duration: 2200, priority: 65, status: "DOUBLE TAP", detail: "two clicks at once", fx: "reboot", lines: ["哎呀，连点两下，我都不知道先看哪一下。", "别急嘛，我还在这儿。"] },
    breathe: { duration: 1700, priority: 50, status: "SLOW BREATH", detail: "belly up and down", fx: "purr", lines: ["慢慢来，我用小肚皮陪你呼吸。", "你慢慢呼，咪跟着一起一伏。"] },
    capture: { duration: 8042, priority: 90, status: "MOUSE CAUGHT", detail: "three-second paw hold", fx: "capture", lines: ["抓到啦。数到三再放你。", "这次真抓住了。三、二、一。"] }
  };
  var videoActions = {
    hop: { id: "C01", duration: 4042 },
    stretch: { id: "C02", duration: 5042 },
    paw: { id: "C03", duration: 4042, foreground: true },
    blink: { id: "C04", duration: 4042 },
    peek: { id: "C05", duration: 5042 },
    nap: { id: "C06", duration: 6042 },
    inspect: { id: "C07", duration: 5042 },
    capture: { id: "C08", duration: 5042, foreground: true, holdAt: 2.7, holdFor: 3000 }
  };
  var clickReactionIds = ["blink", "nod", "walk", "paw", "hop", "stretch", "nap", "hide", "peek", "glitch", "turn", "inspect", "scrub"];
  var ambientReactionIds = ["blink", "walk", "stretch", "nap", "peek", "inspect", "scrub"];
  var focusScenes = [
    { id: "nudge", duration: 3900, status: "NOSE NUDGE", detail: "seconds +8px", line: "这两位挤到我胡子了，我拿鼻尖推开一点。" },
    { id: "watch", duration: 4300, status: "EAR WATCH", detail: "one twitch per tick", line: "秒数每跳一下，我的耳朵就跟一下。" },
    { id: "cross", duration: 4900, status: "NUMBER WALK", detail: "timer edge", line: "数字这么大，够咪慢慢巡一圈。" },
    { id: "pounce", duration: 3800, status: "READY TO POUNCE", detail: "next second", line: "等下一秒蹦出来，我就扑上去。" },
    { id: "sleep", duration: 4700, status: "WARM SPOT", detail: "beside seconds", line: "秒数旁边暖暖的，我趴一小会儿。" },
    { id: "checksum", duration: 4200, status: "SNIFF CHECK", detail: "hh:mm:ss", line: "我挨个闻过啦，时、分、秒都没有偷跑。" },
    { id: "borrow", duration: 3900, status: "TINY SNACK", detail: "colon x1", line: "冒号像两粒猫粮，我就叼走一粒哦。" },
    { id: "cursor", duration: 4100, status: "SECOND GUARD", detail: "watching last two", line: "我趴在最后两位旁边，看它们还会不会乱跑。" }
  ];

  var el = {
    prelude: document.getElementById("prelude"),
    preludeEnter: document.getElementById("prelude-enter"),
    preludeHour: document.getElementById("prelude-hour"),
    preludeMinute: document.getElementById("prelude-minute"),
    app: document.getElementById("app"),
    replayIntro: document.getElementById("replay-intro"),
    clock: document.getElementById("clock"),
    themeColor: document.querySelector('meta[name="theme-color"]'),
    themeButtons: document.querySelectorAll("[data-theme-choice]"),
    themeCats: document.querySelectorAll("[data-theme-cat]"),
    focusToggle: document.getElementById("focus-toggle"),
    focusExit: document.getElementById("focus-exit"),
    tonight: document.getElementById("tonight"),
    phaseKicker: document.getElementById("phase-kicker"),
    phaseTitle: document.getElementById("phase-title"),
    phaseNote: document.getElementById("phase-note"),
    countdown: document.getElementById("countdown"),
    countHours: document.querySelector(".count-hours"),
    countMinutes: document.querySelector(".count-minutes"),
    countSeconds: document.querySelector(".count-seconds"),
    horizonProgress: document.getElementById("horizon-progress"),
    horizonNow: document.getElementById("horizon-now"),
    horizonSleepEarly: document.getElementById("horizon-sleep-early"),
    horizonSleepLate: document.getElementById("horizon-sleep-late"),
    horizonAwake: document.getElementById("horizon-awake"),
    horizonAwakeWrap: document.getElementById("horizon-awake-wrap"),
    horizonWinddown: document.getElementById("horizon-winddown"),
    horizonWinddownWrap: document.getElementById("horizon-winddown-wrap"),
    horizonOff: document.getElementById("horizon-off"),
    horizonBed: document.getElementById("horizon-bed"),
    horizonWake: document.getElementById("horizon-wake"),
    nightIndex: document.getElementById("night-index"),
    cat: document.getElementById("cat-companion"),
    catLook: document.getElementById("cat-look"),
    catPerformance: document.getElementById("cat-performance"),
    catPerformanceStage: document.getElementById("cat-performance-stage"),
    catLine: document.getElementById("cat-line"),
    catStateKind: document.getElementById("cat-state-kind"),
    catStateDetail: document.getElementById("cat-state-detail"),
    catFx: document.getElementById("cat-fx"),
    captive: document.getElementById("cursor-captive"),
    off: document.getElementById("off-time"),
    bed: document.getElementById("bed-time"),
    wake: document.getElementById("wake-time"),
    awakeStat: document.getElementById("awake-stat"),
    bufferStat: document.getElementById("buffer-stat"),
    sleepStat: document.getElementById("sleep-stat"),
    sleepGoalDown: document.getElementById("sleep-goal-down"),
    sleepGoalUp: document.getElementById("sleep-goal-up"),
    sleepGoalOutput: document.getElementById("sleep-goal-output"),
    sleepPresets: document.querySelectorAll("[data-sleep-preset]"),
    recalculate: document.getElementById("recalculate"),
    recalculateLabel: document.getElementById("recalculate-label"),
    planFeedback: document.getElementById("plan-feedback"),
    orbitActive: document.getElementById("orbit-active"),
    orbitTrack: document.querySelector(".orbit-track"),
    orbitNow: document.getElementById("orbit-now"),
    orbitNowLabel: document.getElementById("orbit-now-label"),
    planTitle: document.getElementById("plan-title"),
    handoffTitle: document.getElementById("handoff-title"),
    dumpLabel: document.getElementById("dump-label"),
    taskLabel: document.getElementById("task-label"),
    dump: document.getElementById("brain-dump"),
    taskInput: document.getElementById("task-input"),
    taskAdd: document.getElementById("task-add"),
    taskList: document.getElementById("task-list"),
    taskStatus: document.getElementById("task-status"),
    taskClear: document.getElementById("task-clear"),
    taskUndo: document.getElementById("task-undo"),
    handoffPanel: document.getElementById("handoff-panel"),
    handoffButton: document.getElementById("handoff-button"),
    handoffButtonLabel: document.getElementById("handoff-button-label"),
    handoffFeedback: document.getElementById("handoff-feedback"),
    backupMenu: document.getElementById("backup-menu"),
    exportCopy: document.getElementById("export-copy"),
    exportMd: document.getElementById("export-md"),
    exportIcs: document.getElementById("export-ics"),
    winddown: document.getElementById("winddown"),
    winddownTime: document.getElementById("winddown-time"),
    winddownLocked: document.getElementById("winddown-locked"),
    winddownBody: document.getElementById("winddown-body"),
    shutdownList: document.getElementById("shutdown-list"),
    breathButton: document.getElementById("breath-button"),
    breathWord: document.getElementById("breath-word"),
    breathCount: document.getElementById("breath-count"),
    breathRound: document.getElementById("breath-round"),
    breathElapsed: document.getElementById("breath-elapsed"),
    breathCopy: document.getElementById("breath-copy"),
    breathToggle: document.getElementById("breath-toggle"),
    breathReset: document.getElementById("breath-reset"),
    finishNight: document.getElementById("finish-night"),
    calendarCard: document.getElementById("calendar-card"),
    calendarMonth: document.getElementById("calendar-month"),
    calendarPrev: document.getElementById("calendar-prev"),
    calendarNext: document.getElementById("calendar-next"),
    historyTrack: document.getElementById("history-track"),
    historySummary: document.getElementById("history-summary"),
    resetTonight: document.getElementById("reset-tonight"),
    copyrightTrigger: document.getElementById("copyright-trigger"),
    copyrightDialog: document.getElementById("copyright-dialog"),
    copyrightClose: document.getElementById("copyright-close"),
    completeScreen: document.getElementById("complete-screen"),
    completeCopy: document.getElementById("complete-copy"),
    completeClose: document.getElementById("complete-close")
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function keyFromDate(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function currentNightKey() {
    var date = new Date();
    if (date.getHours() < 5) date.setDate(date.getDate() - 1);
    return keyFromDate(date);
  }

  function isMorningReview(now) {
    if (forceMorning) return true;
    now = now || new Date();
    var minutes = now.getHours() * 60 + now.getMinutes();
    var wake = parseTime(state.wake);
    if (wake < 300 || wake > 750) return minutes >= 360 && minutes < 660;
    return minutes >= wake && minutes < Math.min(780, wake + 240);
  }

  function taskId() {
    return "task-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function parseTime(value) {
    var parts = String(value || "00:00").split(":").map(Number);
    return parts[0] * 60 + parts[1];
  }

  function formatTime(total) {
    var normalized = (total % 1440 + 1440) % 1440;
    return pad(Math.floor(normalized / 60)) + ":" + pad(normalized % 60);
  }

  function snapTimeToQuarter(value) {
    var minutes = parseTime(value);
    return formatTime(Math.round(minutes / 15) * 15);
  }

  function durationMinutes(from, to) {
    var result = parseTime(to) - parseTime(from);
    if (result <= 0) result += 1440;
    return result;
  }

  function durationText(minutes) {
    var hours = Math.floor(minutes / 60);
    var rest = minutes % 60;
    if (!hours) return rest + " 分钟";
    if (!rest) return hours + " 小时";
    return hours + " 小时 " + rest + " 分钟";
  }

  function sleepGoalNumber(minutes) {
    return String(minutes / 60);
  }

  function openCopyright() {
    if (!el.copyrightDialog) return;
    selectRightsTab("rights-panel-summary", false);
    document.body.classList.add("rights-open");
    if (typeof el.copyrightDialog.showModal === "function") {
      if (!el.copyrightDialog.open) el.copyrightDialog.showModal();
      return;
    }
    el.copyrightDialog.setAttribute("open", "");
    el.copyrightDialog.setAttribute("role", "dialog");
    el.copyrightDialog.setAttribute("aria-modal", "true");
  }

  function closeCopyright() {
    if (!el.copyrightDialog) return;
    if (typeof el.copyrightDialog.close === "function" && el.copyrightDialog.open) {
      el.copyrightDialog.close();
    } else {
      el.copyrightDialog.removeAttribute("open");
    }
    document.body.classList.remove("rights-open");
    if (el.copyrightTrigger) el.copyrightTrigger.focus();
  }

  function selectRightsTab(panelId, moveFocus) {
    var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-rights-tab]"));
    var panels = Array.prototype.slice.call(document.querySelectorAll(".rights-panel"));
    tabs.forEach(function (tab) {
      var active = tab.dataset.rightsTab === panelId;
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
      if (active && moveFocus) tab.focus();
    });
    panels.forEach(function (panel) {
      panel.hidden = panel.id !== panelId;
    });
    var scroller = document.querySelector(".rights-panels");
    if (scroller) scroller.scrollTop = 0;
  }

  function loadState() {
    var raw = null;
    try {
      raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
      raw = null;
    }
    var merged = Object.assign({}, defaults, raw || {});
    merged.wake = snapTimeToQuarter(merged.wake || defaults.wake);
    merged.bed = snapTimeToQuarter(merged.bed || defaults.bed);
    merged.off = snapTimeToQuarter(merged.off || defaults.off);
    merged.sleepGoal = Math.max(60, Math.min(960, Math.round((Number(merged.sleepGoal) || defaults.sleepGoal) / 15) * 15));
    merged.tasks = Array.isArray(merged.tasks) ? merged.tasks.map(function (task) {
      if (typeof task === "string") return { id: taskId(), text: task.trim(), done: false };
      return {
        id: task && task.id ? String(task.id) : taskId(),
        text: task && task.text ? String(task.text).trim() : "",
        done: !!(task && task.done)
      };
    }).filter(function (task) { return task.text; }) : [];
    if (!merged.tasks.length && typeof merged.first === "string" && merged.first.trim()) {
      merged.tasks.push({ id: taskId(), text: merged.first.trim(), done: false });
    }
    merged.clearedTasks = Array.isArray(merged.clearedTasks) ? merged.clearedTasks : [];
    merged.checks = Array.isArray(merged.checks) ? merged.checks.slice(0, steps.length) : defaults.checks.slice();
    while (merged.checks.length < steps.length) merged.checks.push(false);
    merged.records = Array.isArray(merged.records) ? merged.records : [];
    var key = currentNightKey();
    if (merged.night !== key) {
      merged.night = key;
      merged.handedOff = false;
      merged.checks = defaults.checks.slice();
      merged.completed = false;
    }
    return merged;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      el.phaseNote.textContent = "这次没存进浏览器。刷新后内容会消失。";
    }
  }

  function resizeDump() {
    el.dump.style.height = "auto";
    var height = Math.max(185, Math.min(318, el.dump.scrollHeight));
    el.dump.style.height = height + "px";
    el.dump.style.overflowY = el.dump.scrollHeight > height + 1 ? "auto" : "hidden";
    el.dump.closest(".note-paper").style.minHeight = height + "px";
  }

  function renderWorkbenchContext(now, force) {
    var context = isMorningReview(now) ? "morning" : "night";
    if (!force && context === lastWorkbenchContext) return;
    lastWorkbenchContext = context;
    document.body.dataset.workbenchContext = context;

    var morning = context === "morning";
    el.planTitle.textContent = "今晚怎么安排";
    el.handoffTitle.textContent = morning ? "看看昨晚留的事" : "明早先做什么";
    el.dumpLabel.textContent = morning ? "昨晚做到哪儿了" : "今天做到哪儿了";
    el.taskLabel.textContent = morning ? "今天先做" : "明早先做";
    el.dump.placeholder = morning ? "昨晚做到哪儿，补一句也行" : "留一句，明早接得上";
    el.taskInput.placeholder = morning ? "再加一件今天要做的" : "写一件，回车加入";
    el.taskAdd.setAttribute("aria-label", morning ? "加入今天要做的事" : "加入明早要做的事");
    el.handoffButtonLabel.textContent = "写好了，收工";
    renderTasks();
    renderWinddown();
  }

  function populateSelect(select, selected) {
    var fragment = document.createDocumentFragment();
    for (var minutes = 0; minutes < 1440; minutes += 15) {
      var option = document.createElement("option");
      option.value = formatTime(minutes);
      option.textContent = option.value;
      option.selected = option.value === selected;
      fragment.appendChild(option);
    }
    select.innerHTML = "";
    select.appendChild(fragment);
  }

  function pickerName(select) {
    return {
      "off-time": "收工时间",
      "bed-time": "入睡时间",
      "wake-time": "起床时间"
    }[select.id] || "时间";
  }

  function closeTimePicker(restoreFocus) {
    if (!openTimePicker) return;
    openTimePicker.root.classList.remove("is-open");
    openTimePicker.menu.hidden = true;
    openTimePicker.trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) openTimePicker.trigger.focus();
    openTimePicker = null;
  }

  function syncTimePicker(select) {
    var picker = timePickers.get(select);
    if (!picker) return;
    picker.trigger.textContent = select.value;
    picker.trigger.setAttribute("aria-label", pickerName(select) + " " + select.value + "，打开 15 分钟间隔选项");
    picker.options.forEach(function (option) {
      option.setAttribute("aria-selected", option.dataset.timeValue === select.value ? "true" : "false");
    });
  }

  function syncTimePickers() {
    [el.off, el.bed, el.wake].forEach(syncTimePicker);
  }

  function showTimePicker(picker) {
    if (openTimePicker && openTimePicker !== picker) closeTimePicker(false);
    picker.root.classList.add("is-open");
    picker.menu.hidden = false;
    picker.trigger.setAttribute("aria-expanded", "true");
    openTimePicker = picker;
    window.requestAnimationFrame(function () {
      var selected = picker.options.find(function (option) {
        return option.getAttribute("aria-selected") === "true";
      });
      if (selected) {
        selected.scrollIntoView({ block: "center" });
        selected.focus();
      }
    });
  }

  function chooseTime(picker, value) {
    if (picker.select.value !== value) {
      picker.select.value = value;
      syncTimePicker(picker.select);
      picker.select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    closeTimePicker(true);
  }

  function upgradeTimeSelect(select) {
    select.classList.add("time-native-select");
    select.setAttribute("aria-hidden", "true");
    select.tabIndex = -1;

    var root = document.createElement("div");
    root.className = "time-picker";

    var trigger = document.createElement("button");
    trigger.className = "time-picker-trigger";
    trigger.type = "button";
    trigger.dataset.timeTrigger = select.id;
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    var menu = document.createElement("div");
    menu.className = "time-picker-menu";
    menu.id = select.id + "-menu";
    menu.dataset.timeMenu = select.id;
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-label", pickerName(select) + "，每 15 分钟一个选项");
    menu.hidden = true;
    trigger.setAttribute("aria-controls", menu.id);

    var options = Array.from(select.options).map(function (nativeOption) {
      var option = document.createElement("button");
      option.className = "time-picker-option";
      option.type = "button";
      option.dataset.timeValue = nativeOption.value;
      option.setAttribute("role", "option");
      option.textContent = nativeOption.value;
      menu.appendChild(option);
      return option;
    });

    root.append(trigger, menu);
    select.insertAdjacentElement("afterend", root);

    var picker = { select: select, root: root, trigger: trigger, menu: menu, options: options };
    timePickers.set(select, picker);
    syncTimePicker(select);

    trigger.addEventListener("click", function () {
      if (openTimePicker === picker) closeTimePicker(false);
      else showTimePicker(picker);
    });
    trigger.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showTimePicker(picker);
      }
    });
    options.forEach(function (option) {
      option.addEventListener("click", function () {
        chooseTime(picker, option.dataset.timeValue);
      });
    });
    menu.addEventListener("keydown", function (event) {
      var index = options.indexOf(document.activeElement);
      if (event.key === "Escape") {
        event.preventDefault();
        closeTimePicker(true);
        return;
      }
      if (event.key === "Tab") {
        closeTimePicker(false);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        if (index >= 0) {
          event.preventDefault();
          chooseTime(picker, options[index].dataset.timeValue);
        }
        return;
      }
      var next = index;
      if (event.key === "ArrowDown") next = Math.min(options.length - 1, index + 1);
      else if (event.key === "ArrowUp") next = Math.max(0, index - 1);
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = options.length - 1;
      else return;
      event.preventDefault();
      options[next].focus();
      options[next].scrollIntoView({ block: "nearest" });
    });
  }

  function applyTheme(theme, persist) {
    var allowed = ["tide", "paper", "plum", "dawn"];
    if (allowed.indexOf(theme) === -1) theme = "tide";
    var changed = state.theme !== theme;
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
    el.themeCats.forEach(function (image) {
      if (image.getAttribute("src") === themeCats[theme]) return;
      image.classList.remove("cat-theme-swap");
      image.setAttribute("src", themeCats[theme]);
      image.classList.add("cat-theme-swap");
      window.setTimeout(function () { image.classList.remove("cat-theme-swap"); }, 520);
    });
    el.themeButtons.forEach(function (button) {
      var active = button.dataset.themeChoice === theme;
      button.classList.toggle("is-current", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    window.setTimeout(function () {
      var background = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
      el.themeColor.setAttribute("content", background);
    }, 0);
    if (persist !== false) saveState();
    if (petReady && changed && persist !== false) {
      playPetAction("theme", {
        line: {
          tide: "这片蓝有点像窗外，我穿白毛正好。",
          paper: "页面亮起来啦，我换身深色毛陪你。",
          plum: "粉色的光落到耳朵上了，暖暖的。",
          dawn: "今天是天青色，腿上的小环也亮了。"
        }[theme]
      });
    }
  }

  function tonightDates() {
    var key = currentNightKey().split("-").map(Number);
    var base = new Date(key[0], key[1] - 1, key[2], 0, 0, 0, 0);
    var off = new Date(base.getTime() + parseTime(state.off) * 60000);
    var bed = new Date(base.getTime() + parseTime(state.bed) * 60000);
    if (bed <= off) bed.setDate(bed.getDate() + 1);
    var wake = new Date(base.getTime() + parseTime(state.wake) * 60000);
    while (wake <= bed) wake.setDate(wake.getDate() + 1);
    return { base: base, off: off, bed: bed, wake: wake };
  }

  function currentPhase(now) {
    var dates = tonightDates();
    if (state.completed) return { id: "complete", target: dates.wake, dates: dates };
    if (now < dates.off) return { id: "work", target: dates.off, dates: dates };
    if (now < dates.bed) return { id: "winddown", target: dates.bed, dates: dates };
    if (now < dates.wake) return { id: "sleep", target: dates.wake, dates: dates };
    return { id: "complete", target: dates.wake, dates: dates };
  }

  function setHorizonSegment(node, startMinutes, duration) {
    node.style.left = (startMinutes / 1440 * 100) + "%";
    node.style.width = (Math.max(0, duration) / 1440 * 100) + "%";
  }

  function setHorizonPhase(first, wrapped, startMinutes, duration) {
    var firstDuration = Math.min(duration, 1440 - startMinutes);
    var wrappedDuration = Math.max(0, duration - firstDuration);
    setHorizonSegment(first, startMinutes, firstDuration);
    setHorizonSegment(wrapped, 0, wrappedDuration);
  }

  function positionHorizonLabel(node, minutes) {
    node.style.left = (minutes / 1440 * 100) + "%";
    node.dataset.edge = minutes < 120 ? "start" : minutes > 1320 ? "end" : "middle";
  }

  function minuteIsWithin(value, start, end) {
    if (start === end) return true;
    if (start < end) return value >= start && value < end;
    return value >= start || value < end;
  }

  function horizonSegmentAt(minutes) {
    var off = parseTime(state.off);
    var bed = parseTime(state.bed);
    var wake = parseTime(state.wake);
    if (minuteIsWithin(minutes, wake, off)) return "awake";
    if (minuteIsWithin(minutes, off, bed)) return "winddown";
    return "sleep";
  }

  function renderHorizon() {
    var off = parseTime(state.off);
    var bed = parseTime(state.bed);
    var wake = parseTime(state.wake);
    var awakeDuration = durationMinutes(state.wake, state.off);
    var winddownDuration = durationMinutes(state.off, state.bed);
    var sleepDuration = durationMinutes(state.bed, state.wake);

    setHorizonPhase(el.horizonSleepLate, el.horizonSleepEarly, bed, sleepDuration);
    setHorizonPhase(el.horizonAwake, el.horizonAwakeWrap, wake, awakeDuration);
    setHorizonPhase(el.horizonWinddown, el.horizonWinddownWrap, off, winddownDuration);

    positionHorizonLabel(el.horizonOff.closest(".horizon-label"), off);
    positionHorizonLabel(el.horizonBed.closest(".horizon-label"), bed);
    positionHorizonLabel(el.horizonWake.closest(".horizon-label"), wake);
  }

  function renderOrbitTimeline(now) {
    var dates = tonightDates();
    var length = el.orbitTrack.getTotalLength();
    var pointAtX = function (targetX) {
      var low = 0;
      var high = length;
      var point;
      for (var i = 0; i < 18; i += 1) {
        var middle = (low + high) / 2;
        point = el.orbitTrack.getPointAtLength(middle);
        if (point.x < targetX) low = middle;
        else high = middle;
      }
      var distance = (low + high) / 2;
      return { distance: distance, point: el.orbitTrack.getPointAtLength(distance) };
    };
    var approach = pointAtX(72);
    var offStation = pointAtX(120);
    var bedStation = pointAtX(360);
    var wakeStation = pointAtX(600);
    var distance = approach.distance;
    var beforeOff = now < dates.off;

    if (beforeOff) {
      el.orbitNow.dataset.stage = "before";
    } else {
      if (now < dates.bed) {
        var winddownProgress = Math.min(1, Math.max(0, (now - dates.off) / (dates.bed - dates.off)));
        distance = offStation.distance + (bedStation.distance - offStation.distance) * winddownProgress;
        el.orbitNow.dataset.stage = "winddown";
      } else if (now < dates.wake) {
        var sleepProgress = Math.min(1, Math.max(0, (now - dates.bed) / (dates.wake - dates.bed)));
        distance = bedStation.distance + (wakeStation.distance - bedStation.distance) * sleepProgress;
        el.orbitNow.dataset.stage = "sleep";
      } else {
        distance = wakeStation.distance;
        el.orbitNow.dataset.stage = "complete";
      }
    }

    var point = el.orbitTrack.getPointAtLength(distance);
    el.orbitNow.setAttribute("transform", "translate(" + point.x.toFixed(2) + " " + point.y.toFixed(2) + ")");
    el.orbitNowLabel.textContent = "现在 " + pad(now.getHours()) + ":" + pad(now.getMinutes());
  }

  function renderPhase(now) {
    var phase = currentPhase(now);
    var remaining = Math.max(0, phase.target.getTime() - now.getTime());
    var seconds = Math.floor(remaining / 1000);
    el.countHours.textContent = pad(Math.floor(seconds / 3600));
    el.countMinutes.textContent = pad(Math.floor(seconds / 60) % 60);
    el.countSeconds.textContent = pad(seconds % 60);
    var labels = {
      work: ["今晚 " + state.off + " 收工", "距离收工", ""],
      winddown: [state.bed + " 睡觉", "距离睡觉", "工作已经停下，接着做睡前这段。"],
      sleep: [state.wake + " 起床", "今晚在睡", "页面会记住明早的清单。"],
      complete: ["今晚已记录", "收好了", "明早第一件事还在清单里。"]
    };
    var copy = labels[phase.id];
    el.phaseKicker.textContent = copy[0];
    el.phaseTitle.textContent = copy[1];
    if (!el.phaseNote.dataset.validation) el.phaseNote.textContent = copy[2];

    var nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    var percent = nowMinutes / 1440 * 100;
    el.horizonProgress.style.width = percent + "%";
    el.horizonNow.style.left = percent + "%";
    el.horizonNow.dataset.segment = horizonSegmentAt(nowMinutes);
    renderOrbitTimeline(now);
    el.winddownTime.textContent = phase.id === "work"
      ? "离睡觉还有 " + durationText(Math.max(0, Math.round((phase.dates.bed - now) / 60000)))
      : phase.id === "winddown"
        ? "离睡觉还有 " + durationText(Math.max(0, Math.round((phase.dates.bed - now) / 60000)))
        : "今晚已经排好了";
  }

  function updatePlan() {
    state.off = el.off.value;
    state.bed = el.bed.value;
    state.wake = el.wake.value;
    syncTimePickers();
    var awake = durationMinutes(state.wake, state.off);
    var buffer = durationMinutes(state.off, state.bed);
    var sleep = durationMinutes(state.bed, state.wake);
    el.awakeStat.textContent = durationText(awake);
    el.bufferStat.textContent = durationText(buffer);
    el.sleepStat.textContent = durationText(sleep);
    el.sleepGoalOutput.textContent = sleepGoalNumber(state.sleepGoal);
    el.recalculateLabel.textContent = "按 " + durationText(state.sleepGoal) + "重算";
    el.sleepGoalDown.disabled = state.sleepGoal <= 60;
    el.sleepGoalUp.disabled = state.sleepGoal >= 960;
    el.sleepPresets.forEach(function (button) {
      var active = Number(button.dataset.sleepPreset) === state.sleepGoal;
      button.classList.toggle("is-current", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    el.horizonOff.textContent = state.off;
    el.horizonBed.textContent = state.bed;
    el.horizonWake.textContent = state.wake;
    el.preludeHour.textContent = state.off.slice(0, 2);
    el.preludeMinute.textContent = state.off.slice(3, 5);
    renderHorizon();
    el.planFeedback.textContent = "";
    if (buffer < 30) {
      el.planFeedback.textContent = "收尾只有 " + buffer + " 分钟，关资料和洗漱会有点赶。";
    } else if (buffer > 120) {
      el.planFeedback.textContent = "收尾有 " + durationText(buffer) + "，这段很容易又回到工作里。";
    } else if (sleep < 420) {
      el.planFeedback.textContent = "今晚只有 " + durationText(sleep) + " 睡眠。";
    }
    saveState();
    renderPhase(new Date());
  }

  function recommendedPlan() {
    var wake = parseTime(el.wake.value);
    var bed = wake - state.sleepGoal;
    var off = bed - 60;
    el.bed.value = formatTime(bed);
    el.off.value = formatTime(off);
    updatePlan();
    el.planFeedback.textContent = "从 " + state.wake + " 起床往前推，睡 " + durationText(state.sleepGoal) + "，再留 1 小时收尾。";
    window.setTimeout(function () {
      if (el.planFeedback.textContent.indexOf("往前推") !== -1) el.planFeedback.textContent = "";
    }, 3600);
    playPetAction("compile", {
      line: "咪从 " + state.wake + " 往回走过一遍：" + state.off + " 收工，" + state.bed + " 钻进被窝。"
    });
  }

  function setSleepGoal(minutes, announce) {
    state.sleepGoal = Math.max(60, Math.min(960, Math.round(minutes / 15) * 15));
    updatePlan();
    if (announce) {
      el.planFeedback.textContent = "每晚睡眠目标改成 " + durationText(state.sleepGoal) + "。点重算后，从起床时间往前推。";
      window.setTimeout(function () {
        if (el.planFeedback.textContent.indexOf("每晚睡眠目标") !== -1) el.planFeedback.textContent = "";
      }, 3200);
    }
  }

  function renderTasks() {
    el.taskList.innerHTML = "";
    state.tasks.forEach(function (task) {
      var item = document.createElement("li");
      item.className = "task-item" + (task.done ? " is-done" : "");

      var check = document.createElement("button");
      check.className = "task-check";
      check.type = "button";
      check.setAttribute("aria-label", task.done ? "恢复：" + task.text : "完成：" + task.text);
      check.addEventListener("click", function () {
        task.done = !task.done;
        saveState();
        renderTasks();
        var allDone = state.tasks.length && state.tasks.every(function (itemTask) { return itemTask.done; });
        if (allDone) {
          playPetAction("celebrate", { line: isMorningReview() ? "今天的事都打勾啦，摸摸我的头嘛。" : "明早的清单空啦，尾巴要翘高一点。" });
        } else if (task.done) {
          playPetAction("pass", { line: "“" + task.text + "”打勾啦，这件可以放下了。" });
        } else {
          playPetAction("rollback", { line: "“" + task.text + "”还要做呀？咪给你叼回来。" });
        }
      });

      var text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;

      var remove = document.createElement("button");
      remove.className = "task-remove";
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "删除：" + task.text);
      remove.addEventListener("click", function () {
        state.tasks = state.tasks.filter(function (itemTask) { return itemTask.id !== task.id; });
        saveState();
        renderTasks();
        playPetAction("purge", { line: isMorningReview() ? "这条咪先叼走啦，今天轻一点。" : "这条咪先叼走啦，明早少一件。" });
      });

      item.append(check, text, remove);
      el.taskList.appendChild(item);
    });
    var done = state.tasks.filter(function (task) { return task.done; }).length;
    el.taskStatus.textContent = state.tasks.length
      ? (isMorningReview() ? "做完 " + done + " / " + state.tasks.length : done + " / " + state.tasks.length + " 已完成")
      : (isMorningReview() ? "今天还没写任务" : "还没写明早的事");
    el.taskStatus.dataset.hasItems = state.tasks.length ? "true" : "false";
    el.taskClear.disabled = !state.tasks.length;
    el.taskUndo.hidden = !state.clearedTasks.length;
  }

  function addTask() {
    var text = el.taskInput.value.trim();
    if (!text) return;
    state.tasks.push({ id: taskId(), text: text, done: false });
    state.clearedTasks = [];
    el.taskInput.value = "";
    saveState();
    renderTasks();
    playPetAction("packet", { line: isMorningReview() ? "“" + text + "”放这儿，咪今天帮你盯着。" : "“" + text + "”放这儿，明早咪先看到它。" });
  }

  function clearTasks() {
    if (!state.tasks.length) return;
    state.clearedTasks = state.tasks.map(function (task) { return Object.assign({}, task); });
    state.tasks = [];
    saveState();
    renderTasks();
    el.handoffFeedback.textContent = "清单清掉了。需要的话点“恢复清单”。";
    playPetAction("purge");
  }

  function undoTasks() {
    if (!state.clearedTasks.length) return;
    state.tasks = state.clearedTasks.map(function (task) { return Object.assign({}, task); });
    state.clearedTasks = [];
    saveState();
    renderTasks();
    el.handoffFeedback.textContent = "";
    playPetAction("rollback");
  }

  function renderWinddown() {
    var morning = isMorningReview();
    el.winddownLocked.hidden = state.handedOff;
    el.winddownBody.hidden = !state.handedOff;
    el.backupMenu.open = false;
    el.handoffButton.hidden = state.handedOff || morning;
    el.backupMenu.hidden = !state.handedOff && !(morning && (state.dump || state.tasks.length));
    el.shutdownList.innerHTML = "";
    steps.forEach(function (step, index) {
      var item = document.createElement("li");
      item.className = "shutdown-item" + (state.checks[index] ? " is-done" : "");
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = step.text;
      button.setAttribute("aria-pressed", state.checks[index] ? "true" : "false");
      button.addEventListener("click", function () {
        state.checks[index] = !state.checks[index];
        saveState();
        renderWinddown();
        if (state.checks.every(Boolean)) {
          playPetAction("celebrate", { line: "都收好啦，我先去床边占个暖位置。" });
        } else if (state.checks[index]) {
          playPetAction("pass", { line: "这件好啦，还剩 " + state.checks.filter(function (checked) { return !checked; }).length + " 件，咪陪你慢慢收。" });
        } else {
          playPetAction("rollback", { line: "这件还没好呀？那咪先给你放回来。" });
        }
      });
      var time = document.createElement("time");
      time.textContent = formatTime(parseTime(state.off) + step.offset);
      item.append(button, time);
      el.shutdownList.appendChild(item);
    });
  }

  function primaryTask() {
    var task = state.tasks.find(function (item) { return !item.done; }) || state.tasks[0];
    return task ? task.text : "打开今晚的交接";
  }

  function handoff() {
    state.dump = el.dump.value.trim();
    if (!state.dump && !state.tasks.length) {
      el.handoffFeedback.textContent = "写一句做到哪儿，或者加一件明早要做的事。";
      el.dump.focus();
      playPetAction("inspect", { priority: 55, status: "NEED INPUT", detail: "handoff empty", line: "这里还白白的。给明早留一句嘛，咪帮你看着。" });
      return;
    }
    state.handedOff = true;
    el.handoffFeedback.textContent = "存好了。";
    saveState();
    renderWinddown();
    playPetAction("handoff");
    el.winddown.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(function () {
      if (el.handoffFeedback.textContent === "存好了。") el.handoffFeedback.textContent = "";
    }, 2200);
  }

  function memoText() {
    var lines = [
      "# Last Commit · " + state.night,
      "",
      "停工 " + state.off + "｜睡觉 " + state.bed + "｜起床 " + state.wake,
      "",
      "## 今天做到哪儿了",
      state.dump || "（空）",
      "",
      "## 明早先做"
    ];
    if (state.tasks.length) {
      state.tasks.forEach(function (task) {
        lines.push("- [" + (task.done ? "x" : " ") + "] " + task.text);
      });
    } else {
      lines.push("- [ ] " + primaryTask());
    }
    return lines.join("\n");
  }

  function download(name, type, content) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportMarkdown() {
    download("Last Commit-" + state.night + ".md", "text/markdown;charset=utf-8", memoText());
    el.handoffFeedback.textContent = "Markdown 已下载。";
  }

  function icsDate(date) {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  function exportCalendar() {
    var dates = tonightDates();
    var content = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Tianyu Vision//Last Commit//ZH-CN",
      "BEGIN:VEVENT",
      "UID:last-commit-" + state.night + "@local",
      "DTSTAMP:" + icsDate(new Date()),
      "DTSTART:" + icsDate(dates.off),
      "DTEND:" + icsDate(dates.bed),
      "SUMMARY:收工，准备睡觉",
      "DESCRIPTION:" + memoText().replace(/\n/g, "\\n"),
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    download("Last Commit-" + state.night + ".ics", "text/calendar;charset=utf-8", content);
    el.handoffFeedback.textContent = "日历文件已下载。";
  }

  async function copyMemo() {
    try {
      await navigator.clipboard.writeText(memoText());
      el.handoffFeedback.textContent = "交接已复制。";
    } catch (error) {
      var textarea = document.createElement("textarea");
      textarea.value = memoText();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      el.handoffFeedback.textContent = "交接已复制。";
    }
  }

  function formatBreathTime(milliseconds) {
    var seconds = Math.max(0, Math.floor(milliseconds / 1000));
    return pad(Math.floor(seconds / 60)) + ":" + pad(seconds % 60);
  }

  function breathElapsedAt(now) {
    if (breathClock.status !== "running") return breathClock.elapsedBeforeRun;
    return breathClock.elapsedBeforeRun + Math.max(0, now - breathClock.runStartedAt);
  }

  function setBreathScale(scale) {
    if (motionQuery.matches) {
      el.breathButton.style.removeProperty("--breath-scale");
      return;
    }
    el.breathButton.style.setProperty("--breath-scale", scale.toFixed(4));
  }

  function breathPosition(elapsed) {
    var roundOffset = elapsed % BREATH_ROUND_DURATION;
    var phaseStart = 0;
    for (var index = 0; index < BREATH_PHASES.length; index += 1) {
      var phase = BREATH_PHASES[index];
      var phaseEnd = phaseStart + phase.duration;
      if (roundOffset < phaseEnd || index === BREATH_PHASES.length - 1) {
        return {
          round: Math.min(BREATH_ROUNDS, Math.floor(elapsed / BREATH_ROUND_DURATION) + 1),
          phase: phase,
          phaseElapsed: Math.max(0, roundOffset - phaseStart)
        };
      }
      phaseStart = phaseEnd;
    }
    return null;
  }

  function finishBreathing() {
    window.cancelAnimationFrame(breathFrame);
    breathFrame = 0;
    breathClock.status = "complete";
    breathClock.elapsedBeforeRun = BREATH_TOTAL_DURATION;
    breathClock.round = BREATH_ROUNDS;
    breathClock.phase = "complete";
    breathClock.remaining = 0;
    el.breathButton.classList.remove("is-running", "is-paused");
    el.breathButton.classList.add("is-complete");
    el.breathButton.dataset.state = "complete";
    el.breathButton.dataset.phase = "complete";
    el.breathButton.dataset.elapsed = String(BREATH_TOTAL_DURATION);
    el.breathButton.setAttribute("aria-label", "三轮呼吸完成，再来三轮");
    el.breathWord.textContent = "好了";
    el.breathCount.textContent = "✓";
    el.breathRound.textContent = "三轮完成";
    el.breathElapsed.textContent = formatBreathTime(BREATH_TOTAL_DURATION);
    el.breathElapsed.dateTime = "PT36S";
    el.breathCopy.textContent = "呼吸慢下来了。";
    el.breathToggle.textContent = "再来";
    el.breathReset.hidden = false;
    setBreathScale(1);
    playPetAction("nod", { force: true, line: "三轮啦。咪听见你的呼吸慢下来了。" });
  }

  function renderBreathing(now) {
    var elapsed = Math.min(BREATH_TOTAL_DURATION, breathElapsedAt(now));
    if (elapsed >= BREATH_TOTAL_DURATION) {
      finishBreathing();
      return;
    }

    var position = breathPosition(elapsed);
    var progress = Math.min(1, position.phaseElapsed / position.phase.duration);
    var eased = .5 - Math.cos(progress * Math.PI) / 2;
    var scale = position.phase.id === "inhale"
      ? .78 + .22 * eased
      : position.phase.id === "exhale"
        ? 1 - .22 * eased
        : 1;
    var remaining = Math.max(1, Math.ceil((position.phase.duration - position.phaseElapsed) / 1000));

    breathClock.round = position.round;
    breathClock.phase = position.phase.id;
    breathClock.remaining = remaining;
    el.breathButton.dataset.state = breathClock.status;
    el.breathButton.dataset.phase = position.phase.id;
    el.breathButton.dataset.round = String(position.round);
    el.breathButton.dataset.elapsed = String(Math.floor(elapsed));
    el.breathButton.classList.toggle("is-running", breathClock.status === "running");
    el.breathButton.classList.toggle("is-paused", breathClock.status === "paused");
    el.breathButton.classList.remove("is-complete");
    el.breathWord.textContent = position.phase.word;
    el.breathCount.textContent = String(remaining);
    el.breathRound.textContent = "第 " + position.round + " / " + BREATH_ROUNDS + " 轮";
    el.breathElapsed.textContent = formatBreathTime(elapsed);
    el.breathElapsed.dateTime = "PT" + Math.floor(elapsed / 1000) + "S";
    el.breathCopy.textContent = breathClock.status === "paused"
      ? "停在这里，继续时接着走。"
      : position.phase.copy;
    el.breathToggle.textContent = breathClock.status === "paused" ? "继续" : "暂停";
    el.breathButton.setAttribute(
      "aria-label",
      (breathClock.status === "paused" ? "继续呼吸，" : "暂停呼吸，") +
      "第 " + position.round + " 轮，" + position.phase.copy + "，还剩 " + remaining + " 秒"
    );
    setBreathScale(scale);

    if (breathClock.status === "running") {
      breathFrame = window.requestAnimationFrame(renderBreathing);
    }
  }

  function startFreshBreathing() {
    window.cancelAnimationFrame(breathFrame);
    breathClock.status = "running";
    breathClock.elapsedBeforeRun = 0;
    breathClock.runStartedAt = performance.now();
    el.breathToggle.textContent = "暂停";
    el.breathReset.hidden = false;
    playPetAction("breathe");
    renderBreathing(breathClock.runStartedAt);
  }

  function pauseBreathing() {
    if (breathClock.status !== "running") return;
    var now = performance.now();
    breathClock.elapsedBeforeRun = Math.min(BREATH_TOTAL_DURATION, breathElapsedAt(now));
    breathClock.status = "paused";
    window.cancelAnimationFrame(breathFrame);
    breathFrame = 0;
    renderBreathing(now);
    playPetAction("nod", { line: "先歇在这一口。你想继续，咪还在。" });
  }

  function resumeBreathing() {
    if (breathClock.status !== "paused") return;
    breathClock.status = "running";
    breathClock.runStartedAt = performance.now();
    playPetAction("breathe", { line: "好呀，接着来。咪的小肚皮继续跟着。" });
    renderBreathing(breathClock.runStartedAt);
  }

  function startBreathing() {
    if (breathClock.status === "running") {
      pauseBreathing();
      return;
    }
    if (breathClock.status === "paused") {
      resumeBreathing();
      return;
    }
    startFreshBreathing();
  }

  function clearBreathing() {
    window.cancelAnimationFrame(breathFrame);
    breathFrame = 0;
    breathClock.status = "idle";
    breathClock.elapsedBeforeRun = 0;
    breathClock.runStartedAt = 0;
    breathClock.round = 0;
    breathClock.phase = "";
    breathClock.remaining = 4;
    el.breathButton.classList.remove("is-running", "is-paused", "is-complete");
    el.breathButton.dataset.state = "idle";
    el.breathButton.dataset.phase = "idle";
    el.breathButton.dataset.round = "0";
    el.breathButton.dataset.elapsed = "0";
    el.breathButton.setAttribute("aria-label", "开始三轮呼吸");
    el.breathButton.style.removeProperty("--breath-scale");
    el.breathWord.textContent = "准备";
    el.breathCount.textContent = "4";
    el.breathRound.textContent = "三轮";
    el.breathElapsed.textContent = "00:00";
    el.breathElapsed.dateTime = "PT0S";
    el.breathCopy.textContent = "吸 4 秒，停 2 秒，呼 6 秒。";
    el.breathToggle.textContent = "开始";
    el.breathReset.hidden = true;
  }

  function completeNight() {
    if (!state.handedOff) {
      el.handoffFeedback.textContent = "先把交接存下来。";
      el.handoffPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    state.completed = true;
    var record = {
      date: state.night,
      completedAt: new Date().toISOString(),
      off: state.off,
      bed: state.bed,
      wake: state.wake
    };
    var existing = state.records.find(function (item) { return item.date === state.night; });
    if (existing) Object.assign(existing, record);
    else state.records.push(record);
    state.records = state.records.slice(-400);
    saveState();
    clearBreathing();
    renderHistory();
    el.completeCopy.textContent = "明早先做：" + primaryTask();
    document.body.classList.add("complete-mode");
    el.completeScreen.hidden = false;
    el.completeClose.focus({ preventScroll: true });
    playPetAction("celebrate", { force: true, line: "今晚收好啦。咪先去床边团成一圈。" });
  }

  function closeCompleteScreen() {
    if (el.completeScreen.hidden) return;
    el.completeScreen.hidden = true;
    document.body.classList.remove("complete-mode");
    el.finishNight.focus({ preventScroll: true });
    scheduleAmbient(true);
  }

  function dateFromKey(key) {
    var parts = key.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }

  function sameMonth(left, right) {
    return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
  }

  function moveCalendar(direction) {
    if (calendarMoveLocked) return;
    var next = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + direction, 1, 12);
    var currentMonth = new Date(dateFromKey(state.night).getFullYear(), dateFromKey(state.night).getMonth(), 1, 12);
    if (next > currentMonth) return;
    calendarMoveLocked = true;
    el.calendarCard.dataset.motion = direction < 0 ? "previous" : "next";
    calendarCursor = next;
    renderHistory();
    window.setTimeout(function () {
      delete el.calendarCard.dataset.motion;
      calendarMoveLocked = false;
    }, 320);
  }

  function renderHistory() {
    el.historyTrack.innerHTML = "";
    var today = dateFromKey(state.night);
    if (!calendarCursor) calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1, 12);
    var first = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1, 12);
    var daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
    var completed = 0;
    el.calendarMonth.textContent = first.getFullYear() + " / " + pad(first.getMonth() + 1);
    el.calendarMonth.setAttribute("datetime", first.getFullYear() + "-" + pad(first.getMonth() + 1));
    el.calendarNext.disabled = sameMonth(first, today);

    el.historyTrack.style.setProperty("--month-days", daysInMonth);
    for (var i = 0; i < daysInMonth; i += 1) {
      var date = new Date(first);
      date.setDate(i + 1);
      var key = keyFromDate(date);
      var found = state.records.some(function (record) { return record.date === key; });
      if (found) completed += 1;
      var mark = document.createElement("div");
      mark.className = "night-mark"
        + (found ? " is-done" : "")
        + (key === state.night ? " is-today" : "");
      mark.setAttribute("role", "gridcell");
      mark.setAttribute("aria-label", key + (found ? "，已按时停下" : "，没有记录"));
      var label = document.createElement("span");
      label.textContent = date.getDate();
      mark.appendChild(label);
      el.historyTrack.appendChild(mark);
    }
    el.historySummary.textContent = "本月按时停下 " + completed + " 晚";
  }

  function resetTonight() {
    if (!window.confirm("重置今晚的交接和睡前勾选？时间和历史记录会保留。")) return;
    state.dump = "";
    state.tasks = [];
    state.clearedTasks = [];
    state.handedOff = false;
    state.checks = defaults.checks.slice();
    state.completed = false;
    el.dump.value = "";
    el.taskInput.value = "";
    el.handoffFeedback.textContent = "";
    clearBreathing();
    releaseCapture(true);
    clearPetAction(true);
    saveState();
    renderTasks();
    renderWinddown();
    renderPhase(new Date());
    playPetAction("rollback", { force: true, line: "好嘛，今晚重新来。时间和月历还在原地。" });
  }

  function setActiveZone(zone) {
    document.querySelectorAll(".interactive-zone.is-active").forEach(function (item) {
      item.classList.remove("is-active");
    });
    if (zone) zone.classList.add("is-active");
  }

  function bindActiveZones() {
    document.querySelectorAll(".interactive-zone").forEach(function (zone) {
      ["pointerenter", "pointerdown", "focusin"].forEach(function (eventName) {
        zone.addEventListener(eventName, function () { setActiveZone(zone); });
      });
      zone.addEventListener("pointerleave", function () {
        window.requestAnimationFrame(function () {
          var focused = document.activeElement && document.activeElement.closest
            ? document.activeElement.closest(".interactive-zone")
            : null;
          setActiveZone(focused);
        });
      });
    });
  }

  function setCatStatus(kind, detail) {
    el.catStateKind.textContent = kind || "IDLE";
    el.catStateDetail.textContent = detail || (document.body.classList.contains("focus-mode") ? "focus loop" : "watching time");
  }

  function speakCat(line) {
    window.clearTimeout(speechTimer);
    el.catLine.textContent = line;
    el.catLine.removeAttribute("data-speaking");
    void el.catLine.offsetWidth;
    el.catLine.dataset.speaking = "true";
    speechTimer = window.setTimeout(function () {
      el.catLine.removeAttribute("data-speaking");
    }, motionQuery.matches ? 80 : 760);
  }

  function clearPetFx() {
    el.catFx.replaceChildren();
    el.catFx.removeAttribute("data-fx");
  }

  function addFxNode(className, text, styles) {
    var node = document.createElement("span");
    node.className = className;
    if (text) node.textContent = text;
    Object.keys(styles || {}).forEach(function (name) {
      node.style.setProperty(name, styles[name]);
    });
    el.catFx.appendChild(node);
    return node;
  }

  function spawnPetFx(type, label) {
    clearPetFx();
    if (motionQuery.matches || !type) return;
    el.catFx.dataset.fx = type;
    if (["pixels", "sparks", "impact", "celebrate", "glitch", "theme", "purge", "rollback", "compile", "packet", "pass", "commit", "warning", "reboot", "capture", "scan"].indexOf(type) !== -1) {
      var count = type === "celebrate" ? 14 : 8;
      for (var i = 0; i < count; i += 1) {
        addFxNode("cat-fx-pixel", "", {
          "--fx-x": (-64 + Math.random() * 128).toFixed(0) + "px",
          "--fx-y": (-42 - Math.random() * 94).toFixed(0) + "px",
          "--fx-delay": (Math.random() * .18).toFixed(2) + "s",
          "--fx-size": (3 + Math.floor(Math.random() * 5)) + "px"
        });
      }
    }
    if (["wave", "purr", "sleep"].indexOf(type) !== -1) {
      var wave = addFxNode("cat-fx-wave");
      for (var waveBar = 0; waveBar < 7; waveBar += 1) {
        var waveNode = document.createElement("i");
        waveNode.style.setProperty("--bar", String(waveBar));
        wave.appendChild(waveNode);
      }
    }
    if (type === "trail" || type === "packet") {
      for (var trail = 0; trail < 5; trail += 1) {
        addFxNode("cat-fx-trail", "", { "--trail": String(trail) });
      }
    }
  }

  function stopPetVideo() {
    window.clearTimeout(videoHoldTimer);
    videoHoldTimer = 0;
    if (!el.catPerformance) return;
    el.catPerformance.pause();
    el.catPerformance.onended = null;
    el.catPerformance.onerror = null;
    el.catPerformance.ontimeupdate = null;
    try {
      el.catPerformance.currentTime = 0;
    } catch (error) {
      // Metadata may not have loaded yet. The next source assignment resets it.
    }
    el.cat.classList.remove("is-video-playing");
    el.tonight.removeAttribute("data-video-action");
    el.tonight.removeAttribute("data-video-hold");
  }

  function playPetVideo(actionId, token) {
    var performance = videoActions[actionId];
    if (!performance || !el.catPerformance || motionQuery.matches) return false;
    var base = "assets/pixel-cat/video-v1/" + performance.id;
    var video = el.catPerformance;
    stopPetVideo();
    video.poster = base + "-poster.png";
    if (video.getAttribute("src") !== base + ".webm") {
      video.src = base + ".webm";
    }
    video.currentTime = 0;
    video.muted = true;
    video.playsInline = true;
    el.tonight.dataset.videoAction = performance.id;
    el.cat.classList.add("is-video-playing");

    var holdStarted = false;
    if (performance.holdAt) {
      video.ontimeupdate = function () {
        if (holdStarted || token !== actionToken || video.currentTime < performance.holdAt) return;
        holdStarted = true;
        video.pause();
        el.tonight.dataset.videoHold = "true";
        videoHoldTimer = window.setTimeout(function () {
          if (token !== actionToken) return;
          el.tonight.removeAttribute("data-video-hold");
          video.play().catch(function () { finishPetAction(token); });
        }, performance.holdFor);
      };
    }

    video.onended = function () {
      if (token !== actionToken) return;
      if (actionId === "capture" && captureTimer) {
        releaseCapture(false);
      } else {
        finishPetAction(token);
      }
    };
    video.onerror = function () {
      if (token !== actionToken) return;
      stopPetVideo();
    };
    video.play().catch(function () {
      if (token !== actionToken) return;
      stopPetVideo();
    });
    return true;
  }

  function clearPetAction(silent) {
    window.clearTimeout(activeReactionTimer);
    activeReactionTimer = 0;
    actionToken += 1;
    currentAction = "";
    currentPriority = 0;
    el.cat.removeAttribute("data-reaction");
    el.cat.removeAttribute("data-pet-source");
    el.tonight.removeAttribute("data-focus-scene");
    stopPetVideo();
    clearPetFx();
    setCatStatus("IDLE", document.body.classList.contains("focus-mode") ? "focus loop" : "watching time");
    if (!silent) scheduleAmbient(false);
  }

  function clearReaction() {
    clearPetAction(false);
  }

  function finishPetAction(token) {
    if (token !== actionToken) return;
    clearPetAction(false);
  }

  function pickLine(action, explicitLine) {
    if (explicitLine) return explicitLine;
    messageCount += 1;
    return action.lines[messageCount % action.lines.length];
  }

  function playPetAction(id, options) {
    options = options || {};
    var action = petActions[id];
    if (!action || (document.hidden && !options.force)) return false;
    var priority = options.priority || action.priority;
    if (currentAction && currentPriority > priority && !options.force) return false;
    if (captureTimer && id !== "capture") {
      if (!options.force) return false;
      releaseCapture(true);
    }
    window.clearTimeout(idleTimer);
    idleTimer = 0;
    clearPetAction(true);
    currentAction = id;
    currentPriority = priority;
    var token = actionToken;
    el.cat.dataset.reaction = id;
    el.cat.dataset.petSource = options.source || (priority >= 50 ? "workflow" : "user");
    setCatStatus(options.status || action.status, options.detail || action.detail);
    speakCat(pickLine(action, options.line));
    spawnPetFx(options.fx || action.fx, options.fxLabel || options.status || action.status);
    var duration = options.duration || action.duration;
    var performance = videoActions[id];
    if (performance && !motionQuery.matches) {
      duration = performance.duration + (performance.holdFor || 0) + 360;
      playPetVideo(id, token);
    }
    if (motionQuery.matches) duration = Math.min(duration, 720);
    activeReactionTimer = window.setTimeout(function () { finishPetAction(token); }, duration);
    return true;
  }

  function shuffled(ids) {
    var deck = ids.slice();
    for (var i = deck.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var held = deck[i];
      deck[i] = deck[j];
      deck[j] = held;
    }
    return deck;
  }

  function refillDeck() {
    reactionDeck = shuffled(clickReactionIds);
    if (recentReactions.length && reactionDeck[reactionDeck.length - 1] === recentReactions[recentReactions.length - 1]) {
      reactionDeck.unshift(reactionDeck.pop());
    }
  }

  function chooseReaction() {
    if (!reactionDeck.length) refillDeck();
    return reactionDeck.pop();
  }

  function releaseCapture(silent) {
    window.clearTimeout(captureTimer);
    window.clearTimeout(captureApproachTimer);
    captureTimer = 0;
    captureApproachTimer = 0;
    document.body.classList.remove("mouse-captured");
    el.captive.hidden = true;
    clearPetAction(true);
    if (!silent) {
      speakCat("好啦，鼠标还你。");
      setCatStatus("RELEASED", "pointer returned");
      window.setTimeout(function () {
        if (!currentAction) setCatStatus("IDLE", document.body.classList.contains("focus-mode") ? "focus loop" : "watching time");
      }, 900);
    }
    scheduleAmbient(false);
  }

  function captureMouse(event) {
    releaseCapture(true);
    playPetAction("capture", { force: true, source: "surprise" });
    var rect = el.cat.getBoundingClientRect();
    captureApproachTimer = window.setTimeout(function () {
      document.body.classList.add("mouse-captured");
      el.captive.hidden = false;
      el.captive.style.left = event.clientX + "px";
      el.captive.style.top = event.clientY + "px";
      window.requestAnimationFrame(function () {
        el.captive.style.left = rect.left + rect.width * .48 + "px";
        el.captive.style.top = rect.top + rect.height * .72 + "px";
      });
    }, 2350);
    captureTimer = window.setTimeout(function () {
      releaseCapture(false);
    }, 8340);
  }

  function touchCat(event) {
    if (captureTimer) {
      speakCat("再玩一下嘛，三秒到了就松爪。");
      return;
    }
    var canCapture = event && typeof event.clientX === "number" && event.clientX > 0;
    var captureAllowed = recentReactions.indexOf("capture") === -1 && Math.random() < .08;
    if (canCapture && captureAllowed) {
      recentReactions.push("capture");
      recentReactions = recentReactions.slice(-6);
      captureMouse(event);
      return;
    }
    var reactionId = chooseReaction();
    recentReactions.push(reactionId);
    recentReactions = recentReactions.slice(-6);
    playPetAction(reactionId, { source: "click", priority: 80 });
  }

  function handleCatClick(event) {
    if (longPressFired) {
      longPressFired = false;
      return;
    }
    window.clearTimeout(clickTimer);
    var point = { clientX: event.clientX, clientY: event.clientY };
    clickTimer = window.setTimeout(function () { touchCat(point); }, 230);
  }

  function handleCatDoubleClick(event) {
    event.preventDefault();
    window.clearTimeout(clickTimer);
    clickTimer = 0;
    playPetAction("reboot", { force: true, source: "double-click" });
  }

  function beginCatHold(event) {
    if (event.button !== undefined && event.button !== 0) return;
    longPressFired = false;
    window.clearTimeout(longPressTimer);
    longPressTimer = window.setTimeout(function () {
      longPressFired = true;
      playPetAction("purr", { force: true, source: "long-press" });
    }, 620);
  }

  function endCatHold() {
    window.clearTimeout(longPressTimer);
    longPressTimer = 0;
  }

  function trackCatPointer(event) {
    if (event.pointerType === "touch" || pointerFrame) return;
    var x = event.clientX;
    var y = event.clientY;
    pointerFrame = window.requestAnimationFrame(function () {
      pointerFrame = 0;
      var rect = el.cat.getBoundingClientRect();
      var nx = Math.max(-1, Math.min(1, (x - rect.left) / rect.width * 2 - 1));
      var ny = Math.max(-1, Math.min(1, (y - rect.top) / rect.height * 2 - 1));
      el.cat.style.setProperty("--look-x", (nx * 4).toFixed(1) + "px");
      el.cat.style.setProperty("--look-y", (ny * 3).toFixed(1) + "px");
      el.cat.classList.add("is-pointer-near");
    });
  }

  function resetCatPointer() {
    el.cat.style.setProperty("--look-x", "0px");
    el.cat.style.setProperty("--look-y", "0px");
    el.cat.classList.remove("is-pointer-near");
    endCatHold();
  }

  function refillFocusDeck() {
    focusDeck = focusScenes.map(function (scene) { return scene.id; });
    for (var i = focusDeck.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var held = focusDeck[i];
      focusDeck[i] = focusDeck[j];
      focusDeck[j] = held;
    }
  }

  function playFocusScene(forcedId) {
    if (!document.body.classList.contains("focus-mode") || document.hidden || captureTimer) return;
    if (motionQuery.matches && !forcedId) return;
    window.clearTimeout(idleTimer);
    idleTimer = 0;
    clearPetAction(true);
    if (!focusDeck.length) refillFocusDeck();
    var id = forcedId || focusDeck.pop();
    var scene = focusScenes.find(function (item) { return item.id === id; });
    if (!scene) return false;
    currentAction = "focus:" + scene.id;
    currentPriority = 10;
    var token = actionToken;
    el.tonight.dataset.focusScene = scene.id;
    speakCat(scene.line);
    el.cat.dataset.petSource = "ambient";
    setCatStatus(scene.status, scene.detail);
    spawnPetFx(scene.id === "checksum" ? "compile" : scene.id === "cursor" ? "scan" : "");
    activeReactionTimer = window.setTimeout(function () { finishPetAction(token); }, motionQuery.matches ? 700 : scene.duration);
    return true;
  }

  function isTyping() {
    var active = document.activeElement;
    return !!active && ["INPUT", "TEXTAREA", "SELECT"].indexOf(active.tagName) !== -1;
  }

  function playAmbient() {
    if (document.hidden || document.body.classList.contains("intro-mode") || document.body.classList.contains("complete-mode") || isTyping() || currentAction || captureTimer) return false;
    if (document.body.classList.contains("focus-mode")) return playFocusScene();
    var choices = ambientReactionIds.filter(function (id) {
      return id !== recentReactions[recentReactions.length - 1];
    });
    var id = choices[Math.floor(Math.random() * choices.length)];
    recentReactions.push(id);
    recentReactions = recentReactions.slice(-6);
    return playPetAction(id, { priority: 10, source: "ambient" });
  }

  function scheduleAmbient(first) {
    window.clearTimeout(idleTimer);
    if (!petReady || document.hidden || motionQuery.matches || document.body.classList.contains("intro-mode") || document.body.classList.contains("complete-mode")) return;
    var focus = document.body.classList.contains("focus-mode");
    var delay = focus
      ? (first ? 4200 + Math.random() * 2200 : 12000 + Math.random() * 9000)
      : (first ? 16000 + Math.random() * 5000 : 26000 + Math.random() * 18000);
    idleTimer = window.setTimeout(function () {
      if (!playAmbient()) scheduleAmbient(false);
    }, delay);
  }

  function scheduleFocusScene(first) {
    scheduleAmbient(first);
  }

  function handleTimeChange(select) {
    updatePlan();
    renderWorkbenchContext(new Date(), true);
    var labels = {
      "off-time": state.off + " 收工。到时候咪来踩住键盘边边。",
      "bed-time": state.bed + " 钻进被窝。今晚能睡 " + durationText(durationMinutes(state.bed, state.wake)) + "。",
      "wake-time": state.wake + " 睁眼。咪先去窗边看看天亮没有。"
    };
    var buffer = durationMinutes(state.off, state.bed);
    if (buffer < 30) {
      playPetAction("warning", {
        line: "只剩 " + buffer + " 分钟洗漱啦，咪的尾巴都塞不进这条缝。"
      });
    } else {
      playPetAction("compile", { line: labels[select.id] });
    }
  }

  function monitorPetClock(now) {
    var phase = currentPhase(now);
    if (!lastPhaseId) {
      lastPhaseId = phase.id;
    } else if (phase.id !== lastPhaseId) {
      lastPhaseId = phase.id;
      if (phase.id === "winddown") {
        playPetAction("warning", { force: true, status: "STOP WORK", detail: "wind-down started", line: "到点啦。先关好工作资料，咪去门口等你。" });
      } else if (phase.id === "sleep") {
        playPetAction("nap", { force: true, priority: 70, line: "该睡啦。咪先团好位置，你快来。" });
      }
    }
    if (phase.id !== "work") {
      lastThreshold = phase.id;
      return;
    }
    var minutes = Math.max(0, Math.ceil((phase.target - now) / 60000));
    var threshold = minutes <= 5 ? "5" : minutes <= 15 ? "15" : minutes <= 30 ? "30" : "far";
    if (!lastThreshold) {
      lastThreshold = threshold;
      return;
    }
    if (threshold !== lastThreshold && threshold !== "far") {
      lastThreshold = threshold;
      playPetAction("warning", {
        line: minutes <= 5
          ? "只剩 " + minutes + " 分钟啦，把手里这一小段收好。"
          : "还有 " + minutes + " 分钟。咪开始在收工那格旁边绕圈。"
      });
    } else {
      lastThreshold = threshold;
    }
  }

  function restorePageScroll(target, attempts) {
    window.scrollTo({ left: 0, top: target, behavior: "instant" });
    if (attempts > 0) {
      window.setTimeout(function () { restorePageScroll(target, attempts - 1); }, 120);
    }
  }

  function finishFocusExit(restoreTarget) {
    window.clearTimeout(idleTimer);
    document.body.classList.remove("focus-mode");
    el.focusToggle.setAttribute("aria-pressed", "false");
    el.focusToggle.querySelector("span:last-child").textContent = "专注";
    speakCat("回来啦。咪也回右边趴好。");
    setCatStatus("OVERVIEW", "context restored");
    scheduleAmbient(true);
    window.setTimeout(function () { restorePageScroll(restoreTarget, 4); }, 90);
  }

  function setFocusMode(active, requestNative) {
    clearPetAction(true);
    if (active) {
      savedScrollY = window.scrollY;
      window.scrollTo(0, 0);
      document.body.classList.add("focus-mode");
      el.focusToggle.setAttribute("aria-pressed", "true");
      el.focusToggle.querySelector("span:last-child").textContent = "全览";
      speakCat("你看大数字，咪去守着最后两位。");
      setCatStatus("FOCUS", "timer foreground");
      scheduleFocusScene(true);
      if (requestNative && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function () {});
      }
    } else {
      var restoreTarget = savedScrollY;
      if (requestNative && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen()
          .then(function () { finishFocusExit(restoreTarget); })
          .catch(function () { finishFocusExit(restoreTarget); });
        return;
      }
      finishFocusExit(restoreTarget);
    }
  }

  function showIntro(force) {
    var seen = false;
    try { seen = sessionStorage.getItem(INTRO_KEY) === state.night; } catch (error) {}
    if ((qaMode || seen) && !force && !new URLSearchParams(location.search).has("intro")) {
      el.prelude.hidden = true;
      document.body.classList.remove("intro-mode");
      el.app.removeAttribute("aria-hidden");
      el.app.inert = false;
      return;
    }
    document.body.classList.add("intro-mode");
    el.app.setAttribute("aria-hidden", "true");
    el.app.inert = true;
    el.prelude.hidden = false;
    el.prelude.classList.remove("is-leaving", "is-alive");
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { el.prelude.classList.add("is-alive"); });
    });
  }

  function leaveIntro() {
    if (el.prelude.hidden) return;
    el.prelude.classList.add("is-leaving");
    try { sessionStorage.setItem(INTRO_KEY, state.night); } catch (error) {}
    window.setTimeout(function () {
      el.prelude.hidden = true;
      el.prelude.classList.remove("is-leaving", "is-alive");
      document.body.classList.remove("intro-mode");
      el.app.removeAttribute("aria-hidden");
      el.app.inert = false;
      el.focusToggle.focus({ preventScroll: true });
      scheduleAmbient(true);
    }, 720);
  }

  function tick() {
    var now = new Date();
    el.clock.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
    renderPhase(now);
    renderWorkbenchContext(now, false);
    if (petReady) monitorPetClock(now);
  }

  function qaEvent(name) {
    var map = {
      "time-change": ["compile", "时间挪好啦，三格我都踩过一遍。"],
      "task-add": ["packet", "明早多一件事，咪先拿爪子压住。"],
      "task-done": ["pass", "这件打勾啦，可以放下了。"],
      "all-done": ["celebrate", "明早的清单空啦，摸摸咪的头嘛。"],
      "task-clear": ["purge", "我先把清单藏好，反悔了还能找回来。"],
      "task-undo": ["rollback", "好嘛，又给你叼回来啦。"],
      "handoff": ["handoff", "咪记住这里啦，明早接着来。"],
      "warning": ["warning", "到点啦，咪来催你收尾。"],
      "theme": ["theme", "光换颜色啦，咪也换一身毛。"],
      "breathe": ["breathe", "你慢慢呼，咪的小肚皮陪你一起一伏。"]
    };
    if (!map[name]) return false;
    return playPetAction(map[name][0], { force: true, source: "qa-event", line: map[name][1] });
  }

  function petSnapshot() {
    return {
      version: "12.24",
      action: currentAction || "idle",
      priority: currentPriority,
      reaction: el.cat.dataset.reaction || "",
      source: el.cat.dataset.petSource || "",
      focusScene: el.tonight.dataset.focusScene || "",
      status: el.catStateKind.textContent,
      detail: el.catStateDetail.textContent,
      line: el.catLine.textContent,
      fx: el.catFx.dataset.fx || "",
      captured: document.body.classList.contains("mouse-captured"),
      focusMode: document.body.classList.contains("focus-mode"),
      hidden: document.hidden,
      reducedMotion: motionQuery.matches
    };
  }

  function installQaLab() {
    if (!qaMode) return;
    document.documentElement.dataset.qa = "true";
    var lab = {
      version: "12.24",
      actions: Object.keys(petActions),
      focusScenes: focusScenes.map(function (scene) { return scene.id; }),
      events: ["time-change", "task-add", "task-done", "all-done", "task-clear", "task-undo", "handoff", "warning", "theme", "breathe"],
      play: function (id) {
        return playPetAction(id, { force: true, source: "qa", duration: 900 });
      },
      event: qaEvent,
      focus: function (id) {
        if (!document.body.classList.contains("focus-mode")) setFocusMode(true, false);
        return playFocusScene(id);
      },
      capture: function (x, y) {
        captureMouse({ clientX: Number(x) || innerWidth * .7, clientY: Number(y) || innerHeight * .45 });
        return true;
      },
      release: function () {
        releaseCapture(true);
        return petSnapshot();
      },
      reset: function () {
        window.clearTimeout(clickTimer);
        endCatHold();
        releaseCapture(true);
        clearPetAction(true);
        resetCatPointer();
        setCatStatus("IDLE", document.body.classList.contains("focus-mode") ? "focus loop" : "watching time");
        return petSnapshot();
      },
      snapshot: petSnapshot
    };
    window.__lastCommitCatLab = lab;
    document.documentElement.dataset.qaActions = String(lab.actions.length);
    document.documentElement.dataset.qaFocusScenes = String(lab.focusScenes.length);
    var panel = document.createElement("div");
    panel.className = "cat-qa-panel";
    panel.id = "cat-qa-panel";
    panel.setAttribute("aria-label", "桌宠测试控制台");
    function qaButton(label, attribute, value, callback) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute(attribute, value);
      button.addEventListener("click", callback);
      panel.appendChild(button);
    }
    lab.actions.forEach(function (id) {
      qaButton(id, "data-qa-action", id, function () { lab.play(id); });
    });
    lab.focusScenes.forEach(function (id) {
      qaButton("focus:" + id, "data-qa-focus", id, function () { lab.focus(id); });
    });
    lab.events.forEach(function (id) {
      qaButton("event:" + id, "data-qa-event", id, function () { lab.event(id); });
    });
    qaButton("capture", "data-qa-command", "capture", function () { lab.capture(); });
    qaButton("release", "data-qa-command", "release", function () { lab.release(); });
    qaButton("reset", "data-qa-command", "reset", function () { lab.reset(); });
    document.body.appendChild(panel);
    document.addEventListener("last-commit-cat-qa", function () {
      var command = {};
      try { command = JSON.parse(document.documentElement.dataset.qaCommand || "{}"); } catch (error) {}
      var result = false;
      if (command.type === "play") result = lab.play(command.name);
      else if (command.type === "event") result = lab.event(command.name);
      else if (command.type === "focus") result = lab.focus(command.name);
      else if (command.type === "capture") result = lab.capture(command.x, command.y);
      else if (command.type === "release") result = lab.release();
      else if (command.type === "reset") result = lab.reset();
      else if (command.type === "snapshot") result = lab.snapshot();
      document.documentElement.dataset.qaResult = JSON.stringify({
        ok: result !== false,
        result: typeof result === "object" ? result : petSnapshot()
      });
    });
  }

  populateSelect(el.off, state.off);
  populateSelect(el.bed, state.bed);
  populateSelect(el.wake, state.wake);
  [el.off, el.bed, el.wake].forEach(upgradeTimeSelect);
  el.dump.value = state.dump;
  el.nightIndex.textContent = String(Math.floor((dateFromKey(state.night) - new Date(2026, 0, 1)) / 86400000) + 1).padStart(3, "0");
  el.preludeHour.textContent = state.off.slice(0, 2);
  el.preludeMinute.textContent = state.off.slice(3, 5);

  el.themeButtons.forEach(function (button) {
    button.addEventListener("click", function () { applyTheme(button.dataset.themeChoice); });
  });
  [el.off, el.bed, el.wake].forEach(function (select) {
    select.addEventListener("change", function () { handleTimeChange(select); });
  });
  document.addEventListener("pointerdown", function (event) {
    if (openTimePicker && !openTimePicker.root.contains(event.target)) closeTimePicker(false);
  });
  el.recalculate.addEventListener("click", recommendedPlan);
  el.sleepGoalDown.addEventListener("click", function () { setSleepGoal(state.sleepGoal - 15, true); });
  el.sleepGoalUp.addEventListener("click", function () { setSleepGoal(state.sleepGoal + 15, true); });
  el.sleepPresets.forEach(function (button) {
    button.addEventListener("click", function () { setSleepGoal(Number(button.dataset.sleepPreset), true); });
  });
  el.dump.addEventListener("input", function () {
    state.dump = el.dump.value;
    resizeDump();
    saveState();
  });
  el.taskAdd.addEventListener("click", addTask);
  el.taskInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      addTask();
    }
  });
  el.taskClear.addEventListener("click", clearTasks);
  el.taskUndo.addEventListener("click", undoTasks);
  el.handoffButton.addEventListener("click", handoff);
  el.exportCopy.addEventListener("click", copyMemo);
  el.exportMd.addEventListener("click", exportMarkdown);
  el.exportIcs.addEventListener("click", exportCalendar);
  el.breathButton.addEventListener("click", startBreathing);
  el.breathToggle.addEventListener("click", startBreathing);
  el.breathReset.addEventListener("click", function () {
    var hadStarted = breathClock.status !== "idle";
    clearBreathing();
    if (hadStarted) playPetAction("rollback", { line: "好嘛，重新来。刚才那几口就当咪没数。" });
  });
  el.finishNight.addEventListener("click", completeNight);
  el.completeClose.addEventListener("click", closeCompleteScreen);
  el.resetTonight.addEventListener("click", resetTonight);
  if (el.copyrightTrigger && el.copyrightDialog && el.copyrightClose) {
    el.copyrightTrigger.addEventListener("click", openCopyright);
    el.copyrightClose.addEventListener("click", closeCopyright);
    el.copyrightDialog.addEventListener("click", function (event) {
      if (event.target === el.copyrightDialog) closeCopyright();
    });
    el.copyrightDialog.addEventListener("close", function () {
      document.body.classList.remove("rights-open");
    });
    Array.prototype.slice.call(document.querySelectorAll("[data-rights-tab]")).forEach(function (tab, index, tabs) {
      tab.addEventListener("click", function () {
        selectRightsTab(tab.dataset.rightsTab, false);
      });
      tab.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        var direction = event.key === "ArrowRight" ? 1 : -1;
        var next = (index + direction + tabs.length) % tabs.length;
        selectRightsTab(tabs[next].dataset.rightsTab, true);
      });
    });
  }
  el.calendarPrev.addEventListener("click", function () { moveCalendar(-1); });
  el.calendarNext.addEventListener("click", function () { moveCalendar(1); });
  el.cat.addEventListener("click", handleCatClick);
  el.cat.addEventListener("dblclick", handleCatDoubleClick);
  el.cat.addEventListener("pointerdown", beginCatHold);
  el.cat.addEventListener("pointerup", endCatHold);
  el.cat.addEventListener("pointercancel", endCatHold);
  el.cat.addEventListener("pointermove", trackCatPointer);
  el.cat.addEventListener("pointerleave", resetCatPointer);
  el.cat.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      playPetAction(event.repeat ? "blink" : "paw", { force: true, source: "keyboard" });
    }
  });
  el.focusToggle.addEventListener("click", function () {
    setFocusMode(!document.body.classList.contains("focus-mode"), false);
  });
  el.focusExit.addEventListener("click", function () { setFocusMode(false, false); });
  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement && document.body.classList.contains("focus-mode")) {
      setFocusMode(false, false);
    }
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      window.clearTimeout(idleTimer);
      releaseCapture(true);
      clearPetAction(true);
    } else {
      if (breathClock.status === "running") {
        window.cancelAnimationFrame(breathFrame);
        renderBreathing(performance.now());
      }
      scheduleAmbient(true);
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.body.classList.contains("complete-mode")) {
      closeCompleteScreen();
      return;
    }
    if (event.key === "Escape" && el.copyrightDialog && el.copyrightDialog.hasAttribute("open")) {
      closeCopyright();
      return;
    }
    if (event.key === "Escape" && captureTimer) {
      releaseCapture(false);
      return;
    }
    if (event.key === "Escape" && document.body.classList.contains("focus-mode") && !document.fullscreenElement) {
      setFocusMode(false, false);
    }
    if (event.key === "Enter" && !el.prelude.hidden) leaveIntro();
  });
  el.preludeEnter.addEventListener("click", leaveIntro);
  el.replayIntro.addEventListener("click", function () { showIntro(true); });
  var handleMotionChange = function () {
    clearPetAction(true);
    scheduleAmbient(true);
  };
  if (motionQuery.addEventListener) motionQuery.addEventListener("change", handleMotionChange);
  else if (motionQuery.addListener) motionQuery.addListener(handleMotionChange);

  applyTheme(state.theme, false);
  updatePlan();
  resizeDump();
  renderWorkbenchContext(new Date(), true);
  renderHistory();
  clearBreathing();
  bindActiveZones();
  petReady = true;
  setCatStatus("IDLE", "watching time");
  installQaLab();
  tick();
  window.setInterval(tick, 1000);
  showIntro(false);
  scheduleAmbient(true);
})();
