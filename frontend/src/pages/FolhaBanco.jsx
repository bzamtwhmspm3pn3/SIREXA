// src/pages/FolhaBanco.jsx - VERSÃO COMPLETAMENTE CORRIGIDA
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle, AlertCircle, Upload, Plus, Download, Zap,
  Building2, RefreshCw, 
  Filter, X, Loader2, FileText,
  ChevronLeft, ChevronRight, CreditCard, Edit, Trash2,
  Landmark
} from "lucide-react";

const FolhaBanco = () => {
  const navigate = useNavigate();
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [bancos, setBancos] = useState([]);
  const [bancoSelecionado, setBancoSelecionado] = useState("");
  const [registos, setRegistos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [estatisticas, setEstatisticas] = useState({
    totalRegistos: 0, reconciliados: 0, pendentes: 0, percentualReconciliado: 0,
    totalEntradas: 0, totalSaidas: 0, saldoAtual: 0, saldoInicial: 0
  });
  const [mostrarUpload, setMostrarUpload] = useState(false);
  const [mostrarModalConta, setMostrarModalConta] = useState(false);
  const [editandoConta, setEditandoConta] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
  const [filtroMes, setFiltroMes] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(20);
  const [mostrarResumo, setMostrarResumo] = useState(false);
  const [resumoFinanceiro, setResumoFinanceiro] = useState(null);
  
  const [formConta, setFormConta] = useState({
    codNome: "",
    nome: "",
    iban: "",
    swift: "",
    saldoInicial: 0,
    moeda: "AOA"
  });

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                 "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const anos = [2023, 2024, 2025, 2026, 2027, 2028];

  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "0 Kz";
    return valor.toLocaleString() + " Kz";
  };

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  // Para técnico: definir empresa automaticamente
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
      carregarBancos();
    } else {
      setBancos([]);
      setBancoSelecionado("");
    }
  }, [empresaSelecionada]);

  useEffect(() => {
    if (bancoSelecionado) {
      carregarRegistos();
      carregarEstatisticas();
    }
  }, [bancoSelecionado, filtroStatus, filtroAno, filtroMes]);

  const carregarEmpresas = async () => {
    if (isTecnico()) {
      setLoadingEmpresas(false);
      return;
    }
    
    setLoadingEmpresas(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://sirexa-api.onrender.com/api/empresa", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        setEmpresas([]);
        mostrarMensagem("Acesso negado", "erro");
        return;
      }
      
      const data = await response.json();
      const empresasList = Array.isArray(data) ? data : [];
      setEmpresas(empresasList);
      
      const empresaPadrao = empresasList[0]?._id || user?.empresaId;
      if (empresaPadrao && !empresaSelecionada) {
        setEmpresaSelecionada(empresaPadrao);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      mostrarMensagem("Erro ao carregar empresas", "erro");
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarBancos = async () => {
    if (!empresaSelecionada) {
      setBancos([]);
      setBancoSelecionado("");
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = `https://sirexa-api.onrender.com/api/bancos?empresaId=${empresaSelecionada}`;
      
      const response = await fetch(url, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      let bancosList = [];
      
      if (Array.isArray(data)) {
        bancosList = data;
      } else if (data.dados && Array.isArray(data.dados)) {
        bancosList = data.dados;
      }
      
      bancosList = bancosList.filter(banco => banco && banco._id);
      setBancos(bancosList);
      
      if (bancosList.length > 0) {
        const bancoAindaExiste = bancosList.some(b => b._id === bancoSelecionado);
        if (!bancoAindaExiste || !bancoSelecionado) {
          setBancoSelecionado(bancosList[0]._id);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar bancos:", error);
      mostrarMensagem("Erro ao carregar contas bancárias", "erro");
    } finally {
      setLoading(false);
    }
  };

  const carregarRegistos = async () => {
    if (!bancoSelecionado) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = `https://sirexa-api.onrender.com/api/reconciliacao/registos?empresaId=${empresaSelecionada}&contaId=${bancoSelecionado}`;
      if (filtroStatus !== "") url += `&reconcilado=${filtroStatus === "reconciliado"}`;
      if (filtroAno) url += `&ano=${filtroAno}`;
      if (filtroMes) url += `&mes=${filtroMes}`;
      
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        setRegistos([]);
        mostrarMensagem("Acesso negado", "erro");
        return;
      }
      
      const data = await response.json();
      let registosList = Array.isArray(data) ? data : (data.dados || []);
      
      // Ordenar por data
      registosList = registosList.sort((a, b) => new Date(a.data) - new Date(b.data));
      
      // Calcular saldo acumulado para cada registo (incluindo saldo inicial)
      const bancoAtual = bancos.find(b => b._id === bancoSelecionado);
      let saldoAcumulado = bancoAtual?.saldoInicial || estatisticas.saldoAtual || 0;
      
      const registosComSaldo = registosList.map(reg => {
        if (reg.entradaSaida === 'entrada') {
          saldoAcumulado += reg.valor;
        } else if (reg.entradaSaida === 'saida') {
          saldoAcumulado -= reg.valor;
        }
        return { ...reg, saldoAcumulado: saldoAcumulado };
      });
      
      setRegistos(registosComSaldo);
    } catch (error) {
      console.error("Erro ao carregar registos:", error);
      setRegistos([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarEstatisticas = async () => {
    if (!bancoSelecionado) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/reconciliacao/estatisticas?empresaId=${empresaSelecionada}&contaId=${bancoSelecionado}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) return;
      
      const data = await response.json();
      setEstatisticas({
        totalRegistos: data.totalRegistos || 0,
        reconciliados: data.reconciliados || 0,
        pendentes: data.pendentes || 0,
        percentualReconciliado: data.percentualReconciliado || 0,
        totalEntradas: data.totalEntradas || 0,
        totalSaidas: data.totalSaidas || 0,
        saldoAtual: data.saldoAtual || 0,
        saldoInicial: data.saldoInicial || 0
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const salvarConta = async () => {
    if (!formConta.codNome || !formConta.nome) {
      mostrarMensagem("Código e Nome da conta são obrigatórios", "erro");
      return;
    }

    if (!empresaSelecionada) {
      mostrarMensagem("Selecione uma empresa primeiro", "erro");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      const url = editandoConta 
        ? `https://sirexa-api.onrender.com/api/bancos/${editandoConta}?empresaId=${empresaSelecionada}` 
        : `https://sirexa-api.onrender.com/api/bancos?empresaId=${empresaSelecionada}`;
      
      const method = editandoConta ? "PUT" : "POST";

      const dadosEnvio = {
        codNome: formConta.codNome.toUpperCase(),
        nome: formConta.nome,
        iban: formConta.iban || "",
        swift: formConta.swift ? formConta.swift.toUpperCase() : "",
        saldoInicial: formConta.saldoInicial || 0,
        moeda: formConta.moeda,
        empresaId: empresaSelecionada
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(dadosEnvio)
      });

      const result = await response.json();

      if (response.ok) {
        mostrarMensagem(editandoConta ? "✅ Conta atualizada!" : "✅ Conta cadastrada!", "sucesso");
        setMostrarModalConta(false);
        resetFormConta();
        await carregarBancos();
      } else {
        mostrarMensagem(result.mensagem || "Erro ao salvar conta", "erro");
      }
    } catch (error) {
      console.error("Erro ao salvar conta:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setLoading(false);
    }
  };

  const excluirConta = async (id) => {
    if (!window.confirm("⚠️ Tem certeza que deseja excluir esta conta?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/bancos/${id}?empresaId=${empresaSelecionada}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        mostrarMensagem("✅ Conta excluída!", "sucesso");
        if (bancoSelecionado === id) setBancoSelecionado("");
        await carregarBancos();
      } else {
        const result = await response.json();
        mostrarMensagem(result.mensagem || "Erro ao excluir", "erro");
      }
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      mostrarMensagem("Erro ao conectar", "erro");
    }
  };

  const editarConta = (conta) => {
    setEditandoConta(conta._id);
    setFormConta({
      codNome: conta.codNome,
      nome: conta.nome,
      iban: conta.iban || "",
      swift: conta.swift || "",
      saldoInicial: conta.saldoInicial || 0,
      moeda: conta.moeda || "AOA"
    });
    setMostrarModalConta(true);
  };

  const resetFormConta = () => {
    setEditandoConta(null);
    setFormConta({
      codNome: "",
      nome: "",
      iban: "",
      swift: "",
      saldoInicial: 0,
      moeda: "AOA"
    });
  };

  const reconciliarAutomatico = async () => {
    if (!bancoSelecionado) {
      mostrarMensagem("Selecione uma conta primeiro", "erro");
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/reconciliacao/reconciliar-automatico`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ empresaId: empresaSelecionada, contaId: bancoSelecionado })
      });
      const data = await response.json();
      if (data.sucesso) {
        mostrarMensagem(data.mensagem || "✅ Reconciliação concluída!", "sucesso");
        // 🔧 Redirecionamento após sucesso
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        mostrarMensagem(data.mensagem || "Erro na reconciliação", "erro");
      }
    } catch (error) {
      mostrarMensagem("Erro ao reconciliar", "erro");
    } finally {
      setLoading(false);
    }
  };

  const reconciliarLancamento = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/reconciliacao/registos/${id}/reconciliar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ reconcilado: true })
      });
      
      if (response.ok) {
        mostrarMensagem("✅ Lançamento reconciliado!", "sucesso");
        await carregarRegistos();
        await carregarEstatisticas();
      } else {
        const data = await response.json();
        mostrarMensagem(data.mensagem || "Erro ao reconciliar", "erro");
      }
    } catch (error) {
      mostrarMensagem("Erro ao reconciliar", "erro");
    }
  };

  const desfazerReconciliacao = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/reconciliacao/registos/${id}/desfazer-reconciliacao`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        mostrarMensagem("🔄 Reconciliação desfeita!", "sucesso");
        await carregarRegistos();
        await carregarEstatisticas();
      } else {
        const data = await response.json();
        mostrarMensagem(data.mensagem || "Erro ao desfazer", "erro");
      }
    } catch (error) {
      mostrarMensagem("Erro ao desfazer reconciliação", "erro");
    }
  };

  const importarPDF = async () => {
    if (!uploadFile) {
      mostrarMensagem("Selecione um arquivo PDF", "erro");
      return;
    }
    
    if (!bancoSelecionado) {
      mostrarMensagem("Selecione uma conta primeiro", "erro");
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append("arquivo", uploadFile);
    formData.append("contaId", bancoSelecionado);
    formData.append("empresaId", empresaSelecionada);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/reconciliacao/importar-pdf`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (data.sucesso) {
        mostrarMensagem("✅ Extrato importado!", "sucesso");
        setMostrarUpload(false);
        setUploadFile(null);
        await carregarRegistos();
        await carregarEstatisticas();
      } else {
        mostrarMensagem(data.mensagem || "Erro ao importar", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao importar PDF", "erro");
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    if (registos.length === 0) {
      mostrarMensagem("Nenhum registo para exportar", "erro");
      return;
    }

    const cabecalhos = ["Data", "Descrição", "Tipo", "Entrada (Kz)", "Saída (Kz)", "Saldo (Kz)", "Status"];
    const linhas = registos.map(r => [
      new Date(r.data).toLocaleDateString('pt-PT'),
      r.descricao,
      r.tipo,
      r.entradaSaida === 'entrada' ? r.valor.toLocaleString() : "",
      r.entradaSaida === 'saida' ? r.valor.toLocaleString() : "",
      r.saldoAcumulado ? r.saldoAcumulado.toLocaleString() : "",
      r.reconcilado ? "Reconciliado" : "Pendente"
    ]);
    
    const csvContent = [cabecalhos, ...linhas]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `reconciliacao_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    mostrarMensagem("✅ Exportado!", "sucesso");
  };

  const bancoAtual = bancos.find(b => b._id === bancoSelecionado);

  const indexOfLastItem = paginaAtual * itensPorPagina;
  const indexOfFirstItem = indexOfLastItem - itensPorPagina;
  const currentItems = registos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPaginas = Math.ceil(registos.length / itensPorPagina);

  if (loadingEmpresas) {
    return (
      <Layout title="Reconciliação Bancária" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin mx-auto text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Reconciliação Bancária" showBackButton={true} backToRoute="/menu">
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

      <div className="space-y-6">
        {/* Seletor de Empresa */}
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => { carregarBancos(); }}
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
            {/* Mensagem para Técnico */}
            {isTecnico() && (
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <Building2 size={18} />
                  <span className="text-sm">
                    Trabalhando com a empresa: <strong>{userEmpresaNome}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Seletor de Conta Bancária */}
            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="text-blue-400" size={24} />
                  <div>
                    <h3 className="text-white font-medium">Conta Bancária</h3>
                    <p className="text-sm text-gray-400">Selecione a conta para reconciliar</p>
                  </div>
                </div>
                <div className="flex flex-1 gap-2">
                  <div className="flex-1 max-w-md">
                    {bancos.length === 0 ? (
                      <div className="text-yellow-400 text-sm p-3 bg-yellow-600/10 rounded-xl">
                        ⚠️ Nenhuma conta cadastrada. Clique em "Nova Conta".
                      </div>
                    ) : (
                      <select 
                        className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white" 
                        value={bancoSelecionado || ""} 
                        onChange={(e) => setBancoSelecionado(e.target.value)}
                      >
                        <option value="">Selecione uma conta</option>
                        {bancos.map(b => (
                          <option key={b._id} value={b._id}>
                            {b.nome} - {b.codNome}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <button 
                    onClick={() => { resetFormConta(); setMostrarModalConta(true); }} 
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 rounded-xl transition flex items-center gap-2"
                  >
                    <Plus size={18} /> Nova Conta
                  </button>
                </div>
                <button 
                  onClick={() => carregarBancos()} 
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition"
                  title="Recarregar contas"
                >
                  <RefreshCw size={18} className="text-gray-300" />
                </button>
              </div>
              
              {/* Saldo Disponível */}
              {bancoAtual && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">💰 Saldo Disponível:</span>
                    <span className="text-lg font-bold text-green-400">{formatarMoeda(bancoAtual.saldoDisponivel || estatisticas.saldoAtual)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                    <span>Saldo Inicial: {formatarMoeda(bancoAtual.saldoInicial || 0)}</span>
                    <span>Entradas: +{formatarMoeda(estatisticas.totalEntradas)}</span>
                    <span>Saídas: -{formatarMoeda(estatisticas.totalSaidas)}</span>
                  </div>
                </div>
              )}
            </div>

            {!bancoSelecionado ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center">
                <CreditCard className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">Selecione uma conta bancária</p>
              </div>
            ) : (
              <>
                {/* Cards de Estatísticas */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-3 text-center border border-blue-500/30">
                    <p className="text-xs text-gray-400">Total Registos</p>
                    <p className="text-xl font-bold text-white">{estatisticas.totalRegistos}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-3 text-center border border-green-500/30">
                    <p className="text-xs text-gray-400">Reconciliados</p>
                    <p className="text-xl font-bold text-green-400">{estatisticas.reconciliados}</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-xl p-3 text-center border border-yellow-500/30">
                    <p className="text-xs text-gray-400">Pendentes</p>
                    <p className="text-xl font-bold text-yellow-400">{estatisticas.pendentes}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-3 text-center border border-purple-500/30">
                    <p className="text-xs text-gray-400">% Reconciliado</p>
                    <p className="text-xl font-bold text-purple-400">{estatisticas.percentualReconciliado}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 rounded-xl p-3 text-center border border-emerald-500/30">
                    <p className="text-xs text-gray-400">Entradas</p>
                    <p className="text-sm font-bold text-emerald-400">{formatarMoeda(estatisticas.totalEntradas)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-xl p-3 text-center border border-red-500/30">
                    <p className="text-xs text-gray-400">Saídas</p>
                    <p className="text-sm font-bold text-red-400">{formatarMoeda(estatisticas.totalSaidas)}</p>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setMostrarUpload(true)} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl transition flex items-center gap-2">
                    <Upload size={18} /> Importar Extrato
                  </button>
                  <button onClick={reconciliarAutomatico} disabled={loading} className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-xl transition flex items-center gap-2">
                    <Zap size={18} /> Reconciliação Automática
                  </button>
                  <button onClick={exportarCSV} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl transition flex items-center gap-2">
                    <Download size={18} /> Exportar CSV
                  </button>
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap gap-3 items-center bg-gray-800/50 rounded-xl p-3">
                  <Filter size={18} className="text-gray-400" />
                  <select className="px-3 py-2 rounded-lg bg-gray-700 text-white text-sm" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                    <option value="">Todos Status</option>
                    <option value="reconciliado">Reconciliados</option>
                    <option value="pendente">Pendentes</option>
                  </select>
                  <select className="px-3 py-2 rounded-lg bg-gray-700 text-white text-sm" value={filtroAno} onChange={(e) => setFiltroAno(parseInt(e.target.value))}>
                    {anos.map(ano => (<option key={ano} value={ano}>{ano}</option>))}
                  </select>
                  <select className="px-3 py-2 rounded-lg bg-gray-700 text-white text-sm" value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}>
                    <option value="">Todos os Meses</option>
                    {meses.map((mes, idx) => (<option key={idx} value={mes}>{mes}</option>))}
                  </select>
                </div>

                {/* Tabela de Registos com COLUNA DE SALDO */}
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto mb-4 text-blue-400" size={40} />
                    <p className="text-gray-400">Carregando...</p>
                  </div>
                ) : registos.length === 0 ? (
                  <div className="bg-gray-800 rounded-2xl p-12 text-center">
                    <FileText className="mx-auto mb-4 text-gray-500" size={48} />
                    <p className="text-gray-400 text-lg">Nenhum lançamento encontrado</p>
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-700">
                          <tr className="text-white text-sm">
                            <th className="p-3 text-center">Data</th>
                            <th className="p-3 text-left">Descrição</th>
                            <th className="p-3 text-left">Tipo</th>
                            <th className="p-3 text-right">Entrada</th>
                            <th className="p-3 text-right">Saída</th>
                            <th className="p-3 text-right">Saldo</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentItems.map((r) => (
                            <tr key={r._id} className="border-t border-gray-700 hover:bg-gray-750 transition">
                              <td className="p-3 text-center text-gray-300">{new Date(r.data).toLocaleDateString('pt-PT')}</td>
                              <td className="p-3">
                                <div className="text-white">{r.descricao}</div>
                                <div className="text-xs text-gray-500">{r.tipo}</div>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  r.entradaSaida === 'entrada' 
                                    ? 'bg-green-600/20 text-green-400' 
                                    : 'bg-red-600/20 text-red-400'
                                }`}>
                                  {r.entradaSaida === 'entrada' ? 'Entrada' : 'Saída'}
                                </span>
                              </td>
                              <td className="p-3 text-right text-green-400">
                                {r.entradaSaida === 'entrada' ? formatarMoeda(r.valor) : "—"}
                              </td>
                              <td className="p-3 text-right text-red-400">
                                {r.entradaSaida === 'saida' ? formatarMoeda(r.valor) : "—"}
                              </td>
                              <td className="p-3 text-right font-bold text-blue-400">
                                {formatarMoeda(r.saldoAcumulado || 0)}
                              </td>
                              <td className="p-3 text-center">
                                {r.reconcilado ? (
                                  <span className="text-green-400 flex items-center justify-center gap-1">
                                    <CheckCircle size={16} /> Reconciliado
                                  </span>
                                ) : (
                                  <span className="text-yellow-400 flex items-center justify-center gap-1">
                                    <AlertCircle size={16} /> Pendente
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex justify-center gap-2">
                                  {!r.reconcilado && (
                                    <button onClick={() => reconciliarLancamento(r._id)} className="p-1.5 bg-green-600/20 hover:bg-green-600/40 rounded-lg transition" title="Reconciliar">
                                      <CheckCircle size={14} className="text-green-400" />
                                    </button>
                                  )}
                                  {r.reconcilado && (
                                    <button onClick={() => desfazerReconciliacao(r._id)} className="p-1.5 bg-red-600/20 hover:bg-red-600/40 rounded-lg transition" title="Desfazer">
                                      <X size={14} className="text-red-400" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {totalPaginas > 1 && (
                      <div className="flex justify-center items-center gap-2 p-4 border-t border-gray-700">
                        <button onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="p-2 bg-gray-700 rounded-lg disabled:opacity-50">
                          <ChevronLeft size={18} />
                        </button>
                        <span className="text-gray-400">Página {paginaAtual} de {totalPaginas}</span>
                        <button onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas} className="p-2 bg-gray-700 rounded-lg disabled:opacity-50">
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Modal de Upload PDF */}
      {mostrarUpload && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-blue-400">Importar Extrato PDF</h2>
              <button onClick={() => setMostrarUpload(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-4 space-y-4">
              <input type="file" accept=".pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600" />
              <button onClick={importarPDF} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg transition disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin inline mr-2" size={18} /> : <Upload size={18} className="inline mr-2" />}
                {loading ? "Processando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conta Bancária */}
      {mostrarModalConta && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">{editandoConta ? "Editar Conta" : "Nova Conta"}</h2>
              <button onClick={() => { setMostrarModalConta(false); resetFormConta(); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-4 space-y-4">
              <input type="text" placeholder="Código (ex: BAI01)" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white uppercase" value={formConta.codNome} onChange={(e) => setFormConta({...formConta, codNome: e.target.value.toUpperCase()})} />
              <input type="text" placeholder="Nome da Conta" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formConta.nome} onChange={(e) => setFormConta({...formConta, nome: e.target.value})} />
              <input type="text" placeholder="IBAN" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white font-mono" value={formConta.iban} onChange={(e) => setFormConta({...formConta, iban: e.target.value})} />
              <input type="number" placeholder="Saldo Inicial" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white text-right" value={formConta.saldoInicial} onChange={(e) => setFormConta({...formConta, saldoInicial: parseFloat(e.target.value) || 0})} />
              <div className="flex gap-3 pt-4">
                <button onClick={salvarConta} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-xl transition">
                  {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : (editandoConta ? "Atualizar" : "Cadastrar")}
                </button>
                <button onClick={() => { setMostrarModalConta(false); resetFormConta(); }} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition">Cancelar</button>
              </div>
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
        .bg-gray-750 { background-color: #2a2a3a; }
      `}</style>
    </Layout>
  );
};

export default FolhaBanco;