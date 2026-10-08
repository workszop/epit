/* Triglyceride Defense — a cardiology simulator nobody asked for. */
(() => {
  'use strict';

  // ───────────────────────── DOM ─────────────────────────
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const ecg = $('ecg');
  const ectx = ecg.getContext('2d');
  const ui = {
    hud: $('hud'), hpfill: $('hpfill'), bpm: $('bpm'), wave: $('wave'), score: $('score'), combo: $('combo'),
    quip: $('quip'), banner: $('banner'), menu: $('menu'), pause: $('pause'), over: $('over'),
    menuBest: $('menuBest'), muteBtn: $('muteBtn'),
  };

  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Best-effort storage: private windows and blocked storage just mean no high score.
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* shrug */ } },
  };

  // ───────────────────────── Helpers ─────────────────────────
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Picks from a list without repeating the last few picks, so the jokes stay (slightly) fresh.
  function deck(lines) {
    let recent = [];
    return () => {
      let line;
      do { line = pick(lines); } while (recent.includes(line) && lines.length > 4);
      recent.push(line);
      if (recent.length > 3) recent.shift();
      return line;
    };
  }

  // ───────────────────────── Copywriting department ─────────────────────────
  const QUIPS = {
    kill: deck([
      'Wow. You clicked a fat molecule. The Nobel committee has been notified.',
      "That's one less yacht for your cardiologist.",
      'Glycerol backbone: broken. Like your New Year\'s resolutions.',
      'Your liver sends its regards. And an invoice.',
      'Somewhere, a kale smoothie sheds a single proud tear.',
      'Esterify THIS.',
      'Lipolysis by mouse. Science has gone too far.',
      'Incredible. Now do that with the fries.',
      'That one came from the "light" mayo. Sure it did.',
      'Your gym membership is shaking. It doesn\'t recognize you.',
      'Triglyceride deleted. Feelings about pizza: unchanged.',
      'Your arteries would clap, but they\'re a bit narrow right now.',
    ]),
    hurt: deck([
      'Ouch. That one was 80% butter.',
      'The heart felt that. The heart remembers.',
      'Your arteries just filed a formal complaint.',
      'Fun fact: hearts do not respawn.',
      'That was a cheeseburger with extra steps.',
      'Direct hit. Your cardiologist just upgraded to business class.',
      'Bold choice, letting that through. Very "YOLO".',
      'The heart is now 4% bacon.',
      'Your heart wants you to know it\'s fine. It is not fine.',
    ]),
    miss: deck([
      'You missed. The fat didn\'t.',
      'Bold strategy: attacking empty plasma.',
      'Aiming like you read nutrition labels: not at all.',
      'That blood cell did nothing to you.',
      'Clicking the void. Very philosophical. Very useless.',
    ]),
    low: deck([
      'Heart integrity critical. Maybe put down the donut you\'re holding right now.',
      'The heart is drafting its will. You\'re not in it.',
      'Low HP. Have you tried... not losing?',
      'Heart status: "it\'s complicated".',
    ]),
    heal: deck([
      'A salad. Wow. Revolutionary. +2 heart.',
      'Leafy greens consumed. Your heart is confused but grateful.',
      'Salad acquired. Somewhere, a crouton weeps.',
    ]),
    omega: [
      'Omega-3 deployed. Fish: 1, Fat: 0.',
      'Fish oil airstrike! Smells terrible. Works great.',
    ],
    statin: [
      'Statins engaged. Everything slows down. Like your metabolism.',
      'Rx: chill. The fat is now moving at DMV speed.',
    ],
    cardio: [
      'CARDIO MODE. You clicking harder counts as exercise, apparently.',
      'Cardio activated. Splash damage! Also your watch thinks you went for a jog.',
    ],
    waveClear: deck([
      'Wave cleared. +1 heart for the effort. Barely.',
      'Wave survived. Rewarding yourself with a snack would be ironic.',
      'Cleared. Your heart grudgingly regenerates. Don\'t make it a habit.',
    ]),
    boss: [
      'BOSS DOWN. The Deep Fryer has been unplugged. Permanently.',
      'You defeated a sentient deep fryer by clicking. Put that on your résumé.',
    ],
    enemy: [
      'Hi! I\'m from the donut.',
      'Your arteries look roomy.',
      'Mmm, cozy ventricles.',
      'I identify as a vitamin.',
      'Butter believe it.',
      'Saturated and proud.',
      'Just passing through. Forever.',
      'Is this the aorta? Meeting friends.',
      'You can\'t click us all.',
      'We are legion. We are lard.',
      'Free real estate!',
      'I came with the fries.',
      'Ester-day was fun.',
      'Mind if I settle down here?',
    ],
    bossLines: [
      'I AM THE DEEP FRYER. KNEEL.',
      'YOU CALL THAT CARDIO?',
      'EVERYTHING IS BETTER BATTERED.',
      '350°F OF PURE MENACE.',
    ],
  };

  const WAVES = [
    ['Casual Brunch', 'They\'re just testing you. Like a bagel with extra cream cheese.'],
    ['Office Birthday Cake', 'Karen brought three. Nobody stopped her.'],
    ['Drive-Thru Diplomacy', 'Would you like to supersize your arterial plaque?'],
    ['All-You-Can-Eat Regret', 'The buffet had no closing time. Neither do they.'],
    ['BOSS: The Deep Fryer', 'He\'s been marinating in this moment.'],
    ['Gas Station Sushi Night', 'Bold. Questionable. Surprisingly fatty.'],
    ['Holiday Leftovers', 'The turkey is gone. The gravy remains.'],
    ['Midnight Fridge Raid', 'Nobody saw anything. Except your heart.'],
    ['State Fair Special', 'Deep-fried butter on a stick. That\'s a real thing. Look it up.'],
    ['BOSS: The Deep Fryer (Extra Crispy)', 'He\'s back, and this time he brought oil.'],
  ];
  const LATE_WAVES = [
    ['Seconds', 'You said you were full.'],
    ['Thirds', 'Okay, now you\'re just showing off.'],
    ['Cheat Week', 'It started as a cheat day.'],
    ['Bacon-Wrapped Bacon', 'Someone had to invent it. Sadly, someone did.'],
    ['Just One More', 'Famous last words, wave edition.'],
    ['Cheesecake Factory Menu', 'All 250 pages of it, swimming toward you.'],
  ];

  // ───────────────────────── Game data ─────────────────────────
  const TYPES = {
    basic:    { name: 'a Regular Trigly',         r: 16, hp: 1, speed: 52,  dmg: 1, color: '#f4c430', dark: '#9a6a00', score: 10 },
    chonk:    { name: 'a Deep-Fried Chonk',       r: 25, hp: 3, speed: 30,  dmg: 2, color: '#d98b3a', dark: '#6e3a08', score: 30 },
    zoomer:   { name: 'an Energy-Drink Zoomer',   r: 12, hp: 1, speed: 115, dmg: 1, color: '#9cff3a', dark: '#3d7a06', score: 20 },
    splitter: { name: 'a Buffet Splitter',        r: 20, hp: 2, speed: 42,  dmg: 2, color: '#ff8fc8', dark: '#a0306a', score: 25 },
    mini:     { name: 'a Buffet Leftover',        r: 10, hp: 1, speed: 78,  dmg: 1, color: '#ff8fc8', dark: '#a0306a', score: 5 },
    boss:     { name: 'The Deep Fryer himself',   r: 56, hp: 30, speed: 20, dmg: 5, color: '#e8a83a', dark: '#5e3800', score: 500 },
  };

  const POWERUPS = {
    omega:  { icon: '🐟', color: '#4fc3f7' },
    statin: { icon: '💊', color: '#e8e8ff' },
    salad:  { icon: '🥗', color: '#7ee07e' },
    cardio: { icon: '🏃', color: '#ffb74d' },
  };

  const MAX_HP = 10;

  // ───────────────────────── State ─────────────────────────
  let W = 0, H = 0, DPR = 1, bgGrad = null;
  const heart = { x: 0, y: 0, r: 50, hp: MAX_HP, flash: 0, phase: 0, pulse: 0, alive: true };
  let enemies = [], particles = [], floaters = [], powerups = [], ripples = [];
  const cells = [];
  const ecgSamples = new Array(96).fill(0);
  let ecgAcc = 0;

  const state = {
    mode: 'menu', // menu | playing | paused | over
    score: 0, kills: 0, shots: 0, hits: 0,
    wave: 0, queue: [], spawnT: 0, interval: 1,
    combo: 0, comboT: 0, bestCombo: 0,
    shake: 0, redFlash: 0, slowT: 0, cardioT: 0,
    betweenT: 0, lastKiller: null, lowWarned: false, overT: 0,
    time: 0,
  };
  let best = parseInt(store.get('tgd.best') || '0', 10) || 0;
  ui.menuBest.textContent = best.toLocaleString();

  // ───────────────────────── Audio (tiny synth, no files) ─────────────────────────
  const sfx = (() => {
    let ac = null;
    let muted = store.get('tgd.muted') === '1';
    function ensure() {
      if (!ac) {
        try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
      }
      if (ac && ac.state === 'suspended') ac.resume();
    }
    function tone(freq, dur, type = 'square', vol = 0.06, slideTo = null, when = 0) {
      if (muted || !ac) return;
      const t0 = ac.currentTime + when;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(ac.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    }
    function noise(dur, vol = 0.12, freq = 900) {
      if (muted || !ac) return;
      const n = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = freq;
      const g = ac.createGain();
      g.gain.value = vol;
      src.connect(f).connect(g).connect(ac.destination);
      src.start();
    }
    return {
      ensure,
      get muted() { return muted; },
      toggle() { muted = !muted; store.set('tgd.muted', muted ? '1' : '0'); return muted; },
      pop(combo) { tone(300 + Math.min(combo, 24) * 28, 0.07, 'square', 0.05, 150); },
      squish() { noise(0.1, 0.1, 1400); },
      hurt() { tone(120, 0.35, 'sine', 0.3, 40); noise(0.3, 0.25, 600); },
      miss() { tone(150, 0.05, 'triangle', 0.03); },
      power() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.045, null, i * 0.06)); },
      wave() { tone(440, 0.14, 'triangle', 0.07); tone(660, 0.22, 'triangle', 0.07, null, 0.12); },
      boss() { tone(90, 0.8, 'sawtooth', 0.08, 60); tone(95, 0.8, 'sawtooth', 0.06, 62, 0.05); },
      beat() { tone(65, 0.1, 'sine', 0.16, 40); },
      boom() { noise(1.2, 0.4, 400); tone(80, 1.2, 'sine', 0.3, 25); },
      over() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.05, null, 0.6 + i * 0.22)); },
    };
  })();
  ui.muteBtn.textContent = sfx.muted ? '🔇' : '🔊';

  // ───────────────────────── Layout ─────────────────────────
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    heart.x = W / 2;
    heart.y = H * 0.54;
    heart.r = clamp(Math.min(W, H) * 0.085, 34, 70);
    bgGrad = ctx.createRadialGradient(W / 2, H * 0.54, 10, W / 2, H * 0.54, Math.max(W, H) * 0.75);
    bgGrad.addColorStop(0, '#6a0f1c');
    bgGrad.addColorStop(0.55, '#3a0410');
    bgGrad.addColorStop(1, '#140003');
    if (!cells.length) {
      const n = Math.round(clamp((W * H) / 26000, 14, 46));
      for (let i = 0; i < n; i++) cells.push(makeCell(true));
    }
  }

  function makeCell(anywhere) {
    return {
      x: anywhere ? rand(0, W) : -40,
      y: rand(0, H),
      r: rand(9, 20),
      vx: rand(18, 50),
      rot: rand(0, Math.PI),
      vr: rand(-0.6, 0.6),
      wob: rand(0, 6.28),
      a: rand(0.18, 0.45),
    };
  }

  // ───────────────────────── Quips & banner ─────────────────────────
  let quipTimer = 0, quipPriority = 0;
  function say(text, priority = 1, bad = false) {
    if (quipTimer > 0 && priority < quipPriority) return;
    ui.quip.textContent = text;
    ui.quip.classList.toggle('bad', bad);
    ui.quip.classList.add('show');
    quipPriority = priority;
    quipTimer = clamp(1.6 + text.length * 0.035, 2.2, 4.5);
  }

  let bannerTimeout = null;
  function banner(title, sub, ms = 2400) {
    ui.banner.querySelector('.b-title').textContent = title;
    ui.banner.querySelector('.b-sub').textContent = sub;
    ui.banner.classList.add('show');
    clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => ui.banner.classList.remove('show'), ms);
  }

  // ───────────────────────── Waves ─────────────────────────
  function waveInfo(n) {
    if (n <= WAVES.length) return WAVES[n - 1];
    if (n % 5 === 0) return [`BOSS: The Deep Fryer ${n / 5}.0`, 'Now with a bigger basket and fewer regrets.'];
    return pick(LATE_WAVES);
  }

  function pickType(n) {
    const pool = [['basic', 10]];
    if (n >= 2) pool.push(['zoomer', 2 + n * 0.6]);
    if (n >= 3) pool.push(['chonk', 2 + n * 0.5]);
    if (n >= 4) pool.push(['splitter', 1.5 + n * 0.45]);
    let total = pool.reduce((s, p) => s + p[1], 0);
    let r = Math.random() * total;
    for (const [type, w] of pool) { if ((r -= w) <= 0) return type; }
    return 'basic';
  }

  function startWave(n) {
    state.wave = n;
    const isBoss = n % 5 === 0;
    const count = 6 + n * 3 - (isBoss ? 5 : 0);
    state.queue = [];
    if (isBoss) state.queue.push('boss');
    for (let i = 0; i < count; i++) state.queue.push(pickType(n));
    state.interval = Math.max(0.26, 1.2 - n * 0.075);
    state.spawnT = 1.6;
    ui.wave.textContent = n;
    const [title, sub] = waveInfo(n);
    banner(`Wave ${n}: ${title}`, sub);
    if (isBoss) sfx.boss(); else sfx.wave();
  }

  // ───────────────────────── Spawning ─────────────────────────
  function spawnEnemy(type, x, y) {
    const t = TYPES[type];
    if (x === undefined) {
      // Pick a random direction and start just past the nearest screen edge that way.
      const ang = rand(0, Math.PI * 2);
      const c = Math.cos(ang), sn = Math.sin(ang);
      const tx = c > 0 ? (W - heart.x) / c : c < 0 ? -heart.x / c : Infinity;
      const ty = sn > 0 ? (H - heart.y) / sn : sn < 0 ? -heart.y / sn : Infinity;
      const R = Math.min(tx, ty) + t.r + 8;
      x = heart.x + c * R;
      y = heart.y + sn * R;
    }
    const waveScale = 1 + (state.wave - 1) * 0.055;
    const e = {
      type, x, y,
      r: t.r,
      hp: type === 'boss' ? t.hp + state.wave * 3 : t.hp,
      maxHp: 0,
      speed: t.speed * waveScale * rand(0.9, 1.1),
      wob: rand(0, 6.28),
      wobAmp: type === 'boss' ? 0 : rand(10, 30),
      phase: rand(0, 6.28),
      flash: 0,
      say: null, sayT: 0,
      minionT: 3,
      dead: false,
    };
    e.maxHp = e.hp;
    const talkers = enemies.filter((o) => o.sayT > 0).length;
    if (type === 'boss') { e.say = pick(QUIPS.bossLines); e.sayT = 3; }
    else if (type !== 'mini' && talkers < 2 && Math.random() < 0.22) { e.say = pick(QUIPS.enemy); e.sayT = 2.6; }
    enemies.push(e);
    return e;
  }

  function dropPowerup(x, y, forced) {
    let kinds = ['omega', 'statin', 'cardio'];
    if (heart.hp < MAX_HP) kinds.push('salad', 'salad');
    const kind = forced || pick(kinds);
    powerups.push({ kind, x, y, r: 18, life: 7, bob: rand(0, 6.28) });
  }

  // ───────────────────────── Particles ─────────────────────────
  function burst(x, y, color, n, speed = 160, size = 4) {
    if (reduceMotion) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(speed * 0.3, speed);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(size * 0.5, size * 1.4), color, life: rand(0.4, 0.9), max: 0.9 });
    }
  }
  function floatText(x, y, text, color = '#fff', size = 16) {
    floaters.push({ x, y, text, color, size, life: 1, vy: -40 });
  }

  // ───────────────────────── Combat ─────────────────────────
  function multiplier() { return Math.min(4, 1 + Math.floor(state.combo / 5) * 0.5); }

  function damage(e, n) {
    if (e.dead) return;
    e.hp -= n;
    e.flash = 0.12;
    burst(e.x, e.y, TYPES[e.type].color, 5, 90, 3);
    if (e.hp <= 0) kill(e);
  }

  function kill(e, silent = false) {
    const t = TYPES[e.type];
    e.dead = true;
    const pts = Math.round(t.score * multiplier());
    state.score += pts;
    state.kills++;
    burst(e.x, e.y, t.color, e.type === 'boss' ? 60 : 14, e.type === 'boss' ? 320 : 180, e.type === 'boss' ? 7 : 4);
    floatText(e.x, e.y - e.r, `+${pts}`, t.color, e.type === 'boss' ? 26 : 15);
    sfx.squish();

    if (e.type === 'splitter') {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + rand(-0.3, 0.3);
        spawnEnemy('mini', e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18);
      }
      if (!silent) floatText(e.x, e.y + 10, 'leftovers!', '#ff8fc8', 13);
    }

    if (e.type === 'boss') {
      state.shake = reduceMotion ? 0 : 18;
      say(pick(QUIPS.boss), 4);
      dropPowerup(e.x, e.y, heart.hp < MAX_HP ? 'salad' : 'cardio');
      return;
    }
    if (silent) return;
    if (Math.random() < 0.055) dropPowerup(e.x, e.y);
    if (state.kills === 1) say('First blood! Well, first lipid. Blood is what we\'re trying to keep.', 2);
    else if (Math.random() < 0.13) say(QUIPS.kill(), 1);
  }

  function registerHit() {
    state.hits++;
    state.combo = state.comboT > 0 ? state.combo + 1 : 1;
    state.comboT = 1.5;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    sfx.pop(state.combo);
    const c = state.combo;
    if (c === 10) say('10x combo! Your doctor is mildly less disappointed.', 2);
    else if (c === 25) say('25x combo! Is this... discipline? On YOUR watch?', 3);
    else if (c === 50) say('50x combo. Okay, show-off. The fat is filing for emotional damages.', 3);
    else if (c > 50 && c % 50 === 0) say(`${c}x combo. Please go outside. Or don't, the heart needs you.`, 3);
  }

  function registerMiss(x, y) {
    if (state.combo >= 5) floatText(x, y, 'combo lost', '#ff8a8a', 13);
    state.combo = 0;
    state.comboT = 0;
    sfx.miss();
    burst(x, y, 'rgba(255,255,255,0.5)', 4, 50, 2);
    if (Math.random() < 0.12) say(QUIPS.miss(), 1);
  }

  function shoot(x, y, isTouch) {
    // Power-ups first: they're the only thing worth clicking that isn't trying to kill you.
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      if (dist(x, y, p.x, p.y) < p.r + (isTouch ? 18 : 10)) {
        powerups.splice(i, 1);
        collect(p);
        return;
      }
    }
    state.shots++;
    const tol = isTouch ? 16 : 8;
    if (state.cardioT > 0) {
      const radius = 75;
      ripples.push({ x, y, r: 10, max: radius, life: 0.35 });
      const hit = enemies.filter((e) => !e.dead && dist(x, y, e.x, e.y) < radius + e.r);
      if (hit.length) { hit.forEach((e) => damage(e, 1)); registerHit(); }
      else registerMiss(x, y);
      return;
    }
    let target = null, bestD = Infinity;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = dist(x, y, e.x, e.y);
      if (d < e.r + tol && d < bestD) { bestD = d; target = e; }
    }
    if (target) { damage(target, 1); registerHit(); }
    else registerMiss(x, y);
  }

  function collect(p) {
    sfx.power();
    burst(p.x, p.y, POWERUPS[p.kind].color, 20, 200, 4);
    switch (p.kind) {
      case 'omega': {
        ripples.push({ x: heart.x, y: heart.y, r: heart.r, max: Math.hypot(W, H), life: 0.7, big: true });
        for (const e of enemies) {
          if (e.dead) continue;
          if (e.type === 'boss') damage(e, 10);
          else kill(e, true);
        }
        say(pick(QUIPS.omega), 3);
        floatText(p.x, p.y, 'OMEGA-3!', '#4fc3f7', 22);
        break;
      }
      case 'statin':
        state.slowT = 6;
        say(pick(QUIPS.statin), 3);
        floatText(p.x, p.y, 'SLOW-MO', '#e8e8ff', 22);
        break;
      case 'salad':
        heart.hp = Math.min(MAX_HP, heart.hp + 2);
        state.lowWarned = heart.hp <= 3;
        say(QUIPS.heal(), 3);
        floatText(p.x, p.y, '+2 ♥', '#7ee07e', 22);
        break;
      case 'cardio':
        state.cardioT = 8;
        say(pick(QUIPS.cardio), 3);
        floatText(p.x, p.y, 'SPLASH CLICKS', '#ffb74d', 20);
        break;
    }
  }

  function hurtHeart(e) {
    const t = TYPES[e.type];
    e.dead = true;
    heart.hp = Math.max(0, heart.hp - t.dmg);
    heart.flash = 0.35;
    state.lastKiller = t.name;
    state.shake = reduceMotion ? 0 : 10 + t.dmg * 3;
    state.redFlash = 0.45;
    state.combo = 0;
    state.comboT = 0;
    burst(e.x, e.y, t.color, 24, 240, 5);
    burst(e.x, e.y, '#ff3b5c', 12, 200, 4);
    floatText(e.x, e.y, `-${t.dmg} ♥`, '#ff3b5c', 22);
    sfx.hurt();
    if (heart.hp <= 0) { gameOver(); return; }
    if (heart.hp <= 3 && !state.lowWarned) { state.lowWarned = true; say(QUIPS.low(), 4, true); }
    else say(QUIPS.hurt(), 2, true);
  }

  // ───────────────────────── Flow ─────────────────────────
  function showOverlay(which) {
    for (const k of ['menu', 'pause', 'over']) ui[k].hidden = k !== which;
    const focusTarget = which && ui[which].querySelector('.btn');
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  function newGame() {
    sfx.ensure();
    enemies = []; particles = []; floaters = []; powerups = []; ripples = [];
    Object.assign(state, {
      mode: 'playing', score: 0, kills: 0, shots: 0, hits: 0, wave: 0, queue: [], spawnT: 0,
      combo: 0, comboT: 0, bestCombo: 0, shake: 0, redFlash: 0, slowT: 0, cardioT: 0,
      betweenT: 0, lastKiller: null, lowWarned: false, overT: 0,
    });
    heart.hp = MAX_HP;
    heart.alive = true;
    heart.flash = 0;
    showOverlay(null);
    ui.hud.hidden = false;
    startWave(1);
    say('Protect the heart. It\'s literally the only one you\'ve got.', 2);
  }

  function pauseGame() {
    if (state.mode !== 'playing') return;
    state.mode = 'paused';
    showOverlay('pause');
  }
  function resumeGame() {
    if (state.mode !== 'paused') return;
    sfx.ensure();
    state.mode = 'playing';
    showOverlay(null);
  }
  function toMenu() {
    state.mode = 'menu';
    enemies = []; powerups = [];
    heart.hp = MAX_HP; heart.alive = true;
    ui.hud.hidden = true;
    ui.quip.classList.remove('show');
    ui.banner.classList.remove('show');
    ui.menuBest.textContent = best.toLocaleString();
    showOverlay('menu');
  }

  function diagnosis(score) {
    if (score < 150) return 'Patient clicked like they were wearing oven mitts. Recommend: literally anything else.';
    if (score < 600) return 'Below the "normal" range of 150 mg/dL... wait, that\'s the wrong chart. Anyway, try harder.';
    if (score < 1500) return 'Mild competence detected. Arteries are cautiously optimistic.';
    if (score < 3500) return 'Respectable. Your heart would send a thank-you card if it had hands.';
    if (score < 7000) return 'Impressive. Cardiologists hate this one weird trick.';
    return 'Certified Lipid Assassin. Please stop. The fat has families.';
  }

  function gameOver() {
    state.mode = 'over';
    state.overT = 0;
    heart.alive = false;
    state.shake = reduceMotion ? 0 : 26;
    state.redFlash = 0.8;
    burst(heart.x, heart.y, '#ff3b5c', 90, 420, 7);
    burst(heart.x, heart.y, '#ffd0d8', 30, 300, 4);
    burst(heart.x, heart.y, '#f4c430', 30, 260, 5);
    floatText(heart.x, heart.y, 'KA-BOOM', '#fff', 40);
    sfx.boom();
    sfx.over();
    ui.quip.classList.remove('show');
    ui.banner.classList.remove('show');

    const isBest = state.score > best;
    if (isBest) { best = state.score; store.set('tgd.best', String(best)); }
    const acc = state.shots ? Math.round((state.hits / state.shots) * 100) : 0;
    $('overLine').textContent = `Cause of death: ${state.lastKiller || 'mystery fat'}. Tragic, yet entirely predictable.`;
    $('oScore').textContent = state.score.toLocaleString();
    $('oWaves').textContent = Math.max(0, state.wave - 1);
    $('oKills').textContent = state.kills.toLocaleString();
    $('oAcc').textContent = acc + '%' + (acc < 50 && state.shots > 10 ? ' (yikes)' : '');
    $('oCombo').textContent = state.bestCombo + 'x';
    $('oBest').textContent = best.toLocaleString() + (isBest && state.score > 0 ? ' — new record!' : '');
    $('dx').textContent = diagnosis(state.score);
  }

  async function share() {
    const text = `I removed ${state.score.toLocaleString()} mg/dL of triglycerides and survived ${Math.max(0, state.wave - 1)} waves in Triglyceride Defense before my heart exploded. Beat that, you lipid-loving coward.`;
    const url = location.href;
    const btn = $('shareBtn');
    try {
      if (navigator.share) { await navigator.share({ title: 'Triglyceride Defense', text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`);
      btn.textContent = 'Copied. Go brag.';
    } catch (e) {
      btn.textContent = 'Couldn\'t copy. Brag verbally.';
    }
    setTimeout(() => { btn.textContent = 'Brag about it'; }, 2200);
  }

  // ───────────────────────── Update ─────────────────────────
  function beatShape(p) {
    // Two-thump "lub-dub" pulse, 0..1
    if (p < 0.12) return Math.sin((p / 0.12) * Math.PI);
    if (p > 0.2 && p < 0.3) return Math.sin(((p - 0.2) / 0.1) * Math.PI) * 0.5;
    return 0;
  }
  function ecgShape(p) {
    if (p < 0.03) return -0.15;
    if (p < 0.06) return 1;
    if (p < 0.09) return -0.45;
    if (p > 0.3 && p < 0.45) return Math.sin(((p - 0.3) / 0.15) * Math.PI) * 0.25;
    return 0;
  }
  function bpm() { return 68 + (MAX_HP - heart.hp) * 11 + (state.mode === 'playing' ? Math.min(state.wave, 10) * 2 : 0); }

  function update(dt) {
    state.time += dt;
    const playing = state.mode === 'playing';

    // Background cells always drift: the bloodstream doesn't care about your pause button.
    for (const c of cells) {
      c.x += c.vx * dt * (state.slowT > 0 ? 0.4 : 1);
      c.y += Math.sin(state.time * 0.8 + c.wob) * 6 * dt;
      c.rot += c.vr * dt;
      if (c.x > W + 40) Object.assign(c, makeCell(false));
    }

    // Heartbeat
    if (heart.alive) {
      const prev = heart.phase;
      heart.phase += dt * (bpm() / 60);
      if (playing && Math.floor(heart.phase) !== Math.floor(prev) && heart.hp <= 3) sfx.beat();
    }
    const p = heart.phase % 1;
    heart.pulse = heart.alive ? beatShape(p) : 0;
    ecgAcc += dt;
    while (ecgAcc > 1 / 45) {
      ecgAcc -= 1 / 45;
      ecgSamples.shift();
      ecgSamples.push(heart.alive ? ecgShape(p) : 0);
    }
    heart.flash = Math.max(0, heart.flash - dt);

    if (quipTimer > 0) {
      quipTimer -= dt;
      if (quipTimer <= 0) ui.quip.classList.remove('show');
    }

    if (state.mode === 'paused') return;

    state.shake = Math.max(0, state.shake - dt * 40);
    state.redFlash = Math.max(0, state.redFlash - dt);

    if (playing) {
      state.slowT = Math.max(0, state.slowT - dt);
      state.cardioT = Math.max(0, state.cardioT - dt);
      if (state.comboT > 0) {
        state.comboT -= dt;
        if (state.comboT <= 0) state.combo = 0;
      }

      // Spawning / wave progression
      if (state.betweenT > 0) {
        state.betweenT -= dt;
        if (state.betweenT <= 0) startWave(state.wave + 1);
      } else if (state.queue.length) {
        state.spawnT -= dt;
        if (state.spawnT <= 0) {
          spawnEnemy(state.queue.shift());
          state.spawnT = state.interval * rand(0.6, 1.3);
        }
      } else if (!enemies.length) {
        state.betweenT = 2.2;
        if (heart.hp < MAX_HP) { heart.hp++; if (heart.hp > 3) state.lowWarned = false; }
        say(QUIPS.waveClear(), 2);
      }
    }

    // Enemies
    const slow = state.slowT > 0 ? 0.35 : 1;
    for (const e of enemies) {
      if (e.dead) continue;
      e.phase += dt * 6;
      e.wob += dt * 2.2;
      e.flash = Math.max(0, e.flash - dt);
      if (e.sayT > 0) e.sayT -= dt;
      if (!playing) continue;
      const dx = heart.x - e.x, dy = heart.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d, ny = dy / d;
      const wob = Math.cos(e.wob) * e.wobAmp * Math.min(1, d / 200);
      const sp = e.speed * slow;
      e.x += (nx * sp + -ny * wob) * dt;
      e.y += (ny * sp + nx * wob) * dt;
      if (e.type === 'boss') {
        e.minionT -= dt * slow;
        if (e.minionT <= 0) {
          e.minionT = 2.6;
          spawnEnemy(Math.random() < 0.5 ? 'basic' : 'zoomer', e.x + rand(-20, 20), e.y + rand(-20, 20));
          if (Math.random() < 0.35) { e.say = pick(QUIPS.bossLines); e.sayT = 2.4; }
        }
      }
      if (d < heart.r * 0.85 + e.r * 0.6) hurtHeart(e);
      if (state.mode !== 'playing') break; // heart just exploded
    }
    enemies = enemies.filter((e) => !e.dead);

    for (const pu of powerups) { pu.life -= dt; pu.bob += dt * 3; }
    powerups = powerups.filter((pu) => pu.life > 0);

    for (const pt of particles) {
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 1 - 2.5 * dt; pt.vy *= 1 - 2.5 * dt;
      pt.life -= dt;
    }
    particles = particles.filter((pt) => pt.life > 0);

    for (const f of floaters) { f.y += f.vy * dt; f.life -= dt; }
    floaters = floaters.filter((f) => f.life > 0);

    for (const r of ripples) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * 10); }
    ripples = ripples.filter((r) => r.life > 0);

    if (state.mode === 'over') {
      state.overT += dt;
      if (state.overT > 1.4 && ui.over.hidden) { ui.hud.hidden = true; showOverlay('over'); }
    }
  }

  // ───────────────────────── Drawing ─────────────────────────
  function heartPath(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y + s * 0.95);
    c.bezierCurveTo(x - s * 0.35, y + s * 0.6, x - s * 1.15, y + s * 0.15, x - s * 1.05, y - s * 0.4);
    c.bezierCurveTo(x - s * 0.95, y - s * 1.05, x - s * 0.15, y - s * 1.05, x, y - s * 0.5);
    c.bezierCurveTo(x + s * 0.15, y - s * 1.05, x + s * 0.95, y - s * 1.05, x + s * 1.05, y - s * 0.4);
    c.bezierCurveTo(x + s * 1.15, y + s * 0.15, x + s * 0.35, y + s * 0.6, x, y + s * 0.95);
    c.closePath();
  }

  function drawBackground() {
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-30, -30, W + 60, H + 60);
    for (const c of cells) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.globalAlpha = c.a;
      ctx.fillStyle = '#b3172e';
      ctx.beginPath();
      ctx.ellipse(0, 0, c.r, c.r * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a0b1d';
      ctx.beginPath();
      ctx.ellipse(0, 0, c.r * 0.5, c.r * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawHeart() {
    if (!heart.alive) return;
    const s = heart.r * (1 + heart.pulse * 0.09);
    const { x, y } = heart;
    const dmg = 1 - heart.hp / MAX_HP;

    // Glow
    const g = ctx.createRadialGradient(x, y, s * 0.3, x, y, s * 2.4);
    g.addColorStop(0, `rgba(255, 60, 90, ${0.28 + heart.pulse * 0.2})`);
    g.addColorStop(1, 'rgba(255, 60, 90, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, s * 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Aorta stubs, for anatomical credibility (minimal)
    ctx.strokeStyle = '#a3122c';
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.22;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.1, y - s * 0.6);
    ctx.quadraticCurveTo(x + s * 0.2, y - s * 1.25, x + s * 0.6, y - s * 1.15);
    ctx.stroke();
    ctx.strokeStyle = '#3d6fd6';
    ctx.lineWidth = s * 0.16;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.25, y - s * 0.6);
    ctx.lineTo(x - s * 0.35, y - s * 1.15);
    ctx.stroke();

    // Body
    const body = ctx.createLinearGradient(x, y - s, x, y + s);
    body.addColorStop(0, heart.flash > 0 ? '#ffffff' : '#ff5a78');
    body.addColorStop(1, heart.flash > 0 ? '#ffc0cb' : '#c8102e');
    heartPath(ctx, x, y, s);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#6b0014';
    ctx.stroke();

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(x - s * 0.55, y - s * 0.55, s * 0.18, s * 0.1, -0.7, 0, Math.PI * 2);
    ctx.fill();

    // Cracks as damage accumulates
    if (dmg > 0.25) {
      ctx.strokeStyle = 'rgba(70, 0, 10, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.55, y - s * 0.6);
      ctx.lineTo(x + s * 0.4, y - s * 0.35);
      ctx.lineTo(x + s * 0.58, y - s * 0.15);
      ctx.lineTo(x + s * 0.45, y + s * 0.05);
      if (dmg > 0.55) {
        ctx.moveTo(x - s * 0.7, y + s * 0.05);
        ctx.lineTo(x - s * 0.5, y + s * 0.2);
        ctx.lineTo(x - s * 0.6, y + s * 0.38);
      }
      ctx.stroke();
    }
    // Band-aid, the universal cure
    if (dmg > 0.45) {
      ctx.save();
      ctx.translate(x - s * 0.15, y + s * 0.45);
      ctx.rotate(-0.5);
      ctx.fillStyle = '#f3c9a0';
      ctx.strokeStyle = '#b98a5e';
      ctx.lineWidth = 1.5;
      roundRect(ctx, -s * 0.32, -s * 0.1, s * 0.64, s * 0.2, s * 0.08);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e0b088';
      ctx.fillRect(-s * 0.09, -s * 0.1, s * 0.18, s * 0.2);
      ctx.restore();
    }

    // Face: eyes track the nearest threat, because anxiety.
    let lookX = 0, lookY = 0;
    let nearest = null, nd = Infinity;
    for (const e of enemies) { const d = dist(x, y, e.x, e.y); if (d < nd) { nd = d; nearest = e; } }
    if (nearest) { lookX = (nearest.x - x) / nd; lookY = (nearest.y - y) / nd; }
    const ey = y - s * 0.12, ex = s * 0.32, er = s * 0.17;
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x + side * ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a0005';
      ctx.beginPath();
      ctx.arc(x + side * ex + lookX * er * 0.45, ey + lookY * er * 0.45, er * 0.5, 0, Math.PI * 2);
      ctx.fill();
      // Worried eyebrows
      ctx.strokeStyle = '#6b0014';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + side * (ex - er), ey - er * 1.75 - dmg * 3);
      ctx.lineTo(x + side * (ex + er * 0.8), ey - er * 1.3 + dmg * 2);
      ctx.stroke();
    }
    // Mouth: goes from nervous smile to full-blown panic
    ctx.strokeStyle = '#6b0014';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const my = y + s * 0.3;
    if (heart.hp > 6) {
      ctx.arc(x, my - s * 0.08, s * 0.16, 0.2 * Math.PI, 0.8 * Math.PI);
    } else if (heart.hp > 3) {
      for (let i = 0; i <= 8; i++) {
        const px = x - s * 0.2 + (i / 8) * s * 0.4;
        const py = my + Math.sin(i * 1.6 + state.time * 8) * 2;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
    } else {
      ctx.fillStyle = '#3a0008';
      ctx.ellipse(x, my, s * 0.12, s * 0.1 + heart.pulse * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.stroke();
    // Sweat drop when it's getting real
    if (heart.hp <= 5) {
      const sy = (state.time * 30) % (s * 0.6);
      ctx.fillStyle = 'rgba(160, 220, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(x + s * 0.75, y - s * 0.45 + sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawEnemy(e) {
    const t = TYPES[e.type];
    const r = e.r;
    const ang = Math.atan2(heart.y - e.y, heart.x - e.x);

    // Three fatty-acid tails, trailing away from the heart
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(ang);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const pass of [0, 1]) {
      ctx.strokeStyle = pass ? (e.flash > 0 ? '#fff' : t.color) : t.dark;
      ctx.lineWidth = r * (pass ? 0.24 : 0.38);
      for (let i = 0; i < 3; i++) {
        const oy = (i - 1) * r * 0.55;
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, oy);
        const segs = 6;
        for (let k = 1; k <= segs; k++) {
          const px = -r * 0.3 - k * r * 0.36;
          const py = oy + Math.sin(e.phase + k * 1.2 + i * 2) * r * 0.16 * (k / segs + 0.3);
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
    ctx.restore();

    // Glycerol backbone (the body) with a face, kept upright
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = e.flash > 0 ? '#fff' : t.color;
    ctx.strokeStyle = t.dark;
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.82, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Type-specific flair
    if (e.type === 'chonk' || e.type === 'boss') {
      ctx.fillStyle = 'rgba(120, 60, 0, 0.55)'; // breading
      for (let i = 0; i < (e.type === 'boss' ? 26 : 9); i++) {
        const a = i * 2.39, rr = r * 0.25 + ((i * 37) % 10) / 10 * r * 0.5;
        ctx.fillRect(Math.cos(a) * rr * 0.8, Math.sin(a) * rr, r * 0.08, r * 0.08);
      }
    } else if (e.type === 'splitter' || e.type === 'mini') {
      const sprinkles = ['#5ad1ff', '#fff36b', '#7dff8a', '#ffffff'];
      for (let i = 0; i < 6; i++) {
        const a = i * 1.7, rr = r * 0.55;
        ctx.save();
        ctx.translate(Math.cos(a) * rr * 0.8, Math.sin(a) * rr * 0.9);
        ctx.rotate(a);
        ctx.fillStyle = sprinkles[i % 4];
        ctx.fillRect(-r * 0.1, -r * 0.03, r * 0.2, r * 0.06);
        ctx.restore();
      }
    }

    // Angry eyes
    const ex = r * 0.3, ey = -r * 0.15, er = Math.max(2.5, r * 0.18);
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(side * ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(side * ex + Math.cos(ang) * er * 0.35, ey + Math.sin(ang) * er * 0.35, er * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a1400';
      ctx.lineWidth = Math.max(1.5, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(side * (ex + er * 1.1), ey - er * 1.6);
      ctx.lineTo(side * (ex - er * 0.9), ey - er * 0.8);
      ctx.stroke();
    }
    // Smug grin
    ctx.strokeStyle = '#2a1400';
    ctx.lineWidth = Math.max(1.5, r * 0.09);
    ctx.beginPath();
    ctx.arc(0, r * 0.2, r * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    if (e.type === 'zoomer') {
      // Energy-drink jitters
      ctx.strokeStyle = 'rgba(200, 255, 120, 0.7)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const a = ang + Math.PI + (i - 1) * 0.5;
        ctx.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
        ctx.lineTo(Math.cos(a) * r * 2, Math.sin(a) * r * 2);
        ctx.stroke();
      }
    }

    if (e.type === 'boss') {
      // Chef's hat, because he's cooking you
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#bbb';
      ctx.lineWidth = 2;
      ctx.fillRect(-r * 0.45, -r * 1.25, r * 0.9, r * 0.3);
      ctx.strokeRect(-r * 0.45, -r * 1.25, r * 0.9, r * 0.3);
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 1.35, r * 0.25, 0, Math.PI * 2);
      ctx.arc(0, -r * 1.5, r * 0.3, 0, Math.PI * 2);
      ctx.arc(r * 0.3, -r * 1.35, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      // Mustache
      ctx.fillStyle = '#3a1a00';
      ctx.beginPath();
      ctx.ellipse(-r * 0.15, r * 0.12, r * 0.18, r * 0.07, 0.3, 0, Math.PI * 2);
      ctx.ellipse(r * 0.15, r * 0.12, r * 0.18, r * 0.07, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // HP pips / boss bar
    if (e.maxHp > 1) {
      const bw = e.type === 'boss' ? r * 2 : r * 1.4;
      const by = r + (e.type === 'boss' ? 10 : 6);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-bw / 2, by, bw, 5);
      ctx.fillStyle = e.type === 'boss' ? '#ff3b5c' : '#fff';
      ctx.fillRect(-bw / 2, by, bw * (e.hp / e.maxHp), 5);
    }
    ctx.restore();
  }

  function drawBubble(e) {
    if (!e.say || e.sayT <= 0) return;
    if (e.x < -e.r || e.x > W + e.r || e.y < -e.r || e.y > H + e.r) return; // no ventriloquism
    ctx.save();
    ctx.globalAlpha = Math.min(1, e.sayT * 3);
    ctx.font = `${e.type === 'boss' ? 800 : 600} ${e.type === 'boss' ? 14 : 12}px Inter, sans-serif`;
    const w = ctx.measureText(e.say).width + 16;
    const h = e.type === 'boss' ? 26 : 22;
    let bx = clamp(e.x - w / 2, 6, W - w - 6);
    let by = e.y - e.r * (e.type === 'boss' ? 1.9 : 1.1) - h - 8;
    by = clamp(by, 70, H - h - 6);
    ctx.fillStyle = e.type === 'boss' ? '#ffe9b0' : '#fff';
    roundRect(ctx, bx, by, w, h, 8);
    ctx.fill();
    ctx.fillStyle = '#2a0008';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.say, bx + 8, by + h / 2 + 1);
    ctx.restore();
  }

  function drawPowerup(p) {
    const blink = p.life < 2 && Math.floor(p.life * 8) % 2 === 0;
    if (blink) return;
    const y = p.y + Math.sin(p.bob) * 4;
    const meta = POWERUPS[p.kind];
    ctx.save();
    ctx.shadowColor = meta.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(20, 0, 5, 0.85)';
    ctx.strokeStyle = meta.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = `${p.r * 1.1}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(meta.icon, p.x, y + 1);
    ctx.restore();
  }

  function render() {
    ctx.save();
    if (state.shake > 0) ctx.translate(rand(-state.shake, state.shake) * 0.5, rand(-state.shake, state.shake) * 0.5);
    drawBackground();
    drawHeart();
    for (const e of enemies) drawEnemy(e);
    for (const p of powerups) drawPowerup(p);

    for (const r of ripples) {
      ctx.strokeStyle = r.big ? `rgba(79,195,247,${r.life})` : `rgba(255,183,77,${r.life * 2})`;
      ctx.lineWidth = r.big ? 8 : 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const pt of particles) {
      ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of floaters) {
      ctx.globalAlpha = clamp(f.life * 1.5, 0, 1);
      ctx.font = `800 ${f.size}px Bungee, Inter, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';

    for (const e of enemies) drawBubble(e);
    ctx.restore();

    // Screen-space tints
    if (state.slowT > 0) {
      ctx.fillStyle = `rgba(120, 140, 255, ${Math.min(0.12, state.slowT * 0.05)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (state.redFlash > 0) {
      ctx.fillStyle = `rgba(255, 0, 40, ${state.redFlash * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (heart.alive && heart.hp <= 3 && state.mode === 'playing') {
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      v.addColorStop(0, 'rgba(255,0,40,0)');
      v.addColorStop(1, `rgba(255,0,40,${0.18 + heart.pulse * 0.15})`);
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ───────────────────────── HUD ─────────────────────────
  let lastHud = '';
  function renderHud() {
    if (ui.hud.hidden) return;
    const pct = (heart.hp / MAX_HP) * 100;
    const comboText = state.combo >= 2 ? `${state.combo}x combo · ${multiplier()}× pts` : '';
    const powerText = state.cardioT > 0 ? ` 🏃${Math.ceil(state.cardioT)}` : '';
    const slowText = state.slowT > 0 ? ` 💊${Math.ceil(state.slowT)}` : '';
    const key = `${pct}|${state.score}|${comboText}${powerText}${slowText}|${Math.round(bpm())}`;
    if (key !== lastHud) {
      lastHud = key;
      ui.hpfill.style.width = pct + '%';
      ui.hpfill.classList.toggle('low', heart.hp <= 3);
      ui.score.textContent = state.score.toLocaleString();
      ui.combo.textContent = comboText + powerText + slowText;
      ui.bpm.textContent = heart.alive ? Math.round(bpm()) : '0';
    }
    const w = ecg.width, h = ecg.height;
    ectx.clearRect(0, 0, w, h);
    ectx.strokeStyle = heart.hp <= 3 ? '#ff3b5c' : '#7dff8a';
    ectx.lineWidth = 1.5;
    ectx.beginPath();
    for (let i = 0; i < ecgSamples.length; i++) {
      const x = (i / (ecgSamples.length - 1)) * w;
      const y = h * 0.6 - ecgSamples[i] * h * 0.5;
      if (i === 0) ectx.moveTo(x, y); else ectx.lineTo(x, y);
    }
    ectx.stroke();
  }

  // ───────────────────────── Loop ─────────────────────────
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    renderHud();
    requestAnimationFrame(frame);
  }

  // ───────────────────────── Input ─────────────────────────
  canvas.addEventListener('pointerdown', (ev) => {
    if (state.mode !== 'playing') return;
    ev.preventDefault();
    sfx.ensure();
    const rect = canvas.getBoundingClientRect();
    shoot(ev.clientX - rect.left, ev.clientY - rect.top, ev.pointerType === 'touch' || ev.pointerType === 'pen');
  });
  canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());

  $('startBtn').addEventListener('click', newGame);
  $('retryBtn').addEventListener('click', newGame);
  $('resumeBtn').addEventListener('click', resumeGame);
  $('quitBtn').addEventListener('click', toMenu);
  $('menuBtn').addEventListener('click', toMenu);
  $('shareBtn').addEventListener('click', share);
  $('pauseBtn').addEventListener('click', () => (state.mode === 'paused' ? resumeGame() : pauseGame()));
  ui.muteBtn.addEventListener('click', () => {
    sfx.ensure();
    ui.muteBtn.textContent = sfx.toggle() ? '🔇' : '🔊';
  });

  window.addEventListener('keydown', (ev) => {
    const k = ev.key.toLowerCase();
    if (k === 'p' || k === 'escape') {
      if (state.mode === 'playing') pauseGame();
      else if (state.mode === 'paused') resumeGame();
    } else if (k === 'm') {
      ui.muteBtn.click();
    }
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
  window.addEventListener('blur', pauseGame);
  window.addEventListener('resize', resize);

  // Test hook: ?debug exposes internals so a bot can play (badly) on your behalf.
  if (/[?&]debug\b/.test(location.search)) {
    window.__tgd = { state, heart, get enemies() { return enemies; }, get powerups() { return powerups; }, startWave, dropPowerup };
  }

  resize();
  requestAnimationFrame(frame);
})();
