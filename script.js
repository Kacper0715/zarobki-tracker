// Dane w localStorage
const STORAGE_KEY = 'work-tracker-entries-v2';
const SETTINGS_KEY = 'work-tracker-settings-v2';

let entries = [];
let settings = {
  rate: 25,
  currency: 'PLN'
};

let rates = { PLN: 1, EUR: 1, USD: 1 };
let baseCurrency = 'PLN';

// DOM
const rateInput = document.getElementById('hourlyRate');
const currencyInput = document.getElementById('currency');
const calendarDiv = document.getElementById('calendar');
const workTable = document.getElementById('workTable').querySelector('tbody');
const formSection = document.getElementById('formSection');
const workForm = document.getElementById('workForm');
const formDateLabel = document.getElementById('formDate');
const hoursInput = document.getElementById('hoursInput');
const noteInput = document.getElementById('noteInput');
const rateInputDay = document.getElementById('rateInput');
const cancelBtn = document.getElementById('cancelBtn');
const exportBtn = document.getElementById('exportBtn');
const summaryPeriod = document.getElementById('summaryPeriod');
const totalHoursEl = document.getElementById('totalHours');
const totalEarningsEl = document.getElementById('totalEarnings');
const calendarYear = document.getElementById('calendarYear');
const calendarMonth = document.getElementById('calendarMonth');
const currencyInfo = document.getElementById('currencyInfo');

const ccFrom = document.getElementById('ccFrom');
const ccTo = document.getElementById('ccTo');
const ccAmount = document.getElementById('ccAmount');
const ccResult = document.getElementById('ccResult');

let editDate = null;
let selectedYear, selectedMonth;

// --- helpers ---
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
function loadData() {
  entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}
function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
function loadSettings() {
  const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
  if (s) Object.assign(settings, s);
}

function formatDate(d) {
  return d.toISOString().slice(0,10);
}
function displayDate(d) {
  const [y,m,day] = d.split('-');
  return `${day}.${m}.${y}`;
}

// --- kursy walut online + kalkulator ---
async function fetchRates() {
  try {
    currencyInfo.textContent = "Aktualizuję kursy...";
    const res = await fetch('https://api.frankfurter.app/latest?from=PLN&to=USD,EUR');
    const data = await res.json();
    rates = { PLN: 1, EUR: data.rates.EUR, USD: data.rates.USD };
    baseCurrency = 'PLN';
    currencyInfo.textContent = `Kursy: 1 PLN = ${rates.EUR.toFixed(3)} EUR, ${rates.USD.toFixed(3)} USD`;
    renderAll();
    updateCurrencyConverter();
  } catch {
    currencyInfo.textContent = "Błąd pobierania kursów!";
    rates = { PLN: 1, EUR: 0.23, USD: 0.25 };
    renderAll();
    updateCurrencyConverter();
  }
}

function convert(amount, from, to) {
  if (from === to) return amount;
  if (!rates[from] || !rates[to]) return NaN;
  // Wszystko przez PLN jako bazowy
  return amount / rates[from] * rates[to];
}

// --- kalkulator walutowy ---
function updateCurrencyConverter() {
  const amount = parseFloat(ccAmount.value) || 0;
  const from = ccFrom.value;
  const to = ccTo.value;
  if (!rates[from] || !rates[to]) {
    ccResult.textContent = 'brak danych';
    return;
  }
  const result = convert(amount, from, to);
  ccResult.textContent = isNaN(result) ? '—' : `= ${result.toFixed(2)} ${to}`;
}

ccAmount.oninput = updateCurrencyConverter;
ccFrom.onchange = updateCurrencyConverter;
ccTo.onchange = updateCurrencyConverter;

// --- wybór roku/miesiąca ---
function fillCalendarControls() {
  const now = new Date();
  const minYear = 2022;
  const maxYear = now.getFullYear() + 1;
  calendarYear.innerHTML = '';
  for(let y=minYear; y<=maxYear; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    calendarYear.appendChild(opt);
  }
  calendarMonth.innerHTML = '';
  const months = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
  for(let m=0; m<12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = months[m];
    calendarMonth.appendChild(opt);
  }
}

function updateCalendarControls() {
  const now = new Date();
  selectedYear = Number(localStorage.getItem('work-tracker-year') || now.getFullYear());
  selectedMonth = Number(localStorage.getItem('work-tracker-month') || now.getMonth());
  calendarYear.value = selectedYear;
  calendarMonth.value = selectedMonth;
}

