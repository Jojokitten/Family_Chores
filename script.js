import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

(() => {
  const SUPABASE_URL = 'https://cxlkzxpstlekcwscnsom.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_PNQ9q1pwf3wi5fZjW3nOQg_87cWiEc1';
  const TABLE_NAME = 'try1';
  const STORAGE_KEY = 'dishwasher_tally_v1';

  const state = { lena: 0, jojo: 0 };
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
  };

  async function loadState() {
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

      try {
        const res = await window.storage.get(STORAGE_KEY, true);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          state.lena = Number(parsed.lena) || 0;
          state.jojo = Number(parsed.jojo) || 0;
        }
      } catch {
        // Kein lokaler Spielstand vorhanden
      }
    }

    renderAll();
    els.loading.classList.add('hidden');
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

      await window.storage.set(
        STORAGE_KEY,
        JSON.stringify({ lena: state.lena, jojo: state.jojo, updatedAt: Date.now() }),
        true
      );

      pulseSaved(true);
    } catch (error) {
      console.error('Fehler beim Speichern in Supabase:', error);
      pulseSaved(false);
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
      els.heroSub.textContent = 'Beide gleich oft dran gewesen – wer zuerst spült, sichert sich Pluspunkte 😉';
    } else {
      const dueLena = state.lena < state.jojo;
      els.heroName.textContent = dueLena ? 'Lena' : 'Jojo';
      els.heroName.className = 'due-name ' + (dueLena ? 'lena' : 'jojo');
      const diff = Math.abs(state.lena - state.jojo);
      els.heroSub.textContent = `${diff}× weniger ausgeräumt`;
    }
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
    floatText(user, '−1', 'float-minus');
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

  function bindLongPress(el, user) {
    let timer = null;
    const start = () => {
      el.classList.add('holding');
      timer = setTimeout(() => {
        decrement(user);
        el.classList.remove('holding');
        if (navigator.vibrate) navigator.vibrate(25);
      }, 600);
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
  }

  const oracleMessages = ['Stricherl werden gezählt …', 'Fairness wird berechnet …', 'Schicksal wird befragt …', 'Ergebnis wird versiegelt …'];
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
        result = 'Unentschieden – beide sind dran! 😄';
      } else {
        result = state.lena < state.jojo ? '🍽️ Lena ist dran!' : '🍽️ Jojo ist dran!';
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
    const colors = ['#3D8BFF', '#8B6CFF', '#FF2E93', '#FFA14A', '#FF7AC0'];
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
    'Ein sauberes Geschirrtuch ist die halbe Miete – ab an die Spüle! 🧽',
    'Teller stapeln sich nicht von selbst weg … oh warte, doch. Also los! 🍽️',
    'Du schaffst das! Danach schmeckt der Kaffee gleich besser ☕✨',
    'Stell dir vor, wie stolz dein Ich von morgen sein wird 💪',
    'Fünf Minuten Einsatz für pures Küchenglück 😌',
    'Ruhm, Ehre und ein aufgeräumter Geschirrspüler warten auf dich 🏆',
    'Ausräumen ist wie Meditation, nur mit Besteck 🧘‍♀️🍴',
    'Los geht’s – die Gabeln vermissen ihre Schublade! 🍴'
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
  document.getElementById('oracle-btn').addEventListener('click', runOracle);
  document.getElementById('oracle-close').addEventListener('click', closeOracle);
  els.oracleOverlay.addEventListener('click', (e) => { if (e.target === els.oracleOverlay) closeOracle(); });
  document.getElementById('motivate-btn').addEventListener('click', showQuote);
  document.getElementById('quote-close').addEventListener('click', hideQuote);

  loadState();
})();
