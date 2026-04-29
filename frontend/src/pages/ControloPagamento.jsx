// src/pages/ControloPagamento.jsx - VERSÃO COMPLETA E ROBUSTA
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import { 
  ShieldCheck, ScrollText, Search, ChevronLeft, ChevronRight, 
  CheckCircle, Clock, XCircle, DollarSign, Calendar, AlertCircle,
  FileText, Download, RefreshCw, Receipt, Ban, Loader2, TrendingUp,
  Building2, X, Plus, Edit, Trash2, Users, Percent, Eye, Info
} from "lucide-react";
import QRCode from "react-qr-code";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const ControloPagamento = () => {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [pesquisaTexto, setPesquisaTexto] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [pagamentosPorPagina] = useState(6);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarRecibo, setMostrarRecibo] = useState(false);
  const [reciboData, setReciboData] = useState(null);
  const [dashboard, setDashboard] = useState({
    totalPendente: 0,
    totalPago: 0,
    atrasados: 0,
    totalPagamentos: 0
  });
  const [saldoDisponivel, setSaldoDisponivel] = useState(0);
  const [contasDebito, setContasDebito] = useState([]);
  const [recarregar, setRecarregar] = useState(false);
  
  // 🔥 NOVOS STATES PARA SELECAO DE CONTA
  const [contasDisponiveis, setContasDisponiveis] = useState([]);
  const [pagamentoParaPagar, setPagamentoParaPagar] = useState(null);
  const [mostrarModalContas, setMostrarModalContas] = useState(false);
  
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();

  const [formData, setFormData] = useState({
    beneficiario: "",
    valor: "",
    dataVencimento: "",
    status: "Pendente",
    observacao: "",
    tipo: "Outro",
    categoria: "Operacional",
    formaPagamento: "Transferência Bancária",
    contaDebito: "",
    retencaoFonte: 0,
    valorLiquido: 0
  });

  const BASE_URL = "https://sirexa-api.onrender.com";
  
  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const statusOptions = ["Todos", "Pago", "Pendente", "Atrasado", "Cancelado"];
  const tipoOptions = ["Todos", "Folha Salarial", "Fornecedor", "Imposto", "Manutenção", "Abastecimento", "Outro"];
  const formaPagamentoOptions = ["Transferência Bancária", "Dinheiro", "Cheque", "Depósito Bancário"];

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
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
      buscarPagamentos();
      carregarContasDebito();
      carregarSaldoDisponivel();
    } else {
      setPagamentos([]);
      setContasDebito([]);
      setSaldoDisponivel(0);
    }
  }, [empresaSelecionada, filtroStatus, filtroTipo, filtroDataInicio, filtroDataFim, recarregar]);

  const carregarEmpresas = async () => {
  if (isTecnico() && userEmpresaId) {
    setLoadingEmpresas(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/empresa/tecnico/empresa`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const empresa = data.dados || data;
        if (empresa) {
          setEmpresas([empresa]);
          setEmpresaSelecionada(empresa._id);
          console.log("✅ Empresa do técnico carregada:", empresa.nome);
        }
      } else {
        console.error("❌ Erro ao carregar empresa do técnico:", response.status);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar empresa do técnico:", error);
    } finally {
      setLoadingEmpresas(false);
    }
    return;
  }
  
  setLoadingEmpresas(true);
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/api/empresa`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const empresasList = Array.isArray(data) ? data : [];
    
    console.log("📋 Empresas carregadas do backend:", empresasList.map(e => ({ id: e._id, nome: e.nome })));
    
    setEmpresas(empresasList);
    
    if (!empresaSelecionada && empresasList.length > 0) {
      setEmpresaSelecionada(empresasList[0]._id);
    }
  } catch (error) {
    console.error("❌ Erro ao carregar empresas:", error);
    mostrarMensagem("Erro ao carregar empresas", "erro");
  } finally {
    setLoadingEmpresas(false);
  }
};

  const carregarSaldoDisponivel = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const response = await fetch(`${BASE_URL}/api/pagamentos?empresaId=${empresaSelecionada}&limit=1`, {
        headers: getHeaders()
      });
      
      const data = await response.json();
      if (data.saldoDisponivel !== undefined) {
        setSaldoDisponivel(data.saldoDisponivel);
      }
    } catch (error) {
      console.error("Erro ao carregar saldo:", error);
    }
  };

  const carregarContasDebito = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const response = await fetch(`${BASE_URL}/api/pagamentos/contas-debito?empresaId=${empresaSelecionada}`, {
        headers: getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        const contas = data.dados || (Array.isArray(data) ? data : []);
        setContasDebito(contas);
      }
    } catch (error) {
      console.error("Erro ao carregar contas débito:", error);
    }
  };

  const buscarPagamentos = async () => {
    if (!empresaSelecionada) return;
    
    setLoading(true);
    try {
      let url = `${BASE_URL}/api/pagamentos?empresaId=${empresaSelecionada}`;
      
      if (filtroTipo === "Folha Salarial") {
        url = `${BASE_URL}/api/pagamentos/folha?empresaId=${empresaSelecionada}`;
        if (filtroDataInicio && filtroDataFim) {
          const mes = new Date(filtroDataInicio).getMonth() + 1;
          const ano = new Date(filtroDataInicio).getFullYear();
          url += `&mes=${mes}&ano=${ano}`;
        }
      } else {
        if (filtroStatus !== "Todos") url += `&status=${filtroStatus}`;
        if (filtroTipo !== "Todos") url += `&tipo=${filtroTipo}`;
        if (filtroDataInicio) url += `&dataInicio=${filtroDataInicio}`;
        if (filtroDataFim) url += `&dataFim=${filtroDataFim}`;
      }
      
      const response = await fetch(url, { headers: getHeaders() });
      
      if (response.status === 403) {
        mostrarMensagem("Acesso negado", "erro");
        setEmpresaSelecionada("");
        setPagamentos([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      const listaPagamentos = data.dados || (Array.isArray(data) ? data : []);
      setPagamentos(listaPagamentos);
      setPaginaActual(1);
      
      if (data.saldoDisponivel !== undefined) {
        setSaldoDisponivel(data.saldoDisponivel);
      }
      
      calcularTotais(listaPagamentos);
    } catch (error) {
      console.error("Erro ao buscar pagamentos:", error);
      mostrarMensagem("Erro ao carregar pagamentos", "erro");
    } finally {
      setLoading(false);
    }
  };

  const calcularTotais = (pagamentosList) => {
    const hoje = new Date();
    let totalPendente = 0;
    let totalPago = 0;
    let atrasados = 0;
    
    for (const p of pagamentosList) {
      if (p.status === "Pago") {
        totalPago += p.valor || 0;
      } else if (p.status === "Pendente" || p.status === "Atrasado") {
        totalPendente += p.valor || 0;
        if (new Date(p.dataVencimento) < hoje && p.status !== "Pendente") {
          atrasados++;
        }
      }
    }
    
    setDashboard({
      totalPendente,
      totalPago,
      atrasados,
      totalPagamentos: pagamentosList.length
    });
  };

  const calcularRetencaoFonte = (valor, tipo) => {
    if (tipo === "Fornecedor") {
      return valor * 0.065;
    }
    return 0;
  };

  const handleValorChange = (valor) => {
    const valorNum = parseFloat(valor) || 0;
    const retencao = calcularRetencaoFonte(valorNum, formData.tipo);
    const valorLiquido = valorNum - retencao;
    
    setFormData({
      ...formData,
      valor: valorNum,
      retencaoFonte: retencao,
      valorLiquido: valorLiquido
    });
  };

  const handleTipoChange = (tipo) => {
    const retencao = calcularRetencaoFonte(parseFloat(formData.valor) || 0, tipo);
    const valorLiquido = (parseFloat(formData.valor) || 0) - retencao;
    
    setFormData({
      ...formData,
      tipo: tipo,
      retencaoFonte: retencao,
      valorLiquido: valorLiquido
    });
  };

  const criarPagamento = async (e) => {
    e.preventDefault();
    
    if (!empresaSelecionada) {
      mostrarMensagem("Selecione uma empresa", "erro");
      return;
    }
    
    if (!formData.beneficiario || !formData.valor || !formData.dataVencimento) {
      mostrarMensagem("Beneficiário, valor e data de vencimento são obrigatórios", "erro");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        beneficiario: formData.beneficiario,
        valor: parseFloat(formData.valor),
        dataVencimento: new Date(formData.dataVencimento),
        tipo: formData.tipo,
        categoria: formData.tipo === "Folha Salarial" ? "Folha Salarial" : 
                   formData.tipo === "Fornecedor" ? "Fornecedor" : "Operacional",
        formaPagamento: formData.formaPagamento,
        contaDebito: formData.contaDebito,
        observacao: formData.observacao,
        empresaId: empresaSelecionada,
        retencaoFonte: formData.retencaoFonte,
        valorLiquido: formData.valorLiquido
      };
      
      const response = await fetch(`${BASE_URL}/api/pagamentos`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        mostrarMensagem("Pagamento criado com sucesso!", "sucesso");
        setMostrarFormulario(false);
        resetForm();
        setRecarregar(!recarregar);
        
        setTimeout(() => {
          window.location.href = '/controlo-pagamento';
        }, 100);
      } else {
        mostrarMensagem(data.mensagem || "Erro ao criar pagamento", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FUNÇÃO PREPARAR PAGAMENTO - Mostra contas disponíveis antes de pagar
  const prepararPagamento = async (pagamento) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/pagamentos/preparar-pagamento?id=${pagamento._id}&empresaId=${empresaSelecionada}`, {
        headers: getHeaders()
      });
      
      const data = await response.json();
      
      if (data.sucesso) {
        setPagamentoParaPagar(data.dados.pagamento);
        setContasDisponiveis(data.dados.contasDisponiveis);
        setMostrarModalContas(true);
        if (mostrarModal) setMostrarModal(false);
      } else {
        mostrarMensagem(data.mensagem || "Erro ao preparar pagamento", "erro");
      }
    } catch (error) {
      console.error("Erro ao preparar pagamento:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FUNÇÃO PROCESSAR PAGAMENTO - Executa o pagamento na conta selecionada
  const processarPagamentoSelecionado = async (contaSelecionada) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/pagamentos/processar-pagamento/${pagamentoParaPagar._id}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          contaDebito: contaSelecionada.codNome,
          contaDebitoId: contaSelecionada._id,
          ibanDebito: contaSelecionada.iban,
          empresaId: empresaSelecionada
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        mostrarMensagem(data.mensagem, "sucesso");
        setMostrarModalContas(false);
        setPagamentoParaPagar(null);
        setContasDisponiveis([]);
        setRecarregar(!recarregar);
      } else {
        mostrarMensagem(data.mensagem || "Erro ao processar pagamento", "erro");
      }
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setLoading(false);
    }
  };

  const cancelarPagamento = async (pagamento) => {
    if (!isGestor()) {
      mostrarMensagem("Apenas gestores podem cancelar pagamentos", "erro");
      return;
    }
    
    const motivo = prompt("Informe o motivo do cancelamento:", "Cancelamento solicitado");
    if (!motivo) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/pagamentos/${pagamento._id}/status`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ 
          status: "Cancelado",
          motivoStatus: motivo
        })
      });
      
      if (response.ok) {
        mostrarMensagem(`Pagamento ${pagamento.referencia} cancelado!`, "sucesso");
        setRecarregar(!recarregar);
        if (mostrarModal) setMostrarModal(false);
      } else {
        const data = await response.json();
        mostrarMensagem(data.mensagem || "Erro ao cancelar", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setLoading(false);
    }
  };

  const emitirRecibo = async (pagamento) => {
  setLoading(true);
  try {
    console.log("=== EMITINDO RECIBO ===");
    console.log("isTecnico:", isTecnico());
    console.log("Empresas no state:", empresas.length);
    
    let empresaData = null;
    
    const formatarEndereco = (endereco) => {
      if (!endereco) return "Endereço não cadastrado";
      if (typeof endereco === 'string') return endereco;
      if (typeof endereco === 'object') {
        const partes = [
          endereco.rua,
          endereco.numero,
          endereco.bairro,
          endereco.cidade,
          endereco.provincia,
          endereco.pais
        ].filter(p => p && p !== 'null' && p !== 'undefined' && p !== '');
        return partes.length > 0 ? partes.join(', ') : "Endereço não cadastrado";
      }
      return "Endereço não cadastrado";
    };
    
    if (empresas.length > 0) {
      if (isTecnico()) {
        empresaData = empresas[0];
        console.log("✅ Empresa do técnico encontrada no state:", empresaData?.nome);
      } else {
        empresaData = empresas.find(e => e._id === empresaSelecionada);
        console.log("✅ Empresa do gestor encontrada no state:", empresaData?.nome);
      }
    }
    
    if (!empresaData && isTecnico() && userEmpresaId) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${BASE_URL}/api/empresa/tecnico/empresa`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          empresaData = data.dados || data;
          console.log("✅ Empresa do técnico encontrada via API:", empresaData?.nome);
        }
      } catch (err) {
        console.error("❌ Erro na requisição API:", err);
      }
    }
    
    const empresaFinal = empresaData || {
      nome: "EMPRESA",
      nif: "---",
      endereco: "Endereço não cadastrado"
    };
    
    const dataPagamento = pagamento.dataPagamento 
      ? new Date(pagamento.dataPagamento).toLocaleDateString("pt-AO") 
      : new Date().toLocaleDateString("pt-AO");
    
    const recibo = {
      numero: `REC-${pagamento.referencia || pagamento._id}`,
      data: new Date().toLocaleDateString("pt-AO"),
      empresa: {
        nome: empresaFinal.nome || "EMPRESA",
        nif: empresaFinal.nif || "---",
        endereco: formatarEndereco(empresaFinal.endereco)
      },
      beneficiario: pagamento.beneficiario,
      valor: pagamento.valor,
      valorLiquido: pagamento.valorLiquido || pagamento.valor,
      retencaoFonte: pagamento.retencaoFonte || 0,
      descricao: pagamento.descricao || `Pagamento referente a ${pagamento.tipo}`,
      referencia: pagamento.referencia,
      dataPagamento: dataPagamento,
      usuario: user?.nome || "Sistema"
    };
    
    setReciboData(recibo);
    setMostrarRecibo(true);
  } catch (error) {
    console.error("❌ Erro ao emitir recibo:", error);
    mostrarMensagem("Erro ao emitir recibo: " + error.message, "erro");
  } finally {
    setLoading(false);
  }
};

  const resetForm = () => {
    setFormData({
      beneficiario: "",
      valor: "",
      dataVencimento: "",
      status: "Pendente",
      observacao: "",
      tipo: "Outro",
      categoria: "Operacional",
      formaPagamento: "Transferência Bancária",
      contaDebito: "",
      retencaoFonte: 0,
      valorLiquido: 0
    });
  };

  const exportarPDF = async (elementId, nomeArquivo) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    setLoading(true);
    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`${nomeArquivo}.pdf`);
      mostrarMensagem("Documento exportado com sucesso!", "sucesso");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      mostrarMensagem("Erro ao exportar documento", "erro");
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

  const getStatusConfig = (status) => {
    const configs = {
      "Pago": { icon: <CheckCircle size={16} />, color: "bg-green-600", textColor: "text-green-400" },
      "Pendente": { icon: <Clock size={16} />, color: "bg-yellow-600", textColor: "text-yellow-400" },
      "Atrasado": { icon: <AlertCircle size={16} />, color: "bg-red-600", textColor: "text-red-400" },
      "Cancelado": { icon: <Ban size={16} />, color: "bg-gray-600", textColor: "text-gray-400" },
      default: { icon: <Clock size={16} />, color: "bg-gray-600", textColor: "text-gray-400" }
    };
    return configs[status] || configs.default;
  };

  const pagamentosFiltrados = pagamentos.filter(p => {
    const matchTexto = pesquisaTexto === "" || 
      (p.beneficiario && p.beneficiario.toLowerCase().includes(pesquisaTexto.toLowerCase())) ||
      (p.referencia && p.referencia.toLowerCase().includes(pesquisaTexto.toLowerCase()));
    return matchTexto;
  });

  const indexInicial = (paginaActual - 1) * pagamentosPorPagina;
  const pagamentosVisiveis = pagamentosFiltrados.slice(indexInicial, indexInicial + pagamentosPorPagina);
  const paginasTotal = Math.ceil(pagamentosFiltrados.length / pagamentosPorPagina);

  if (loadingEmpresas) {
    return (
      <Layout title="Controlo de Pagamentos" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Controlo de Pagamentos" showBackButton={true} backToRoute="/menu">
      {mensagem.texto && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
          } text-white text-sm whitespace-nowrap`}>
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
          onRefresh={() => { setRecarregar(!recarregar); }}
          loading={loadingEmpresas}
        />

        {!empresaSelecionada ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <Building2 className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">
              {isTecnico() ? "Carregando sua empresa..." : "Selecione uma empresa para começar"}
            </p>
          </div>
        ) : (
          <>
            {isTecnico() && (
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <Info size={18} />
                  <span className="text-sm">Técnicos podem criar pagamentos e marcar como Pago. Cancelamento apenas para Gestores.</span>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-5 border border-blue-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-3 rounded-full">
                    <DollarSign className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="text-blue-300 text-sm">Saldo Disponível</p>
                    <p className="text-3xl font-bold text-white">{formatarNumero(saldoDisponivel)} Kz</p>
                  </div>
                </div>
                <button onClick={carregarSaldoDisponivel} className="text-gray-400 hover:text-white">
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <button onClick={() => setRecarregar(!recarregar)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <RefreshCw size={18} /> Atualizar
              </button>
              <button onClick={() => setMostrarFormulario(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center gap-2">
                <Plus size={18} /> Novo Pagamento
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                <DollarSign className="mx-auto mb-2 text-yellow-400" size={24} />
                <p className="text-2xl font-bold text-yellow-400">{formatarNumero(dashboard.totalPendente)} Kz</p>
                <p className="text-xs text-gray-400">Total Pendente</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                <CheckCircle className="mx-auto mb-2 text-green-400" size={24} />
                <p className="text-2xl font-bold text-green-400">{formatarNumero(dashboard.totalPago)} Kz</p>
                <p className="text-xs text-gray-400">Total Pago</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                <AlertCircle className="mx-auto mb-2 text-red-400" size={24} />
                <p className="text-2xl font-bold text-red-400">{dashboard.atrasados || 0}</p>
                <p className="text-xs text-gray-400">Pagamentos Atrasados</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                <FileText className="mx-auto mb-2 text-blue-400" size={24} />
                <p className="text-2xl font-bold text-blue-400">{dashboard.totalPagamentos}</p>
                <p className="text-xs text-gray-400">Total de Pagamentos</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input type="text" placeholder="Pesquisar beneficiário" value={pesquisaTexto} onChange={e => setPesquisaTexto(e.target.value)}
                    className="w-full pl-10 p-2 rounded bg-gray-700 text-white" />
                </div>
                <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="p-2 rounded bg-gray-700 text-white">
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="p-2 rounded bg-gray-700 text-white">
                  {tipoOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="date" placeholder="Data inicial" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)}
                    className="flex-1 p-2 rounded bg-gray-700 text-white" />
                  <input type="date" placeholder="Data final" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)}
                    className="flex-1 p-2 rounded bg-gray-700 text-white" />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin mx-auto text-blue-400" size={40} />
                <p className="text-gray-400 mt-2">Carregando pagamentos...</p>
              </div>
            ) : pagamentosVisiveis.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagamentosVisiveis.map((pagamento) => {
                  const statusConfig = getStatusConfig(pagamento.status);
                  const isAtrasado = pagamento.status === "Pendente" && new Date(pagamento.dataVencimento) < new Date();
                  
                  return (
                    <div key={pagamento._id} className="bg-gray-800 rounded-lg border border-gray-700 hover:shadow-lg transition cursor-pointer"
                      onClick={() => { setPagamentoSelecionado(pagamento); setMostrarModal(true); }}>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-bold text-white">{pagamento.beneficiario}</h3>
                          <span className={`${statusConfig.color} text-white px-2 py-1 rounded-full text-xs flex items-center gap-1`}>
                            {statusConfig.icon} {pagamento.status}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-blue-400 mb-2">{formatarNumero(pagamento.valor)} Kz</p>
                        
                        {pagamento.retencaoFonte > 0 && (
                          <p className="text-sm text-orange-400 mb-1">
                            Retenção Fonte: {formatarNumero(pagamento.retencaoFonte)} Kz (6.5%)
                          </p>
                        )}
                        
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-400 flex items-center gap-2">
                            <Calendar size={14} />
                            Vencimento: {formatarData(pagamento.dataVencimento)}
                            {isAtrasado && <span className="text-red-400 text-xs ml-2">(Atrasado)</span>}
                          </p>
                          {pagamento.dataPagamento && (
                            <p className="text-gray-400 flex items-center gap-2">
                              <CheckCircle size={14} />
                              Pago em: {formatarData(pagamento.dataPagamento)}
                            </p>
                          )}
                          <p className="text-gray-400 text-xs">Ref: {pagamento.referencia}</p>
                          <p className="text-gray-400 text-xs">Tipo: {pagamento.tipo}</p>
                        </div>
                        
                        <div className="mt-4 flex gap-2 flex-wrap">
                          {pagamento.status === "Pago" && (
                            <button onClick={(e) => { e.stopPropagation(); emitirRecibo(pagamento); }}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs transition flex items-center justify-center gap-1">
                              <Receipt size={12} /> Recibo
                            </button>
                          )}
                          
                          {/* 🔥 BOTÃO PAGAR ATUALIZADO - Chama prepararPagamento */}
                          {pagamento.status === "Pendente" && (
                            <button onClick={(e) => { e.stopPropagation(); prepararPagamento(pagamento); }}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition flex items-center justify-center gap-1">
                              <CheckCircle size={12} /> Pagar
                            </button>
                          )}
                          
                          {isGestor() && pagamento.status === "Pendente" && (
                            <button onClick={(e) => { e.stopPropagation(); cancelarPagamento(pagamento); }}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition">
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                <ShieldCheck className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">Nenhum pagamento encontrado.</p>
              </div>
            )}

            {paginasTotal > 1 && (
              <div className="flex justify-between items-center">
                <button onClick={() => setPaginaActual(paginaActual - 1)} disabled={paginaActual === 1}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2">
                  <ChevronLeft size={18} /> Anterior
                </button>
                <span className="text-sm text-gray-300">Página {paginaActual} de {paginasTotal}</span>
                <button onClick={() => setPaginaActual(paginaActual + 1)} disabled={paginaActual === paginasTotal}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2">
                  Próxima <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Novo Pagamento - MANTIDO ORIGINAL */}
      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg"><Plus className="text-white" size={20} /></div>
                  <h2 className="text-xl font-bold text-white">Novo Pagamento</h2>
                </div>
                <button onClick={() => { setMostrarFormulario(false); resetForm(); }} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={criarPagamento} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Beneficiário *</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.beneficiario} onChange={(e) => setFormData({...formData, beneficiario: e.target.value})} required />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Valor (Kz) *</label>
                  <input type="number" step="0.01" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white text-right"
                    value={formData.valor} onChange={(e) => handleValorChange(e.target.value)} required />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Data de Vencimento *</label>
                  <input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.dataVencimento} onChange={(e) => setFormData({...formData, dataVencimento: e.target.value})} required />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.tipo} onChange={(e) => handleTipoChange(e.target.value)}>
                    {tipoOptions.filter(t => t !== "Todos").map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                
                {formData.tipo === "Fornecedor" && formData.retencaoFonte > 0 && (
                  <div className="bg-orange-600/10 rounded-lg p-3 border border-orange-500/30">
                    <div className="flex justify-between items-center">
                      <span className="text-orange-400 text-sm">Retenção na Fonte (6.5%):</span>
                      <span className="text-orange-400 font-bold">{formatarNumero(formData.retencaoFonte)} Kz</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-gray-400 text-sm">Valor Líquido a Pagar:</span>
                      <span className="text-green-400 font-bold">{formatarNumero(formData.valorLiquido)} Kz</span>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Forma de Pagamento</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.formaPagamento} onChange={(e) => setFormData({...formData, formaPagamento: e.target.value})}>
                    {formaPagamentoOptions.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Conta para Débito</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.contaDebito} onChange={(e) => setFormData({...formData, contaDebito: e.target.value})}>
                    <option value="">Selecione uma conta</option>
                    {contasDebito.map(conta => (
                      <option key={conta.codNome} value={conta.codNome}>
                        {conta.nome} ({conta.codNome}) - Saldo: {formatarNumero(conta.saldoDisponivel)} Kz
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                  <textarea rows={2} className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none"
                    value={formData.observacao} onChange={(e) => setFormData({...formData, observacao: e.target.value})} />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                    {loading ? "Processando..." : "Criar Pagamento"}
                  </button>
                  <button type="button" onClick={() => { setMostrarFormulario(false); resetForm(); }} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes - MANTIDO ORIGINAL (com botão Pagar atualizado) */}
      {mostrarModal && pagamentoSelecionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Detalhes do Pagamento</h2>
              <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div><p className="text-sm text-gray-400">Referência</p><p className="font-semibold text-white">{pagamentoSelecionado.referencia}</p></div>
              <div><p className="text-sm text-gray-400">Beneficiário</p><p className="font-semibold text-white">{pagamentoSelecionado.beneficiario}</p></div>
              <div><p className="text-sm text-gray-400">Valor Bruto</p><p className="font-bold text-2xl text-blue-400">{formatarNumero(pagamentoSelecionado.valor)} Kz</p></div>
              
              {pagamentoSelecionado.retencaoFonte > 0 && (
                <>
                  <div><p className="text-sm text-gray-400">Retenção na Fonte (6.5%)</p><p className="font-semibold text-orange-400">{formatarNumero(pagamentoSelecionado.retencaoFonte)} Kz</p></div>
                  <div><p className="text-sm text-gray-400">Valor Líquido</p><p className="font-bold text-green-400">{formatarNumero(pagamentoSelecionado.valorLiquido)} Kz</p></div>
                </>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-400">Vencimento</p><p className="font-semibold text-white">{formatarData(pagamentoSelecionado.dataVencimento)}</p></div>
                <div><p className="text-sm text-gray-400">Pagamento</p><p className="font-semibold text-white">{formatarData(pagamentoSelecionado.dataPagamento) || "—"}</p></div>
              </div>
              <div><p className="text-sm text-gray-400">Status</p><span className={`${getStatusConfig(pagamentoSelecionado.status).color} text-white px-3 py-1 rounded-full text-sm inline-flex items-center gap-2`}>
                {getStatusConfig(pagamentoSelecionado.status).icon} {pagamentoSelecionado.status}</span></div>
              {pagamentoSelecionado.motivoStatus && (
                <div><p className="text-sm text-gray-400">Motivo</p><p className="text-white text-sm">{pagamentoSelecionado.motivoStatus}</p></div>
              )}
              <div className="flex gap-2 pt-4">
                {pagamentoSelecionado.status === "Pago" && (
                  <button onClick={() => { emitirRecibo(pagamentoSelecionado); setMostrarModal(false); }}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold flex items-center justify-center gap-2">
                    <Receipt size={18} /> Emitir Recibo
                  </button>
                )}
                {/* 🔥 BOTÃO PAGAR ATUALIZADO NO MODAL */}
                {pagamentoSelecionado.status === "Pendente" && (
                  <button onClick={() => { prepararPagamento(pagamentoSelecionado); setMostrarModal(false); }}
                    className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg font-semibold flex items-center justify-center gap-2">
                    <CheckCircle size={18} /> Pagar
                  </button>
                )}
                {isGestor() && pagamentoSelecionado.status === "Pendente" && (
                  <button onClick={() => { cancelarPagamento(pagamentoSelecionado); setMostrarModal(false); }}
                    className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold">Cancelar</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 NOVO MODAL PARA SELECIONAR CONTA DE DÉBITO */}
      {mostrarModalContas && pagamentoParaPagar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <DollarSign className="text-blue-400" size={24} />
                <h2 className="text-xl font-bold text-white">Efetuar Pagamento</h2>
              </div>
              <button onClick={() => setMostrarModalContas(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Beneficiário</p>
                <p className="font-semibold text-white text-lg">{pagamentoParaPagar.beneficiario}</p>
                
                <p className="text-sm text-gray-400 mt-3">Valor</p>
                <p className="font-bold text-2xl text-blue-400">{pagamentoParaPagar.valorFormatado}</p>
                
                <p className="text-sm text-gray-400 mt-3">Referência</p>
                <p className="font-mono text-sm text-gray-300">{pagamentoParaPagar.referencia}</p>
                
                {pagamentoParaPagar.descricao && (
                  <>
                    <p className="text-sm text-gray-400 mt-3">Descrição</p>
                    <p className="text-sm text-gray-300">{pagamentoParaPagar.descricao}</p>
                  </>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Selecione a conta para débito:
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {contasDisponiveis.map((conta) => (
                    <button
                      key={conta.codNome}
                      onClick={() => processarPagamentoSelecionado(conta)}
                      disabled={!conta.temSaldoSuficiente}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        conta.temSaldoSuficiente
                          ? "bg-gray-700 hover:bg-gray-600 cursor-pointer border border-gray-600"
                          : "bg-gray-800/50 opacity-50 cursor-not-allowed border border-red-500/30"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-white">{conta.nome}</p>
                          <p className="text-xs text-gray-400">{conta.codNome}</p>
                          {conta.iban && (
                            <p className="text-xs text-gray-500 font-mono">IBAN: {conta.iban.substring(0, 15)}...</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${conta.temSaldoSuficiente ? "text-green-400" : "text-red-400"}`}>
                            {conta.saldoFormatado}
                          </p>
                          {!conta.temSaldoSuficiente && (
                            <p className="text-xs text-red-400">Saldo insuficiente</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-400 flex items-center gap-1">
                  <Info size={14} />
                  O pagamento será debitado da conta selecionada e registado automaticamente no extrato bancário.
                </p>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-700 flex gap-2">
              <button
                onClick={() => setMostrarModalContas(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recibo - MANTIDO ORIGINAL */}
      {mostrarRecibo && reciboData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 p-4 rounded-t-lg flex justify-between items-center sticky top-0">
              <h2 className="text-xl font-bold text-white">Recibo de Pagamento</h2>
              <button onClick={() => setMostrarRecibo(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
            </div>
            <div id="recibo-imprimir" className="p-8 bg-white" style={{ color: '#000000' }}>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">{reciboData.empresa?.nome || "EMPRESA"}</h1>
                <p className="text-sm text-gray-600">NIF: {reciboData.empresa?.nif || "---"}</p>
                <p className="text-sm text-gray-600">
                  {typeof reciboData.empresa?.endereco === 'object' 
                    ? `${reciboData.empresa.endereco.rua || ''}, ${reciboData.empresa.endereco.numero || ''}, ${reciboData.empresa.endereco.bairro || ''}, ${reciboData.empresa.endereco.cidade || ''}`
                    : reciboData.empresa?.endereco || "Endereço não cadastrado"}
                </p>
                <div className="border-t-2 border-gray-300 my-4"></div>
                <h2 className="text-xl font-bold text-gray-800">RECIBO Nº {reciboData.numero}</h2>
                <p className="text-sm text-gray-500">Data de Emissão: {reciboData.data}</p>
              </div>

              <div className="border border-gray-300 rounded-lg p-6 my-6 bg-gray-50">
                <div className="space-y-4">
                  <p className="text-gray-800"><strong>Pagamento efetuado a:</strong> <span className="ml-2">{reciboData.beneficiario}</span></p>
                  <p className="text-gray-800"><strong>Valor Bruto:</strong> <span className="ml-2 text-blue-600 font-bold text-lg">{formatarNumero(reciboData.valor)} Kz</span></p>
                  {reciboData.retencaoFonte > 0 && (
                    <>
                      <p className="text-gray-800"><strong>Retenção na Fonte (6.5%):</strong> <span className="ml-2 text-orange-600">{formatarNumero(reciboData.retencaoFonte)} Kz</span></p>
                      <p className="text-gray-800"><strong>Valor Líquido Pago:</strong> <span className="ml-2 text-green-600 font-bold text-lg">{formatarNumero(reciboData.valorLiquido)} Kz</span></p>
                    </>
                  )}
                  <p className="text-gray-800"><strong>Referente a:</strong> <span className="ml-2">{reciboData.descricao}</span></p>
                  <p className="text-gray-800"><strong>Referência:</strong> <span className="ml-2">{reciboData.referencia}</span></p>
                  <p className="text-gray-800"><strong>Data do Pagamento:</strong> <span className="ml-2">{reciboData.dataPagamento}</span></p>
                </div>
              </div>

              <div className="flex justify-center my-6">
                <div className="bg-white p-2 rounded-lg shadow-md">
                  <QRCode value={`Recibo ${reciboData.numero}\nEmpresa: ${reciboData.empresa?.nome}\nValor: ${formatarNumero(reciboData.valor)} Kz\nBeneficiário: ${reciboData.beneficiario}`} size={130} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mt-8 pt-8">
                <div className="text-center">
                  <div className="border-t-2 border-gray-400 pt-2">
                    <p className="text-sm font-medium text-gray-700">Assinatura do Responsável</p>
                    <p className="text-xs text-gray-500 mt-1">{reciboData.usuario}</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t-2 border-gray-400 pt-2">
                    <p className="text-sm font-medium text-gray-700">Carimbo da Empresa</p>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-gray-400 mt-8 pt-4 border-t border-gray-200">
                <p>Documento emitido eletronicamente - Sistema de Gestão Empresarial</p>
                <p>Este documento é válido como comprovante de pagamento</p>
              </div>
            </div>
            <div className="p-4 bg-gray-100 rounded-b-lg flex gap-2 sticky bottom-0">
              <button onClick={() => exportarPDF("recibo-imprimir", `recibo_${reciboData.referencia}`)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2">
                <Download size={18} /> Exportar PDF
              </button>
              <button onClick={() => setMostrarRecibo(false)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-semibold">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out { animation: fade-in-out 2.5s ease forwards; }
      `}</style>
    </Layout>
  );
};

export default ControloPagamento;