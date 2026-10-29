const METALLURGY_CONFIG = {
  BASE_SULPHUR_TARGET: 0.0105,
  INITIAL_MG_REACTIONS: 0.045,
  TARGET_ABSORPTION_PERCENT: 35,
  WIRE_COEFFICIENT: 0.76,
  WIRE_FACTOR: 0.044,

  // Скоростни диапазони (м/мин)
  OPTIMAL_SPEED_MIN: 21,
  OPTIMAL_SPEED_MAX: 23,
  ABSOLUTE_SPEED_MIN: 20,
  ABSOLUTE_SPEED_MAX: 24,
  DEFAULT_SPEED: 22,

  // Технологични прагове за остатъчен Mg (%)
  MG_WARN_MIN: 0.035,    // под това: критично нисък
  MG_TARGET_MIN: 0.042,  // от тук: оптимален
  MG_HIGH_SOFT: 0.052,   // от тук: повишен
  MG_TARGET_MAX: 0.060,  // над това: премодифициране

  // Визуална скала за Mg
  MG_SCALE_MIN: 0.025,
  MG_SCALE_MAX: 0.070,

  LENGTH_TOLERANCE_PCT: 2.5,
  HISTORY_PER_CAPACITY: 3,  // най-много записи за една вместимост на кофата
  HISTORY_LIMIT: 30         // общ таван на записите
};

const ZONES = {
  optimal:  { label: 'Оптимален',      tone: 'ok',   status: 'success', color: 'var(--ok)' },
  high:     { label: 'Повишен',        tone: 'warn', status: 'warning', color: 'var(--warn)' },
  low:      { label: 'Нисък',          tone: 'warn', status: 'warning', color: 'var(--warn)' },
  critical: { label: 'Критичен',       tone: 'bad',  status: 'danger',  color: 'var(--bad)' },
  over:     { label: 'Премодифициран', tone: 'bad',  status: 'danger',  color: 'var(--bad)' }
};

// lengthTouched: false докато операторът не промени ръчно вложената жица –
// дотогава полето следва предписанието автоматично
const state = { speed: METALLURGY_CONFIG.DEFAULT_SPEED, targetWire: 0, lengthTouched: false };
const HISTORY_KEY = 'mgModifierHistory';
const THEME_KEY = 'mgModifierTheme';
const RING_LENGTH = 2 * Math.PI * 52;

const $ = (id) => document.getElementById(id);
const isDesktop = () => window.matchMedia('(min-width: 1100px)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- Четене на числа ----------
   Приема запетая или точка (0,045 = 0.045).
   Полета с data-short приемат кратък запис: 45 → 0.045, 20 → 0.020. */
function parseNum(str) {
  const t = String(str ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return NaN;
  return Number(t);
}

function readField(id) {
  const input = $(id);
  let v = parseNum(input.value);
  const short = parseFloat(input.dataset.short);
  if (!isNaN(v) && short && v >= 1) v = Number((v * short).toFixed(6));
  return v;
}
const num = readField;

/* ---------- Старт ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  buildSpeedSelectors();
  buildMgScale();
  initInputs();

  $('m1').addEventListener('input', () => { calculateWireRequirement(); renderHistory(); });
  $('lenghtOfWire').addEventListener('input', (e) => {
    if (e.isTrusted) state.lengthTouched = $('lenghtOfWire').value.trim() !== '';
  });
  $('s1').addEventListener('input', calculateWireRequirement);

  $('useTarget').addEventListener('click', () => {
    if (state.targetWire > 0) {
      const input = $('lenghtOfWire');
      state.lengthTouched = false;
      input.value = state.targetWire.toFixed(1);
      input.dispatchEvent(new Event('input'));
      $('residualMg').focus();
    }
  });

  $('clearHistory').addEventListener('click', () => { writeHistory([]); renderHistory(); });

  renderHistory();
  setSpeed(state.speed);
  renderEmptyResults();
});

/* ---------- Полета за въвеждане ---------- */
function initInputs() {
  document.querySelectorAll('.control input').forEach((input) => {
    const hint = input.closest('.field').querySelector('.hint');
    if (hint) hint.dataset.default = hint.textContent;

    // Маркира цялото съдържание при клик → новото число директно замества старото
    let justFocused = false;
    input.addEventListener('focus', () => {
      input.select();
      justFocused = true;
      setTimeout(() => { if (justFocused) input.select(); }, 30);
    });
    const keepSelection = (e) => {
      if (justFocused) { e.preventDefault(); input.select(); justFocused = false; }
    };
    input.addEventListener('mouseup', keepSelection);
    input.addEventListener('touchend', keepSelection);
    input.addEventListener('blur', () => { justFocused = false; });

    input.addEventListener('input', () => {
      input.closest('.control').classList.remove('invalid');
      updateHint(input);
    });

    input.addEventListener('keydown', (e) => {
      justFocused = false;
      if (e.key === 'Enter') {
        e.preventDefault();
        const next = input.dataset.next;
        if (next === 'analyze') { input.blur(); calculateMg(); }
        else if (next) $(next).focus();
        else input.blur();
      } else if (e.key === 'Escape') {
        clearField(input);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = Math.abs(parseFloat(input.dataset.step)) || 1;
        nudge(input, e.key === 'ArrowUp' ? step : -step, input.dataset.step);
      }
    });

    // Клик където и да е в полето слага фокус в него
    input.closest('.input-wrap').addEventListener('click', (e) => {
      if (e.target === input.closest('.input-wrap')) input.focus();
    });

    updateHint(input);
  });

  document.querySelectorAll('.clear').forEach((btn) => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => clearField(btn.parentElement.querySelector('input')));
  });

  document.querySelectorAll('.nudge').forEach((btn) => {
    btn.addEventListener('click', () => nudge($(btn.dataset.target), parseFloat(btn.dataset.step), btn.dataset.step));
  });
}

