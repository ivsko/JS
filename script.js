function calculate() {
  const m1 = parseFloat(document.getElementById("m1").value);
  const s1 = parseFloat(document.getElementById("s1").value);
  const s2 =0.0105
  const mg1 = 0.048
  const speedOfWire = parseFloat(document.getElementById("speedOfWire").value);

  

  const inputs = document.querySelectorAll('.positive-only');
  
const error = document.getElementById('error');

inputs.forEach(input => {
  input.addEventListener('input', () => {
    if (parseFloat(input.value) < 0) {
      error.style.display = 'flex';
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

  if (isNaN(m1) || isNaN(s1) || isNaN(s2) || isNaN(mg1)|| isNaN(speedOfWire)) {
    alert("Моля, попълни всички стойности!");
    return;
  }
  const poor = document.getElementById("messagePoor");
  const good = document.getElementById("messageGood");
  let mg =0;
  if(speedOfWire>=18){mg = 35;
  
good.style.display ="flex"}
  else{mg = 33 ;poor.style.display ="flex";
  }
const result =((0.76*(s1-s2)+mg1)/(0.044*mg))*m1;

const form = document.getElementById("myForm");


  // Превключва скрито/показано състояние
  if (form.style.display === "none") {
    form.style.display = "flex";
  } else {
    form.style.display = "none";
  
  }
const el = document.getElementById("result")
el.style.color = "green"


  document.getElementById("result").textContent = result.toFixed(1);
}

function calculateMg(){
 
  const m1 = parseFloat(document.getElementById("m1").value);
  const s1 = parseFloat(document.getElementById("s1").value);
  const s2 = 0.0105
  const mg1 = 0.045
  const lenghtOfWire = parseFloat(document.getElementById("lenghtOfWire").value);
  const residualMg = parseFloat(document.getElementById("residualMg").value);
  const inputs = document.querySelectorAll('.positive-only');
  
const error2 = document.getElementById('error2');

inputs.forEach(input => {
  input.addEventListener('input', () => {
    if (parseFloat(input.value) < 0) {
      error2.style.display = 'flex';
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

  if (isNaN(m1) || isNaN(s1) || isNaN(s2) || isNaN(lenghtOfWire)|| isNaN(residualMg)) {
    alert("Моля, попълни всички стойности!");
    return;
  }
  
const result =((0.76*(s1-s2)+residualMg)/(0.044*lenghtOfWire))*m1;
const toWiev = document.getElementById("result1")
if(result>=35){toWiev.style.color="green"}
else if(result<35 && result>=33){
  toWiev.style.color="orange"
}
else{toWiev.style.color="red"}



  document.getElementById("result1").textContent = result.toFixed(1);
}
