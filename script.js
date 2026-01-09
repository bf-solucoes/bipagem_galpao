document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     CONFIG
  ========================= */
  const API_URL =
    "https://script.google.com/macros/s/AKfycbwI8QCCzYIUU_7_q5AcYV5zOUTTZ2ExcDuPzu1BfEOm4uHnUYL7X9Qz8njaovvWOPNi/exec";

  const AUTO_REFRESH = 5000;

  const FILA = [];
  let processando = false;

  let dadosBrutos = {};

  /* =========================
     ELEMENTOS
  ========================= */
  const input = document.getElementById("input");
  const acompanhamento = document.getElementById("acompanhamento");

  const cntCimed = document.getElementById("countCimed");
  const cntEntrada = document.getElementById("countEntrada");
  const cntSaida = document.getElementById("countSaida");

  const filtroStatus = document.getElementById("filtroStatus");
  const filtroData = document.getElementById("filtroData");
  const btnDownload = document.getElementById("btnDownload");
  const msg = document.getElementById("mensagem");

  /* =========================
     MENSAGEM
  ========================= */
  function mostrarMensagem(texto, tipo = "aviso", tempo = 1200) {
    if (!msg) return;
    msg.className = `mensagem ${tipo}`;
    msg.innerText = texto;
    msg.style.display = "block";
    setTimeout(() => msg.style.display = "none", tempo);
  }

  /* =========================
     CONTADORES
  ========================= */
  function atualizarContadores(contadores) {
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
     FILTROS
  ========================= */
  function aplicarFiltros(dados) {
    const statusSelecionado = filtroStatus?.value || "todos";
    const dataSelecionada = filtroData?.value || "";

    let filtrado = {};

    Object.keys(dados).forEach(codigo => {
      const d = dados[codigo];
      const status = calcularStatus(d);

      // filtro status
      if (statusSelecionado !== "todos" && status !== statusSelecionado) return;

      // filtro data (por etapa da página)
      if (dataSelecionada) {
        const dataEtapa = d[ETAPA].data;
        if (!dataEtapa) return;

        const dataISO = dataEtapa
          .split(" ")[0]
          .split("/")
          .reverse()
          .join("-");

        if (dataISO !== dataSelecionada) return;
      }

      filtrado[codigo] = d;
    });

    return filtrado;
  }

  /* =========================
     RENDER
  ========================= */
  function render(dados) {
    let html = `
      <table>
        <tr>
          <th>Cimed</th>
          <th>Entrada</th>
          <th>Saída</th>
          <th>Data (Cimed)</th>
          <th>Data (Entrada)</th>
          <th>Data (Saída)</th>
          <th>Status</th>
        </tr>
    `;

    Object.keys(dados).sort().forEach(codigo => {
      const d = dados[codigo];
      const status = calcularStatus(d);

      html += `
        <tr>
          <td>${d.cimed.ok ? codigo : ""}</td>
          <td>${d.entrada.ok ? codigo : ""}</td>
          <td>${d.saida.ok ? codigo : ""}</td>
          <td>${d.cimed.data || ""}</td>
          <td>${d.entrada.data || ""}</td>
          <td>${d.saida.data || ""}</td>
          <td class="${status === "OK" ? "ok" : "erro"}">${status}</td>
        </tr>
      `;
    });

    html += "</table>";
    acompanhamento.innerHTML = html;
  }

  /* =========================
     SINCRONIZAR
  ========================= */
  async function sincronizar() {
    try {
      const res = await fetch(`${API_URL}?acao=listar&_=${Date.now()}`);
      const json = await res.json();

      dadosBrutos = json.dados || {};
      atualizarContadores(json.contadores || {});
      render(aplicarFiltros(dadosBrutos));
    } catch (e) {}
  }

  /* =========================
     EVENTOS FILTROS
  ========================= */
  filtroStatus?.addEventListener("change", () => {
    render(aplicarFiltros(dadosBrutos));
  });

  filtroData?.addEventListener("change", () => {
    render(aplicarFiltros(dadosBrutos));
  });

  /* =========================
     DOWNLOAD CSV
  ========================= */
  btnDownload?.addEventListener("click", () => {
    let csv = "Codigo;Etapa;Data\n";

    Object.keys(dadosBrutos).forEach(codigo => {
      ["cimed", "entrada", "saida"].forEach(et => {
        if (dadosBrutos[codigo][et].ok) {
          csv += `${codigo};${et};${dadosBrutos[codigo][et].data}\n`;
        }
      });
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `bipagem_${ETAPA}.csv`;
    a.click();
  });

  /* =========================
     INPUT → FILA (ENTER)
  ========================= */
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const codigo = input.value.trim();
    input.value = "";
    input.focus();

    if (!codigo) return;

    if (dadosBrutos[codigo] && dadosBrutos[codigo][ETAPA]?.ok) {
      mostrarMensagem(`⚠️ ${codigo} já registrado`, "aviso");
      return;
    }

    FILA.push(codigo);
    processarFila();
  });

  /* =========================
     PROCESSAR FILA
  ========================= */
  async function processarFila() {
    if (processando || FILA.length === 0) return;

    processando = true;
    const codigo = FILA.shift();

    try {
      await fetch(
        `${API_URL}?acao=registrar&etapa=${ETAPA}&codigo=${encodeURIComponent(codigo)}`
      );
      mostrarMensagem(`✅ ${codigo}`, "sucesso");
      await sincronizar();
    } catch {
      mostrarMensagem(`❌ Erro ${codigo}`, "erro");
    } finally {
      processando = false;
      processarFila();
    }
  }

  /* =========================
     AUTO REFRESH
  ========================= */
  setInterval(() => {
    sincronizar();
  }, AUTO_REFRESH);

  /* =========================
     INIT
  ========================= */
  sincronizar();
  input.focus();

});
