import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

(() => {
  const SUPABASE_URL = 'https://cxlkzxpstlekcwscnsom.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_PNQ9q1pwf3wi5fZjW3nOQg_87cWiEc1';
  const TABLE_NAME = 'try1';
  const STORAGE_KEY = 'dishwasher_tally_v1';
  const FAMILY_STORAGE_KEY = 'family_chores_extra_v1';

  const PEOPLE = [
    { id: 'papa', name: 'Papa', initial: 'P', defaultColor: '#ffb020' },
    { id: 'lena', name: 'Lena', initial: 'L', defaultColor: '#3dc8ff' },
    { id: 'jojo', name: 'Jojo', initial: 'J', defaultColor: '#ff4f9a' },
  ];
  const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const SHORT_DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const state = { lena: 0, jojo: 0 };
  const familyState = createDefaultFamilyState();
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const els = {
    loading: document.getElementById('loading'),
    lenaCount: document.getElementById('lena-count'),
    jojoCount: document.getElementById('jojo-count'),
    lenaCard: document.getElementById('lena-card'),
    jojoCard: document.getElementById('jojo-card'),
    heroName: document.getElementById('hero-name'),
    heroSub: document.getElementById('hero-sub'),
    barLena: document.getElementById('bar-lena'),
    barJojo: document.getElementById('bar-jojo'),
    barLabelLena: document.getElementById('bar-label-lena'),
    barLabelJojo: document.getElementById('bar-label-jojo'),
    saveDot: document.getElementById('save-dot'),
    oracleOverlay: document.getElementById('oracle-overlay'),
    oracleStatus: document.getElementById('oracle-status'),
    oracleResult: document.getElementById('oracle-result'),
    oracleConfetti: document.getElementById('oracle-confetti'),
    quoteToast: document.getElementById('quote-toast'),
    quoteText: document.getElementById('quote-text'),
    colorDock: document.getElementById('color-dock'),
    weekCalendar: document.getElementById('week-calendar'),
    todayPanel: document.getElementById('today-panel'),
    todayTitle: document.getElementById('today-title'),
    todayStatus: document.getElementById('today-status'),
    todayDoneCheck: document.getElementById('today-done-check'),
    todayDoneBtn: document.getElementById('today-done-btn'),
    kitchenLeaderboard: document.getElementById('kitchen-leaderboard'),
    weekendBlock: document.getElementById('weekend-block'),
    weekendStatePill: document.getElementById('weekend-state-pill'),
    weekendGrid: document.getElementById('weekend-grid'),
    weekendBoardToggle: document.getElementById('weekend-board-toggle'),
    weekendLeaderboards: document.getElementById('weekend-leaderboards'),
    currentWeekendBoard: document.getElementById('current-weekend-board'),
    allWeekendBoard: document.getElementById('all-weekend-board'),
    editOverlay: document.getElementById('edit-overlay'),
    editList: document.getElementById('edit-list'),
  };

  function createDefaultFamilyState() {
    return {
      colors: { papa: '#ffb020', lena: '#3dc8ff', jojo: '#ff4f9a' },
      kitchenSchedule: ['papa', 'lena', 'jojo', 'papa', 'lena', 'jojo', 'papa'],
      kitchenDone: {},
      weekendTasks: {
        papa: ['Kochen', 'Klo putzen'],
        lena: ['Erdgeschoss wischen', 'Unteres Bad', 'Waschbecken'],
        jojo: ['Obergeschoss wischen', 'Oberes Bad', 'Spiegel', 'Treppe'],
      },
      weekendCompletions: {},
      weekendTotals: { papa: 0, lena: 0, jojo: 0 },
      weekendSpeedSums: { papa: 0, lena: 0, jojo: 0 },
      weekendSpeedCounts: { papa: 0, lena: 0, jojo: 0 },
      notifiedHalfDone: {},
    };
  }

  async function loadState() {
    await Promise.all([loadDishwasherState(), loadFamilyState()]);
    renderAll();
    renderFamily();
    maybeSendHalfWeekendReminder();
    els.loading.classList.add('hidden');
  }

  async function loadDishwasherState() {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('state, value')
        .in('state', ['lena', 'jojo']);

      if (error) throw error;

      for (const row of data ?? []) {
        if (row.state === 'lena') state.lena = Number(row.value) || 0;
        if (row.state === 'jojo') state.jojo = Number(row.value) || 0;
      }
    } catch (error) {
      console.error('Fehler beim Laden aus Supabase:', error);
      const parsed = await readStoredJson(STORAGE_KEY);
      if (parsed) {
        state.lena = Number(parsed.lena) || 0;
        state.jojo = Number(parsed.jojo) || 0;
      }
    }
  }

  async function loadFamilyState() {
    const stored = await readStoredJson(FAMILY_STORAGE_KEY);
    if (!stored) return;

    Object.assign(familyState.colors, stored.colors ?? {});
    if (Array.isArray(stored.kitchenSchedule) && stored.kitchenSchedule.length === 7) {
      familyState.kitchenSchedule = stored.kitchenSchedule.map(id => getPerson(id)?.id ?? 'papa');
    }
    familyState.kitchenDone = stored.kitchenDone ?? {};
    familyState.weekendTasks = {
      ...familyState.weekendTasks,
      ...(stored.weekendTasks ?? {}),
    };
    familyState.weekendCompletions = stored.weekendCompletions ?? {};
    familyState.weekendTotals = { ...familyState.weekendTotals, ...(stored.weekendTotals ?? {}) };
    familyState.weekendSpeedSums = { ...familyState.weekendSpeedSums, ...(stored.weekendSpeedSums ?? {}) };
    familyState.weekendSpeedCounts = { ...familyState.weekendSpeedCounts, ...(stored.weekendSpeedCounts ?? {}) };
    familyState.notifiedHalfDone = stored.notifiedHalfDone ?? {};
  }

  async function saveState() {
    try {
      const payload = [
        { state: 'lena', value: state.lena },
        { state: 'jojo', value: state.jojo },
      ];

      const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(payload, { onConflict: 'state' });

      if (error) throw error;

      await writeStoredJson(STORAGE_KEY, { lena: state.lena, jojo: state.jojo, updatedAt: Date.now() });
      pulseSaved(true);
    } catch (error) {
      console.error('Fehler beim Speichern in Supabase:', error);
      await writeStoredJson(STORAGE_KEY, { lena: state.lena, jojo: state.jojo, updatedAt: Date.now() });
      pulseSaved(false);
    }
  }

  async function saveFamilyState() {
    await writeStoredJson(FAMILY_STORAGE_KEY, { ...familyState, updatedAt: Date.now() });
    pulseSaved(true);
  }

  async function readStoredJson(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {
      // LocalStorage kann in manchen WebViews blockiert sein.
    }

    try {
      if (!window.storage) return null;
      const res = await window.storage.get(key, true);
      return res?.value ? JSON.parse(res.value) : null;
    } catch {
      return null;
    }
  }

  async function writeStoredJson(key, value) {
    const serialized = JSON.stringify(value);
    try {
      localStorage.setItem(key, serialized);
    } catch {
      // Fallback unten
    }

    try {
      if (window.storage) await window.storage.set(key, serialized, true);
    } catch {
      // Automatisches Speichern ist ein Komfort, die UI bleibt trotzdem nutzbar.
    }
  }

  function pulseSaved(ok) {
    els.saveDot.classList.remove('ok', 'err');
    void els.saveDot.offsetWidth;
    els.saveDot.classList.add(ok ? 'ok' : 'err');
  }

  function renderAll() {
    els.lenaCount.textContent = state.lena;
    els.jojoCount.textContent = state.jojo;
    els.barLabelLena.textContent = state.lena;
    els.barLabelJojo.textContent = state.jojo;

    const total = state.lena + state.jojo;
    const lenaPct = total === 0 ? 50 : Math.round((state.lena / total) * 100);
    els.barLena.style.width = lenaPct + '%';
    els.barJojo.style.width = 100 - lenaPct + '%';

    if (state.lena === state.jojo) {
      els.heroName.textContent = 'Unentschieden';
      els.heroName.className = 'due-name tie';
      els.heroSub.textContent = 'Beide gleich oft dran gewesen - wer zuerst spuelt, sichert sich Pluspunkte';
    } else {
      const dueLena = state.lena < state.jojo;
      els.heroName.textContent = dueLena ? 'Lena' : 'Jojo';
      els.heroName.className = 'due-name ' + (dueLena ? 'lena' : 'jojo');
      const diff = Math.abs(state.lena - state.jojo);
      els.heroSub.textContent = `${diff}x weniger ausgeraeumt`;
    }
  }

  function renderFamily() {
    renderColorDock();
    renderWeekCalendar();
    renderTodayPanel();
    renderKitchenLeaderboard();
    renderWeekend();
  }

  function renderColorDock() {
    els.colorDock.innerHTML = PEOPLE.map(person => `
      <label class="color-chip" style="--person-color:${getColor(person.id)}">
        <span>${person.initial}</span>
        <strong>${person.name}</strong>
        <input type="color" value="${getColor(person.id)}" data-color-person="${person.id}" aria-label="Farbe fuer ${person.name}">
      </label>
    `).join('');
  }

  function renderWeekCalendar() {
    const todayIndex = getMondayIndex(new Date());
    const todayKey = getDateKey(new Date());

    els.weekCalendar.innerHTML = DAY_NAMES.map((dayName, index) => {
      const assignedId = familyState.kitchenSchedule[index];
      const assigned = getPerson(assignedId);
      const done = familyState.kitchenDone[todayKey] === assignedId && index === todayIndex;
      const isToday = index === todayIndex;
      const options = PEOPLE.map(person => `
        <button
          class="person-dot ${person.id === assignedId ? 'active' : ''}"
          style="--person-color:${getColor(person.id)}"
          data-assign-day="${index}"
          data-assign-person="${person.id}"
          aria-label="${dayName} ${person.name} zuweisen">${person.initial}</button>
      `).join('');

      return `
        <article class="day-card ${isToday ? 'today' : ''} ${done ? 'done' : ''}" style="--person-color:${getColor(assignedId)}">
          <div class="day-top">
            <span>${SHORT_DAY_NAMES[index]}</span>
            ${isToday ? '<b>Heute</b>' : ''}
          </div>
          <h3>${dayName}</h3>
          <div class="assigned">
            <span class="assigned-dot"></span>
            <strong>${assigned.name}</strong>
          </div>
          <div class="assign-row">${options}</div>
        </article>
      `;
    }).join('');
  }

  function renderTodayPanel() {
    const today = new Date();
    const todayIndex = getMondayIndex(today);
    const assignedId = familyState.kitchenSchedule[todayIndex];
    const assigned = getPerson(assignedId);
    const todayKey = getDateKey(today);
    const isDone = familyState.kitchenDone[todayKey] === assignedId;

    els.todayPanel.style.setProperty('--person-color', getColor(assignedId));
    els.todayTitle.textContent = `${assigned.name} hat heute Küchendienst`;
    els.todayStatus.textContent = isDone ? 'Erledigt - sauber abgehakt.' : `${DAY_NAMES[todayIndex]} ist noch offen.`;
    els.todayDoneCheck.classList.toggle('show', isDone);
    els.todayDoneBtn.textContent = isDone ? 'Heute erledigt' : 'Heute abhaken';
    els.todayDoneBtn.disabled = isDone;
  }

  function renderKitchenLeaderboard() {
    const scores = PEOPLE.map(person => ({
      ...person,
      score: Object.values(familyState.kitchenDone).filter(id => id === person.id).length,
    })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    els.kitchenLeaderboard.innerHTML = scores.map((person, index) => leaderboardRow(person, person.score, `${person.score}x erledigt`, index)).join('');
  }

  function renderWeekend() {
    const weekend = isWeekend(new Date());
    const key = getWeekendKey(new Date());
    const completions = familyState.weekendCompletions[key] ?? {};

    els.weekendBlock.classList.toggle('active-weekend', weekend);
    els.weekendStatePill.textContent = weekend ? 'Jetzt bunt & aktiv' : 'Wird nächstes Wochenende freigeschaltet';

    els.weekendGrid.innerHTML = PEOPLE.map(person => {
      const tasks = familyState.weekendTasks[person.id] ?? [];
      const completedAt = completions[person.id];
      return `
        <article class="weekend-card ${completedAt ? 'complete' : ''}" style="--person-color:${getColor(person.id)}">
          <div class="weekend-person">
            <span>${person.initial}</span>
            <div>
              <h4>${person.name}</h4>
              <p>${tasks.length} Aufgaben als Paket</p>
            </div>
          </div>
          <ul>${tasks.map(task => `<li>${escapeHtml(task)}</li>`).join('')}</ul>
          <button class="package-btn" data-weekend-done="${person.id}" ${!weekend || completedAt ? 'disabled' : ''}>
            ${completedAt ? `Erledigt um ${formatTime(completedAt)}` : 'Paket abhaken'}
          </button>
        </article>
      `;
    }).join('');

    renderWeekendBoards();
  }

  function renderWeekendBoards() {
    const key = getWeekendKey(new Date());
    const completions = familyState.weekendCompletions[key] ?? {};
    const currentRows = PEOPLE
      .map(person => ({ ...person, at: completions[person.id] ?? null }))
      .sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity));

    els.currentWeekendBoard.innerHTML = currentRows.map((person, index) => {
      const text = person.at ? `nach ${formatDuration(person.at - getWeekendStartMs(key))}` : 'noch offen';
      return leaderboardRow(person, person.at ? index + 1 : '-', text, index);
    }).join('');

    const allRows = PEOPLE.map(person => {
      const count = familyState.weekendSpeedCounts[person.id] || 0;
      const avg = count ? familyState.weekendSpeedSums[person.id] / count : null;
      return { ...person, score: familyState.weekendTotals[person.id] || 0, avg };
    }).sort((a, b) => b.score - a.score || (a.avg ?? Infinity) - (b.avg ?? Infinity));

    els.allWeekendBoard.innerHTML = allRows.map((person, index) => {
      const avgText = person.avg ? `Ø ${formatDuration(person.avg)}` : 'noch kein Paket';
      return leaderboardRow(person, person.score, `${person.score}x fertig, ${avgText}`, index);
    }).join('');
  }

  function leaderboardRow(person, value, label, index) {
    return `
      <div class="leader-row" style="--person-color:${getColor(person.id)}">
        <span class="rank">${index + 1}</span>
        <span class="leader-avatar">${person.initial}</span>
        <strong>${person.name}</strong>
        <span>${label}</span>
        <b>${value}</b>
      </div>
    `;
  }

  function bump(user) {
    state[user]++;
    renderAll();
    saveState();
    floatText(user, '+1', 'float-plus');
    punch(user);
  }

  function decrement(user) {
    if (state[user] <= 0) return;
    state[user]--;
    renderAll();
    saveState();
    floatText(user, '-1', 'float-minus');
    punch(user);
  }

  function floatText(user, text, cls) {
    const card = user === 'lena' ? els.lenaCard : els.jojoCard;
    const span = document.createElement('span');
    span.className = cls;
    span.textContent = text;
    span.style.left = (42 + Math.random() * 16) + '%';
    card.appendChild(span);
    setTimeout(() => span.remove(), 900);
  }

  function punch(user) {
    const card = user === 'lena' ? els.lenaCard : els.jojoCard;
    card.classList.remove('punch');
    void card.offsetWidth;
    card.classList.add('punch');
  }

  function bindLongPress(el, user, options = {}) {
    let timer = null;
    let longPressed = false;
    const start = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      longPressed = false;
      el.classList.add('holding');
      clearTimeout(timer);
      timer = setTimeout(() => {
        longPressed = true;
        decrement(user);
        el.classList.remove('holding');
        if (navigator.vibrate) navigator.vibrate(25);
      }, 650);
    };
    const cancel = () => {
      clearTimeout(timer);
      el.classList.remove('holding');
    };

    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', cancel);
    el.addEventListener('pointerleave', cancel);
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('contextmenu', e => e.preventDefault());

    if (options.suppressClickAfterLongPress) {
      el.addEventListener('click', (event) => {
        if (!longPressed) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        longPressed = false;
      }, true);
    }
  }

  function markTodayKitchenDone() {
    const todayIndex = getMondayIndex(new Date());
    const assignedId = familyState.kitchenSchedule[todayIndex];
    familyState.kitchenDone[getDateKey(new Date())] = assignedId;
    saveFamilyState();
    renderFamily();
  }

  function completeWeekendPackage(personId) {
    if (!isWeekend(new Date())) return;
    const key = getWeekendKey(new Date());
    familyState.weekendCompletions[key] ??= {};
    if (familyState.weekendCompletions[key][personId]) return;

    const completedAt = Date.now();
    const duration = Math.max(0, completedAt - getWeekendStartMs(key));
    familyState.weekendCompletions[key][personId] = completedAt;
    familyState.weekendTotals[personId] = (familyState.weekendTotals[personId] || 0) + 1;
    familyState.weekendSpeedSums[personId] = (familyState.weekendSpeedSums[personId] || 0) + duration;
    familyState.weekendSpeedCounts[personId] = (familyState.weekendSpeedCounts[personId] || 0) + 1;
    saveFamilyState();
    renderFamily();
    notifyLocally(`${getPerson(personId).name} ist fertig`, 'Das Wochenendpaket wurde gerade abgehakt.');
  }

  function openEditModal() {
    renderEditList();
    els.editOverlay.classList.add('open');
  }

  function closeEditModal() {
    els.editOverlay.classList.remove('open');
  }

  function renderEditList() {
    els.editList.innerHTML = PEOPLE.map(person => {
      const tasks = familyState.weekendTasks[person.id] ?? [];
      return `
        <section class="edit-person" style="--person-color:${getColor(person.id)}">
          <div class="edit-person-head">
            <span>${person.initial}</span>
            <h4>${person.name}</h4>
            <button type="button" data-add-task="${person.id}">+ Aufgabe</button>
          </div>
          <div class="task-edit-list">
            ${tasks.map((task, index) => `
              <label>
                <input value="${escapeAttribute(task)}" data-task-person="${person.id}" data-task-index="${index}">
                <button type="button" data-delete-task="${person.id}" data-delete-index="${index}" aria-label="Aufgabe loeschen">×</button>
              </label>
            `).join('')}
          </div>
        </section>
      `;
    }).join('');
  }

  function saveEditModal() {
    const nextTasks = {};
    for (const person of PEOPLE) nextTasks[person.id] = [];

    els.editList.querySelectorAll('[data-task-person]').forEach(input => {
      const personId = input.dataset.taskPerson;
      const value = input.value.trim();
      if (value) nextTasks[personId].push(value);
    });

    familyState.weekendTasks = nextTasks;
    saveFamilyState();
    renderFamily();
    closeEditModal();
  }

  function resetWeekendTasks() {
    familyState.weekendTasks = createDefaultFamilyState().weekendTasks;
    renderEditList();
  }

  function addTask(personId) {
    familyState.weekendTasks[personId] ??= [];
    familyState.weekendTasks[personId].push('Neue Aufgabe');
    renderEditList();
  }

  function deleteTask(personId, index) {
    familyState.weekendTasks[personId].splice(index, 1);
    renderEditList();
  }

  function getPerson(id) {
    return PEOPLE.find(person => person.id === id) ?? PEOPLE[0];
  }

  function getColor(personId) {
    return familyState.colors[personId] || getPerson(personId).defaultColor;
  }

  function getMondayIndex(date) {
    return (date.getDay() + 6) % 7;
  }

  function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function isWeekend(date) {
    return date.getDay() === 0 || date.getDay() === 6;
  }

  function getWeekendKey(date) {
    const copy = new Date(date);
    const day = copy.getDay();
    const diffToSaturday = day === 0 ? -1 : 6 - day;
    copy.setDate(copy.getDate() + diffToSaturday);
    copy.setHours(0, 0, 0, 0);
    return getDateKey(copy);
  }

  function getWeekendStartMs(key) {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
  }

  function formatTime(timestamp) {
    return new Intl.DateTimeFormat('de-AT', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
  }

  function formatDuration(ms) {
    const totalMinutes = Math.max(0, Math.round(ms / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days) return `${days}d ${hours}h`;
    if (hours) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[char]));
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }

  async function notifyLocally(title, body) {
    if (!('Notification' in window)) return;
    try {
      const permission = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission === 'granted') new Notification(title, { body });
    } catch {
      // Manche Browser erlauben Notifications nur unter HTTPS oder als installierte App.
    }
  }

  function maybeSendHalfWeekendReminder() {
    const now = new Date();
    if (now.getDay() !== 0 || now.getHours() < 12) return;
    const key = getWeekendKey(now);
    if (familyState.notifiedHalfDone[key]) return;
    const completed = familyState.weekendCompletions[key] ?? {};
    const openNames = PEOPLE.filter(person => !completed[person.id]).map(person => person.name);
    if (!openNames.length) return;

    familyState.notifiedHalfDone[key] = true;
    saveFamilyState();
    notifyLocally('Das Wochenende ist schon halb um', `${openNames.join(', ')}: Eure Wochenendpakete sind noch offen.`);
  }

  const oracleMessages = ['Stricherl werden gezaehlt ...', 'Fairness wird berechnet ...', 'Schicksal wird befragt ...', 'Ergebnis wird versiegelt ...'];
  let oracleInterval = null;

  function runOracle() {
    els.oracleOverlay.classList.add('open');
    els.oracleResult.classList.remove('show');
    els.oracleResult.textContent = '';
    els.oracleConfetti.innerHTML = '';
    els.oracleStatus.classList.remove('hidden');

    let i = 0;
    els.oracleStatus.textContent = oracleMessages[0];
    clearInterval(oracleInterval);
    oracleInterval = setInterval(() => {
      i = (i + 1) % oracleMessages.length;
      els.oracleStatus.textContent = oracleMessages[i];
    }, 380);

    setTimeout(() => {
      clearInterval(oracleInterval);
      els.oracleStatus.classList.add('hidden');
      let result;
      if (state.lena === state.jojo) {
        result = 'Unentschieden - beide sind dran!';
      } else {
        result = state.lena < state.jojo ? 'Lena ist dran!' : 'Jojo ist dran!';
      }
      els.oracleResult.textContent = result;
      els.oracleResult.classList.add('show');
      spawnConfetti();
    }, 1700);
  }

  function closeOracle() {
    els.oracleOverlay.classList.remove('open');
    clearInterval(oracleInterval);
  }

  function spawnConfetti() {
    const colors = ['#3D8BFF', '#18c78a', '#FF2E93', '#FFA14A', '#8B6CFF'];
    for (let n = 0; n < 26; n++) {
      const dot = document.createElement('span');
      dot.className = 'confetti-piece';
      dot.style.left = Math.random() * 100 + '%';
      dot.style.background = colors[Math.floor(Math.random() * colors.length)];
      dot.style.animationDelay = (Math.random() * 0.3) + 's';
      dot.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
      els.oracleConfetti.appendChild(dot);
    }
  }

  const quotesList = [
    'Ein sauberes Geschirrtuch ist die halbe Miete - ab an die Spuele!',
    'Teller stapeln sich nicht von selbst weg ... oh warte, doch. Also los!',
    'Du schaffst das! Danach schmeckt der Kaffee gleich besser.',
    'Stell dir vor, wie stolz dein Ich von morgen sein wird.',
    'Fuenf Minuten Einsatz fuer pures Kuechenglueck.',
    'Ruhm, Ehre und ein aufgeraeumter Geschirrspueler warten auf dich.',
    'Ausraeumen ist wie Meditation, nur mit Besteck.',
    'Los gehts - die Gabeln vermissen ihre Schublade!'
  ];
  let quoteTimer = null;

  function showQuote() {
    const q = quotesList[Math.floor(Math.random() * quotesList.length)];
    els.quoteText.textContent = q;
    els.quoteToast.classList.add('show');
    clearTimeout(quoteTimer);
    quoteTimer = setTimeout(() => els.quoteToast.classList.remove('show'), 6000);
  }

  function hideQuote() {
    clearTimeout(quoteTimer);
    els.quoteToast.classList.remove('show');
  }

  document.getElementById('bump-lena').addEventListener('click', () => bump('lena'));
  document.getElementById('bump-jojo').addEventListener('click', () => bump('jojo'));
  bindLongPress(els.lenaCount, 'lena');
  bindLongPress(els.jojoCount, 'jojo');
  bindLongPress(document.getElementById('bump-lena'), 'lena', { suppressClickAfterLongPress: true });
  bindLongPress(document.getElementById('bump-jojo'), 'jojo', { suppressClickAfterLongPress: true });

  document.getElementById('oracle-btn').addEventListener('click', runOracle);
  document.getElementById('oracle-close').addEventListener('click', closeOracle);
  els.oracleOverlay.addEventListener('click', (e) => { if (e.target === els.oracleOverlay) closeOracle(); });
  document.getElementById('motivate-btn').addEventListener('click', showQuote);
  document.getElementById('quote-close').addEventListener('click', hideQuote);

  els.todayDoneBtn.addEventListener('click', markTodayKitchenDone);
  els.weekCalendar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-assign-person]');
    if (!button) return;
    familyState.kitchenSchedule[Number(button.dataset.assignDay)] = button.dataset.assignPerson;
    saveFamilyState();
    renderFamily();
  });
  els.colorDock.addEventListener('input', (event) => {
    const input = event.target.closest('[data-color-person]');
    if (!input) return;
    familyState.colors[input.dataset.colorPerson] = input.value;
    saveFamilyState();
    renderFamily();
  });
  els.weekendGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-weekend-done]');
    if (button) completeWeekendPackage(button.dataset.weekendDone);
  });
  els.weekendBoardToggle.addEventListener('click', () => {
    const shouldOpen = els.weekendLeaderboards.hidden;
    els.weekendLeaderboards.hidden = !shouldOpen;
    els.weekendBoardToggle.setAttribute('aria-expanded', String(shouldOpen));
    els.weekendBoardToggle.textContent = shouldOpen ? 'Leaderboard zuklappen' : 'Leaderboard aufklappen';
  });

  document.getElementById('edit-weekend-btn').addEventListener('click', openEditModal);
  document.getElementById('edit-close').addEventListener('click', closeEditModal);
  document.getElementById('edit-save-btn').addEventListener('click', saveEditModal);
  document.getElementById('edit-reset-btn').addEventListener('click', resetWeekendTasks);
  els.editOverlay.addEventListener('click', (event) => { if (event.target === els.editOverlay) closeEditModal(); });
  els.editList.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-add-task]');
    if (addButton) addTask(addButton.dataset.addTask);

    const deleteButton = event.target.closest('[data-delete-task]');
    if (deleteButton) deleteTask(deleteButton.dataset.deleteTask, Number(deleteButton.dataset.deleteIndex));
  });

  loadState();
})();