calendarYear.onchange = ()=>{
  selectedYear = Number(calendarYear.value);
  localStorage.setItem('work-tracker-year', selectedYear);
  renderCalendar();
};
calendarMonth.onchange = ()=>{
  selectedMonth = Number(calendarMonth.value);
  localStorage.setItem('work-tracker-month', selectedMonth);
  renderCalendar();
};

// --- kalendarz ---
function renderCalendar() {
  calendarDiv.innerHTML = '';
  const year = selectedYear;
  const month = selectedMonth;
  const today = new Date();
  const first = new Date(year, month, 1);
  const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1; // poniedziałek = 0
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const days = ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'];
  for(let i=0;i<7;i++) {
    const label = document.createElement('div');
    label.textContent = days[i];
    label.style.fontWeight = 'bold';
    calendarDiv.appendChild(label);
  }
  for(let i=0;i<startDay;i++) {
    const empty = document.createElement('div');
    calendarDiv.appendChild(empty);
  }
  for(let day=1; day<=daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.className = 'day';
    const date = new Date(year, month, day);
    const dateStr = formatDate(date);
    cell.textContent = day;
    if(formatDate(today) === dateStr) {
      cell.classList.add('today');
    }
    if(entries.find(e=>e.date===dateStr)) {
      cell.classList.add('worked');
    }
    cell.addEventListener('click', ()=>{
      openForm(dateStr);
    });
    calendarDiv.appendChild(cell);
  }
}

// --- formularz ---
function openForm(dateStr) {
  editDate = dateStr;
  const entry = entries.find(e=>e.date===dateStr);
  hoursInput.value = entry ? entry.hours : '';
  rateInputDay.value = entry ? entry.rate : settings.rate;
  noteInput.value = entry ? entry.note : '';
  formDateLabel.textContent = `Data: ${displayDate(dateStr)}`;
  formSection.classList.remove('hidden');
  hoursInput.focus();
}
cancelBtn.onclick = ()=> {
  formSection.classList.add('hidden');
};
workForm.onsubmit = function(e) {
  e.preventDefault();
  const hours = parseFloat(hoursInput.value);
  const note = noteInput.value.trim();
  const rate = parseFloat(rateInputDay.value);
  if (isNaN(hours) || hours <= 0 || isNaN(rate) || rate <= 0) return;
  const idx = entries.findIndex(e=>e.date===editDate);
  if (idx !== -1) {
    entries[idx].hours = hours;
    entries[idx].rate = rate;
    entries[idx].note = note;
  } else {
    entries.push({date: editDate, hours, rate, note});
  }
  saveData();
  renderAll();
  formSection.classList.add('hidden');
  workForm.reset();
};

