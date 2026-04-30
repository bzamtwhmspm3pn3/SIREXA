// frontend/src/pages/ContaCorrente.jsx - VERSÃO CORRIGIDA
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import { 
  FileText, Download, Printer, RefreshCw, Loader2, 
  Building2, Eye as EyeIcon, ChevronLeft, ChevronRight, 
  X, AlertCircle, CheckCircle, Search, Filter, Calendar,
  Users, Briefcase, DollarSign, TrendingUp, TrendingDown,
  PlusCircle, MinusCircle, Clock as ClockIcon
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ==================== COMPONENTE DE EXTRATO INTEGRADO - CORRIGIDO ====================
const ModalExtrato = ({ fornecedor, empresaId, onClose }) => {
  const [empresa, setEmpresa] = useState(null);
  const [movimentos, setMovimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saldoAtual, setSaldoAtual] = useState(0);
  const [estatisticas, setEstatisticas] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState(null);
  

  const BASE_URL = "https://sirexa-api.onrender.com";

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    carregarExtrato();
  }, [fornecedor, empresaId]);

  const carregarExtrato = async () => {
  setLoading(true);
  setErro(null);
  try {
    // Buscar dados da empresa
    const empresaResponse = await fetch(`${BASE_URL}/api/empresa/${empresaId}`, {
      headers: getHeaders()
    });
    const empresaData = await empresaResponse.json();
    setEmpresa(empresaData.dados || empresaData);
    
    // Buscar extrato
    const response = await fetch(
      `${BASE_URL}/api/contacorrente/extrato/completo?empresaId=${empresaId}&fornecedorId=${fornecedor.id}`,
      { headers: getHeaders() }
    );
    
    const data = await response.json();
    
    if (data.sucesso) {
      const movimentosOrdenados = [...(data.dados.movimentos || [])].sort((a, b) => new Date(a.data) - new Date(b.data));
      setMovimentos(movimentosOrdenados);
      setSaldoAtual(data.dados.saldo || 0);
      setEstatisticas(data.dados.estatisticas);
    } else {
      setErro(data.mensagem || "Erro ao carregar movimentos");
      setMovimentos([]);
    }
  } catch (error) {
    console.error("Erro ao carregar extrato:", error);
    setErro("Erro ao conectar ao servidor");
    setMovimentos([]);
  } finally {
    setLoading(false);
  }
};


  const formatarData = (data) => {
    if (!data) return "—";
    return new Date(data).toLocaleDateString("pt-AO");
  };

  const formatarNumero = (numero) => {
    if (numero === undefined || numero === null) return "0,00";
    return Number(numero).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatarTipoMovimento = (tipo) => {
    switch(tipo) {
      case 'Crédito': return <span className="text-green-400 flex items-center gap-1"><PlusCircle size={14} /> Crédito</span>;
      case 'Débito': return <span className="text-red-400 flex items-center gap-1"><MinusCircle size={14} /> Débito</span>;
      default: return tipo;
    }
  };

  const exportarPDF = async () => {
  if (movimentos.length === 0) {
    alert("Nenhum movimento para exportar");
    return;
  }
  
  setExportando(true);
  try {
    // Buscar dados completos da empresa novamente para garantir
    const empresaResponse = await fetch(`${BASE_URL}/api/empresa/${empresaId}`, {
      headers: getHeaders()
    });
    const empresaData = await empresaResponse.json();
    const dadosEmpresa = empresaData.dados || empresaData;
    
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;
    
    // ============================================
    // CABEÇALHO COM DADOS DA EMPRESA
    // ============================================
    
    // Nome da Empresa
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(dadosEmpresa?.nome?.toUpperCase() || "EMPRESA", pageWidth / 2, yPos, { align: "center" });
    yPos += 8;
    
    // NIF
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`NIF: ${dadosEmpresa?.nif || "---"}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 6;
    
    // Endereço
    if (dadosEmpresa?.endereco) {
      let enderecoStr = "";
      if (typeof dadosEmpresa.endereco === 'object') {
        enderecoStr = [dadosEmpresa.endereco.rua, dadosEmpresa.endereco.numero, dadosEmpresa.endereco.bairro, dadosEmpresa.endereco.cidade, dadosEmpresa.endereco.provincia]
          .filter(Boolean).join(", ");
      } else {
        enderecoStr = dadosEmpresa.endereco;
      }
      doc.text(enderecoStr, pageWidth / 2, yPos, { align: "center" });
      yPos += 6;
    }
    
    // Contactos
    if (dadosEmpresa?.telefone || dadosEmpresa?.email) {
      const contato = [dadosEmpresa.telefone, dadosEmpresa.email].filter(Boolean).join(" | ");
      doc.text(contato, pageWidth / 2, yPos, { align: "center" });
      yPos += 6;
    }
    
    // Linha separadora
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;
    
    // ============================================
    // TÍTULO DO EXTRATO
    // ============================================
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("EXTRATO DE CONTA CORRENTE", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;
    
    // ============================================
    // INFORMAÇÕES DO FORNECEDOR E PERÍODO
    // ============================================
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    doc.text(`Fornecedor: ${fornecedor.nome}`, 20, yPos);
    doc.text(`NIF: ${fornecedor.nif || "---"}`, 20, yPos + 7);
    doc.text(`Período: ${formatarData(movimentos[0]?.data)} até ${formatarData(movimentos[movimentos.length - 1]?.data)}`, 20, yPos + 14);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString("pt-AO")}`, pageWidth - 60, yPos);
    doc.text(`Hora: ${new Date().toLocaleTimeString("pt-AO")}`, pageWidth - 60, yPos + 7);
    yPos += 25;
    
    // ============================================
    // TABELA DE MOVIMENTOS
    // ============================================
    const tableData = movimentos.map(m => [
      formatarData(m.data),
      m.referencia || "—",
      (m.descricao || "—").substring(0, 40),
      m.tipo || "—",
      m.tipo === 'Débito' ? formatarNumero(m.valor) : "—",
      m.tipo === 'Crédito' ? formatarNumero(m.valor) : "—",
      formatarNumero(m.saldoAtual)
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [["Data", "Nº Recibo", "Descrição", "Tipo", "Débito (Kz)", "Crédito (Kz)", "Saldo (Kz)"]],
      body: tableData,
      theme: "striped",
      headStyles: { 
        fillColor: [37, 99, 235], 
        textColor: [255, 255, 255], 
        fontSize: 9, 
        fontStyle: 'bold' 
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 50 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: 20, right: 20 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth - 30, doc.internal.pageSize.height - 10);
      }
    });
    
    const finalY = doc.lastAutoTable?.finalY || yPos + 50;
    yPos = finalY + 15;
    
    // ============================================
    // RESUMO DO PERÍODO
    // ============================================
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("RESUMO DO PERÍODO", 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Total de Débitos (Pagamentos): ${formatarNumero(estatisticas?.valorTotalPago || 0)} Kz`, 30, yPos);
    yPos += 6;
    doc.text(`Total de Créditos (Faturas): ${formatarNumero(estatisticas?.valorTotalFaturas || 0)} Kz`, 30, yPos);
    yPos += 6;
    doc.text(`Saldo Atual: ${formatarNumero(Math.abs(saldoAtual))} Kz`, 30, yPos);
    yPos += 6;
    doc.text(`Situação: ${saldoAtual > 0 ? "Credor (Empresa deve ao fornecedor)" : saldoAtual < 0 ? "Devedor (Fornecedor deve à empresa)" : "Conta Zerada"}`, 30, yPos);
    yPos += 20;
    
    // ============================================
    // ESPAÇOS PARA ASSINATURAS
    // ============================================
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    
    // Linha para assinatura do Gestor (esquerda)
    doc.line(30, yPos + 15, 80, yPos + 15);
    doc.setFontSize(9);
    doc.text("Assinatura do Gestor", 55, yPos + 23, { align: "center" });
    
    // Linha para assinatura do Técnico Responsável (direita)
    doc.line(pageWidth - 80, yPos + 15, pageWidth - 30, yPos + 15);
    doc.text("Assinatura do Técnico Responsável", pageWidth - 55, yPos + 23, { align: "center" });
    
        yPos += 40;
    
    // ============================================
    // RODAPÉ
    // ============================================
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Documento emitido eletronicamente - Sistema de Gestão Empresarial AnDioGest", pageWidth / 2, doc.internal.pageSize.height - 20, { align: "center" });
    doc.text("Este documento é válido como comprovante de movimentação da conta corrente", pageWidth / 2, doc.internal.pageSize.height - 15, { align: "center" });
    
    // ============================================
    // SALVAR PDF
    // ============================================
    doc.save(`extrato_${fornecedor.nome}_${new Date().toISOString().split("T")[0]}.pdf`);
    
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Erro ao gerar PDF: " + error.message);
  } finally {
    setExportando(false);
  }
};

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
          <div>
            <h2 className="text-xl font-bold text-white">Extrato de Conta Corrente</h2>
            <p className="text-gray-300 text-sm mt-1">
              {fornecedor?.nome || "Fornecedor"} | NIF: {fornecedor?.nif || "---"}
            </p>
            {estatisticas && (
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-green-400">Faturas: {formatarNumero(estatisticas.valorTotalFaturas)} Kz</span>
                <span className="text-red-400">Pagamentos: {formatarNumero(estatisticas.valorTotalPago)} Kz</span>
                <span className={`${saldoAtual > 0 ? 'text-red-400' : saldoAtual < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  Saldo: {formatarNumero(Math.abs(saldoAtual))} Kz
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportarPDF}
              disabled={exportando || movimentos.length === 0}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Printer size={16} /> {exportando ? "Exportando..." : "PDF"}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-blue-400" size={40} />
            </div>
          ) : erro ? (
            <div className="bg-red-600/20 rounded-xl p-8 text-center border border-red-500/30">
              <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
              <p className="text-red-400 text-lg">{erro}</p>
              <button
                onClick={carregarExtrato}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
              >
                Tentar Novamente
              </button>
            </div>
          ) : movimentos.length === 0 ? (
            <div className="bg-gray-700/30 rounded-xl p-12 text-center">
              <FileText className="mx-auto mb-4 text-gray-500" size={48} />
              <p className="text-gray-400 text-lg">Nenhum movimento encontrado</p>
              <p className="text-gray-500 text-sm mt-2">
                Este fornecedor ainda não tem movimentações registadas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700 sticky top-0">
                  <tr className="text-white">
                    <th className="p-3 text-left">Data</th>
                    <th className="p-3 text-left">Nº Recibo</th>
                    <th className="p-3 text-left">Descrição</th>
                    <th className="p-3 text-center">Tipo</th>
                    <th className="p-3 text-right">Débito (Kz)</th>
                    <th className="p-3 text-right">Crédito (Kz)</th>
                    <th className="p-3 text-right">Saldo (Kz)</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentos.map((mov, idx) => {
                    const isCredito = mov.tipo === 'Crédito';
                    const isDebito = mov.tipo === 'Débito';
                    
                    return (
                      <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                        <td className="p-3 text-white whitespace-nowrap">{formatarData(mov.data)}</td>
                        <td className="p-3 text-gray-300 font-mono text-xs">{mov.referencia || "—"}</td>
                        <td className="p-3 text-gray-300 max-w-xs">
                          {mov.descricao || "—"}
                          {mov.retencaoFonte > 0 && (
                            <span className="block text-xs text-orange-400 mt-1">
                              Retenção: {formatarNumero(mov.retencaoFonte)} Kz
                            </span>
                          )}
                          {mov.status === 'Pendente' && (
                            <span className="block text-xs text-yellow-400 mt-1">⚠️ Pendente</span>
                          )}
                          {mov.status === 'Pago' && (
                            <span className="block text-xs text-green-400 mt-1">✓ Pago em: {formatarData(mov.dataPagamento)}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {formatarTipoMovimento(mov.tipo)}
                        </td>
                        <td className={`p-3 text-right font-bold ${isDebito ? 'text-red-400' : 'text-gray-500'}`}>
                          {isDebito ? formatarNumero(mov.valor) : "—"}
                        </td>
                        <td className={`p-3 text-right font-bold ${isCredito ? 'text-green-400' : 'text-gray-500'}`}>
                          {isCredito ? formatarNumero(mov.valor) : "—"}
                        </td>
                        <td className={`p-3 text-right font-bold ${mov.saldoAtual > 0 ? 'text-red-400' : mov.saldoAtual < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                          {formatarNumero(Math.abs(mov.saldoAtual))}
                          <span className="text-xs ml-1">
                            {mov.saldoAtual > 0 ? "C" : mov.saldoAtual < 0 ? "D" : ""}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {estatisticas && (
                  <tfoot className="bg-gray-700/50 border-t border-gray-600 sticky bottom-0">
                    <tr className="text-white text-sm font-bold">
                      <td colSpan="4" className="p-3 text-right">TOTAIS:</td>
                      <td className="p-3 text-right text-red-400">
                        {formatarNumero(estatisticas.valorTotalPago)}
                      </td>
                      <td className="p-3 text-right text-green-400">
                        {formatarNumero(estatisticas.valorTotalFaturas)}
                      </td>
                      <td className={`p-3 text-right ${saldoAtual > 0 ? 'text-red-400' : saldoAtual < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                        {formatarNumero(Math.abs(saldoAtual))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-750 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Total de Movimentos: {movimentos.length}
            {estatisticas && (
              <span className="ml-4">
                | Débitos: {formatarNumero(estatisticas.valorTotalPago)} Kz
                | Créditos: {formatarNumero(estatisticas.valorTotalFaturas)} Kz
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================
const ContaCorrente = () => {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [contas, setContas] = useState([]);
  const [contasFiltradas, setContasFiltradas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [exportando, setExportando] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(10);
  const [sincronizando, setSincronizando] = useState(false);
  const [gerandoCreditos, setGerandoCreditos] = useState(false);
  const [mostrarResumo, setMostrarResumo] = useState(false);
  const [resumoGeral, setResumoGeral] = useState(null);
  
  // State para o extrato
  const [mostrarExtrato, setMostrarExtrato] = useState(false);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState(null);
  
  // Filtros
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroTipoServico, setFiltroTipoServico] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroSituacao, setFiltroSituacao] = useState("todos");
  const [tipoConta, setTipoConta] = useState("Fornecedor"); 

  const BASE_URL = "https://sirexa-api.onrender.com";
  const tiposServico = ["Todos", "Informática", "Construção", "Limpeza", "Transporte", "Consultoria", "Fornecimento", "Outros"];

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const abrirExtrato = (conta) => {
    const fornecedorNaLista = resumoGeral?.fornecedores?.find(f => f.nome === conta.beneficiario);
    
    if (fornecedorNaLista) {
      setFornecedorSelecionado({
        id: fornecedorNaLista.id,
        nome: fornecedorNaLista.nome,
        nif: fornecedorNaLista.nif
      });
      setMostrarExtrato(true);
    } else {
      mostrarMensagem("Fornecedor não encontrado", "erro");
    }
  };

  const gerarCreditosAntecipados = async () => {
    if (!empresaSelecionada) {
      mostrarMensagem("Selecione uma empresa primeiro", "erro");
      return;
    }
    
    setGerandoCreditos(true);
    try {
      const response = await fetch(`${BASE_URL}/api/contacorrente/gerar-creditos-antecipados`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ empresaId: empresaSelecionada })
      });
      
      const data = await response.json();
      
      if (data.sucesso) {
        mostrarMensagem(data.mensagem || "Créditos gerados com sucesso!", "sucesso");
        await carregarContas();
        await carregarResumoGeral();
      } else {
        mostrarMensagem(data.mensagem || "Erro ao gerar créditos", "erro");
      }
    } catch (error) {
      console.error("Erro ao gerar créditos:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setGerandoCreditos(false);
    }
  };

  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarContas();
      carregarResumoGeral();
    }
}, [empresaSelecionada, tipoConta]); 

  useEffect(() => {
    aplicarFiltros();
  }, [contas, filtroNome, filtroTipoServico, filtroDataInicio, filtroDataFim, filtroStatus, filtroSituacao]);

  const carregarEmpresas = async () => {
    if (isTecnico()) {
      setLoadingEmpresas(false);
      return;
    }
    
    setLoadingEmpresas(true);
    try {
      const response = await fetch(`${BASE_URL}/api/empresa`, { headers: getHeaders() });
      
      if (response.status === 403) {
        setEmpresas([]);
        mostrarMensagem("Acesso negado", "erro");
        return;
      }
      
      const data = await response.json();
      setEmpresas(Array.isArray(data) ? data : []);
      
      if (data.length > 0 && !empresaSelecionada) {
        setEmpresaSelecionada(data[0]._id);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      mostrarMensagem("Erro ao carregar empresas", "erro");
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarContas = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/contacorrente?empresaId=${empresaSelecionada}&tipo=${tipoConta}`, {
        headers: getHeaders()
      });
      
      const data = await response.json();
      
      if (data.sucesso !== false) {
        setContas(data.dados || []);
      } else {
        setContas([]);
      }
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
      setContas([]);
      mostrarMensagem("Erro ao carregar contas", "erro");
    } finally {
      setLoading(false);
    }
  };

  const carregarResumoGeral = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/contacorrente/resumo?empresaId=${empresaSelecionada}`, {
        headers: getHeaders()
      });
      
      const data = await response.json();
      if (data.sucesso !== false) {
        setResumoGeral(data.dados);
      }
    } catch (error) {
      console.error("Erro ao carregar resumo:", error);
    }
  };

  const sincronizarContas = async () => {
    if (!empresaSelecionada) {
      mostrarMensagem("Selecione uma empresa primeiro", "erro");
      return;
    }
    
    setSincronizando(true);
    try {
      const response = await fetch(`${BASE_URL}/api/contacorrente/sincronizar?empresaId=${empresaSelecionada}`, {
        method: "POST",
        headers: getHeaders()
      });
      
      const data = await response.json();
      
      if (data.sucesso) {
        mostrarMensagem(data.mensagem || "Sincronização concluída!", "sucesso");
        await carregarContas();
        await carregarResumoGeral();
      } else {
        mostrarMensagem(data.mensagem || "Erro ao sincronizar", "erro");
      }
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      mostrarMensagem("Erro ao sincronizar", "erro");
    } finally {
      setSincronizando(false);
    }
  };

  const aplicarFiltros = () => {
    let filtradas = [...contas];
    
    if (filtroNome) {
      filtradas = filtradas.filter(c => 
        c.beneficiario?.toLowerCase().includes(filtroNome.toLowerCase())
      );
    }
    
    if (filtroTipoServico && filtroTipoServico !== "Todos") {
      filtradas = filtradas.filter(c => 
        c.tipoServico?.toLowerCase().includes(filtroTipoServico.toLowerCase())
      );
    }
    
    if (filtroDataInicio) {
      const dataInicio = new Date(filtroDataInicio);
      filtradas = filtradas.filter(c => 
        c.dataUltimaMovimentacao && new Date(c.dataUltimaMovimentacao) >= dataInicio
      );
    }
    
    if (filtroDataFim) {
      const dataFim = new Date(filtroDataFim);
      filtradas = filtradas.filter(c => 
        c.dataUltimaMovimentacao && new Date(c.dataUltimaMovimentacao) <= dataFim
      );
    }
    
    if (filtroStatus !== "todos") {
      filtradas = filtradas.filter(c => 
        c.status?.toLowerCase() === filtroStatus.toLowerCase()
      );
    }
    
    if (filtroSituacao !== "todos") {
      if (filtroSituacao === "credor") {
        filtradas = filtradas.filter(c => c.saldo > 0);
      } else if (filtroSituacao === "devedor") {
        filtradas = filtradas.filter(c => c.saldo < 0);
      } else if (filtroSituacao === "zerado") {
        filtradas = filtradas.filter(c => c.saldo === 0);
      }
    }
    
    setContasFiltradas(filtradas);
    setPaginaAtual(1);
  };

  const limparFiltros = () => {
    setFiltroNome("");
    setFiltroTipoServico("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setFiltroStatus("todos");
    setFiltroSituacao("todos");
  };

  const exportarPDF = async () => {
  if (movimentos.length === 0) {
    alert("Nenhum movimento para exportar");
    return;
  }
  
  setExportando(true);
  try {
    // Buscar dados completos da empresa novamente para garantir
    const empresaResponse = await fetch(`${BASE_URL}/api/empresa/${empresaId}`, {
      headers: getHeaders()
    });
    const empresaData = await empresaResponse.json();
    const dadosEmpresa = empresaData.dados || empresaData;
    
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;
    
    // ============================================
    // CABEÇALHO COM DADOS DA EMPRESA
    // ============================================
    
    // Nome da Empresa
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(dadosEmpresa?.nome?.toUpperCase() || "EMPRESA", pageWidth / 2, yPos, { align: "center" });
    yPos += 8;
    
    // NIF
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`NIF: ${dadosEmpresa?.nif || "---"}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 6;
    
    // Endereço
    if (dadosEmpresa?.endereco) {
      let enderecoStr = "";
      if (typeof dadosEmpresa.endereco === 'object') {
        enderecoStr = [dadosEmpresa.endereco.rua, dadosEmpresa.endereco.numero, dadosEmpresa.endereco.bairro, dadosEmpresa.endereco.cidade, dadosEmpresa.endereco.provincia]
          .filter(Boolean).join(", ");
      } else {
        enderecoStr = dadosEmpresa.endereco;
      }
      doc.text(enderecoStr, pageWidth / 2, yPos, { align: "center" });
      yPos += 6;
    }
    
    // Contactos
    if (dadosEmpresa?.telefone || dadosEmpresa?.email) {
      const contato = [dadosEmpresa.telefone, dadosEmpresa.email].filter(Boolean).join(" | ");
      doc.text(contato, pageWidth / 2, yPos, { align: "center" });
      yPos += 6;
    }
    
    // Linha separadora
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;
    
    // ============================================
    // TÍTULO DO EXTRATO
    // ============================================
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("EXTRATO DE CONTA CORRENTE", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;
    
    // ============================================
    // INFORMAÇÕES DO FORNECEDOR E PERÍODO
    // ============================================
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    doc.text(`Fornecedor: ${fornecedor.nome}`, 20, yPos);
    doc.text(`NIF: ${fornecedor.nif || "---"}`, 20, yPos + 7);
    doc.text(`Período: ${formatarData(movimentos[0]?.data)} até ${formatarData(movimentos[movimentos.length - 1]?.data)}`, 20, yPos + 14);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString("pt-AO")}`, pageWidth - 60, yPos);
    doc.text(`Hora: ${new Date().toLocaleTimeString("pt-AO")}`, pageWidth - 60, yPos + 7);
    yPos += 25;
    
    // ============================================
    // TABELA DE MOVIMENTOS
    // ============================================
    const tableData = movimentos.map(m => [
      formatarData(m.data),
      m.referencia || "—",
      (m.descricao || "—").substring(0, 40),
      m.tipo || "—",
      m.tipo === 'Débito' ? formatarNumero(m.valor) : "—",
      m.tipo === 'Crédito' ? formatarNumero(m.valor) : "—",
      formatarNumero(m.saldoAtual)
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [["Data", "Nº Recibo", "Descrição", "Tipo", "Débito (Kz)", "Crédito (Kz)", "Saldo (Kz)"]],
      body: tableData,
      theme: "striped",
      headStyles: { 
        fillColor: [37, 99, 235], 
        textColor: [255, 255, 255], 
        fontSize: 9, 
        fontStyle: 'bold' 
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 50 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: 20, right: 20 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth - 30, doc.internal.pageSize.height - 10);
      }
    });
    
    const finalY = doc.lastAutoTable?.finalY || yPos + 50;
    yPos = finalY + 15;
    
    // ============================================
    // RESUMO DO PERÍODO
    // ============================================
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("RESUMO DO PERÍODO", 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Total de Débitos (Pagamentos): ${formatarNumero(estatisticas?.valorTotalPago || 0)} Kz`, 30, yPos);
    yPos += 6;
    doc.text(`Total de Créditos (Faturas): ${formatarNumero(estatisticas?.valorTotalFaturas || 0)} Kz`, 30, yPos);
    yPos += 6;
    doc.text(`Saldo Atual: ${formatarNumero(Math.abs(saldoAtual))} Kz`, 30, yPos);
    yPos += 6;
    doc.text(`Situação: ${saldoAtual > 0 ? "Credor (Empresa deve ao fornecedor)" : saldoAtual < 0 ? "Devedor (Fornecedor deve à empresa)" : "Conta Zerada"}`, 30, yPos);
    yPos += 20;
    
    // ============================================
    // ESPAÇOS PARA ASSINATURAS
    // ============================================
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    
    // Linha para assinatura do Gestor (esquerda)
    doc.line(30, yPos + 15, 80, yPos + 15);
    doc.setFontSize(9);
    doc.text("Assinatura do Gestor", 55, yPos + 23, { align: "center" });
    
    // Linha para assinatura do Técnico Responsável (direita)
    doc.line(pageWidth - 80, yPos + 15, pageWidth - 30, yPos + 15);
    doc.text("Assinatura do Técnico Responsável", pageWidth - 55, yPos + 23, { align: "center" });
    
        yPos += 40;
    
    // ============================================
    // RODAPÉ
    // ============================================
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Documento emitido eletronicamente - Sistema de Gestão Empresarial AnDioGest", pageWidth / 2, doc.internal.pageSize.height - 20, { align: "center" });
    doc.text("Este documento é válido como comprovante de movimentação da conta corrente", pageWidth / 2, doc.internal.pageSize.height - 15, { align: "center" });
    
    // ============================================
    // SALVAR PDF
    // ============================================
    doc.save(`extrato_${fornecedor.nome}_${new Date().toISOString().split("T")[0]}.pdf`);
    
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Erro ao gerar PDF: " + error.message);
  } finally {
    setExportando(false);
  }
};


  const formatarData = (data) => {
    if (!data) return "—";
    return new Date(data).toLocaleDateString("pt-AO");
  };

  const indexOfLastItem = paginaAtual * itensPorPagina;
  const indexOfFirstItem = indexOfLastItem - itensPorPagina;
  const currentItems = contasFiltradas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPaginas = Math.ceil(contasFiltradas.length / itensPorPagina);

  const totalCredor = contasFiltradas.filter(c => c.saldo > 0).reduce((sum, c) => sum + c.saldo, 0);
  const totalDevedor = contasFiltradas.filter(c => c.saldo < 0).reduce((sum, c) => sum + Math.abs(c.saldo), 0);
  const totalContas = contasFiltradas.length;

  if (loadingEmpresas) {
    return (
      <Layout title="Conta Corrente" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Conta Corrente" showBackButton={true} backToRoute="/menu">
      {mensagem.texto && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
          } text-white text-sm`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      <div className="space-y-6 p-4">
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => { carregarContas(); carregarResumoGeral(); }}
          loading={loadingEmpresas}
        />

        {!empresaSelecionada ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <Building2 className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">
              {isTecnico() ? "Carregando sua empresa..." : "Selecione uma empresa para comecar"}
            </p>
          </div>
        ) : (
          <>
            {isTecnico() && (
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <EyeIcon size={18} />
                  <span className="text-sm">Empresa: <strong>{userEmpresaNome}</strong></span>
                </div>
              </div>
            )}

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-4 border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm">Total de Contas</p>
                    <p className="text-2xl font-bold text-white">{totalContas}</p>
                  </div>
                  <Users className="text-blue-400" size={28} />
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-xl p-4 border border-red-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-300 text-sm">Total a Pagar</p>
                    <p className="text-xl font-bold text-red-400">{totalCredor.toLocaleString()} Kz</p>
                  </div>
                  <TrendingUp className="text-red-400" size={28} />
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-4 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-300 text-sm">Total a Receber</p>
                    <p className="text-xl font-bold text-green-400">{totalDevedor.toLocaleString()} Kz</p>
                  </div>
                  <TrendingDown className="text-green-400" size={28} />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-4 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 text-sm">Saldo Líquido</p>
                    <p className={`text-xl font-bold ${(totalCredor - totalDevedor) >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {Math.abs(totalCredor - totalDevedor).toLocaleString()} Kz
                    </p>
                    <p className="text-xs text-gray-400">
                      {(totalCredor - totalDevedor) >= 0 ? 'Empresa deve' : 'Fornecedores devem'}
                    </p>
                  </div>
                  <DollarSign className="text-purple-400" size={28} />
                </div>
              </div>
            </div>

            {/* 🔥 ABAS FORNECEDOR/CLIENTE */}
<div className="flex gap-2 mb-4">
  <button
    onClick={() => setTipoConta("Fornecedor")}
    className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
      tipoConta === "Fornecedor"
        ? "bg-blue-600 text-white shadow-lg"
        : "bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600"
    }`}
  >
    🏢 Fornecedores
  </button>
  <button
    onClick={() => setTipoConta("Cliente")}
    className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
      tipoConta === "Cliente"
        ? "bg-green-600 text-white shadow-lg"
        : "bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600"
    }`}
  >
    👥 Clientes
  </button>
</div>

             

            {/* Botões de Ação */}
            <div className="flex flex-wrap justify-between gap-2">
              <button
                onClick={() => setMostrarResumo(true)}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white flex items-center gap-2 text-sm"
              >
                <FileText size={16} /> Resumo Geral
              </button>
              <div className="flex gap-2">
                <button
                  onClick={gerarCreditosAntecipados}
                  disabled={gerandoCreditos}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <PlusCircle size={16} /> {gerandoCreditos ? "Gerando..." : "Gerar Créditos"}
                </button>
                <button
                  onClick={sincronizarContas}
                  disabled={sincronizando}
                  className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg text-white flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <RefreshCw size={16} /> {sincronizando ? "Sincronizando..." : "Sincronizar"}
                </button>
                <button
                  onClick={exportarPDF}
                  disabled={exportando}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <Printer size={16} /> {exportando ? "..." : "Exportar PDF"}
                </button>
                <button
                  onClick={() => { carregarContas(); carregarResumoGeral(); }}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white flex items-center gap-2 text-sm"
                >
                  <RefreshCw size={16} /> Atualizar
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Filter size={18} className="text-blue-400" />
                <h3 className="text-white font-semibold">Filtros de Pesquisa</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">🔍 Nome / Beneficiário</label>
                  <input
                    type="text"
                    placeholder="Digite o nome..."
                    className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm"
                    value={filtroNome}
                    onChange={(e) => setFiltroNome(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">🏷️ Tipo de Serviço</label>
                  <select
                    className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm"
                    value={filtroTipoServico}
                    onChange={(e) => setFiltroTipoServico(e.target.value)}
                  >
                    {tiposServico.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">📅 Data Início</label>
                  <input
                    type="date"
                    className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">📅 Data Fim</label>
                  <input
                    type="date"
                    className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">📊 Status</label>
                  <select
                    className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm"
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                    <option value="Bloqueado">Bloqueado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">💰 Situação</label>
                  <select
                    className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm"
                    value={filtroSituacao}
                    onChange={(e) => setFiltroSituacao(e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    <option value="credor">Credor (a pagar)</option>
                    <option value="devedor">Devedor (a receber)</option>
                    <option value="zerado">Zerado</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={limparFiltros}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>

            {/* Tabela de Contas */}
            {loading ? (
              <div className="text-center p-8">
                <Loader2 className="animate-spin mx-auto text-blue-400" size={32} />
              </div>
            ) : contasFiltradas.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
                <FileText className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">Nenhuma conta encontrada</p>
                <p className="text-gray-500 text-sm mt-2">
                  {contas.length === 0 ? "Clique em 'Gerar Créditos' para criar as faturas" : "Ajuste os filtros para encontrar resultados"}
                </p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700">
                      <tr className="text-white">
                        <th className="p-3 text-left">Beneficiário</th>
                        <th className="p-3 text-left">NIF</th>
                        <th className="p-3 text-left">Tipo</th>
                        <th className="p-3 text-left">Contacto</th>
                        <th className="p-3 text-right">Saldo (Kz)</th>
                        <th className="p-3 text-center">Situação</th>
                        <th className="p-3 text-center">Ult. Movimento</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((conta, idx) => {
                        const saldo = conta.saldo || 0;
                        const situacao = saldo > 0 ? "Credor (empresa deve)" : saldo < 0 ? "Devedor (fornecedor deve)" : "Zerado";
                        const situacaoCor = saldo > 0 ? "text-red-400" : saldo < 0 ? "text-green-400" : "text-gray-400";
                        const bgSituacao = saldo > 0 ? "bg-red-600/20 text-red-400" : saldo < 0 ? "bg-green-600/20 text-green-400" : "bg-gray-600/20 text-gray-400";
                        
                        return (
                          <tr key={conta._id || idx} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                            <td className="p-3 font-medium text-white">{conta.beneficiario}</td>
                            <td className="p-3 text-gray-300">{conta.beneficiarioDocumento || "—"}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
  conta.tipo === "Cliente" 
    ? 'bg-green-600/20 text-green-400' 
    : 'bg-blue-600/20 text-blue-400'
}`}>
  {conta.tipo || "Outro"}
</span>
                            </td>
                            <td className="p-3 text-gray-300">{conta.telefone || conta.email || "—"}</td>
                            <td className={`p-3 text-right font-bold ${situacaoCor}`}>
                              {Math.abs(saldo).toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs ${bgSituacao}`}>
                                {situacao}
                              </span>
                            </td>
                            <td className="p-3 text-center text-gray-400 text-xs">
                              {formatarData(conta.dataUltimaMovimentacao)}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs ${conta.status === "Ativo" ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                                {conta.status || "Ativo"}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => abrirExtrato(conta)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-xs transition flex items-center gap-1 mx-auto"
                              >
                                <EyeIcon size={12} /> Ver Extrato
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-700/50 border-t border-gray-600">
                      <tr className="text-white text-sm">
                        <td colSpan="4" className="p-3 text-right font-bold">TOTAIS:</td>
                        <td className="p-3 text-right font-bold">
                          <span className="text-red-400">+{totalCredor.toLocaleString()}</span> / 
                          <span className="text-green-400"> -{totalDevedor.toLocaleString()}</span>
                         </td>
                        <td colSpan="3" className="p-3">Saldo Líquido: {Math.abs(totalCredor - totalDevedor).toLocaleString()} Kz {(totalCredor - totalDevedor) >= 0 ? '(Empresa deve)' : '(Fornecedores devem)'}</td>
                        <td className="p-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                {totalPaginas > 1 && (
                  <div className="flex justify-center items-center gap-2 p-4 border-t border-gray-700">
                    <button
                      onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                      disabled={paginaAtual === 1}
                      className="p-2 bg-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-600 transition"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-gray-400 text-sm">Página {paginaAtual} de {totalPaginas}</span>
                    <button
                      onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                      disabled={paginaAtual === totalPaginas}
                      className="p-2 bg-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-600 transition"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Resumo Geral */}
      {mostrarResumo && resumoGeral && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg"><FileText className="text-white" size={20} /></div>
                  <h2 className="text-xl font-bold text-white">Resumo Geral</h2>
                </div>
                <button onClick={() => setMostrarResumo(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-600/20 rounded-xl p-4 text-center border border-red-500/30">
                  <p className="text-red-300 text-sm">Total a Pagar</p>
                  <p className="text-2xl font-bold text-red-400">{(resumoGeral.totalAPagar || 0).toLocaleString()} Kz</p>
                </div>
                <div className="bg-green-600/20 rounded-xl p-4 text-center border border-green-500/30">
                  <p className="text-green-300 text-sm">Total a Receber</p>
                  <p className="text-2xl font-bold text-green-400">{(resumoGeral.totalAReceber || 0).toLocaleString()} Kz</p>
                </div>
                <div className="bg-purple-600/20 rounded-xl p-4 text-center border border-purple-500/30">
                  <p className="text-purple-300 text-sm">Saldo Líquido</p>
                  <p className={`text-2xl font-bold ${(resumoGeral.totalAPagar - resumoGeral.totalAReceber) >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {Math.abs((resumoGeral.totalAPagar || 0) - (resumoGeral.totalAReceber || 0)).toLocaleString()} Kz
                  </p>
                  <p className="text-xs text-gray-400">
                    {(resumoGeral.totalAPagar - resumoGeral.totalAReceber) >= 0 ? 'Empresa deve' : 'Fornecedores devem'}
                  </p>
                </div>
              </div>
              
              {resumoGeral.fornecedores && resumoGeral.fornecedores.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Saldo por Fornecedor</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-700">
                        <tr className="text-white">
                          <th className="p-2 text-left">Fornecedor</th>
                          <th className="p-2 text-right">Saldo (Kz)</th>
                          <th className="p-2 text-center">Situação</th>
                          <th className="p-2 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumoGeral.fornecedores.map((f, idx) => {
                          const saldoFornecedor = f.saldo || 0;
                          const situacaoFornecedor = saldoFornecedor > 0 ? "Credor (empresa deve)" : saldoFornecedor < 0 ? "Devedor (fornecedor deve)" : "Zerado";
                          const corFornecedor = saldoFornecedor > 0 ? "text-red-400" : saldoFornecedor < 0 ? "text-green-400" : "text-gray-400";
                          const bgFornecedor = saldoFornecedor > 0 ? "bg-red-600/20 text-red-400" : saldoFornecedor < 0 ? "bg-green-600/20 text-green-400" : "bg-gray-600/20 text-gray-400";
                          
                          return (
                            <tr key={idx} className="border-t border-gray-700">
                              <td className="p-2 text-white">{f.nome}</td>
                              <td className={`p-2 text-right font-bold ${corFornecedor}`}>
                                {Math.abs(saldoFornecedor).toLocaleString()}
                              </td>
                              <td className="p-2 text-center">
                                <span className={`px-2 py-1 rounded text-xs ${bgFornecedor}`}>
                                  {situacaoFornecedor}
                                </span>
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => {
                                    setMostrarResumo(false);
                                    setFornecedorSelecionado({
                                      id: f.id,
                                      nome: f.nome,
                                      nif: f.nif
                                    });
                                    setMostrarExtrato(true);
                                  }}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs transition flex items-center gap-1 mx-auto"
                                >
                                  <EyeIcon size={10} /> Ver Extrato
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-700/50 border-t border-gray-600">
                        <tr className="text-white font-bold">
                          <td className="p-2">TOTAL</td>
                          <td className={`p-2 text-right ${resumoGeral.saldoTotal >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {Math.abs(resumoGeral.saldoTotal || 0).toLocaleString()} Kz
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${resumoGeral.saldoTotal >= 0 ? 'bg-red-600/20 text-red-400' : 'bg-green-600/20 text-green-400'}`}>
                              {resumoGeral.saldoTotal >= 0 ? 'Empresa deve' : 'Fornecedores devem'}
                            </span>
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="bg-gray-700/30 rounded-xl p-4">
                <p className="text-gray-400 text-sm">
                  📊 Total de Fornecedores: {resumoGeral.totalFornecedores || 0} |
                  Total de Movimentos: {resumoGeral.totalMovimentos || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Extrato do Fornecedor */}
      {mostrarExtrato && fornecedorSelecionado && (
        <ModalExtrato
          fornecedor={fornecedorSelecionado}
          empresaId={empresaSelecionada}
          onClose={() => setMostrarExtrato(false)}
        />
      )}

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out { animation: fade-in-out 2.5s ease forwards; }
      `}</style>
    </Layout>
  );
};

export default ContaCorrente;