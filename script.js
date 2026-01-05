document.addEventListener("DOMContentLoaded", () => {

/* =========================
   CONFIG
========================= */
const API_URL = "https://script.google.com/macros/s/AKfycbyxfjB7AMLtyYeCtqyXRt-DbBYd4VS2-Vg0qDmIndsb4Xs_U-RJDTZldjwgi71-fPQuYQ/exec";

/* =========================
   ELEMENTOS
========================= */
const input = document.getElementById("input");
const contador = document.getElementById("contador");
const acompanhamento = document.getElementById("acompanhamento");
const filtroStatus = document.getElementById("filtroStatus");
const btnDownload = document.getElementById("btnDownload");

if (!input || !contador || !acompanhamento) {
  alert("Erro: elementos não encontrados");
  return;
}

if (typeof ETAPA === "undefined") {
  alert("Erro: ETAPA não definida");
  return;
}

/* =========================
   ESTADO
========================= */
let dados = {};
let contadores = { cimed: 0, entrada: 0, saida: 0 };

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
   RENDER
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

  const codigos = Object.keys(dados);

  if (codigos.length === 0) {
    html += `<tr><td colspan="4">Nenhum registro</td></tr>`;
  }

  codigos.sort().forEach(codigo => {
    const d = dados[codigo];
    const status = calcularStatus(d);
    if (filtro !== "todos" && status !== filtro) return;

    html += `
      <tr>
        <td>${d.cimed ? codigo : ""}</td>
        <td>${d.entrada ? codigo : ""}</td>
        <td>${d.saida ? codigo : ""}</td>
        <td class="${status === "OK" ? "ok" : "erro"}">${status}</td>
      </tr>
    `;
  });

  html += "</table>";
  acompanhamento.innerHTML = html;
}

/* =========================
   CARREGAR DADOS DO BACKEND
========================= */
async function carregarDados() {
  try {
    const res = await fetch(`${API_URL}?acao=listar`);
    const json = await res.json();

    dados = json.dados || {};
    contadores = json.contadores || contadores;

    contador.innerText = contadores[ETAPA] || 0;
    renderAcompanhamento();
  } catch (e) {
    console.error("Erro ao carregar dados", e);
  }
}

/* =========================
   BIPAGEM (RÁPIDA)
========================= */
input.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;

  const codigo = input.value.trim();
  if (!codigo) return;

  // ===== ATUALIZA LOCAL IMEDIATA =====
  if (!dados[codigo]) {
    dados[codigo] = { cimed: false, entrada: false, saida: false };
  }

  if (dados[codigo][ETAPA]) {
    alert("Código já bipado nesta etapa");
    input.value = "";
    return;
  }

  dados[codigo][ETAPA] = true;
  contadores[ETAPA]++;
  contador.innerText = contadores[ETAPA];
  renderAcompanhamento();
  input.value = "";

  // ===== ENVIO BACKEND (SEM BLOQUEAR UI) =====
  const url = `${API_URL}?acao=registrar&codigo=${encodeURIComponent(codigo)}&etapa=${ETAPA}`;
  fetch(url).catch(() => {
    console.warn("Falha ao registrar no backend");
  });
});

/* =========================
   FILTRO
========================= */
if (filtroStatus) {
  filtroStatus.addEventListener("change", renderAcompanhamento);
}

/* =========================
   INIT
========================= */
carregarDados();

});
