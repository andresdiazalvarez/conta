const STORAGE_KEY = "contabilidad-mensual";
const IVA_RATE = 0.21;

const months = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE"
];

const quarters = [
  ["ENERO", "FEBRERO", "MARZO"],
  ["ABRIL", "MAYO", "JUNIO"],
  ["JULIO", "AGOSTO", "SEPTIEMBRE"],
  ["OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
];

const editableFields = ["units", "price", "irpf", "autonomos", "gasoil1", "gasoil2", "gasoil3", "gasoil4"];
const calculatedFields = ["total", "iva", "invoice-total", "expense-iva", "expense-irpf", "expenses-total"];
let selectedMonth = months[0];
let records = loadRecords();

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR"
});

document.querySelectorAll("[data-screen]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.screen));
});

buildMonthButtons();
buildQuarterButtons();
bindInvoiceInputs();
showScreen("home-screen");

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === screenId);
  });
}

function buildMonthButtons() {
  const grid = document.getElementById("months-grid");
  months.forEach((month) => {
    const button = document.createElement("button");
    button.className = "month-button";
    button.textContent = month;
    button.addEventListener("click", () => openMonth(month));
    grid.appendChild(button);
  });
}

function buildQuarterButtons() {
  const grid = document.getElementById("quarters-grid");
  quarters.forEach((quarterMonths, index) => {
    const button = document.createElement("button");
    button.className = "quarter-button";
    button.textContent = `TRIMESTRE ${index + 1}`;
    button.addEventListener("click", () => openQuarter(index, quarterMonths));
    grid.appendChild(button);
  });
}

function bindInvoiceInputs() {
  [...editableFields, ...calculatedFields].forEach((id) => {
    const input = document.getElementById(id);
    input.value = "0.00";
  });

  editableFields.forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      updateCurrentMonth();
    });
  });
}

function openMonth(month) {
  selectedMonth = month;
  document.getElementById("selected-month").textContent = month;
  fillInvoiceForm(records[month] || emptyRecord());
  updateCurrentMonth();
  showScreen("invoice-screen");
}

function fillInvoiceForm(record) {
  editableFields.forEach((id) => {
    document.getElementById(id).value = numberValue(record[id]).toFixed(2);
  });
}

function updateCurrentMonth() {
  const record = readEditableRecord();
  const calculated = calculateRecord(record);
  const completeRecord = { ...record, ...calculated };
  records[selectedMonth] = completeRecord;
  saveRecords();
  renderCalculatedFields(completeRecord);
}

function readEditableRecord() {
  return editableFields.reduce((record, id) => {
    record[id] = numberValue(document.getElementById(id).value);
    return record;
  }, {});
}

function calculateRecord(record) {
  const total = record.units * record.price;
  const iva = total * IVA_RATE;
  const invoiceTotal = total + iva;
  const expenseIva = iva;
  const expenseIrpf = record.irpf;
  const expensesTotal = expenseIva + record.autonomos + expenseIrpf + record.gasoil1 + record.gasoil2 + record.gasoil3 + record.gasoil4;
  const income = invoiceTotal - expensesTotal;

  return {
    total,
    iva,
    "invoice-total": invoiceTotal,
    "expense-iva": expenseIva,
    "expense-irpf": expenseIrpf,
    "expenses-total": expensesTotal,
    income
  };
}

function renderCalculatedFields(record) {
  calculatedFields.forEach((id) => {
    document.getElementById(id).value = numberValue(record[id]).toFixed(2);
  });
  document.getElementById("income-value").textContent = currency.format(numberValue(record.income));
}

function openQuarter(index, quarterMonths) {
  document.getElementById("quarter-detail-title").textContent = `TRIMESTRE ${index + 1}`;
  const tbody = document.getElementById("quarter-table");
  tbody.innerHTML = "";

  const sums = {
    total: 0,
    iva: 0,
    invoiceTotal: 0,
    expensesTotal: 0,
    income: 0
  };

  quarterMonths.forEach((month) => {
    const record = records[month] || emptyRecord();
    const rowValues = getQuarterValues(record);
    addQuarterRow(tbody, month, rowValues);
    sums.total += rowValues.total;
    sums.iva += rowValues.iva;
    sums.invoiceTotal += rowValues.invoiceTotal;
    sums.expensesTotal += rowValues.expensesTotal;
    sums.income += rowValues.income;
  });

  addQuarterRow(tbody, "SUMA", sums);
  showScreen("quarter-detail-screen");
}

function getQuarterValues(record) {
  return {
    total: numberValue(record.total),
    iva: numberValue(record.iva),
    invoiceTotal: numberValue(record["invoice-total"]),
    expensesTotal: numberValue(record["expenses-total"]),
    income: numberValue(record.income)
  };
}

function addQuarterRow(tbody, label, values) {
  const row = document.createElement("tr");
  const cells = [
    label,
    currency.format(values.total),
    currency.format(values.iva),
    currency.format(values.invoiceTotal),
    currency.format(values.expensesTotal),
    currency.format(values.income)
  ];

  cells.forEach((value) => {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);
  });

  tbody.appendChild(row);
}

function emptyRecord() {
  return editableFields.reduce((record, id) => {
    record[id] = 0;
    return record;
  }, {});
}

function numberValue(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
