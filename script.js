function calculate() {
  const m1 = parseFloat(document.getElementById("m1").value);
  const s1 = parseFloat(document.getElementById("s1").value);
  const s2 = parseFloat(document.getElementById("s2").value);
  const mg1 = parseFloat(document.getElementById("mg1").value);
  const mg2 = parseFloat(document.getElementById("mg2").value);

  

  const inputs = document.querySelectorAll('.positive-only');
const error = document.getElementById('error');

inputs.forEach(input => {
  input.addEventListener('input', () => {
    if (parseFloat(input.value) < 0) {
      error.style.display = 'block';
      input.value = '';
    } else {
      error.style.display = 'none';
    }
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === '-' || e.key === 'e') {
      e.preventDefault();
    }
  });
});

  if (isNaN(m1) || isNaN(s1) || isNaN(s2) || isNaN(mg1)|| isNaN(mg2)) {
    alert("Моля, попълни всички стойности!");
    return;
  }
  let mg =0;
  if(mg2>=18){mg = 35}
  else{mg = 33 }
const result =((0.76*(s1-s2)+mg1)/(0.044*mg))*m1;



  document.getElementById("result").textContent = result.toFixed(1);
}
