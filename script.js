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

  // Технологични прагове за остатъчен Mg (%)
  MG_TARGET_MIN: 0.042,    // Долна оптимална граница
  MG_HIGH_SOFT: 0.052,     // Граница за подсказка за намаляване на скоростта
  MG_TARGET_MAX: 0.060,    // Твърда горна граница (без толеранс)
  MG_WARN_MIN: 0.035,      // Начало на зоната за внимание
  MG_WARN_MAX: 0.041       // Край на зоната за внимание
};

let calculatedTargetWire = 0;

document.addEventListener('DOMContentLoaded', () => {
  const speed1 = document.getElementById('speedOfWire');
  const speed2 = document.getElementById('speedOfWireStep2');

  [speed1, speed2].forEach(slider => {
    slider.min = METALLURGY_CONFIG.ABSOLUTE_SPEED_MIN;
    slider.max = METALLURGY_CONFIG.ABSOLUTE_SPEED_MAX;
    slider.value = 22;
  });

  speed1.addEventListener('input', (e) => {
    speed2.value = e.target.value;
    updateSpeedDisplays(e.target.value);
    calculateWireRequirement();
  });

  speed2.addEventListener('input', (e) => {
    speed1.value = e.target.value;
    updateSpeedDisplays(e.target.value);
    calculateWireRequirement();
  });

  document.getElementById('m1').addEventListener('input', calculateWireRequirement);
  document.getElementById('s1').addEventListener('input', calculateWireRequirement);

  calculateWireRequirement();
});

function updateSpeedDisplays(val) {
  document.getElementById('speedValueDisplay').textContent = `${val} м/мин`;
  document.getElementById('speedValueDisplayStep2').textContent = `${val} м/мин`;
}

function switchTab(step) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.step-content').forEach(sec => sec.classList.remove('active'));

  document.getElementById(`tab${step}`).classList.add('active');
  document.getElementById(`step${step}`).classList.add('active');

  if (step === 2) {
    document.getElementById('targetWireSummary').textContent = `${calculatedTargetWire.toFixed(1)} м`;
    
    const lengthInput = document.getElementById('lenghtOfWire');
    if (!lengthInput.value) {
      lengthInput.value = calculatedTargetWire.toFixed(1);
    }
  }
}

function calculateWireRequirement() {
  const m1 = parseFloat(document.getElementById('m1').value);
  const s1 = parseFloat(document.getElementById('s1').value);
  const speed = parseFloat(document.getElementById('speedOfWire').value);

  updateSpeedDisplays(speed);

  if (isNaN(m1) || isNaN(s1) || isNaN(speed)) {
    document.getElementById('wireResultDisplay').textContent = '–';
    calculatedTargetWire = 0;
    return;
  }

  const { BASE_SULPHUR_TARGET, INITIAL_MG_REACTIONS, TARGET_ABSORPTION_PERCENT, WIRE_COEFFICIENT, WIRE_FACTOR, OPTIMAL_SPEED_MIN, OPTIMAL_SPEED_MAX, ABSOLUTE_SPEED_MIN, ABSOLUTE_SPEED_MAX } = METALLURGY_CONFIG;

  calculatedTargetWire = ((WIRE_COEFFICIENT * (s1 - BASE_SULPHUR_TARGET) + INITIAL_MG_REACTIONS) / (WIRE_FACTOR * TARGET_ABSORPTION_PERCENT)) * m1;
  document.getElementById('wireResultDisplay').textContent = calculatedTargetWire.toFixed(1);

  const speedStatusBox = document.getElementById('speedStatus');

  if (speed >= OPTIMAL_SPEED_MIN && speed <= OPTIMAL_SPEED_MAX) {
    speedStatusBox.textContent = `Оптимален режим на подаване (${speed} м/мин).`;
    speedStatusBox.className = 'status-box success';
  } else if (speed >= ABSOLUTE_SPEED_MIN && speed <= ABSOLUTE_SPEED_MAX) {
    speedStatusBox.textContent = `Работа в режим на корекция (${speed} м/мин).`;
    speedStatusBox.className = 'status-box warning';
  } else {
    speedStatusBox.textContent = `ОПАСНОСТ: Скорост извън разрешения толеранс (20-25 м/мин)!`;
    speedStatusBox.className = 'status-box danger';
  }
}