function nudge(input, step, stepStr) {
  const decimals = (String(stepStr).split('.')[1] || '').length;
  let base = readField(input.id);
  if (isNaN(base)) {
    base = input.id === 'lenghtOfWire' ? state.targetWire : (parseFloat(input.dataset.default) || 0);
  }
  input.value = Math.max(0, base + step).toFixed(decimals);
  if (input.id === 'lenghtOfWire') state.lengthTouched = true;
  input.dispatchEvent(new Event('input'));
}

function clearField(input) {
  if (input.id === 'lenghtOfWire') state.lengthTouched = false;
  input.value = '';
  input.dispatchEvent(new Event('input'));
  input.focus();
}

function updateHint(input) {
  const ctrl = input.closest('.control');
  const hasValue = input.value.trim() !== '';
  ctrl.classList.toggle('has-value', hasValue);

  const hint = input.closest('.field').querySelector('.hint');
  if (!hint) return;
  const raw = parseNum(input.value);

  if (hasValue && isNaN(raw)) {
    hint.textContent = 'Невалидно число';
    hint.className = 'hint bad';
  } else if (input.dataset.short && raw >= 1) {
    hint.textContent = `→ ${readField(input.id).toFixed(3)} ${input.dataset.unit || ''}`;
    hint.className = 'hint on';
  } else {
    hint.textContent = hint.dataset.default;
    hint.className = 'hint';
  }
}

/* ---------- Тема ---------- */
function initTheme() {
  let theme = document.documentElement.dataset.theme || 'foundry';
  applyTheme(theme, false);
  document.querySelectorAll('[data-theme-set]').forEach((b) => {
    b.addEventListener('click', () => applyTheme(b.dataset.themeSet, true));
  });
}

function applyTheme(theme, save) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('[data-theme-set]').forEach((b) => {
    b.classList.toggle('active', b.dataset.themeSet === theme);
    b.setAttribute('aria-pressed', b.dataset.themeSet === theme);
  });
  if (save) { try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* без хранилище */ } }
}

/* ---------- Скорост ---------- */
function speedZone(v) {
  const C = METALLURGY_CONFIG;
  if (v >= C.OPTIMAL_SPEED_MIN && v <= C.OPTIMAL_SPEED_MAX) return 'ok';
  if (v >= C.ABSOLUTE_SPEED_MIN && v <= C.ABSOLUTE_SPEED_MAX) return 'warn';
  return 'bad';
}

function buildSpeedSelectors() {
  const { ABSOLUTE_SPEED_MIN: min, ABSOLUTE_SPEED_MAX: max } = METALLURGY_CONFIG;
  document.querySelectorAll('.speed-select').forEach((group) => {
    group.innerHTML = '';
    for (let v = min; v <= max; v++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `speed-opt ${speedZone(v)}`;
      b.dataset.value = v;
      b.innerHTML = `<b>${v}</b><i></i>`;
      b.addEventListener('click', () => setSpeed(v));
      group.appendChild(b);
    }
  });
}

