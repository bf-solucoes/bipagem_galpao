document.addEventListener("DOMContentLoaded", () => {

/* =========================
   CONFIG
========================= */
const API_URL = "https://script.google.com/macros/s/AKfycbwMoWdI_lPVXLcWStSmZW583GuZxr5KbV3DjGay9bT0Ikqty3K1RC_cRoybRQ6-2_mjpA/exec";

let dados = {};
let contadores = { cimed: 0, entrada: 0, saida: 0 };

const input = document.getElementById("input");
const contador = document.getElementById("contador");
const acompanhamento = document.getElementById("acompanhamento");
const filtroStatus = document.getElementById("filtroStatus");
const btnDownload = document.getElementById("btnDownload");

if (typeof ETAPA === "undefined") {
  alert("Etapa não definida");
  return;
}

/* =========================
   API
========================= */
async function carregarDados() {
  const res = await fetch(API_URL);
  const json = await res.json();

  dados = json.dados || {};
  contadores = json.contadores || { cimed: 0, entrada: 0, saida: 0 };

  contador.innerText = contadores[ETAPA] || 0;
  renderAcompanhamento();
}

async function salvarCodigo(codigo) {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      acao: "bipar",
      codigo,
      etapa: ETAPA
    })
  });

  await carregarDados();
}

/* =========================
   STATUS
========================= */
function calcularStatus(d) {
  if (!d.cimed) return "Pendente Cimed";
  if (d.cimed && !d.entrada) return "Falta Entrada";
  if (d.cimed && d.entrada && !d.saida) return "Falta Saída";
  return "OK";
}

/* =========================
   ACOMPANHAMENTO
========================= */
function renderAcompanhamento() {
  const filtro = filtroStatus ? filtroStatus.value : "todos";

  let html = `
    <table>
      <tr>
        <th>Cimed</th>
        <th>Entrada</th>
        <th>Saída</th>
        <th>Status</th>
      </tr>
  `;

  const codigos = Object.keys(dados).sort();

  if (codigos.length === 0) {
    html += `<tr><td colspan="4">Nenhum registro</td></tr>`;
  }

  codigos.forEach(codigo => {
    const d = dados[codigo];
    const status = calcularStatus(d);
    const cls = status === "OK" ? "ok" : "erro";

    if (filtro !== "todos" && status !== filtro) return;

    html += `
      <tr>
        <td>${d.cimed ? codigo : ""}</td>
        <td>${d.entrada ? codigo : ""}</td>
        <td>${d.saida ? codigo : ""}</td>
        <td class="${cls}">${status}</td>
      </tr>
    `;
  });

  html += "</table>";
  acompanhamento.innerHTML = html;
}

/* =========================
   BIPAGEM
========================= */
input.addEventListener("keypress", async e => {
  if (e.key !== "Enter") return;

  const codigo = input.value.trim();
  if (!codigo) return;

  if (dados[codigo]?.[ETAPA]) {
    alert(`Código ${codigo} já bipado nesta etapa`);
    input.value = "";
    return;
  }

  if (ETAPA === "entrada" && !dados[codigo]?.cimed) {
    alert("Código não passou pelo Cimed");
    input.value = "";
    return;
  }

  if (ETAPA === "saida" && !dados[codigo]?.entrada) {
    alert("Código não passou pela Entrada");
    input.value = "";
    return;
  }

  await salvarCodigo(codigo);
  input.value = "";
});

/* =========================
   FILTRO
========================= */
if (filtroStatus) {
  filtroStatus.addEventListener("change", renderAcompanhamento);
}

/* =========================
   DOWNLOAD CSV
========================= */
if (btnDownload) {
  btnDownload.addEventListener("click", () => {
    let csv = "Codigo,Cimed,Entrada,Saida,Status\n";

    Object.keys(dados).sort().forEach(codigo => {
      const d = dados[codigo];
      csv += `${codigo},${d.cimed?"Sim":"Não"},${d.entrada?"Sim":"Não"},${d.saida?"Sim":"Não"},${calcularStatus(d)}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "bipagem_galpao.csv";
    a.click();

    URL.revokeObjectURL(url);
  });
}

/* =========================
   INIT
========================= */
carregarDados();

});
