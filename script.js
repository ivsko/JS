function validatePositiveInputs() {
  const inputs = document.querySelectorAll('.positive-only');

  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      if (parseFloat(input.value) < 0) {
        input.value = '';
        document.getElementById('error').style.display = 'block';
      } else {
        document.getElementById('error').style.display = 'none';
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === '-' || e.key === 'e') e.preventDefault();
    });
  });
}

validatePositiveInputs();

function calculate() {
  const m1 = parseFloat(document.getElementById('m1').value);
  const s1 = parseFloat(document.getElementById('s1').value);
  const speed = parseFloat(document.getElementById('speedOfWire').value);

  if (isNaN(m1) || isNaN(s1) || isNaN(speed)) {
    alert('Моля, попълни всички стойности!');
    return;
  }

  const s2 = 0.0105;
  const mg1 = 0.045;

  let mg = 35; // скоростта е само информативна

  const result = ((0.76 * (s1 - s2) + mg1) / (0.044 * mg)) * m1;
  document.getElementById('result').textContent = result.toFixed(1);
  document.getElementById("wireResult").style.display = "block";

  document.getElementById('myForm').style.display = 'block';

  // ⭐ СЪОБЩЕНИЕ ЗА СКОРОСТТА
  const speedInfo = document.getElementById('speedInfo');

  if (speed < 20) {
    speedInfo.textContent =
      'Скорост на подаване: ниска. Провери температурата, стабилността на инсталацията и условията на обработка.';
    speedInfo.style.color = 'orange';
    speedInfo.style.display = 'block';
  } else if (speed >= 20 && speed <= 23) {
    speedInfo.textContent = 'Скорост на подаване: оптимална (20–23 м/мин).';
    speedInfo.style.color = 'limegreen';
    speedInfo.style.display = 'block';
  } else {
    speedInfo.textContent =
      'Скорост на подаване: висока. Следи за пръски, нестабилно усвояване и влиянието върху температурата.';
    speedInfo.style.color = 'orange';
    speedInfo.style.display = 'block';
  }
}

function calculateMg() {
  const m1 = parseFloat(document.getElementById('m1').value);
  const s1 = parseFloat(document.getElementById('s1').value);
  const length = parseFloat(document.getElementById('lenghtOfWire').value);
  const residualMg = parseFloat(document.getElementById('residualMg').value);

  if (isNaN(m1) || isNaN(s1) || isNaN(length) || isNaN(residualMg)) {
    alert('Моля, попълни всички стойности!');
    return;
  }

  const s2 = 0.0105;

  const result = ((0.76 * (s1 - s2) + residualMg) / (0.044 * length)) * m1;

  const output = document.getElementById('result1');
  const msgBox = document.getElementById('mgMessage');

  const mgLine = document.getElementById('mgResultLine');
  if (result >= 35) {
    mgLine.style.color = 'limegreen';
    msgBox.textContent = 'Усвояването е отлично.';
    msgBox.style.color = 'limegreen';
  } else if (result >= 30) {
    mgLine.style.color = 'orange';
    msgBox.textContent =
      'Усвояването е средно. Провери температурата и скоростта на подаване.';
    msgBox.style.color = 'orange';
  } else {
    mgLine.style.color = 'red';
    msgBox.textContent =
      'Усвояването е ниско. Необходими са незабавни корекции.';
    msgBox.style.color = 'red';
  }

  output.textContent = result.toFixed(1);
  msgBox.style.display = 'block';
}

function resetAll() {
  document.querySelectorAll('input').forEach((i) => (i.value = ''));
  document.getElementById('result').textContent = '–';
  document.getElementById('result1').textContent = '–';
  document.getElementById('mgMessage').style.display = 'none';
  document.getElementById('myForm').style.display = 'none';
  document.getElementById('speedInfo').style.display = 'none';
  document.getElementById('mgResultLine').style.display = 'none';
  document.getElementById('wireResult').style.display = 'none';
}
