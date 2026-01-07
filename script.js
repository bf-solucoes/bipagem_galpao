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
const filtroData = document.getElementById("filtroData");

const cntCimed = document.getElementById("countCimed");
const cntEntrada = document.getElementById("countEntrada");
const cntSaida = document.getElementById("countSaida");


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
let carregado = false;

/* =========================
   UTILS
========================= */
function agora() {
  return new Date().toLocaleString("pt-BR");
}

function atualizarContadores() {
  cntCimed.innerText = contadores.cimed || 0;
  cntEntrada.innerText = contadores.entrada || 0;
  cntSaida.innerText = contadores.saida || 0;
}

/* =========================
   STATUS
========================= */
function calcularStatus(d) {
  if (!d.cimed.ok) return "Pendente Cimed";
  if (d.cimed.ok && !d.entrada.ok) return "Falta Entrada";
  if (d.cimed.ok && d.entrada.ok && !d.saida.ok) return "Falta Saída";
  return "OK";
}

/* =========================
   RENDER
========================= */
function renderAcompanhamento() {
  const statusFiltro = filtroStatus ? filtroStatus.value : "todos";
  const dataFiltro = filtroData ? filtroData.value : "";

  let html = `
    <table>
      <tr>
        <th>Cimed</th>
        <th>Entrada</th>
        <th>Saída</th>
        <th>Data (${ETAPA})</th>
        <th>Status</th>
      </tr>
  `;

  const codigos = Object.keys(dados);

  if (codigos.length === 0) {
    html += `<tr><td colspan="5">Nenhum registro</td></tr>`;
  }

  codigos.sort().forEach(codigo => {
    const d = dados[codigo];
    const status = calcularStatus(d);

    if (statusFiltro !== "todos" && status !== statusFiltro) return;

    if (dataFiltro) {
      if (!d[ETAPA].data) return;
      const dataISO = d[ETAPA].data.split(",")[0].split("/").reverse().join("-");
      if (dataISO !== dataFiltro) return;
    }

    html += `
      <tr>
        <td>${d.cimed.ok ? codigo : ""}</td>
        <td>${d.entrada.ok ? codigo : ""}</td>
        <td>${d.saida.ok ? codigo : ""}</td>
        <td>${d[ETAPA].data || ""}</td>
        <td class="${status === "OK" ? "ok" : "erro"}">${status}</td>
      </tr>
    `;
  });

  html += "</table>";
  acompanhamento.innerHTML = html;
}

/* =========================
   BACKEND
========================= */
async function carregarDados() {
  try {
    const res = await fetch(`${API_URL}?acao=listar`);
    const json = await res.json();

    dados = json.dados || {};
    contadores = json.contadores || contadores;

    contador.innerText = contadores[ETAPA] || 0;
    atualizarContadores();
    renderAcompanhamento();
    carregado = true;
  } catch (e) {
    console.error("Erro ao carregar dados", e);
  }
}

/* =========================
   BIPAGEM INSTANTÂNEA (SEM ENTER)
========================= */
let timer;

input.addEventListener("input", () => {
  clearTimeout(timer);

  timer = setTimeout(() => {
    const codigo = input.value.trim();
    if (!codigo || !carregado) return;

    if (!dados[codigo]) {
      dados[codigo] = {
        cimed: { ok: false, data: null },
        entrada: { ok: false, data: null },
        saida: { ok: false, data: null }
      };
    }

    if (dados[codigo][ETAPA].ok) {
      input.value = "";
      return;
    }

    dados[codigo][ETAPA] = {
      ok: true,
      data: agora()
    };

    contadores[ETAPA] = (contadores[ETAPA] || 0) + 1;

    contador.innerText = contadores[ETAPA];
    atualizarContadores();
    renderAcompanhamento();

    input.value = "";
    input.focus();

    // backend assíncrono (não trava)
    fetch(`${API_URL}?acao=registrar&codigo=${encodeURIComponent(codigo)}&etapa=${ETAPA}`)
      .catch(() => {});
  }, 120); // tempo ideal p/ leitor
});

/* =========================
   FILTROS
========================= */
if (filtroStatus) filtroStatus.addEventListener("change", renderAcompanhamento);
if (filtroData) filtroData.addEventListener("change", renderAcompanhamento);

/* =========================
   INIT
========================= */
carregarDados();

});
