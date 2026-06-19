// src/pages/Contabilidade/LivroRazao.jsx
import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { 
  BookOpen, Search, RefreshCw, Download, Printer, FileSpreadsheet,
  ChevronLeft, ChevronRight, Building2, TrendingUp, TrendingDown,
  Calendar, Eye, FileText, Wallet, Loader2, Filter
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { carregarLogoBase64, drawCabecalhoProfissional, drawRodape } from '../../utils/pdfUtils';

const LivroRazao = () => {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [contas, setContas] = useState([]);
  const [contaSelecionada, setContaSelecionada] = useState("");
  const [movimentos, setMovimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: ""
  });

  const BASE_URL = "https://sirexa-api.onrender.com";

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => {
    buscarEmpresas();
    carregarContas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarContas();
    }
  }, [empresaSelecionada]);

  useEffect(() => {
    if (empresaSelecionada && contaSelecionada) {
      carregarRazao();
    }
  }, [empresaSelecionada, contaSelecionada, filtros]);

  const buscarEmpresas = async () => {
    if (isTecnico()) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/api/empresa`, { headers: getHeaders() });
      if (response.status === 403) {
        setEmpresas([]);
        return;
      }
      const data = await response.json();
      const lista = Array.isArray(data) ? data : [];
      setEmpresas(lista);
      if (lista.length > 0 && !empresaSelecionada) {
        setEmpresaSelecionada(lista[0]._id);
      }
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
    }
  };

  const carregarContas = async () => {
    try {
      const id = empresaSelecionada || userEmpresaId;
      if (!id) return;
      
      const response = await fetch(`${BASE_URL}/api/contabilidade/plano-contas?empresaId=${id}`, {
        headers: getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          setContas(data.dados || []);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
    }
  };

  const carregarRazao = async () => {
    if (!contaSelecionada) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        empresaId: empresaSelecionada || userEmpresaId,
        conta: contaSelecionada
      });
      
      if (filtros.dataInicio) params.append("dataInicio", filtros.dataInicio);
      if (filtros.dataFim) params.append("dataFim", filtros.dataFim);
      
      const response = await fetch(`${BASE_URL}/api/contabilidade/lancamentos?${params}`, {
        headers: getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          const lancamentos = data.dados || [];
          
          const movs = [];
          let saldoAnterior = 0;
          let saldoAcumulado = 0;
          
          lancamentos.forEach(lanc => {
            lanc.partidas?.forEach(partida => {
              if (partida.contaCodigo === contaSelecionada) {
                const debito = partida.debito || 0;
                const credito = partida.credito || 0;
                saldoAcumulado += debito - credito;
                
                movs.push({
                  data: lanc.dataLancamento,
                  numeroLancamento: lanc.numeroLancamento,
                  descricao: lanc.descricao,
                  debito,
                  credito,
                  saldo: saldoAcumulado,
                  documentoRef: partida.documentoOrigem?.referencia || "-"
                });
              }
            });
          });
          
          setMovimentos(movs);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar razão:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatarNumero = (numero) => {
    if (numero === undefined || numero === null) return "0,00";
    return Number(numero).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatarData = (data) => {
    if (!data) return "—";
    return new Date(data).toLocaleDateString("pt-AO");
  };

  const exportarExcel = () => {
    setExportando(true);
    try {
      const dadosExport = movimentos.map(mov => ({
        "Data": formatarData(mov.data),
        "Nº Lançamento": mov.numeroLancamento,
        "Documento Referência": mov.documentoRef,
        "Descrição": mov.descricao,
        "Débito (Kz)": mov.debito,
        "Crédito (Kz)": mov.credito,
        "Saldo (Kz)": mov.saldo
      }));
      
      const ws = XLSX.utils.json_to_sheet(dadosExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Livro_Razao_${contaSelecionada}`);
      
      XLSX.writeFile(wb, `livro_razao_${contaSelecionada}_${new Date().toISOString().split("T")[0]}.xlsx`);
      alert("✅ Excel exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      alert("❌ Erro ao exportar Excel");
    } finally {
      setExportando(false);
    }
  };

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const empresaObj = isTecnico()
        ? { _id: userEmpresaId, nome: userEmpresaNome }
        : empresas.find(e => e._id === empresaSelecionada);
      const logo = await carregarLogoBase64(empresaObj);
      const empresaNome = empresaObj?.nome || "Não selecionada";
      
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const contaInfo = contas.find(c => c.codigo === contaSelecionada);
      
      let yPos = drawCabecalhoProfissional(doc, empresaObj, logo);
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("LIVRO RAZÃO", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" });
      
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Conta: ${contaSelecionada} - ${contaInfo?.nome || ""}`, 14, yPos);
      yPos += 7;
      doc.text(`Período: ${filtros.dataInicio || "Início"} a ${filtros.dataFim || "Actual"}`, 14, yPos);
      
      const totalDebito = movimentos.reduce((s, m) => s + m.debito, 0);
      const totalCredito = movimentos.reduce((s, m) => s + m.credito, 0);
      const saldoFinal = totalDebito - totalCredito;
      
      const dadosTabela = movimentos.map(mov => [
        formatarData(mov.data),
        mov.numeroLancamento,
        mov.descricao?.substring(0, 35) || "",
        formatarNumero(mov.debito),
        formatarNumero(mov.credito),
        `${formatarNumero(Math.abs(mov.saldo))} ${mov.saldo >= 0 ? 'D' : 'C'}`
      ]);
      
      autoTable(doc, {
        startY: yPos + 6,
        head: [["Data", "Nº", "Descrição", "Débito", "Crédito", "Saldo"]],
        body: dadosTabela,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
      });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Resumo: Débitos: ${formatarNumero(totalDebito)} Kz | Créditos: ${formatarNumero(totalCredito)} Kz | Saldo: ${formatarNumero(Math.abs(saldoFinal))} Kz ${saldoFinal >= 0 ? 'D' : 'C'}`, 14, doc.lastAutoTable.finalY + 10);
      
      const pageCount = doc.internal.getNumberOfPages();
      drawRodape(doc, empresaNome, pageCount);
      doc.save(`livro_razao_${contaSelecionada}_${new Date().toISOString().split("T")[0]}.pdf`);
      alert("✅ PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("❌ Erro ao gerar PDF");
    } finally {
      setExportando(false);
    }
  };

  const contaInfo = contas.find(c => c.codigo === contaSelecionada);
  const totalDebito = movimentos.reduce((s, m) => s + m.debito, 0);
  const totalCredito = movimentos.reduce((s, m) => s + m.credito, 0);
  const saldoFinal = totalDebito - totalCredito;

  if (loading) {
    return (
      <Layout title="Livro Razão" showBackButton backToRoute="/contabilidade">
        <div className="flex justify-center items-center h-64">
          <Loader2 size={40} className="animate-spin text-blue-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Livro Razão" showBackButton backToRoute="/contabilidade">
      <div className="space-y-6 p-4">
        {/* Cabeçalho */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <BookOpen size={28} className="text-amber-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Livro Razão</h2>
                <p className="text-gray-400 text-sm">Registo detalhado de todos os movimentos por conta</p>
              </div>
            </div>
            {contaSelecionada && (
              <div className="flex gap-2">
                <button onClick={exportarExcel} disabled={exportando || movimentos.length === 0} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-white flex items-center gap-2">
                  <FileSpreadsheet size={18} /> Excel
                </button>
                <button onClick={exportarPDF} disabled={exportando || movimentos.length === 0} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-white flex items-center gap-2">
                  <Printer size={18} /> PDF
                </button>
                <button onClick={carregarRazao} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-white">
                  <RefreshCw size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Seletor de Conta */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[250px]">
              <label className="block text-xs text-gray-400 mb-1">Conta Contabilística</label>
              <select
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={contaSelecionada}
                onChange={(e) => setContaSelecionada(e.target.value)}
              >
                <option value="">Selecione uma conta...</option>
                {contas.map(conta => (
                  <option key={conta.codigo} value={conta.codigo}>
                    {conta.codigo} - {conta.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Início</label>
              <input
                type="date"
                className="bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Fim</label>
              <input
                type="date"
                className="bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
              />
            </div>
            <div>
              <button onClick={carregarRazao} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white flex items-center gap-2">
                <Search size={18} /> Consultar
              </button>
            </div>
          </div>
        </div>

        {/* Informação da Conta */}
        {contaInfo && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div><p className="text-xs text-gray-400">Código</p><p className="text-white font-mono font-bold">{contaInfo.codigo}</p></div>
              <div><p className="text-xs text-gray-400">Nome</p><p className="text-white">{contaInfo.nome}</p></div>
              <div><p className="text-xs text-gray-400">Classe</p><p className="text-white">{contaInfo.classe}</p></div>
              <div><p className="text-xs text-gray-400">Natureza</p><p className="text-white">{contaInfo.natureza}</p></div>
              <div><p className="text-xs text-gray-400">Saldo Atual</p><p className={`font-bold ${saldoFinal >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatarNumero(Math.abs(saldoFinal))} Kz {saldoFinal >= 0 ? 'D' : 'C'}</p></div>
            </div>
          </div>
        )}

        {/* Tabela de Movimentos */}
        {contaSelecionada && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr className="text-left text-gray-300">
                    <th className="p-3">Data</th>
                    <th className="p-3">Nº Lançamento</th>
                    <th className="p-3">Documento</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3 text-right">Débito</th>
                    <th className="p-3 text-right">Crédito</th>
                    <th className="p-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="text-center p-8"><Loader2 size={32} className="animate-spin mx-auto" /></td></tr>
                  ) : movimentos.length === 0 ? (
                    <tr><td colSpan="7" className="text-center p-8 text-gray-400">Nenhum movimento encontrado para esta conta</td></tr>
                  ) : (
                    movimentos.map((mov, idx) => (
                      <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/50">
                        <td className="p-3">{formatarData(mov.data)}</td>
                        <td className="p-3 font-mono text-xs">{mov.numeroLancamento}</td>
                        <td className="p-3 text-xs">{mov.documentoRef}</td>
                        <td className="p-3 max-w-md truncate">{mov.descricao}</td>
                        <td className="p-3 text-right text-green-400">{mov.debito > 0 ? formatarNumero(mov.debito) : "—"}</td>
                        <td className="p-3 text-right text-red-400">{mov.credito > 0 ? formatarNumero(mov.credito) : "—"}</td>
                        <td className="p-3 text-right"><span className={mov.saldo >= 0 ? "text-green-400" : "text-red-400"}>{formatarNumero(Math.abs(mov.saldo))} {mov.saldo >= 0 ? "D" : "C"}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
                {movimentos.length > 0 && (
                  <tfoot className="bg-gray-700">
                    <tr><td colSpan="4" className="p-3 text-right font-bold">TOTAIS:</td>
                      <td className="p-3 text-right font-bold text-green-400">{formatarNumero(totalDebito)}</td>
                      <td className="p-3 text-right font-bold text-red-400">{formatarNumero(totalCredito)}</td>
                      <td className="p-3 text-right font-bold">{formatarNumero(Math.abs(saldoFinal))} {saldoFinal >= 0 ? "D" : "C"}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LivroRazao;