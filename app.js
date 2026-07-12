const STORAGE_KEY = "contabilidad-mensual";
const IVA_RATE = 0.21;
const DEFAULT_DAILY_PRICE = 72.85;
const INVOICE_COUNT = 4;

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

const invoiceNumericEditableFields = ["units", "price", "otros", "aparte", "irpf"];
const invoiceTextEditableFields = ["otrosText", "aparteText"];
const invoiceEditableFields = [...invoiceNumericEditableFields, ...invoiceTextEditableFields];
const invoiceCalculatedFields = ["total", "iva", "invoiceTotal", "invoiceTotalNoIrpf"];
const expenseEditableFields = ["autonomos", "gasoil1", "gasoil2", "gasoil3", "gasoil4"];
const expenseCalculatedFields = ["expense-iva", "expense-irpf", "expenses-total"];
let selectedMonth = months[0];
let records = loadRecords();

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR"
});

document.querySelectorAll("[data-screen]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.screen));
});

document.getElementById("print-invoice").addEventListener("click", printInvoice);
document.getElementById("download-year").addEventListener("click", downloadYear);

buildMonthButtons();
buildQuarterButtons();
buildInvoiceForms();
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
    const card = document.createElement("div");
    card.className = "quarter-card";

    const button = document.createElement("button");
    button.className = "quarter-button";
    button.textContent = `TRIMESTRE ${index + 1}`;
    button.addEventListener("click", () => openQuarter(index, quarterMonths));

    const downloadButton = document.createElement("button");
    downloadButton.className = "action-button";
    downloadButton.type = "button";
    downloadButton.textContent = "DESCARGAR";
    downloadButton.addEventListener("click", () => downloadQuarter(index, quarterMonths));

    card.append(button, downloadButton);
    grid.appendChild(card);
  });
}

function buildInvoiceForms() {
  const container = document.getElementById("invoices-container");
  container.innerHTML = "";

  for (let index = 0; index < INVOICE_COUNT; index += 1) {
    const section = document.createElement("section");
    section.className = "invoice-box";
    section.setAttribute("aria-label", `Factura ${index + 1}`);
    section.innerHTML = `
      <div class="invoice-heading">FACTURA ${index + 1}</div>
      <div class="invoice-fields">
        ${invoiceField(index, "units", "UND.", false)}
        ${invoiceField(index, "price", "PRECIO AL DIA", false)}
        ${invoiceField(index, "otros", "OTROS", false)}
        ${invoiceTextField(index, "otrosText", "ESCRIBIR TEXTO")}
        ${invoiceField(index, "total", "TOTAL", true)}
        ${invoiceField(index, "iva", "IVA", true)}
        ${invoiceField(index, "aparte", "A PARTE", false)}
        ${invoiceTextField(index, "aparteText", "ESCRIBIR TEXTO")}
        ${invoiceField(index, "irpf", "IRPF", false)}
        ${invoiceField(index, "invoiceTotal", "TOTAL DE LA FACTURA DE ASESORIA", true)}
        ${invoiceField(index, "invoiceTotalNoIrpf", "TOTAL FACTURA SIN IRPF", true)}
      </div>
    `;
    container.appendChild(section);
  }
}

function invoiceField(index, key, label, readonly) {
  const id = invoiceInputId(index, key);
  const readonlyAttribute = readonly ? " readonly" : "";
  return `
    <div class="field">
      <label for="${id}">${label}</label>
      <input id="${id}" type="number" min="0" step="0.01" inputmode="decimal"${readonlyAttribute}>
    </div>
  `;
}

function invoiceTextField(index, key, label) {
  const id = invoiceInputId(index, key);
  return `
    <div class="field text-entry-field">
      <label for="${id}">${label}</label>
      <input id="${id}" class="text-entry-input" type="text" placeholder="${label}">
    </div>
  `;
}

function bindInvoiceInputs() {
  for (let index = 0; index < INVOICE_COUNT; index += 1) {
    invoiceEditableFields.forEach((field) => {
      const input = document.getElementById(invoiceInputId(index, field));
      input.value = "";
      input.addEventListener("input", updateCurrentMonth);
    });

    invoiceCalculatedFields.forEach((field) => {
      document.getElementById(invoiceInputId(index, field)).value = "0.00";
    });
  }

  expenseEditableFields.forEach((id) => {
    const input = document.getElementById(id);
    input.value = "";
    input.addEventListener("input", updateCurrentMonth);
  });

  expenseCalculatedFields.forEach((id) => {
    document.getElementById(id).value = "0.00";
  });
}

function openMonth(month) {
  selectedMonth = month;
  document.getElementById("selected-month").textContent = month;
  fillMonthForm(records[month] || defaultMonthRecord());
  updateCurrentMonth();
  showScreen("invoice-screen");
}