// --- lista wpisów ---
function renderTable() {
  workTable.innerHTML = '';
  const sorted = entries.slice().sort((a,b)=>a.date.localeCompare(b.date));
  for(const entry of sorted) {
    const amountPLN = entry.hours * (entry.rate ?? settings.rate);
    const amountUser = convert(amountPLN, baseCurrency, settings.currency);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${displayDate(entry.date)}</td>
      <td>${entry.hours}</td>
      <td>${entry.rate.toFixed(2)} ${settings.currency}</td>
      <td>${entry.note||''}</td>
      <td>${isNaN(amountUser) ? "—" : amountUser.toFixed(2)} ${settings.currency}</td>
      <td>
        <button data-edit="${entry.date}" aria-label="Edytuj wpis">Edytuj</button>
        <button data-del="${entry.date}" aria-label="Usuń wpis">Usuń</button>
      </td>
    `;
    tr.querySelector('[data-edit]').onclick = ()=>openForm(entry.date);
    tr.querySelector('[data-del]').onclick = ()=>{
      if (confirm('Na pewno usunąć ten wpis?')) {
        entries = entries.filter(e=>e.date!==entry.date);
        saveData();
        renderAll();
      }
    };
    workTable.appendChild(tr);
  }
}

// --- podsumowanie ---
function getPeriodEntries() {
  const now = new Date();
  const type = summaryPeriod.value;
  if(type === 'all') return entries;
  if(type === 'month') {
    const y = now.getFullYear(), m = now.getMonth();
    return entries.filter(e=>{
      const d = new Date(e.date);
      return d.getFullYear()===y && d.getMonth()===m;
    });
  }
  if(type === 'week') {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay()+6)%7));
    monday.setHours(0,0,0,0);
    return entries.filter(e=>{
      const d = new Date(e.date);
      return d >= monday && d <= now;
    });
  }
  return entries;
}

function renderSummary() {
  const periodEntries = getPeriodEntries();
  const sumHours = periodEntries.reduce((s,e)=>s+e.hours,0);
  const sumPLN = periodEntries.reduce((s,e)=>s+e.hours*(e.rate ?? settings.rate),0);
  const sumUser = convert(sumPLN, baseCurrency, settings.currency);
  totalHoursEl.textContent = sumHours.toFixed(2);
  totalEarningsEl.textContent = `${isNaN(sumUser) ? "—" : sumUser.toFixed(2)} ${settings.currency}`;
}

// --- stat tiles (podsumowania w kaflach) ---
function renderStatTiles() {
  const statTiles = document.getElementById('statTiles');
  const periodEntries = getPeriodEntries();
  if (!statTiles) return;
  if (periodEntries.length === 0) {
    statTiles.innerHTML = `<div style="opacity:0.7;padding:1em;">Brak danych w wybranym okresie.</div>`;
    return;
  }

  // Najlepszy dzień
  let bestDay = periodEntries[0];
  let maxEarn = periodEntries[0].hours * (periodEntries[0].rate ?? settings.rate);
  for(const e of periodEntries) {
    const earn = e.hours * (e.rate ?? settings.rate);
    if (earn > maxEarn) { maxEarn = earn; bestDay = e; }
  }
  const avgHours = periodEntries.reduce((s,e)=>s+e.hours,0) / periodEntries.length;
  const avgRate = periodEntries.reduce((s,e)=>s+(e.rate ?? settings.rate),0) / periodEntries.length;
  const totalEarnPLN = periodEntries.reduce((s,e)=>s+e.hours*(e.rate ?? settings.rate),0);
  const totalEarnUser = convert(totalEarnPLN, baseCurrency, settings.currency);

  statTiles.innerHTML = `
    <div class="stat-tile">
      <div class="stat-tile-label">Łącznie zarobione</div>
      <div class="stat-tile-value">${isNaN(totalEarnUser) ? "—" : totalEarnUser.toFixed(2)} ${settings.currency}</div>
    </div>
    <div class="stat-tile">
      <div class="stat-tile-label">Przepracowane godziny</div>
      <div class="stat-tile-value">${periodEntries.reduce((s,e)=>s+e.hours,0).toFixed(2)} h</div>
    </div>
    <div class="stat-tile">
      <div class="stat-tile-label">Średnia stawka</div>
      <div class="stat-tile-value">${avgRate.toFixed(2)} ${settings.currency}/h</div>
    </div>
    <div class="stat-tile">
      <div class="stat-tile-label">Najlepszy dzień</div>
      <div class="stat-tile-value">${displayDate(bestDay.date)}</div>
      <div style="color:#4b5563;font-size:0.98em;font-weight:500">
        +${(bestDay.hours * (bestDay.rate ?? settings.rate)).toFixed(2)} ${settings.currency}
      </div>
    </div>
  `;
}

// --- ustawienia/waluta ---
rateInput.oninput = ()=>{
  settings.rate = parseFloat(rateInput.value) || 0;
  saveSettings();
  renderAll();
};
currencyInput.onchange = ()=>{
  settings.currency = currencyInput.value;
  saveSettings();
  fetchRates();
};
summaryPeriod.onchange = ()=>{renderSummary(); renderStatTiles();};

// --- eksport CSV ---
exportBtn.onclick = function() {
  let csv = 'Data,Godziny,Stawka,Notatka,Zarobek\n';
  for(const e of entries) {
    const amountPLN = e.hours * (e.rate ?? settings.rate);
    const amountUser = convert(amountPLN, baseCurrency, settings.currency);
    csv += `"${e.date}",${e.hours},${e.rate ?? settings.rate},"${e.note||''}",${isNaN(amountUser) ? "—" : amountUser.toFixed(2)} ${settings.currency}\n`;
  }
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'zarobki.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// --- renderAll & init ---
function renderAll() {
  renderCalendar();
  renderTable();
  renderSummary();
  renderStatTiles();
}

function init() {
  fillCalendarControls();
  updateCalendarControls();
  loadSettings();
  rateInput.value = settings.rate;
  currencyInput.value = settings.currency;
  loadData();
  fetchRates();
  renderAll();
  updateCurrencyConverter();
}
init();