function setSpeed(v) {
  state.speed = v;
  document.querySelectorAll('.speed-opt').forEach((b) => {
    const on = Number(b.dataset.value) === v;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-pressed', on);
  });
  updateSpeedDisplays(v);
  calculateWireRequirement();
}

function updateSpeedDisplays(val) {
  $('speedValueDisplay').textContent = `${val} м/мин`;
  $('speedValueDisplayStep2').textContent = `${val} м/мин`;
}

function markSuggestedSpeed(v) {
  document.querySelectorAll('.speed-opt').forEach((b) => {
    b.classList.toggle('suggested', v !== null && Number(b.dataset.value) === v && v !== state.speed);
  });
}

/* ---------- Навигация ---------- */
function switchTab(step) {
  [1, 2].forEach((n) => {
    $(`tab${n}`).classList.toggle('active', n === step);
  });
  $('tab1').classList.toggle('done', step === 2);
  $('tab1').querySelector('.step-num').textContent = step === 2 ? '✓' : '1';
  $('stepLineFill').style.width = step === 2 ? '100%' : '0%';
  document.body.dataset.step = step;
  if (!isDesktop()) window.scrollTo({ top: 0, behavior: 'smooth' });

  if (step === 2) {
    updateTargetSummary();
    const lengthInput = $('lenghtOfWire');
    if (!lengthInput.value && state.targetWire > 0) {
      lengthInput.value = state.targetWire.toFixed(1);
      updateHint(lengthInput);
    }
    // Курсорът отива направо в полето за Mg – най-често въвежданата стойност
    if (!$('residualMg').value) setTimeout(() => $('residualMg').focus({ preventScroll: true }), 350);
  }
}

function syncLengthToTarget() {
  const input = $('lenghtOfWire');
  if (state.lengthTouched || state.targetWire <= 0) return;
  input.value = state.targetWire.toFixed(1);
  updateHint(input);
}

function updateTargetSummary() {
  $('targetWireSummary').textContent = state.targetWire > 0 ? `${state.targetWire.toFixed(1)} м` : '– м';
}

function setPill(text, tone) {
  $('livePill').className = `live-pill ${tone || ''}`;
  $('livePillText').textContent = text;
}

/* ---------- Стъпка 1 ---------- */
function calculateWireRequirement() {
  const C = METALLURGY_CONFIG;
  const m1 = num('m1');
  const s1 = num('s1');
  const speed = state.speed;
  const statusBox = $('speedStatus');

  if (isNaN(m1) || isNaN(s1) || m1 <= 0 || s1 < 0) {
    $('wireResultDisplay').textContent = '–';
    $('feedTime').textContent = '–';
    state.targetWire = 0;
    statusBox.textContent = 'Въведете вместимост на кофата и начална сяра.';
    statusBox.className = 'status info';
    setPill('Въведете данни', '');
    updateTargetSummary();
    return;
  }

  state.targetWire = ((C.WIRE_COEFFICIENT * (s1 - C.BASE_SULPHUR_TARGET) + C.INITIAL_MG_REACTIONS) /
    (C.WIRE_FACTOR * C.TARGET_ABSORPTION_PERCENT)) * m1;

  $('wireResultDisplay').textContent = state.targetWire.toFixed(1);
  syncLengthToTarget();

  const totalSec = Math.round((state.targetWire / speed) * 60);
  $('feedTime').textContent = `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')} мин`;

  const zone = speedZone(speed);
  if (zone === 'ok') {
    statusBox.textContent = `Оптимален режим на подаване (${speed} м/мин).`;
    statusBox.className = 'status success';
  } else if (zone === 'warn') {
    statusBox.textContent = `Работа в режим на корекция (${speed} м/мин).`;
    statusBox.className = 'status warning';
  } else {
    statusBox.textContent = `ОПАСНОСТ: Скорост извън разрешения толеранс (${C.ABSOLUTE_SPEED_MIN}–${C.ABSOLUTE_SPEED_MAX} м/мин)!`;
    statusBox.className = 'status danger';
  }
  setPill(`${speed} м/мин`, zone);
  updateTargetSummary();
}

/* ---------- Стъпка 2 ---------- */
function markInvalid(id) {
  const ctrl = $(id).closest('.control');
  ctrl.classList.remove('invalid');
  void ctrl.offsetWidth;
  ctrl.classList.add('invalid');
  $(id).focus();
}