function fillMonthForm(record) {
  const normalized = normalizeRecord(record);
  normalized.invoices.forEach((invoice, index) => {
    invoiceNumericEditableFields.forEach((field) => {
      const value = numberValue(invoice[field]);
      const input = document.getElementById(invoiceInputId(index, field));
      input.value = shouldShowBlank(field, value) ? "" : value.toFixed(2);
    });
    invoiceTextEditableFields.forEach((field) => {
      document.getElementById(invoiceInputId(index, field)).value = invoice[field] || "";
    });
  });

  expenseEditableFields.forEach((field) => {
    const value = numberValue(normalized[field]);
    document.getElementById(field).value = value === 0 ? "" : value.toFixed(2);
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
  const invoices = [];

  for (let index = 0; index < INVOICE_COUNT; index += 1) {
    const invoice = {};
    invoiceNumericEditableFields.forEach((field) => {
      invoice[field] = numberValue(document.getElementById(invoiceInputId(index, field)).value);
    });
    invoiceTextEditableFields.forEach((field) => {
      invoice[field] = document.getElementById(invoiceInputId(index, field)).value.trim();
    });
    invoices.push(invoice);
  }

  return expenseEditableFields.reduce(
    (record, field) => {
      record[field] = numberValue(document.getElementById(field).value);
      return record;
    },
    { invoices }
  );
}

function calculateRecord(record) {
  const invoices = normalizeInvoices(record.invoices).map(calculateInvoice);
  const total = sum(invoices, "total");
  const iva = sum(invoices, "iva");
  const aparte = sum(invoices, "aparte");
  const irpf = sum(invoices, "irpf");
  const invoiceTotal = sum(invoices, "invoiceTotal");
  const invoiceTotalNoIrpf = sum(invoices, "invoiceTotalNoIrpf");
  const expenseIva = iva;
  const expenseIrpf = irpf;
  const expensesTotal = expenseIva + numberValue(record.autonomos) + expenseIrpf + numberValue(record.gasoil1) + numberValue(record.gasoil2) + numberValue(record.gasoil3) + numberValue(record.gasoil4);
  const income = invoiceTotal - expensesTotal;

  return {
    invoices,
    total,
    iva,
    aparte,
    irpf,
    "invoice-total": invoiceTotal,
    "invoice-total-no-irpf": invoiceTotalNoIrpf,
    "expense-iva": expenseIva,
    "expense-irpf": expenseIrpf,
    "expenses-total": expensesTotal,
    income
  };
}

function calculateInvoice(invoice) {
  const units = numberValue(invoice.units);
  const price = numberValue(invoice.price);
  const otros = numberValue(invoice.otros);
  const otrosText = invoice.otrosText || "";
  const aparte = numberValue(invoice.aparte);
  const aparteText = invoice.aparteText || "";
  const irpf = numberValue(invoice.irpf);
  const total = units * price + otros;
  const iva = total * IVA_RATE;
  const invoiceTotalNoIrpf = total + iva + aparte;
  const invoiceTotal = invoiceTotalNoIrpf - irpf;

  return {
    units,
    price,
    otros,
    otrosText,
    aparte,
    aparteText,
    irpf,
    total,
    iva,
    invoiceTotal,
    invoiceTotalNoIrpf
  };
}

function renderCalculatedFields(record) {
  record.invoices.forEach((invoice, index) => {
    invoiceCalculatedFields.forEach((field) => {
      document.getElementById(invoiceInputId(index, field)).value = numberValue(invoice[field]).toFixed(2);
    });
  });

  document.getElementById("expense-iva").value = numberValue(record["expense-iva"]).toFixed(2);
  document.getElementById("expense-irpf").value = numberValue(record["expense-irpf"]).toFixed(2);
  document.getElementById("expenses-total").value = numberValue(record["expenses-total"]).toFixed(2);
  document.getElementById("all-invoices-total").textContent = currency.format(numberValue(record["invoice-total"]));
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
    const rowValues = getQuarterValues(completeRecordFor(month));
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

function printInvoice() {
  updateCurrentMonth();
  window.print();
}

function downloadQuarter(index, quarterMonths) {
  const rows = buildQuarterRows(quarterMonths);
  downloadCsv(`trimestre-${index + 1}.csv`, rows);
}

function downloadYear() {
  const rows = [
    [
      "MES",
      "TOTAL",
      "IVA",
      "A PARTE",
      "IRPF",
      "TOTAL DE LA FACTURA DE ASESORIA",
      "TOTAL FACTURA SIN IRPF",
      "AUTONOMOS",
      "GASOIL 1",
      "GASOIL 2",
      "GASOIL 3",
      "GASOIL 4",
      "GASTOS",
      "INGRESOS"
    ]
  ];

  const sums = {
    total: 0,
    iva: 0,
    irpf: 0,
    aparte: 0,
    invoiceTotal: 0,
    invoiceTotalNoIrpf: 0,
    autonomos: 0,
    gasoil1: 0,
    gasoil2: 0,
    gasoil3: 0,
    gasoil4: 0,
    expensesTotal: 0,
    income: 0
  };

  months.forEach((month) => {
    const record = completeRecordFor(month);
    rows.push([
      month,
      decimal(record.total),
      decimal(record.iva),
      decimal(record.aparte),
      decimal(record.irpf),
      decimal(record["invoice-total"]),
      decimal(record["invoice-total-no-irpf"]),
      decimal(record.autonomos),
      decimal(record.gasoil1),
      decimal(record.gasoil2),
      decimal(record.gasoil3),
      decimal(record.gasoil4),
      decimal(record["expenses-total"]),
      decimal(record.income)
    ]);

    sums.total += numberValue(record.total);
    sums.iva += numberValue(record.iva);
    sums.aparte += numberValue(record.aparte);
    sums.irpf += numberValue(record.irpf);
    sums.invoiceTotal += numberValue(record["invoice-total"]);
    sums.invoiceTotalNoIrpf += numberValue(record["invoice-total-no-irpf"]);
    sums.autonomos += numberValue(record.autonomos);
    sums.gasoil1 += numberValue(record.gasoil1);
    sums.gasoil2 += numberValue(record.gasoil2);
    sums.gasoil3 += numberValue(record.gasoil3);
    sums.gasoil4 += numberValue(record.gasoil4);
    sums.expensesTotal += numberValue(record["expenses-total"]);
    sums.income += numberValue(record.income);
  });

  rows.push([
    "SUMA",
    decimal(sums.total),
    decimal(sums.iva),
    decimal(sums.aparte),
    decimal(sums.irpf),
    decimal(sums.invoiceTotal),
    decimal(sums.invoiceTotalNoIrpf),
    decimal(sums.autonomos),
    decimal(sums.gasoil1),
    decimal(sums.gasoil2),
    decimal(sums.gasoil3),
    decimal(sums.gasoil4),
    decimal(sums.expensesTotal),
    decimal(sums.income)
  ]);

  downloadCsv("contabilidad-anual.csv", rows);
}

function buildQuarterRows(quarterMonths) {
  const rows = [["MES", "TOTAL", "IVA", "TOTAL DE LA FACTURA DE ASESORIA", "GASTOS", "INGRESOS"]];
  const sums = {
    total: 0,
    iva: 0,
    invoiceTotal: 0,
    expensesTotal: 0,
    income: 0
  };

  quarterMonths.forEach((month) => {
    const values = getQuarterValues(completeRecordFor(month));
    rows.push([
      month,
      decimal(values.total),
      decimal(values.iva),
      decimal(values.invoiceTotal),
      decimal(values.expensesTotal),
      decimal(values.income)
    ]);
    sums.total += values.total;
    sums.iva += values.iva;
    sums.invoiceTotal += values.invoiceTotal;
    sums.expensesTotal += values.expensesTotal;
    sums.income += values.income;
  });

  rows.push([
    "SUMA",
    decimal(sums.total),
    decimal(sums.iva),
    decimal(sums.invoiceTotal),
    decimal(sums.expensesTotal),
    decimal(sums.income)
  ]);

  return rows;
}

function completeRecordFor(month) {
  return normalizeRecord(records[month] || defaultMonthRecord());
}

function normalizeRecord(record) {
  const base = defaultMonthRecord();
  const normalized = {
    ...base,
    ...record,
    invoices: normalizeInvoices(record.invoices || oldSingleInvoice(record))
  };
  return { ...normalized, ...calculateRecord(normalized) };
}

function normalizeInvoices(invoices = []) {
  const normalized = [];
  for (let index = 0; index < INVOICE_COUNT; index += 1) {
    normalized.push({
      ...defaultInvoice(),
      ...(invoices[index] || {})
    });
  }
  return normalized;
}

function oldSingleInvoice(record) {
  return [
    {
      units: numberValue(record.units),
      price: numberValue(record.price) || DEFAULT_DAILY_PRICE,
      otros: 0,
      otrosText: "",
      aparte: 0,
      aparteText: "",
      irpf: numberValue(record.irpf)
    }
  ];
}

function defaultMonthRecord() {
  return {
    invoices: Array.from({ length: INVOICE_COUNT }, defaultInvoice),
    autonomos: 0,
    gasoil1: 0,
    gasoil2: 0,
    gasoil3: 0,
    gasoil4: 0
  };
}

function defaultInvoice() {
  return {
    units: 0,
    price: DEFAULT_DAILY_PRICE,
    otros: 0,
    otrosText: "",
    aparte: 0,
    aparteText: "",
    irpf: 0
  };
}

function invoiceInputId(index, field) {
  return `invoice-${index}-${field}`;
}

function shouldShowBlank(field, value) {
  return field !== "price" && value === 0;
}

function sum(items, key) {
  return items.reduce((total, item) => total + numberValue(item[key]), 0);
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value);
  if (/[;"\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function decimal(value) {
  return numberValue(value).toFixed(2).replace(".", ",");
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
