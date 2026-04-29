// src/pages/GestaoAbonos.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import { 
  Plus, Edit, Trash2, Search, Gift, Calendar, Users, TrendingUp,
  X, Loader2, CheckCircle, AlertCircle, FileText, Percent,
  Coffee, Bus, Umbrella, Award, HelpCircle, DollarSign, Eye, RefreshCw,
  Building2
} from "lucide-react";

const GestaoAbonos = () => {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [abonos, setAbonos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [abonoSelecionado, setAbonoSelecionado] = useState(null);
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [recarregar, setRecarregar] = useState(false);
  const [estatisticas, setEstatisticas] = useState({
    totalAbonos: 0,
    totalValor: 0,
    subsidioAlimentacao: { total: 0, valor: 0 },
    subsidioTransporte: { total: 0, valor: 0 },
    subsidioFerias: { total: 0, valor: 0 },
    decimoTerceiro: { total: 0, valor: 0 }
  });
  
  const [formData, setFormData] = useState({
    funcionarioId: "",
    tipoAbono: "",
    valor: 0,
    descricao: "",
    motivo: "",
    dataReferencia: new Date().toISOString().split('T')[0],
    status: "Pendente",
    percentualFerias: 100,
    diasTrabalhados: 22,
    valorDiario: 2500
  });

  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();

  const tiposAbono = [
    { value: "Subsídio de Alimentação", label: "🍽️ Subsídio de Alimentação", icon: Coffee, limite: "Até 30.000 Kz isentos", cor: "blue", tributavel: false },
    { value: "Subsídio de Transporte", label: "🚌 Subsídio de Transporte", icon: Bus, limite: "Até 30.000 Kz isentos", cor: "green", tributavel: false },
    { value: "Subsídio de Férias", label: "🏖️ Subsídio de Férias", icon: Umbrella, limite: "100% tributável", cor: "red", tributavel: true },
    { value: "Décimo Terceiro", label: "🎄 Décimo Terceiro", icon: Gift, limite: "100% tributável", cor: "red", tributavel: true },
    { value: "Bónus", label: "⭐ Bónus", icon: Award, limite: "Até 5% do salário isentos", cor: "purple", tributavel: false },
    { value: "Prémio", label: "🏆 Prémio", icon: Award, limite: "Até 5% do salário isentos", cor: "orange", tributavel: false },
    { value: "Ajuda de Custo", label: "🤝 Ajuda de Custo", icon: HelpCircle, limite: "Até 5% do salário isentos", cor: "cyan", tributavel: false },
    { value: "Outro", label: "📌 Outro", icon: FileText, limite: "Até 5% do salário isentos", cor: "gray", tributavel: false }
  ];

  const statusLista = ["Pendente", "Aprovado", "Pago", "Cancelado", "Integrado"];

  // Para técnico: definir empresa automaticamente
  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  // Calcular estatísticas localmente baseado nos abonos
  useEffect(() => {
    if (abonos.length > 0) {
      const totalAbonos = abonos.length;
      const totalValor = abonos.reduce((acc, a) => acc + (a.valor || 0), 0);
      
      const alimentacaoItems = abonos.filter(a => a.tipoAbono === 'Subsídio de Alimentação');
      const subsidioAlimentacao = {
        total: alimentacaoItems.length,
        valor: alimentacaoItems.reduce((acc, a) => acc + (a.valor || 0), 0)
      };
      
      const transporteItems = abonos.filter(a => a.tipoAbono === 'Subsídio de Transporte');
      const subsidioTransporte = {
        total: transporteItems.length,
        valor: transporteItems.reduce((acc, a) => acc + (a.valor || 0), 0)
      };
      
      const feriasItems = abonos.filter(a => a.tipoAbono === 'Subsídio de Férias');
      const subsidioFerias = {
        total: feriasItems.length,
        valor: feriasItems.reduce((acc, a) => acc + (a.valor || 0), 0)
      };
      
      const decimoTerceiroItems = abonos.filter(a => a.tipoAbono === 'Décimo Terceiro');
      const decimoTerceiro = {
        total: decimoTerceiroItems.length,
        valor: decimoTerceiroItems.reduce((acc, a) => acc + (a.valor || 0), 0)
      };
      
      setEstatisticas({
        totalAbonos,
        totalValor,
        subsidioAlimentacao,
        subsidioTransporte,
        subsidioFerias,
        decimoTerceiro
      });
    } else {
      setEstatisticas({
        totalAbonos: 0,
        totalValor: 0,
        subsidioAlimentacao: { total: 0, valor: 0 },
        subsidioTransporte: { total: 0, valor: 0 },
        subsidioFerias: { total: 0, valor: 0 },
        decimoTerceiro: { total: 0, valor: 0 }
      });
    }
  }, [abonos]);

  useEffect(() => {
  if (empresaSelecionada) {
    carregarAbonos();
    carregarFuncionarios();
  } else {
    // 🔒 Limpar dados quando não há empresa selecionada
    setAbonos([]);
    setFuncionarios([]);
  }
}, [empresaSelecionada, filtroTipo, filtroStatus, paginaAtual]);

  useEffect(() => {
    if (empresaSelecionada && recarregar) {
      carregarAbonos();
      setRecarregar(false);
    }
  }, [empresaSelecionada, recarregar]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 5000);
  };

  const carregarEmpresas = async () => {
  // Se for técnico, não precisa carregar lista de empresas
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
    console.error("Erro:", error);
    mostrarMensagem("Erro ao carregar empresas", "erro");
  } finally {
    setLoadingEmpresas(false);
  }
};


 const carregarAbonos = async () => {
  if (!empresaSelecionada) {
    setAbonos([]);
    return;
  }
  
  setLoading(true);
  try {
    const token = localStorage.getItem("token");
    let url = `https://sirexa-api.onrender.com/api/abonos?empresaId=${empresaSelecionada}&page=${paginaAtual}&limit=20`;
    if (filtroTipo) url += `&tipoAbono=${filtroTipo}`;
    if (filtroStatus) url += `&status=${filtroStatus}`;
    
    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    // 🔒 Se for 403 (acesso negado), limpar empresa selecionada
    if (response.status === 403) {
      const data = await response.json();
      mostrarMensagem(data.mensagem || "Acesso negado a esta empresa", "erro");
      setEmpresaSelecionada("");
      setAbonos([]);
      return;
    }
    
    const data = await response.json();
    if (data.sucesso) {
      setAbonos(data.dados || []);
      setTotalPaginas(data.totalPaginas || 1);
    } else {
      setAbonos([]);
    }
  } catch (error) {
    console.error("Erro:", error);
    setAbonos([]);
  } finally {
    setLoading(false);
  }
};


  const carregarFuncionarios = async () => {
  if (!empresaSelecionada) {
    setFuncionarios([]);
    return;
  }
  
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`https://sirexa-api.onrender.com/api/funcionarios?empresaId=${empresaSelecionada}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (response.status === 403) {
      setFuncionarios([]);
      return;
    }
    
    const data = await response.json();
    setFuncionarios(Array.isArray(data) ? data : (data.dados || []));
  } catch (error) {
    console.error("Erro:", error);
    setFuncionarios([]);
  }
};


  const handleTipoChange = (tipo) => {
    setFormData({ ...formData, tipoAbono: tipo });
    if (tipo === 'Subsídio de Alimentação') {
      const valor = formData.diasTrabalhados * formData.valorDiario;
      setFormData(prev => ({ ...prev, tipoAbono: tipo, valor }));
    } else if (tipo === 'Subsídio de Férias') {
      const funcionario = funcionarios.find(f => f._id === formData.funcionarioId);
      if (funcionario) {
        const valor = (funcionario.salarioBase * formData.percentualFerias) / 100;
        setFormData(prev => ({ ...prev, tipoAbono: tipo, valor }));
      }
    } else if (tipo === 'Décimo Terceiro') {
      const funcionario = funcionarios.find(f => f._id === formData.funcionarioId);
      if (funcionario) {
        setFormData(prev => ({ ...prev, tipoAbono: tipo, valor: funcionario.salarioBase }));
      }
    }
  };

 const handleSubmit = async () => {
  if (!formData.funcionarioId || !formData.tipoAbono || !formData.valor) {
    mostrarMensagem("Preencha todos os campos obrigatórios", "erro");
    return;
  }
  
  setLoading(true);
  
  try {
    const token = localStorage.getItem("token");
    const url = editando ? `https://sirexa-api.onrender.com/api/abonos/${editando}` : "https://sirexa-api.onrender.com/api/abonos";
    const method = editando ? "PUT" : "POST";
    
    const payload = {
      ...formData,
      empresaId: empresaSelecionada,
      valor: parseFloat(formData.valor)
    };
    
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.mensagem || "Erro ao salvar");
    }

    const data = await response.json();
    
    if (data.sucesso) {
      mostrarMensagem(data.mensagem || (editando ? "Abono atualizado!" : "Abono registrado!"), "sucesso");
      setModalOpen(false);
      setEditando(null);
      resetForm();
      setRecarregar(true);
    } else {
      mostrarMensagem(data.mensagem || "Erro ao salvar", "erro");
    }
  } catch (error) {
    console.error("Erro:", error);
    mostrarMensagem("Erro ao conectar: " + error.message, "erro");
  } finally {
    setLoading(false);
  }
};


  const excluirAbono = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este abono?")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/abonos/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        mostrarMensagem("Abono excluído!", "sucesso");
        setRecarregar(true);
      }
    } catch (error) {
      mostrarMensagem("Erro ao excluir", "erro");
    }
  };

  const integrarFolha = async (id) => {
    if (!window.confirm("Integrar este abono à folha salarial?")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/abonos/${id}/integrar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          mesReferencia: new Date().getMonth() + 1,
          anoReferencia: new Date().getFullYear()
        })
      });
      if (response.ok) {
        mostrarMensagem("Abono integrado à folha salarial!", "sucesso");
        setRecarregar(true);
      }
    } catch (error) {
      mostrarMensagem("Erro ao integrar", "erro");
    }
  };

  const resetForm = () => {
    setFormData({
      funcionarioId: "",
      tipoAbono: "",
      valor: 0,
      descricao: "",
      motivo: "",
      dataReferencia: new Date().toISOString().split('T')[0],
      status: "Pendente",
      percentualFerias: 100,
      diasTrabalhados: 22,
      valorDiario: 2500
    });
  };

  const verDetalhes = (abono) => {
    setAbonoSelecionado(abono);
    setModalDetalhes(true);
  };

  const getStatusColor = (status) => {
    const cores = {
      'Aprovado': 'bg-green-600/20 text-green-400',
      'Pago': 'bg-blue-600/20 text-blue-400',
      'Pendente': 'bg-yellow-600/20 text-yellow-400',
      'Cancelado': 'bg-red-600/20 text-red-400',
      'Integrado': 'bg-purple-600/20 text-purple-400'
    };
    return cores[status] || 'bg-gray-600/20 text-gray-400';
  };

  const abonosFiltrados = abonos.filter(a =>
    a.funcionarioNome?.toLowerCase().includes(busca.toLowerCase()) ||
    a.tipoAbono?.toLowerCase().includes(busca.toLowerCase())
  );

  const totalValor = abonos.reduce((acc, a) => acc + (a.valor || 0), 0);
  const empresaAtual = isTecnico() 
    ? { nome: userEmpresaNome, _id: userEmpresaId }
    : empresas.find(e => e._id === empresaSelecionada);

  if (loadingEmpresas) {
    return (
      <Layout title="Gestão de Subsídios e Abonos" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin mx-auto text-blue-400" size={40} />
          <p className="text-gray-400 mt-4">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Gestão de Subsídios e Abonos" showBackButton={true} backToRoute="/menu">
      {mensagem.texto && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg animate-fade-in-out ${
          mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
        } text-white`}>
          <div className="flex items-center gap-2">
            {mensagem.tipo === "sucesso" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
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
          onRefresh={() => { carregarAbonos(); carregarFuncionarios(); }}
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
            {/* Cards de Estatísticas - Primeira linha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-4 border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm">Total Abonos</p>
                    <p className="text-2xl font-bold text-white">{estatisticas.totalAbonos}</p>
                  </div>
                  <Gift className="text-blue-400" size={28} />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-4 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-300 text-sm">Valor Total</p>
                    <p className="text-2xl font-bold text-green-400">
                      {estatisticas.totalValor.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz
                    </p>
                  </div>
                  <DollarSign className="text-green-400" size={28} />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-xl p-4 border border-yellow-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-300 text-sm">Subsídio Alimentação</p>
                    <p className="text-2xl font-bold text-white">
                      {estatisticas.subsidioAlimentacao.valor.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz
                    </p>
                    <p className="text-xs text-gray-400">{estatisticas.subsidioAlimentacao.total} abonos</p>
                  </div>
                  <Coffee className="text-yellow-400" size={28} />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-4 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 text-sm">Subsídio Transporte</p>
                    <p className="text-2xl font-bold text-white">
                      {estatisticas.subsidioTransporte.valor.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz
                    </p>
                    <p className="text-xs text-gray-400">{estatisticas.subsidioTransporte.total} abonos</p>
                  </div>
                  <Bus className="text-purple-400" size={28} />
                </div>
              </div>
            </div>

            {/* Cards de Estatísticas - Segunda linha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-xl p-4 border border-red-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-300 text-sm">Subsídio de Férias</p>
                    <p className="text-2xl font-bold text-white">
                      {estatisticas.subsidioFerias.valor.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz
                    </p>
                    <p className="text-xs text-gray-400">{estatisticas.subsidioFerias.total} abonos</p>
                    <p className="text-xs text-red-400">100% tributável</p>
                  </div>
                  <Umbrella className="text-red-400" size={28} />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 rounded-xl p-4 border border-orange-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-300 text-sm">Décimo Terceiro</p>
                    <p className="text-2xl font-bold text-white">
                      {estatisticas.decimoTerceiro.valor.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz
                    </p>
                    <p className="text-xs text-gray-400">{estatisticas.decimoTerceiro.total} abonos</p>
                    <p className="text-xs text-red-400">100% tributável</p>
                  </div>
                  <Gift className="text-orange-400" size={28} />
                </div>
              </div>
            </div>

            {/* Barra de Ações */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Pesquisar por funcionário ou tipo..." className="w-full pl-10 p-3 rounded-xl bg-gray-800 border border-gray-700 text-white" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <select className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                  <option value="">Todos os tipos</option>
                  {tiposAbono.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                  <option value="">Todos status</option>
                  {statusLista.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => { resetForm(); setModalOpen(true); setEditando(null); }} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg">
                  <Plus size={18} /> Novo Abono
                </button>
              </div>
            </div>

            {/* Legenda de Limites Legais */}
            <div className="bg-blue-600/10 rounded-xl p-3 border border-blue-500/30">
              <div className="flex flex-wrap gap-4 text-xs">
                <span className="text-blue-400">📋 Limites Legais (Lei Angolana):</span>
                <span>🍽️ Alimentação: até 30.000 Kz isentos</span>
                <span>🚌 Transporte: até 30.000 Kz isentos</span>
                <span className="text-red-400">🏖️ Férias: 100% tributável (sujeito a IRT)</span>
                <span className="text-red-400">🎄 Décimo Terceiro: 100% tributável</span>
                <span>⭐ Abonos eventuais: até 5% do salário isentos</span>
              </div>
            </div>

            {/* Tabela de Abonos */}
            {loading ? (
              <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-blue-400" size={40} /></div>
            ) : abonosFiltrados.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center">
                <Gift className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">Nenhum abono registrado</p>
                <button onClick={() => { resetForm(); setModalOpen(true); }} className="mt-4 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition">Registrar Primeiro Abono</button>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr className="text-white text-sm">
                        <th className="p-4 text-left">Data</th>
                        <th className="p-4 text-left">Funcionário</th>
                        <th className="p-4 text-left">Tipo</th>
                        <th className="p-4 text-left">Descrição</th>
                        <th className="p-4 text-right">Valor</th>
                        <th className="p-4 text-center">Isento</th>
                        <th className="p-4 text-center">Tributável</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abonosFiltrados.map((a) => (
                        <tr key={a._id} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                          <td className="p-4 text-gray-300">{new Date(a.dataReferencia).toLocaleDateString()}</td>
                          <td className="p-4 font-medium text-white">{a.funcionarioNome}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-lg text-xs ${
                              a.tipoAbono === 'Subsídio de Alimentação' ? 'bg-blue-600/20 text-blue-400' :
                              a.tipoAbono === 'Subsídio de Transporte' ? 'bg-green-600/20 text-green-400' :
                              a.tipoAbono === 'Subsídio de Férias' ? 'bg-red-600/20 text-red-400' :
                              a.tipoAbono === 'Décimo Terceiro' ? 'bg-orange-600/20 text-orange-400' :
                              'bg-purple-600/20 text-purple-400'
                            }`}>
                              {a.tipoAbono}
                            </span>
                          </td>
                          <td className="p-4 text-gray-300 max-w-xs truncate">{a.descricao || a.motivo || '—'}</td>
                          <td className="p-4 text-right text-green-400 font-semibold">
                            {a.valor?.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz
                          </td>
                          <td className="p-4 text-center text-green-400">
                            {(a.tipoAbono === 'Subsídio de Férias' || a.tipoAbono === 'Décimo Terceiro') 
                              ? '0,00 Kz' 
                              : (a.valorIsento?.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00')} Kz
                          </td>
                          <td className="p-4 text-center text-yellow-400">
                            {a.valorTributavel?.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'} Kz
                            {(a.tipoAbono === 'Subsídio de Férias' || a.tipoAbono === 'Décimo Terceiro') && (
                              <span className="block text-xs text-red-400">100% tributável</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(a.status)}`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => verDetalhes(a)} className="p-2 bg-blue-600/20 hover:bg-blue-600/40 rounded-lg transition">
                                <Eye size={16} className="text-blue-400" />
                              </button>
                              <button onClick={() => { setEditando(a._id); setFormData(a); setModalOpen(true); }} className="p-2 bg-yellow-600/20 hover:bg-yellow-600/40 rounded-lg transition">
                                <Edit size={16} className="text-yellow-400" />
                              </button>
                              <button onClick={() => excluirAbono(a._id)} className="p-2 bg-red-600/20 hover:bg-red-600/40 rounded-lg transition">
                                <Trash2 size={16} className="text-red-400" />
                              </button>
                              {!a.integradoFolha && a.status === 'Aprovado' && (
                                <button onClick={() => integrarFolha(a._id)} className="p-2 bg-purple-600/20 hover:bg-purple-600/40 rounded-lg transition">
                                  <FileText size={16} className="text-purple-400" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-700/50 border-t border-gray-600">
                      <tr>
                        <td colSpan="4" className="p-4 text-right font-medium text-gray-300">Total Geral:</td>
                        <td className="p-4 text-right font-bold text-green-400">{totalValor.toLocaleString()} Kz</td>
                        <td colSpan="4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                {/* Paginação */}
                {totalPaginas > 1 && (
                  <div className="flex justify-center items-center gap-2 p-4 border-t border-gray-700">
                    <button onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="px-4 py-2 bg-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-600 transition">Anterior</button>
                    <span className="text-gray-400">Página {paginaAtual} de {totalPaginas}</span>
                    <button onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas} className="px-4 py-2 bg-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-600 transition">Próxima</button>
                  </div>
                )}
              </div>
            )}

            {/* Modal de Novo/Editar Abono */}
            {modalOpen && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-gray-800 rounded-2xl w-full max-w-md">
                  <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-blue-400">{editando ? "Editar Abono" : "Novo Abono"}</h2>
                    <button onClick={() => { setModalOpen(false); setEditando(null); resetForm(); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
                  </div>
                  <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                    {/* Funcionário */}
                    <div>
                      <label className="block text-gray-300 mb-1">Funcionário *</label>
                      <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.funcionarioId} onChange={(e) => setFormData({...formData, funcionarioId: e.target.value})}>
                        <option value="">Selecione</option>
                        {funcionarios.map(f => <option key={f._id} value={f._id}>{f.nome} - {f.cargo || 'Sem cargo'}</option>)}
                      </select>
                    </div>

                    {/* Tipo de Abono */}
                    <div>
                      <label className="block text-gray-300 mb-1">Tipo de Abono *</label>
                      <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.tipoAbono} onChange={(e) => handleTipoChange(e.target.value)}>
                        <option value="">Selecione</option>
                        {tiposAbono.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      {formData.tipoAbono && (
                        <p className="text-xs text-gray-400 mt-1">{tiposAbono.find(t => t.value === formData.tipoAbono)?.limite}</p>
                      )}
                    </div>

                    {/* Campos específicos por tipo */}
                    {formData.tipoAbono === 'Subsídio de Alimentação' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-gray-300 mb-1">Dias Trabalhados</label>
                          <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.diasTrabalhados} onChange={(e) => {
                            const dias = parseInt(e.target.value);
                            setFormData({...formData, diasTrabalhados: dias, valor: dias * formData.valorDiario});
                          }} />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Valor Diário (Kz)</label>
                          <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.valorDiario} onChange={(e) => {
                            const valor = parseInt(e.target.value);
                            setFormData({...formData, valorDiario: valor, valor: formData.diasTrabalhados * valor});
                          }} />
                        </div>
                      </div>
                    )}

                    {formData.tipoAbono === 'Subsídio de Férias' && (
                      <div>
                        <label className="block text-gray-300 mb-1">Percentual de Férias (%)</label>
                        <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.percentualFerias} onChange={(e) => {
                          const percentual = parseInt(e.target.value);
                          const funcionario = funcionarios.find(f => f._id === formData.funcionarioId);
                          const valor = funcionario ? (funcionario.salarioBase * percentual) / 100 : 0;
                          setFormData({...formData, percentualFerias: percentual, valor});
                        }}>
                          <option value="100">100% (Férias integrais)</option>
                          <option value="50">50% (Meias férias)</option>
                          <option value="25">25% (Férias reduzidas)</option>
                        </select>
                        <p className="text-xs text-red-400 mt-1">⚠️ Subsídio de Férias é 100% tributável</p>
                      </div>
                    )}

                    {formData.tipoAbono === 'Décimo Terceiro' && (
                      <div>
                        <p className="text-xs text-red-400 mb-2">⚠️ Décimo Terceiro é 100% tributável</p>
                      </div>
                    )}

                    {/* Valor */}
                    <div>
                      <label className="block text-gray-300 mb-1">Valor (Kz) *</label>
                      <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.valor} onChange={(e) => setFormData({...formData, valor: parseFloat(e.target.value) || 0})} />
                    </div>

                    {/* Data Referência */}
                    <div>
                      <label className="block text-gray-300 mb-1">Data de Referência</label>
                      <input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.dataReferencia} onChange={(e) => setFormData({...formData, dataReferencia: e.target.value})} />
                    </div>

                    {/* Descrição/Motivo */}
                    <div>
                      <label className="block text-gray-300 mb-1">Descrição/Motivo</label>
                      <textarea rows={2} className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" value={formData.descricao || formData.motivo} onChange={(e) => setFormData({...formData, descricao: e.target.value, motivo: e.target.value})} placeholder="Justificativa do abono..." />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-gray-300 mb-1">Status</label>
                      <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                        {statusLista.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Informações do Funcionário */}
                    {formData.funcionarioId && (
                      <div className="bg-gray-700/30 rounded-lg p-3">
                        <h4 className="text-blue-400 text-sm font-medium mb-2">📋 Informações do Funcionário</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-gray-400">Salário Base:</span><span className="text-white ml-2">{funcionarios.find(f => f._id === formData.funcionarioId)?.salarioBase?.toLocaleString() || 0} Kz</span></div>
                          <div><span className="text-gray-400">Departamento:</span><span className="text-white ml-2">{funcionarios.find(f => f._id === formData.funcionarioId)?.departamento || '—'}</span></div>
                          <div><span className="text-gray-400">Cargo:</span><span className="text-white ml-2">{funcionarios.find(f => f._id === formData.funcionarioId)?.cargo || '—'}</span></div>
                          <div><span className="text-gray-400">Limite 5%:</span><span className="text-white ml-2">{Math.round((funcionarios.find(f => f._id === formData.funcionarioId)?.salarioBase || 0) * 0.05).toLocaleString()} Kz</span></div>
                        </div>
                      </div>
                    )}

                    <button onClick={handleSubmit} disabled={loading} className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 py-3 rounded-xl transition disabled:opacity-50">
                      {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : (editando ? "Atualizar" : "Registrar")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Detalhes */}
            {modalDetalhes && abonoSelecionado && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-gray-800 rounded-2xl w-full max-w-md">
                  <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-blue-400">Detalhes do Abono</h2>
                    <button onClick={() => setModalDetalhes(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-400">Funcionário:</span><span className="text-white ml-2">{abonoSelecionado.funcionarioNome}</span></div>
                        <div><span className="text-gray-400">Tipo:</span><span className="text-white ml-2">{abonoSelecionado.tipoAbono}</span></div>
                        <div><span className="text-gray-400">Valor:</span><span className="text-green-400 ml-2">{abonoSelecionado.valor?.toLocaleString()} Kz</span></div>
                        <div><span className="text-gray-400">Valor Isento:</span><span className="text-green-400 ml-2">{abonoSelecionado.valorIsento?.toLocaleString()} Kz</span></div>
                        <div><span className="text-gray-400">Valor Tributável:</span><span className="text-yellow-400 ml-2">{abonoSelecionado.valorTributavel?.toLocaleString()} Kz</span></div>
                        <div><span className="text-gray-400">Status:</span><span className={`ml-2 ${getStatusColor(abonoSelecionado.status)}`}>{abonoSelecionado.status}</span></div>
                        <div><span className="text-gray-400">Data:</span><span className="text-white ml-2">{new Date(abonoSelecionado.dataReferencia).toLocaleDateString()}</span></div>
                        <div><span className="text-gray-400">Integrado Folha:</span><span className="text-white ml-2">{abonoSelecionado.integradoFolha ? 'Sim' : 'Não'}</span></div>
                      </div>
                    </div>
                    <div><span className="text-gray-400">Descrição:</span><p className="text-white mt-1">{abonoSelecionado.descricao || abonoSelecionado.motivo || '—'}</p></div>
                    <button onClick={() => setModalDetalhes(false)} className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition">Fechar</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in-out { 0% { opacity: 0; transform: translateY(-20px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </Layout>
  );
};

export default GestaoAbonos;