function getMgZone(mg) {
  const C = METALLURGY_CONFIG;
  if (mg > C.MG_TARGET_MAX) return 'over';
  if (mg >= C.MG_HIGH_SOFT) return 'high';
  if (mg >= C.MG_TARGET_MIN) return 'optimal';
  if (mg >= C.MG_WARN_MIN) return 'low';
  return 'critical';
}

function calculateMg() {
  const C = METALLURGY_CONFIG;
  const m1 = num('m1');
  const s1 = num('s1');
  const actualLength = num('lenghtOfWire');
  const residualMg = num('residualMg');
  const currentSpeed = state.speed;

  if (isNaN(m1) || isNaN(s1) || state.targetWire <= 0) {
    toast('Попълнете вместимост и сяра в стъпка 1.');
    switchTab(1);
    return;
  }
  if (isNaN(actualLength) || actualLength <= 0) { toast('Въведете реално вложената жица.'); markInvalid('lenghtOfWire'); return; }
  if (isNaN(residualMg) || residualMg <= 0) { toast('Въведете остатъчния Mg от лабораторията.'); markInvalid('residualMg'); return; }
  if (currentSpeed < C.ABSOLUTE_SPEED_MIN || currentSpeed > C.ABSOLUTE_SPEED_MAX) {
    toast(`Недопустима скорост: работете между ${C.ABSOLUTE_SPEED_MIN} и ${C.ABSOLUTE_SPEED_MAX} м/мин.`);
    return;
  }

  const absorption = ((C.WIRE_COEFFICIENT * (s1 - C.BASE_SULPHUR_TARGET) + residualMg) / (C.WIRE_FACTOR * actualLength)) * m1;

  // 1. Отклонение на метража
  const target = state.targetWire;
  const diffMeters = actualLength - target;
  const absDiff = Math.abs(diffMeters).toFixed(1);
  const diffPercent = (diffMeters / target) * 100;
  const isLengthOk = Math.abs(diffPercent) <= C.LENGTH_TOLERANCE_PCT;

  let lengthStatusText;
  if (isLengthOk) lengthStatusText = `Метражът е спазен (вложени ${actualLength} м / предписани ${target.toFixed(1)} м).`;
  else if (diffMeters > 0) lengthStatusText = `ОТКЛОНЕНИЕ: Подадени са +${absDiff} м повече от предписаното!`;
  else lengthStatusText = `ОТКЛОНЕНИЕ: Подадени са −${absDiff} м по-малко от предписаното!`;

  // 2. Зона на Mg и препоръки
  const zone = getMgZone(residualMg);
  const actions = [];
  let suggestedSpeed = currentSpeed;
  let operatorText, operatorClass, mgText;

  if (zone === 'optimal') {
    operatorText = lengthStatusText;
    operatorClass = isLengthOk ? 'success' : 'warning';
    mgText = `Остатъчен Mg (${residualMg}%): в оптимални граници.`;

    if (!isLengthOk && diffMeters < -0.5) {
      actions.push(`<span><strong>Метраж:</strong> Въпреки недостига от −${absDiff} м жица, Mg е в норма. Спазвайте предписанието.</span>`);
    } else if (!isLengthOk && diffMeters > 0.5) {
      actions.push(`<span><strong>Метраж:</strong> Има преразход (+${absDiff} м). Върнете се към изчислената стойност.</span>`);
    } else {
      actions.push(`<span><strong>Запазете метража:</strong> Продължете със същото предписание.</span>`);
    }
    actions.push(`<span><strong>Поддържайте скоростта:</strong> Запазете текущата скорост от ${currentSpeed} м/мин.</span>`);

  } else if (zone === 'high') {
    if (currentSpeed > C.ABSOLUTE_SPEED_MIN) suggestedSpeed = Math.max(C.ABSOLUTE_SPEED_MIN, currentSpeed - 1);
    operatorText = `${lengthStatusText} Повишен остатъчен Mg (${residualMg}%).`;
    operatorClass = 'warning';
    mgText = `Повишено съдържание на Mg (${residualMg}%). Налице е високо усвояване.`;

    if (diffMeters > 0.5) {
      actions.push(`<span><strong>Метраж:</strong> Има реално предозиране (+${absDiff} м). Върнете се към базовото предписание и го намалете с <strong>−0.5 м</strong>.</span>`);
    } else if (diffMeters < -0.5) {
      actions.push(`<span><strong>Метраж:</strong> Усвояването е много високо (Mg е висок въпреки недостига от −${absDiff} м). Намалете предписанието с <strong>−1.0 м</strong>.</span>`);
    } else {
      actions.push(`<span><strong>Метраж:</strong> Метражът е спазен, но усвояването е високо. За следващата кофа намалете с <strong>−0.5 м до −1.0 м</strong>.</span>`);
    }
    if (suggestedSpeed < currentSpeed) {
      actions.push(`<span><strong>Скорост:</strong> Намалете от ${currentSpeed} на <strong>${suggestedSpeed} м/мин</strong> за плавно сваляне на Mg и икономия.</span>`);
    } else {
      actions.push(`<span><strong>Скорост:</strong> Скоростта е на долния толеранс (${C.ABSOLUTE_SPEED_MIN} м/мин). Не я намалявайте повече.</span>`);
    }

  } else if (zone === 'low') {
    operatorText = `${lengthStatusText} Нисък Mg (${residualMg}%).`;
    operatorClass = 'warning';
    mgText = 'Предупреждение: остатъчният Mg пада към долната допустима граница.';

    if (diffMeters < -0.5) {
      actions.push(`<span><strong>Причина:</strong> Подадени са <strong>−${absDiff} м по-малко</strong> жица. Подайте пълния предписан метраж.</span>`);
    } else {
      actions.push(`<span><strong>Метраж:</strong> Увеличете заложения метраж с <strong>+1.0 м до +1.5 м</strong> за следващата кофа.</span>`);
    }
    if (currentSpeed < C.OPTIMAL_SPEED_MAX) {
      suggestedSpeed = Math.min(C.OPTIMAL_SPEED_MAX, currentSpeed + 1);
      actions.push(`<span><strong>Скорост:</strong> Повишете скоростта на <strong>${suggestedSpeed} м/мин</strong>.</span>`);
    } else {
      actions.push(`<span><strong>Скорост:</strong> Запазете текущата скорост от ${currentSpeed} м/мин.</span>`);
    }

  } else if (zone === 'critical') {
    operatorText = `${lengthStatusText} Критично нисък Mg (${residualMg}%).`;
    operatorClass = 'danger';
    mgText = `КРИТИЧНО НИСЪК Mg (${residualMg}% < ${C.MG_WARN_MIN}%): риск от бракуване!`;

    if (diffMeters < -0.5) {
      actions.push(`<span><strong>Грешка при дозирането:</strong> Недостиг от <strong>−${absDiff} м</strong>! Подайте пълния метраж +1.0 м за компенсация.</span>`);
    } else {
      actions.push(`<span><strong>Задължително:</strong> Увеличете заложения метраж с <strong>+2.0 м до +2.5 м</strong>.</span>`);
    }
    if (currentSpeed < C.ABSOLUTE_SPEED_MAX) {
      suggestedSpeed = Math.min(C.ABSOLUTE_SPEED_MAX, currentSpeed + 2);
      actions.push(`<span><strong>Скорост:</strong> Увеличете скоростта на <strong>${suggestedSpeed} м/мин</strong>.</span>`);
    } else {
      suggestedSpeed = C.ABSOLUTE_SPEED_MAX;
      actions.push(`<span><strong>Скорост:</strong> Скоростта е на максимално допустимия таван (${C.ABSOLUTE_SPEED_MAX} м/мин).</span>`);
    }

  } else { // over
    operatorText = `${lengthStatusText} Премодифициране (${residualMg}% > ${C.MG_TARGET_MAX}%).`;
    operatorClass = 'danger';
    mgText = `ПРЕВИШЕНА ГОРНА ГРАНИЦА: остатъчният Mg надвишава ${C.MG_TARGET_MAX}%!`;

    if (diffMeters > 0.5) {
      actions.push(`<span><strong>Задължителен метраж:</strong> Отчетено е предозиране (+${absDiff} м). Спазвайте точното предписание и го намалете с <strong>−1.5 м</strong>.</span>`);
    } else {
      actions.push(`<span><strong>Задължителен метраж:</strong> Силно премодифициране! Намалете метража за следващата кофа с <strong>−1.5 м до −2.0 м</strong>.</span>`);
    }
    if (currentSpeed > C.ABSOLUTE_SPEED_MIN) {
      suggestedSpeed = Math.max(C.ABSOLUTE_SPEED_MIN, currentSpeed - 1);
      actions.push(`<span><strong>Задължителна скорост:</strong> Намалете от ${currentSpeed} на <strong>${suggestedSpeed} м/мин</strong>.</span>`);
    } else {
      suggestedSpeed = C.ABSOLUTE_SPEED_MIN;
      actions.push(`<span><strong>Задължителна скорост:</strong> Запазете долната граница от ${C.ABSOLUTE_SPEED_MIN} м/мин.</span>`);
    }
  }

  // 3. Визуализация
  const z = ZONES[zone];
  $('mgAnalysisBox').classList.remove('is-empty');
  $('mgMarker').style.display = '';

  $('mgResultDisplay').textContent = absorption.toFixed(1);
  const ring = $('ringFg');
  ring.style.stroke = z.color;
  ring.style.opacity = '1';
  ring.style.strokeDashoffset = RING_LENGTH * (1 - clamp(absorption, 0, 100) / 100);

  $('recommendedSpeedDisplay').textContent = suggestedSpeed;
  const delta = $('speedDelta');
  if (suggestedSpeed > currentSpeed) { delta.textContent = `▲ +${suggestedSpeed - currentSpeed} спрямо сега`; delta.className = 'delta up'; }
  else if (suggestedSpeed < currentSpeed) { delta.textContent = `▼ −${currentSpeed - suggestedSpeed} спрямо сега`; delta.className = 'delta down'; }
  else { delta.textContent = '● Без промяна'; delta.className = 'delta same'; }
  markSuggestedSpeed(suggestedSpeed);

  const tag = $('mgValueTag');
  tag.textContent = `${residualMg}% · ${z.label}`;
  tag.className = `tag ${z.tone}`;
  const pos = ((clamp(residualMg, C.MG_SCALE_MIN, C.MG_SCALE_MAX) - C.MG_SCALE_MIN) / (C.MG_SCALE_MAX - C.MG_SCALE_MIN)) * 100;
  $('mgMarker').style.left = `${pos}%`;

  const maxLen = Math.max(target, actualLength) * 1.1;
  $('barTarget').style.width = `${(target / maxLen) * 100}%`;
  $('barActual').style.width = `${(actualLength / maxLen) * 100}%`;
  $('barActual').className = isLengthOk ? 'ok' : 'warn';
  $('barTargetVal').textContent = `${target.toFixed(1)} м`;
  $('barActualVal').textContent = `${actualLength.toFixed(1)} м`;
  const sign = absDiff === '0.0' ? '±' : (diffMeters > 0 ? '+' : '−');
  const devTag = $('devTag');
  devTag.textContent = `${sign}${absDiff} м (${sign}${Math.abs(diffPercent).toFixed(1)}%)`;
  devTag.className = `tag ${isLengthOk ? 'ok' : 'warn'}`;

  $('operatorStatus').textContent = operatorText;
  $('operatorStatus').className = `status ${operatorClass}`;
  $('mgStatus').textContent = mgText;
  $('mgStatus').className = `status ${z.status}`;
  $('actionPlanList').innerHTML = actions.map((a) => `<li>${a}</li>`).join('');

  setPill(`Mg ${z.label.toLowerCase()}`, z.tone);

  addHistory({ t: Date.now(), m1, s1, len: actualLength, mg: residualMg, abs: absorption, zone, speed: currentSpeed });

  if (!isDesktop()) setTimeout(() => $('mgAnalysisBox').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

/* ---------- Празно състояние (преди анализ) ---------- */
function renderEmptyResults() {
  $('mgAnalysisBox').classList.add('is-empty');
  $('mgResultDisplay').textContent = '–';
  const ring = $('ringFg');
  ring.style.opacity = '0';
  ring.style.strokeDashoffset = RING_LENGTH;
  $('recommendedSpeedDisplay').textContent = '–';
  $('speedDelta').textContent = 'Очаква анализ';
  $('speedDelta').className = 'delta idle';
  $('mgValueTag').textContent = '–';
  $('mgValueTag').className = 'tag';
  $('mgMarker').style.display = 'none';
  $('devTag').textContent = '–';
  $('devTag').className = 'tag';
  $('barTarget').style.width = '0%';
  $('barActual').style.width = '0%';
  $('barTargetVal').textContent = '–';
  $('barActualVal').textContent = '–';
  $('operatorStatus').textContent = 'Очаква лабораторен резултат: въведете остатъчния Mg и натиснете Enter.';
  $('operatorStatus').className = 'status info';
  $('mgStatus').textContent = '';
  $('mgStatus').className = 'status';
  $('actionPlanList').innerHTML = '<li class="empty">Корекциите ще се появят тук след анализа.</li>';
  markSuggestedSpeed(null);
}

/* ---------- Скала Mg ---------- */
function buildMgScale() {
  const C = METALLURGY_CONFIG;
  const p = (v) => ((v - C.MG_SCALE_MIN) / (C.MG_SCALE_MAX - C.MG_SCALE_MIN)) * 100;
  const a = p(C.MG_WARN_MIN), b = p(C.MG_TARGET_MIN), c = p(C.MG_HIGH_SOFT), d = p(C.MG_TARGET_MAX);
  $('mgTrack').style.background = `linear-gradient(90deg,
    var(--bad) 0 ${a}%, var(--warn) ${a}% ${b}%, var(--ok) ${b}% ${c}%,
    var(--warn) ${c}% ${d}%, var(--bad) ${d}% 100%)`;
  $('mgTicks').innerHTML = [C.MG_WARN_MIN, C.MG_TARGET_MIN, C.MG_HIGH_SOFT, C.MG_TARGET_MAX]
    .map((v) => `<span style="left:${p(v)}%">${v.toFixed(3)}</span>`).join('');
}

/* ---------- Журнал ---------- */
function readHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (e) { return []; }
}
function writeHistory(list) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) { /* няма достъп до хранилище */ }
}
function addHistory(entry) {
  const C = METALLURGY_CONFIG;
  const perCap = {};
  // Най-новите са първи; за всяка вместимост остават само последните N записа
  const list = [entry, ...readHistory()]
    .filter((h) => {
      const key = String(Number(h.m1));
      perCap[key] = (perCap[key] || 0) + 1;
      return perCap[key] <= C.HISTORY_PER_CAPACITY;
    })
    .slice(0, C.HISTORY_LIMIT);
  writeHistory(list);
  renderHistory(list);
}

