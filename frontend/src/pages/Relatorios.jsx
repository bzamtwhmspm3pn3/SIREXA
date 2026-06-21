import Layout from "../components/Layout";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { getImageUrl } from '../utils/pdfUtils';
import ReportChart from "../components/ReportChart";

const BASE_URL = "https://sirexa-api.onrender.com";
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const formatarMoeda = (valor) => {
  if (valor === undefined || valor === null) return "0,00 Kz";
  return Number(valor).toLocaleString("pt-AO", { minimumFractionDigits: 2 }) + " Kz";
};

const formatarNumero = (valor) => {
  if (valor === undefined || valor === null) return "0";
  return Number(valor).toLocaleString("pt-AO");
};

function formatValor(valor, fmt) {
  if (fmt === 'moeda') return formatarMoeda(valor);
  return formatarNumero(valor);
}

function getChartType(tipo) {
  const map = { bar: 'bar', pie: 'pie', doughnut: 'doughnut', line: 'line' };
  return map[tipo] || 'bar';
}

const Relatorios = () => {
  const { isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const reportRef = useRef(null);

  const [grupos, setGrupos] = useState({});
  const [modulosList, setModulosList] = useState([]);
  const [grupoAtivo, setGrupoAtivo] = useState(null);
  const [subModuloAtivo, setSubModuloAtivo] = useState(null);
  const [isGroupMode, setIsGroupMode] = useState(false);

  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [empresaLogo, setEmpresaLogo] = useState(null);
  const [tipoPeriodo, setTipoPeriodo] = useState("mensal");
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState(4);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [relatorio, setRelatorio] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    if (isTecnico() && userEmpresaId) setEmpresaSelecionada(userEmpresaId);
  }, [isTecnico, userEmpresaId]);

  useEffect(() => { carregarModulos(); carregarEmpresas(); }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarHistorico();
      carregarLogo();
    } else {
      setHistorico([]);
      setRelatorio(null);
    }
  }, [empresaSelecionada]);

  const carregarModulos = async () => {
    try {
      const r = await fetch(`${BASE_URL}/api/relatorios/lista-modulos`, { headers: getHeaders() });
      const data = await r.json();
      if (data.sucesso) {
        setGrupos(data.grupos);
        const gs = Object.keys(data.grupos);
        setModulosList(gs);
        if (gs.length > 0) {
          setGrupoAtivo(gs[0]);
          const firstMod = data.grupos[gs[0]].modulos;
          if (firstMod.length > 0) {
            setSubModuloAtivo(firstMod[0].id);
            setIsGroupMode(false);
          }
        }
      }
    } catch (e) { console.error("Erro modulos:", e); }
  };

  const carregarEmpresas = async () => {
    if (isTecnico()) return;
    try {
      const r = await fetch(`${BASE_URL}/api/empresa`, { headers: getHeaders() });
      if (r.ok) {
        const data = await r.json();
        const lista = Array.isArray(data) ? data : [];
        setEmpresas(lista);
        if (lista.length > 0 && !empresaSelecionada) setEmpresaSelecionada(lista[0]._id);
      }
    } catch (e) { console.error("Erro empresas:", e); }
  };

  const carregarLogo = async () => {
    if (!empresaSelecionada) return;
    try {
      const r = await fetch(`${BASE_URL}/api/empresa/${empresaSelecionada}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (r.ok) {
        const data = await r.json();
        const emp = data.dados || data;
        if (emp?.logotipo) {
          const url = getImageUrl(emp.logotipo);
          if (!url) return;
          const blob = await (await fetch(url)).blob();
          const b64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => { console.warn('Erro ao ler logo'); resolve(null); };
            reader.readAsDataURL(blob);
          });
          setEmpresaLogo(b64);
        }
      }
    } catch {}
  };

  const carregarHistorico = async () => {
    if (!empresaSelecionada) return;
    try {
      const r = await fetch(`${BASE_URL}/api/relatorios/historico/listar?empresaId=${empresaSelecionada}&limit=10`, { headers: getHeaders() });
      if (r.ok) {
        const data = await r.json();
        setHistorico(data.relatorios || []);
      }
    } catch {}
  };

  const gerarRelatorio = async () => {
    if (!empresaSelecionada) { setErro("Selecione empresa!"); return; }
    setLoading(true);
    setErro("");
    setRelatorio(null);
    try {
      let url;
      if (isGroupMode) {
        url = `${BASE_URL}/api/relatorios/grupo/${grupoAtivo}?empresaId=${empresaSelecionada}&tipoPeriodo=${tipoPeriodo}&ano=${ano}`;
        if (tipoPeriodo !== 'anual') url += `&mes=${mes}`;
      } else {
        url = `${BASE_URL}/api/relatorios/submodulo/${subModuloAtivo}?empresaId=${empresaSelecionada}&tipoPeriodo=${tipoPeriodo}&ano=${ano}`;
        if (tipoPeriodo !== 'anual') url += `&mes=${mes}`;
      }
      const r = await fetch(url, { headers: getHeaders() });
      if (r.status === 403) { setErro("Acesso negado"); setLoading(false); return; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setRelatorio(data);
      await carregarHistorico();
    } catch (e) { setErro(`Erro: ${e.message}`); } finally { setLoading(false); }
  };

  const carregarDoHistorico = async (id) => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/relatorios/detalhes/${id}`, { headers: getHeaders() });
      if (r.ok) {
        const data = await r.json();
        setRelatorio(data.dados);
      }
    } catch {} finally { setLoading(false); }
  };

  const excluirRelatorio = async (id) => {
    if (!window.confirm("Excluir?")) return;
    try {
      await fetch(`${BASE_URL}/api/relatorios/${id}`, { method: "DELETE", headers: getHeaders() });
      await carregarHistorico();
    } catch {}
  };

  const exportarPDF = async () => {
    if (!relatorio) return;
    setExportandoPDF(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      const charts = document.querySelectorAll('.report-chart');
      const chartImages = [];
      for (let i = 0; i < charts.length; i++) {
        try {
          const canvas = await html2canvas(charts[i], { backgroundColor: '#1f2937', scale: 2, useCORS: true, logging: false });
          chartImages.push(canvas.toDataURL('image/png'));
        } catch { chartImages.push(null); }
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const m = 20;
      let y = 25;

      const checkPage = (sp = 20) => { if (y + sp > ph - 15) { doc.addPage(); y = 25; } };
      const fN = (v) => { if (v == null) return "0,00"; const n = Number(v); return isNaN(n) ? "0,00" : n.toLocaleString('pt-AO', { minimumFractionDigits: 2 }); };
      const fI = (v) => { if (v == null) return "0"; const n = Number(v); return isNaN(n) ? "0" : n.toLocaleString('pt-AO'); };

      const addChartImg = (img, w = 160, h = 65) => {
        if (!img) return;
        checkPage(h + 10);
        doc.addImage(img, 'PNG', (pw - w) / 2, y, w, h);
        y += h + 8;
      };

      const sec = (title, num) => {
        checkPage(15); y += 3;
        doc.setFillColor(37, 99, 235); doc.rect(m - 3, y - 3, 3, 10, 'F');
        doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(37, 99, 235);
        doc.text(`${num}. ${title}`, m, y); y += 6;
        doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.3); doc.line(m, y, pw - m, y); y += 6;
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 60);
      };

      const table = (head, body, opts = {}) => {
        checkPage(40);
        autoTable(doc, { startY: y, head: [head], body, theme: "striped",
          headStyles: { fillColor: opts.headColor || [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 8, textColor: [50, 50, 60] },
          alternateRowStyles: { fillColor: [248, 249, 250] },
          margin: { left: m, right: m }, ...opts.tableOptions });
        y = doc.lastAutoTable.finalY + 8;
      };

      const { modulo, grupo, nome, dados, periodo, empresa } = relatorio;
      const isGroup = !!grupo;
      const titulo = isGroup ? `RELATORIO ${(nome || grupo).toUpperCase()}` : `RELATORIO: ${(nome || modulo).toUpperCase()}`;
      const empresaNome = empresa?.nome || "Empresa";

      // Capa
      doc.setFillColor(240, 242, 245); doc.rect(0, 0, pw, ph, 'F');
      doc.setFillColor(37, 99, 235); doc.rect(0, 0, pw, 5, 'F');
      if (empresaLogo) doc.addImage(empresaLogo, "PNG", pw / 2 - 20, 30, 40, 40);
      else { doc.setFillColor(37, 99, 235); doc.circle(pw / 2, 50, 18, 'F'); doc.setFillColor(255, 255, 255); doc.circle(pw / 2, 50, 12, 'F'); doc.setFillColor(37, 99, 235); doc.circle(pw / 2, 50, 5, 'F'); }
      doc.setFontSize(24); doc.setFont("helvetica", "bold"); doc.setTextColor(25, 25, 35);
      doc.text(titulo, pw / 2, 95, { align: "center" });
      doc.setFontSize(13); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 120);
      doc.text(isGroup ? `Grupo: ${nome}` : `Módulo: ${nome || modulo}`, pw / 2, 110, { align: "center" });
      doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.5); doc.line(50, 120, pw - 50, 120);
      doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(37, 99, 235);
      doc.text(empresaNome, pw / 2, 148, { align: "center" });
      doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 100);
      doc.text(`Período: ${periodo?.nome || "N/A"}`, pw / 2, 168, { align: "center" });
      doc.setFontSize(10); doc.setTextColor(120, 120, 140);
      doc.text(new Date().toLocaleString("pt-AO"), pw / 2, 183, { align: "center" });

      doc.addPage(); y = 25;

      // Indicadores
      if (dados?.indicadores && dados.indicadores.length > 0) {
        sec("INDICADORES", "1");
        const iBody = dados.indicadores.map(ind => [ind.nome, formatValor(ind.valor, ind.fmt)]);
        table(["Indicador", "Valor"], iBody);
      }

      if (dados?.indicadoresAgregados && dados.indicadoresAgregados.length > 0) {
        sec("INDICADORES AGREGADOS", "1");
        const aBody = dados.indicadoresAgregados.map(ind => [ind.nome, formatValor(ind.valor, 'moeda')]);
        table(["Indicador", "Valor"], aBody);
      }

      // Gráficos
      let chartIdx = 0;
      if (dados?.graficos) {
        sec("GRÁFICOS", "2");
        for (const g of dados.graficos) {
          if (chartIdx < chartImages.length && chartImages[chartIdx]) {
            addChartImg(chartImages[chartIdx]);
          }
          chartIdx++;
        }
      }

      // Alertas
      if (dados?.alertas && dados.alertas.length > 0) {
        sec("ALERTAS", "3");
        const aBody = dados.alertas.map(a => [a.nome, fI(a.quantidade)]);
        table(["Alerta", "Qtd"], aBody, { headColor: [220, 38, 38] });
      }

      // Sub-módulos (group mode)
      if (isGroup && dados?.subModulos) {
        sec("MÓDULOS DO GRUPO", "4");
        for (const sub of dados.subModulos) {
          if (sub.erro) {
            doc.setFontSize(9); doc.setTextColor(220, 38, 38);
            doc.text(`${sub.nome}: Erro - ${sub.erro}`, m, y);
            y += 6;
            continue;
          }
          checkPage(60);
          doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(59, 130, 246);
          doc.text(sub.nome, m, y); y += 5;
          doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 60);

          if (sub.dados?.indicadores) {
            const siBody = sub.dados.indicadores.map(ind => [ind.nome, formatValor(ind.valor, ind.fmt)]);
            autoTable(doc, { startY: y, head: [["Indicador", "Valor"]], body: siBody, theme: "striped",
              headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
              bodyStyles: { fontSize: 7, textColor: [50, 50, 60] },
              alternateRowStyles: { fillColor: [248, 249, 250] }, margin: { left: m, right: m } });
            y = doc.lastAutoTable.finalY + 5;
          }
        }
      }

      // Rodapé
      const pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setDrawColor(200, 200, 210); doc.setLineWidth(0.3);
        doc.line(m, ph - 12, pw - m, ph - 12);
        doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(120, 120, 140);
        doc.text(`Página ${i} de ${pages}`, pw / 2, ph - 6, { align: "center" });
      }

      doc.save(`Relatorio_${isGroup ? grupo : modulo}_${empresaNome.replace(/\s/g, "_")}_${(periodo?.nome || "Relatorio").replace(/\s/g, "_")}.pdf`);
    } catch (e) { console.error("Erro PDF:", e); setErro("Erro ao exportar PDF"); } finally { setExportandoPDF(false); }
  };

  const handleGrupoChange = (gid) => {
    setGrupoAtivo(gid);
    const g = grupos[gid];
    if (g?.modulos?.length > 0) {
      setSubModuloAtivo(g.modulos[0].id);
      setIsGroupMode(false);
    }
    setRelatorio(null);
  };

  if (!grupoAtivo) {
    return (
      <Layout title="Relatórios" showBackButton backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Relatórios" showBackButton backToRoute="/menu">
      <div className="p-4 space-y-6">
        {erro && <div className="bg-red-900 text-red-200 p-4 rounded-lg">{erro}</div>}

        {/* Empresa */}
        <div className="bg-gray-800 rounded-lg p-4">
          <label className="block mb-2 text-gray-300">Empresa</label>
          {isTecnico() ? (
            <div className="bg-gray-700 p-2 rounded text-white">{userEmpresaNome}<span className="text-xs text-gray-400 ml-2">(Atribuída)</span></div>
          ) : (
            <select className="w-full p-2 rounded bg-gray-700 text-white" value={empresaSelecionada} onChange={e => setEmpresaSelecionada(e.target.value)}>
              <option value="">Selecione</option>
              {empresas.map(e => <option key={e._id} value={e._id}>{e.nome}</option>)}
            </select>
          )}
        </div>

        {/* Config */}
        <div className="bg-gray-800 rounded-lg p-4">
          {/* Grupos */}
          <div className="flex flex-wrap gap-2 mb-4">
            {modulosList.map(gid => (
              <button key={gid} onClick={() => handleGrupoChange(gid)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${grupoAtivo === gid ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                {grupos[gid]?.nome || gid}
              </button>
            ))}
          </div>

          {/* Sub-módulos do grupo */}
          {grupoAtivo && grupos[grupoAtivo] && (
            <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-gray-700">
              <button onClick={() => setIsGroupMode(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${isGroupMode ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                📊 Resumo do Grupo
              </button>
              {grupos[grupoAtivo].modulos.map(mod => (
                <button key={mod.id} onClick={() => { setSubModuloAtivo(mod.id); setIsGroupMode(false); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${!isGroupMode && subModuloAtivo === mod.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                  {mod.nome}
                </button>
              ))}
            </div>
          )}

          <h2 className="text-xl font-bold text-blue-400 mb-4">
            {isGroupMode ? `📊 ${grupos[grupoAtivo]?.nome} - Resumo do Grupo` : `📈 ${grupos[grupoAtivo]?.modulos?.find(m => m.id === subModuloAtivo)?.nome || subModuloAtivo}`}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2 text-gray-300">Período</label>
              <select className="w-full p-2 rounded bg-gray-700 text-white" value={tipoPeriodo} onChange={e => setTipoPeriodo(e.target.value)}>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div>
              <label className="block mb-2 text-gray-300">Ano</label>
              <select className="w-full p-2 rounded bg-gray-700 text-white" value={ano} onChange={e => setAno(parseInt(e.target.value))}>
                {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 3 + i).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {tipoPeriodo !== 'anual' && (
              <div>
                <label className="block mb-2 text-gray-300">Mês</label>
                <select className="w-full p-2 rounded bg-gray-700 text-white" value={mes} onChange={e => setMes(parseInt(e.target.value))}>
                  {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={gerarRelatorio} disabled={loading || !empresaSelecionada}
              className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold text-white disabled:opacity-50">
              {loading ? "Gerando..." : "Gerar Relatório"}
            </button>
            {relatorio && (
              <button onClick={exportarPDF} disabled={exportandoPDF}
                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-semibold text-white disabled:opacity-50">
                {exportandoPDF ? "Exportando..." : "PDF"}
              </button>
            )}
            <button onClick={() => setMostrarHistorico(!mostrarHistorico)}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white">
              {mostrarHistorico ? "Fechar" : `Histórico (${historico.length})`}
            </button>
          </div>
        </div>

        {/* Histórico */}
        {mostrarHistorico && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold text-blue-400 mb-3">Relatórios Anteriores</h3>
            {historico.length === 0 ? <p className="text-gray-400 text-center">Nenhum</p> : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {historico.map(rel => (
                  <div key={rel._id} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{rel.titulo}</p>
                      <p className="text-xs text-gray-400">{new Date(rel.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => carregarDoHistorico(rel._id)} className="bg-blue-600 px-3 py-1 rounded text-sm">Carregar</button>
                      <button onClick={() => excluirRelatorio(rel._id)} className="bg-red-600 px-3 py-1 rounded text-sm">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Relatório */}
        <div ref={reportRef}>
          {relatorio && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-center border-b border-gray-700 pb-4 mb-4">
                <h1 className="text-2xl font-bold text-blue-400">
                  {relatorio.grupo ? `📊 ${relatorio.nome}` : `📈 ${relatorio.nome || relatorio.modulo}`}
                </h1>
                <p className="text-gray-300 mt-2">{relatorio.empresa?.nome}</p>
                <p className="text-gray-400 text-sm">Período: {relatorio.periodo?.nome}</p>
              </div>

              {/* Group mode: sub-modules summary */}
              {relatorio.grupo && relatorio.dados?.subModulos && (
                <div className="space-y-4">
                  {relatorio.dados.indicadoresAgregados?.length > 0 && (
                    <div>
                      <h3 className="text-md font-bold text-purple-400 mb-3">Indicadores Agregados do Grupo</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {relatorio.dados.indicadoresAgregados.map((ind, i) => (
                          <div key={i} className="bg-gray-700 p-3 rounded-lg text-center">
                            <p className="text-xs text-gray-400">{ind.nome}</p>
                            <p className="text-lg font-bold text-blue-400">{formatValor(ind.valor, 'moeda')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    {relatorio.dados.subModulos.map((sub, si) => (
                      <div key={si} className="border border-gray-700 rounded-lg p-4">
                        <h3 className="text-md font-bold text-blue-400 mb-3">{sub.nome}</h3>
                        {sub.erro ? <p className="text-red-400 text-sm">Erro: {sub.erro}</p> : (
                          <>
                            {sub.dados?.indicadores && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                {sub.dados.indicadores.map((ind, ii) => (
                                  <div key={ii} className="bg-gray-700/50 p-2 rounded text-center">
                                    <p className="text-xs text-gray-400">{ind.nome}</p>
                                    <p className="text-sm font-bold text-white">{formatValor(ind.valor, ind.fmt)}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {sub.dados?.graficos?.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sub.dados.graficos.map((g, gi) => (
                                  <div key={gi}>
                                    <p className="text-xs text-gray-400 mb-1">{g.titulo}</p>
                                    <ReportChart
                                      tipo={getChartType(g.tipo)}
                                      rotulos={g.data?.map(d => d.label) || []}
                                      dados={g.data?.map(d => d.valor) || []}
                                      titulo={g.titulo}
                                      altura={200}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-module mode */}
              {!relatorio.grupo && (
                <>
                  {/* Indicadores */}
                  {relatorio.dados?.indicadores?.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-md font-bold text-blue-400 mb-3">Indicadores</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {relatorio.dados.indicadores.map((ind, i) => (
                          <div key={i} className="bg-gray-700 p-3 rounded-lg text-center">
                            <p className="text-xs text-gray-400">{ind.nome}</p>
                            <p className={`text-lg font-bold ${ind.valor < 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {formatValor(ind.valor, ind.fmt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alertas */}
                  {relatorio.dados?.alertas?.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-md font-bold text-red-400 mb-3">Alertas</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {relatorio.dados.alertas.map((a, i) => (
                          <div key={i} className="bg-red-900/30 p-3 rounded-lg text-center border border-red-800">
                            <p className="text-xs text-red-300">{a.nome}</p>
                            <p className="text-lg font-bold text-red-400">{a.quantidade}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gráficos */}
                  {relatorio.dados?.graficos?.length > 0 && (
                    <div>
                      <h3 className="text-md font-bold text-blue-400 mb-3">Gráficos</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {relatorio.dados.graficos.map((g, i) => (
                          <div key={i}>
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">{g.titulo}</h4>
                            {g.datasets ? (
                              <div style={{ height: 250 }}>
                                {g.datasets.map((ds, di) => (
                                  <ReportChart
                                    key={di}
                                    tipo={getChartType(g.tipo)}
                                    rotulos={ds.data?.map(d => d.label) || []}
                                    dados={ds.data?.map(d => d.valor) || []}
                                    titulo={ds.label}
                                    altura={120}
                                  />
                                ))}
                              </div>
                            ) : (
                              <ReportChart
                                tipo={getChartType(g.tipo)}
                                rotulos={g.data?.map(d => d.label) || []}
                                dados={g.data?.map(d => d.valor) || []}
                                titulo={g.titulo}
                                altura={250}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Relatorios;