function calculateMg() {
  const m1 = parseFloat(document.getElementById('m1').value);
  const s1 = parseFloat(document.getElementById('s1').value);
  const actualLength = parseFloat(document.getElementById('lenghtOfWire').value);
  const residualMg = parseFloat(document.getElementById('residualMg').value);
  const currentSpeed = parseFloat(document.getElementById('speedOfWireStep2').value);

  if (isNaN(m1) || isNaN(s1) || isNaN(actualLength) || isNaN(residualMg)) {
    alert('Моля, въведете реално вложената жица и остатъчния Mg!');
    return;
  }

  const { BASE_SULPHUR_TARGET, WIRE_COEFFICIENT, WIRE_FACTOR, ABSOLUTE_SPEED_MIN, ABSOLUTE_SPEED_MAX, OPTIMAL_SPEED_MIN, OPTIMAL_SPEED_MAX, MG_TARGET_MIN, MG_HIGH_SOFT, MG_TARGET_MAX, MG_WARN_MIN, MG_WARN_MAX } = METALLURGY_CONFIG;

  if (currentSpeed < ABSOLUTE_SPEED_MIN || currentSpeed > ABSOLUTE_SPEED_MAX) {
    alert(`НЕДОПУСТИМА СКОРОСТ: Работете в границите от ${ABSOLUTE_SPEED_MIN} до ${ABSOLUTE_SPEED_MAX} м/мин!`);
    return;
  }

  const realAbsorptionRate = ((WIRE_COEFFICIENT * (s1 - BASE_SULPHUR_TARGET) + residualMg) / (WIRE_FACTOR * actualLength)) * m1;

  const mgAnalysisBox = document.getElementById('mgAnalysisBox');
  const mgResultDisplay = document.getElementById('mgResultDisplay');
  const operatorStatus = document.getElementById('operatorStatus');
  const mgStatus = document.getElementById('mgStatus');
  const actionPlanList = document.getElementById('actionPlanList');
  const recommendedSpeedDisplay = document.getElementById('recommendedSpeedDisplay');

  mgResultDisplay.textContent = realAbsorptionRate.toFixed(1);
  mgAnalysisBox.classList.remove('hidden');

  let actions = [];
  let suggestedSpeed = currentSpeed;

  // 1. Изчисляване на разликата между фактически вложената и изчислената жица
  const diffMeters = actualLength - calculatedTargetWire;
  const absDiff = Math.abs(diffMeters).toFixed(1);
  const diffPercent = (diffMeters / calculatedTargetWire) * 100;

  let lengthStatusText = "";
  let isLengthOk = Math.abs(diffPercent) <= 2.5; // Толеранс до ±2.5%

  if (isLengthOk) {
    lengthStatusText = `Метражът е спазен (Вложени: ${actualLength} м / Предписани: ${calculatedTargetWire.toFixed(1)} м).`;
  } else if (diffMeters > 0) {
    lengthStatusText = `ОТКЛОНЕНИЕ: Подадени са +${absDiff} м повече от предписаното!`;
  } else {
    lengthStatusText = `ОТКЛОНЕНИЕ: Подадени са -${absDiff} м по-малко от предписаното!`;
  }

  // 2. ДИНАМИЧНИ ПРАГОВЕ НА МАГНЕЗИЯ
  const isMgOptimalLow = residualMg >= MG_TARGET_MIN && residualMg < MG_HIGH_SOFT;   // 0.042% - 0.0519% (Идеален)
  const isMgOptimalHigh = residualMg >= MG_HIGH_SOFT && residualMg <= MG_TARGET_MAX; // 0.052% - 0.060% (Повишен)
  const isMgWarning = residualMg >= MG_WARN_MIN && residualMg <= MG_WARN_MAX;         // 0.035% - 0.041% (Внимание)
  const isMgCriticalLow = residualMg < MG_WARN_MIN;                                    // < 0.035% (Критично нисък)
  const isMgStrictOver = residualMg > MG_TARGET_MAX;                                   // > 0.060% (Твърдо премодифициране)

  // 2A. ИДЕАЛЕН ОПТИМАЛЕН РЕЖИМ (0.042% - 0.051%) -> Зелен цвят
  if (isMgOptimalLow) {
    suggestedSpeed = currentSpeed;
    operatorStatus.textContent = lengthStatusText;
    operatorStatus.className = isLengthOk ? 'status-box success' : 'status-box warning';
    
    mgStatus.textContent = `Остатъчен Mg (${residualMg}%): В оптимални граници.`;
    mgStatus.className = 'status-box success';

    if (!isLengthOk && diffMeters < -0.5) {
      actions.push(`<strong>Забележка за метража:</strong> Въпреки недостига от -${absDiff} м жица, Mg е в норма. Спазвайте предписанието.`);
    } else if (!isLengthOk && diffMeters > 0.5) {
      actions.push(`<strong>Забележка за метража:</strong> Има преразход (+${absDiff} м). Върнете се към изчислената стойност.`);
    } else {
      actions.push(`<strong>1. Запазете метража:</strong> Продължете със същото предписание.`);
    }
    actions.push(`<strong>2. Поддържайте скоростта:</strong> Запазете текущата скорост от ${currentSpeed} м/мин.`);
  } 
  // 2B. ПОВИШЕН Mg В ДОПУСТИМАТА ЗОНА (0.052% - 0.060%) -> Жълт цвят (Оптимизация)
  else if (isMgOptimalHigh) {
    if (currentSpeed > ABSOLUTE_SPEED_MIN) {
      suggestedSpeed = Math.max(ABSOLUTE_SPEED_MIN, currentSpeed - 1);
    }

    operatorStatus.textContent = `${lengthStatusText} | Повишен остатъчен Mg (${residualMg}%).`;
    operatorStatus.className = 'status-box warning';

    mgStatus.textContent = `Повишено съдържание на Mg (${residualMg}%). Налице е високо усвояване.`;
    mgStatus.className = 'status-box warning';

    if (diffMeters > 0.5) {
      actions.push(`<strong>1. Препоръка за метраж:</strong> Има реално предозиране (+${absDiff} м). Върнете се към базовото предписание и го намалете с <strong>-0.5 м</strong>.`);
    } else if (diffMeters < -0.5) {
      actions.push(`<strong>1. Препоръка за метраж:</strong> Усвояването е много високо (Mg е висок въпреки недостига от -${absDiff} м). Намалете предписанието с <strong>-1.0 м</strong>.`);
    } else {
      actions.push(`<strong>1. Препоръка за метраж:</strong> Метражът е спазен, но усвояването е високо. За следващата кофа намалете предписания метраж с <strong>-0.5 м до -1.0 м</strong>.`);
    }

    if (suggestedSpeed < currentSpeed) {
      actions.push(`<strong>2. Препоръка за скорост:</strong> Намалете скоростта от ${currentSpeed} на <strong>${suggestedSpeed} м/мин</strong> за плавно сваляне на Mg и икономия.`);
    } else {
      actions.push(`<strong>2. Препоръка за скорост:</strong> Скоростта е на долния толеранс (${ABSOLUTE_SPEED_MIN} м/мин). Не я намалявайте повече.`);
    }
  }
  // 2C. ЗОНА ЗА ВНИМАНИЕ (0.035% - 0.041%) -> Жълт цвят
  else if (isMgWarning) {
    operatorStatus.textContent = `${lengthStatusText} | Нисък Mg (${residualMg}%).`;
    operatorStatus.className = 'status-box warning';

    mgStatus.textContent = `Предупреждение: Остатъчният Mg пада към долната допустима граница.`;
    mgStatus.className = 'status-box warning';

    if (diffMeters < -0.5) {
      actions.push(`<strong>1. Причина:</strong> Подадени са <strong>-${absDiff} м по-малко</strong> жица. Подайте пълния предписан метраж.`);
    } else {
      actions.push(`<strong>1. Метраж:</strong> Увеличете заложения метраж с <strong>+1.0 м до +1.5 м</strong> за следващата кофа.`);
    }

    if (currentSpeed < OPTIMAL_SPEED_MAX) {
      suggestedSpeed = Math.min(OPTIMAL_SPEED_MAX, currentSpeed + 1);
      actions.push(`<strong>2. Скорост:</strong> Повишете скоростта на <strong>${suggestedSpeed} м/мин</strong>.`);
    } else {
      actions.push(`<strong>2. Скорост:</strong> Запазете текущата скорост от ${currentSpeed} м/мин.`);
    }
  }
  // 2D. КРИТИЧНО НИСЪК Mg (< 0.035%) -> Червен цвят
  else if (isMgCriticalLow) {
    operatorStatus.textContent = `${lengthStatusText} | Критично нисък Mg (${residualMg}%).`;
    operatorStatus.className = 'status-box danger';

    mgStatus.textContent = `КРИТИЧНО НИСЪК Mg (${residualMg}% < ${MG_WARN_MIN}%): Риск от бракуване!`;
    mgStatus.className = 'status-box danger';

    if (diffMeters < -0.5) {
      actions.push(`<strong>1. Грешка при дозирането:</strong> Недостиг от <strong>-${absDiff} м</strong>! Подайте пълния метраж +1.0 м за компенсация.`);
    } else {
      actions.push(`<strong>1. Задължителна мярка:</strong> Увеличете заложения метраж с <strong>+2.0 м до +2.5 м</strong>.`);
    }

    if (currentSpeed < ABSOLUTE_SPEED_MAX) {
      suggestedSpeed = Math.min(ABSOLUTE_SPEED_MAX, currentSpeed + 2);
      actions.push(`<strong>2. Скорост:</strong> Увеличете скоростта на <strong>${suggestedSpeed} м/мин</strong>.`);
    } else {
      suggestedSpeed = ABSOLUTE_SPEED_MAX;
      actions.push(`<strong>2. Скорост:</strong> Скоростта е на максимално допустимия таван (${ABSOLUTE_SPEED_MAX} м/мин).`);
    }
  } 
  // 2E. ТВЪРДО ПРЕМОДИФИЦИРАНЕ (> 0.060%) -> Червен цвят
  else if (isMgStrictOver) {
    operatorStatus.textContent = `${lengthStatusText} | Премодифициране (${residualMg}% > ${MG_TARGET_MAX}%).`;
    operatorStatus.className = 'status-box danger';

    mgStatus.textContent = `ПРЕВИШЕНА ГОРНА ГРАНИЦА: Остатъчният Mg надвишава ${MG_TARGET_MAX}%!`;
    mgStatus.className = 'status-box danger';

    if (diffMeters > 0.5) {
      actions.push(`<strong>1. Задължителен метраж:</strong> Отчетено е предозиране (+${absDiff} м). Спазвайте точното предписание и го намалете с <strong>-1.5 м</strong>.`);
    } else {
      actions.push(`<strong>1. Задължителен метраж:</strong> Силно премодифициране! Намалете заложения метраж за следващата кофа с <strong>-1.5 м до -2.0 м</strong>.`);
    }

    if (currentSpeed > ABSOLUTE_SPEED_MIN) {
      suggestedSpeed = Math.max(ABSOLUTE_SPEED_MIN, currentSpeed - 1);
      actions.push(`<strong>2. Задължителна скорост:</strong> Намалете скоростта от ${currentSpeed} на <strong>${suggestedSpeed} м/мин</strong>.`);
    } else {
      suggestedSpeed = ABSOLUTE_SPEED_MIN;
      actions.push(`<strong>2. Задължителна скорост:</strong> Запазете долната граница от ${ABSOLUTE_SPEED_MIN} м/мин.`);
    }
  }

  recommendedSpeedDisplay.textContent = `${suggestedSpeed} м/мин`;
  actionPlanList.innerHTML = actions.map(action => `<li>${action}</li>`).join('');
}

function resetAll() {
  document.getElementById('m1').value = '1000';
  document.getElementById('s1').value = '0.020';
  document.getElementById('speedOfWire').value = '22';
  document.getElementById('speedOfWireStep2').value = '22';
  document.getElementById('lenghtOfWire').value = '';
  document.getElementById('residualMg').value = '';

  document.getElementById('mgAnalysisBox').classList.add('hidden');
  calculateWireRequirement();
  switchTab(1);
}