function fmtMg(v) {
  const n = Number(v);
  return Math.abs(n * 1000 - Math.round(n * 1000)) > 1e-6 ? n.toFixed(4) : n.toFixed(3);
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === now.toDateString()) return hm;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function renderHistory(list = readHistory()) {
  const box = $('historyList');
  if (!list.length) {
    box.innerHTML = '<div class="history-empty">Все още няма анализирани кофи.</div>';
    return;
  }

  // Групиране по вместимост; групите са подредени по най-скорошен запис
  const groups = new Map();
  list.forEach((h) => {
    const key = Number(h.m1);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(h);
  });

  const currentCap = num('m1');

  box.innerHTML = [...groups.entries()].map(([cap, items]) => {
    const isCurrent = cap === currentCap;
    const rows = items.map((h) => {
      const z = ZONES[h.zone] || ZONES.optimal;
      return `<div class="history-item">
        <span class="history-time" title="${new Date(h.t).toLocaleString('bg-BG')}">${formatTime(h.t)}</span>
        <span class="history-main">Mg <b>${fmtMg(h.mg)}%</b> · <b>${Number(h.len).toFixed(1)} м</b> · <b>${Number(h.abs).toFixed(1)}%</b> усв. · ${h.speed} м/мин</span>
        <span class="history-zone ${z.tone}">${z.label}</span>
      </div>`;
    }).join('');
    return `<div class="history-group${isCurrent ? ' current' : ''}">
      <div class="history-head">
        <span class="history-cap">${cap}<small>кг</small></span>
        <span>${isCurrent ? '<span class="history-now">текуща кофа</span> · ' : ''}${items.length} от ${METALLURGY_CONFIG.HISTORY_PER_CAPACITY}</span>
      </div>
      ${rows}
    </div>`;
  }).join('');
}

/* ---------- Известие ---------- */
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ---------- Нулиране ---------- */
function resetAll() {
  $('m1').value = '1000';
  $('s1').value = '0.020';
  $('lenghtOfWire').value = '';
  state.lengthTouched = false;
  $('residualMg').value = '';
  document.querySelectorAll('.control input').forEach(updateHint);
  renderEmptyResults();
  markSuggestedSpeed(null);
  setSpeed(METALLURGY_CONFIG.DEFAULT_SPEED);
  switchTab(1);
}
