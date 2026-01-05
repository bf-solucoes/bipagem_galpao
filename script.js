document.addEventListener("DOMContentLoaded", () => {

/* =========================
   CONFIG
========================= */
const API_URL = "https://script.google.com/macros/s/AKfycbyxfjB7AMLtyYeCtqyXRt-DbBYd4VS2-Vg0qDmIndsb4Xs_U-RJDTZldjwgi71-fPQuYQ/exec";
const ENVIO_MS = 8000; // backend em background

/* =========================
   ELEMENTOS
========================= */
const input = document.getElementById("input");
const contador = document.getElementById("contador");
const acompanhamento = document.getElementById("acompanhamento");
const filtroStatus = document.getElementById("filtroStatus");

if (!input || !contador || !acompanhamento || typeof ETAPA === "undefined") {
  alert("Erro de inicialização");
  return;
}

/* =========================
   ESTADO LOCAL (RÁPIDO)
========================= */
let dados = JSON.parse(localStorage.getItem("dados")) || {};
let contadores = JSON.parse(localStorage.getItem("contadores")) || {
  cimed: 0, entrada: 0, saida: 0
};
let fila = JSON.parse(localStorage.getItem("fila")) || [];

/* =========================
   LOCAL STORAGE
========================= */
function salvarLocal() {
  localStorage.setItem("dados", JSON.stringify(dados));
  localStorage.setItem("contadores", JSON.stringify(contadores));
  localStorage.setItem("fila", JSON.stringify(fila));
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
   RENDER IMEDIATO
========================= */
function renderAcompanhamento() {
  const filtro = filtroStatus?.value || "todos";
  let html = `
    <table>
      <tr>
        <th>Cimed</th>
        <th>Entrada</th>
        <th>Saída</th>
        <th>Status</th>
      </tr>`;

  const codigos = Object.keys(dados);
  if (!codigos.length) {
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
      </tr>`;
  });

  html += "</table>";
  acompanhamento.innerHTML = html;
}

/* =========================
   BIPAGEM (ZERO LATÊNCIA)
========================= */
input.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;

  const codigo = input.value.trim();
  if (!codigo) return;

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
  fila.push({ codigo, etapa: ETAPA, ts: Date.now() });

  salvarLocal();
  contador.innerText = contadores[ETAPA];
  renderAcompanhamento();
  input.value = "";
});

/* =========================
   ENVIO EM BACKGROUND
========================= */
async function enviarFila() {
  if (!fila.length) return;

  const payload = { acao: "lote", dados: [...fila] };

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    fila = [];
    salvarLocal();
  } catch {
    // silencioso: tenta novamente depois
  }
}

setInterval(enviarFila, ENVIO_MS);

/* =========================
   INIT
========================= */
contador.innerText = contadores[ETAPA];
renderAcompanhamento();

});
