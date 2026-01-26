document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     SUPABASE CONFIG
  ========================= */
  const SUPABASE_URL = "https://rmylubijetneztskpaud.supabase.co";
  const SUPABASE_KEY = "sb_publishable_k3Tkbfch2OQ78VfeU8NNdA_30vP0WEX";

  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

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

  /* =========================
     STATUS (FONTE ÚNICA)
  ========================= */
  function calcularStatus(r) {
    if (!r.cimed) return "Pendente Cimed";
    if (r.cimed && !r.entrada) return "Falta Entrada";
    if (r.cimed && r.entrada && !r.saida) return "Falta Saída";
    return "OK";
  }

  /* =========================
     FILTROS + CONTADORES
  ========================= */
  function aplicarFiltros(dados) {
    const statusSel = filtroStatus?.value || "todos";
    const dataSel = filtroData?.value || "";

    let filtrado = {};
    let cimed = 0;
    let entrada = 0;
    let saida = 0;

    Object.keys(dados).forEach(codigo => {
      const r = dados[codigo];
      const status = calcularStatus(r);

      // filtro status
      if (statusSel !== "todos" && status !== statusSel) return;

      // filtro data por etapa
      if (dataSel) {
        const dataRef =
          ETAPA === "cimed" ? r.data_cimed :
          ETAPA === "entrada" ? r.data_entrada :
          r.data_saida;

        if (!dataRef) return;

        const iso = new Date(dataRef).toISOString().slice(0, 10);
        if (iso !== dataSel) return;
      }

      filtrado[codigo] = r;

      if (r.cimed) cimed++;
      if (r.entrada) entrada++;
      if (r.saida) saida++;
    });

    // contadores reativos aos filtros
    if (cntCimed) cntCimed.innerText = cimed;
    if (cntEntrada) cntEntrada.innerText = entrada;
    if (cntSaida) cntSaida.innerText = saida;

    return filtrado;
  }

  /* =========================
     RENDER (CORRIGIDO)
  ========================= */
  function render(dados) {
    let html = `
      <table>
        <thead>
          <tr>
            <th>Cimed</th>
            <th>Entrada</th>
            <th>Saída</th>
            <th>Data (Cimed)</th>
            <th>Data (Entrada)</th>
            <th>Data (Saída)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    Object.keys(dados).sort().forEach(codigo => {
      const r = dados[codigo];
      const status = calcularStatus(r);

      html += `
        <tr>
          <td>${r.cimed ? codigo : ""}</td>
          <td>${r.entrada ? codigo : ""}</td>
          <td>${r.saida ? codigo : ""}</td>
          <td>${r.data_cimed ? new Date(r.data_cimed).toLocaleString("pt-BR") : ""}</td>
          <td>${r.data_entrada ? new Date(r.data_entrada).toLocaleString("pt-BR") : ""}</td>
          <td>${r.data_saida ? new Date(r.data_saida).toLocaleString("pt-BR") : ""}</td>
          <td class="${status === "OK" ? "ok" : "erro"}">${status}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    acompanhamento.innerHTML = html;
  }

  /* =========================
     SINCRONIZAR
  ========================= */
  async function sincronizar() {
    try {
      const { data, error } = await supabase
        .from("controle_galpao_cd")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      dadosBrutos = {};
      data.forEach(r => {
        dadosBrutos[r.codigo] = r;
      });

      render(aplicarFiltros(dadosBrutos));
    } catch (e) {
      console.error("Erro Supabase:", e);
    }
  }

  /* =========================
     REGISTRAR (UPSERT)
  ========================= */
  async function registrar(codigo) {
    const payload =
      ETAPA === "cimed"
        ? { codigo, cimed: true, data_cimed: new Date() }
        : ETAPA === "entrada"
        ? { codigo, entrada: true, data_entrada: new Date() }
        : { codigo, saida: true, data_saida: new Date() };

    const { error } = await supabase
      .from("controle_galpao_cd")
      .upsert(payload, { onConflict: "codigo" });

    if (error) throw error;
  }

  /* =========================
     INPUT → FILA
  ========================= */
  input.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const codigo = input.value.trim();
    input.value = "";

    if (!codigo) return;

    FILA.push(codigo);
    processarFila();
  });

  async function processarFila() {
    if (processando || FILA.length === 0) return;
    processando = true;

    try {
      await registrar(FILA.shift());
      await sincronizar();
    } catch (e) {
      console.error("Erro ao registrar:", e);
    } finally {
      processando = false;
      processarFila();
    }
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
    let csv = "Codigo;Cimed;Entrada;Saida;Data Cimed;Data Entrada;Data Saida;Status\n";

    Object.values(dadosBrutos).forEach(r => {
      csv += `${r.codigo};${r.cimed};${r.entrada};${r.saida};` +
             `${r.data_cimed || ""};${r.data_entrada || ""};${r.data_saida || ""};` +
             `${calcularStatus(r)}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `controle_${ETAPA}.csv`;
    a.click();
  });

  /* =========================
     INIT
  ========================= */
  sincronizar();
  setInterval(sincronizar, AUTO_REFRESH);

});
