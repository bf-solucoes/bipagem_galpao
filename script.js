document.addEventListener("DOMContentLoaded", () => {

/* =========================
   CONFIGURAÇÃO
========================= */
const API_URL = "https://script.google.com/macros/s/AKfycbwMoWdI_lPVXLcWStSmZW583GuZxr5KbV3DjGay9bT0Ikqty3K1RC_cRoybRQ6-2_mjpA/exec";

/* =========================
   ELEMENTOS
========================= */
const input = document.getElementById("input");
const contador = document.getElementById("contador");
const acompanhamento = document.getElementById("acompanhamento");
const filtroStatus = document.getElementById("filtroStatus");
const btnDownload = document.getElementById("btnDownload");

if (!input || !contador || !acompanhamento) {
  alert("Erro: elementos do HTML não encontrados");
  return;
}

if (typeof ETAPA === "undefined") {
  alert("Erro: ETAPA não definida");
  return;
}

/* =========================
   ESTADO EM MEMÓRIA
========================= */
let dados = {};
let contadores = {
  cimed: 0,
  entrada: 0,
  saida: 0
};

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
   BIPAGEM (ENVIO AO BACKEND)
========================= */
input.addEventListener("keypress", async e => {
  if (e.key !== "Enter") return;

  const codigo = input.value.trim();
  if (!codigo) return;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        codigo: codigo,
        etapa: ETAPA
      })
    });

    const result = await response.json();

    if (result.status !== "ok") {
      alert(result.mensagem || "Erro ao registrar");
      return;
    }

    // Atualiza memória local (visual)
    if (!dados[codigo]) {
      dados[codigo] = { cimed: false, entrada: false, saida: false };
    }

    dados[codigo][ETAPA] = true;
    contadores[ETAPA]++;
    contador.innerText = contadores[ETAPA];

    renderAcompanhamento();
    input.value = "";

  } catch (err) {
    console.error(err);
    alert("Erro de comunicação com o servidor");
  }
});

/* =========================
   FILTRO
========================= */
if (filtroStatus) {
  filtroStatus.addEventListener("change", renderAcompanhamento);
}

/* =========================
   DOWNLOAD CSV (VISUAL)
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
contador.innerText = 0;
renderAcompanhamento();

});
