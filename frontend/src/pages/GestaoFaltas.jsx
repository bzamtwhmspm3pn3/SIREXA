// src/pages/GestaoFaltas.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import { 
  Plus, Edit, Trash2, Search, Calendar, Users, AlertCircle, CheckCircle,
  Upload, Database, RefreshCw, Settings, Fingerprint, Download,
  X, Loader2, FileSpreadsheet, Clock, DollarSign, Filter, Building2
} from "lucide-react";
import { gerarDocumentoProfissional } from "../services/documentoService";

const GestaoFaltas = () => {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [faltas, setFaltas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBiometrico, setModalBiometrico] = useState(false);
  const [modalCSV, setModalCSV] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [documentoSelecionado, setDocumentoSelecionado] = useState(null);
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [estatisticas, setEstatisticas] = useState(null);
  const [configBiometrico, setConfigBiometrico] = useState({
    ativo: false,
    tipo: 'restapi',
    apiUrl: '',
    apiToken: '',
    ip: '',
    porta: 4370,
    timeout: 5000
  });
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [arquivoCSV, setArquivoCSV] = useState(null);
  const [importando, setImportando] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [previewDesconto, setPreviewDesconto] = useState(0);
  const [horasAtraso, setHorasAtraso] = useState("");
  const [recarregar, setRecarregar] = useState(false);
  
  const [formData, setFormData] = useState({
    funcionarioId: "",
    funcionarioNome: "",
    tipoFalta: "",
    dataInicio: new Date().toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0],
    motivo: "",
    observacao: "",
    status: "Pendente",
    justificada: false
  });

  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();

  const tiposFalta = [
    { value: "Falta Injustificada", label: "⚠️ Falta Injustificada (com desconto)", cor: "red" },
    { value: "Atraso", label: "⏰ Atraso (desconto proporcional)", cor: "yellow" },
    { value: "Doença", label: "🏥 Doença (com justificação)", cor: "blue" },
    { value: "Férias", label: "🌴 Férias", cor: "green" },
    { value: "Licença", label: "📋 Licença", cor: "purple" },
    { value: "Falta Justificada", label: "✅ Falta Justificada (sem desconto)", cor: "green" },
    { value: "Formação", label: "📚 Formação", cor: "cyan" },
    { value: "Luto", label: "⚫ Luto", cor: "gray" },
    { value: "Casamento", label: "💒 Casamento", cor: "pink" },
    { value: "Outro", label: "📌 Outro", cor: "gray" }
  ];
  
  const statusLista = ["Pendente", "Aprovado", "Rejeitado"];

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
      carregarFaltas();
      carregarFuncionarios();
      carregarConfigBiometrico();
    } else {
      setFaltas([]);
      setFuncionarios([]);
    }
  }, [empresaSelecionada, filtroStatus, filtroTipo, paginaAtual]);

  // Calcular estatísticas localmente baseado nas faltas
  useEffect(() => {
    if (faltas.length > 0) {
      const totalFaltas = faltas.length;
      const pendentes = faltas.filter(f => f.status === 'Pendente').length;
      const totalDesconto = faltas.reduce((acc, f) => acc + (f.descontoSalario || 0), 0);
      
      setEstatisticas({
        totalGeral: totalFaltas,
        pendentes: pendentes,
        totalDescontoGeral: totalDesconto,
        porFuncionario: faltas.reduce((acc, f) => {
          if (!acc.find(item => item.funcionarioId === f.funcionarioId)) {
            acc.push({
              funcionarioId: f.funcionarioId,
              funcionarioNome: f.funcionarioNome,
              totalFaltas: faltas.filter(f2 => f2.funcionarioId === f.funcionarioId).length,
              totalDesconto: faltas.filter(f2 => f2.funcionarioId === f.funcionarioId).reduce((sum, f2) => sum + (f2.descontoSalario || 0), 0)
            });
          }
          return acc;
        }, []),
        porStatus: [
          { _id: 'Pendente', total: pendentes },
          { _id: 'Aprovado', total: faltas.filter(f => f.status === 'Aprovado').length },
          { _id: 'Rejeitado', total: faltas.filter(f => f.status === 'Rejeitado').length }
        ],
        porTipo: faltas.reduce((acc, f) => {
          const tipo = f.tipoFalta;
          const existing = acc.find(item => item._id === tipo);
          if (existing) {
            existing.total++;
            existing.totalDesconto += (f.descontoSalario || 0);
          } else {
            acc.push({ _id: tipo, total: 1, totalDesconto: (f.descontoSalario || 0) });
          }
          return acc;
        }, [])
      });
    } else {
      setEstatisticas({
        totalGeral: 0,
        pendentes: 0,
        totalDescontoGeral: 0,
        porFuncionario: [],
        porStatus: [],
        porTipo: []
      });
    }
  }, [faltas]);

  useEffect(() => {
    if (empresaSelecionada && recarregar) {
      carregarFaltas();
      setRecarregar(false);
    }
  }, [empresaSelecionada, recarregar]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 5000);
  };

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

  const carregarConfigBiometrico = async () => {
    if (!empresaSelecionada) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/faltas/biometrico/config/${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.sucesso && data.config) {
        setConfigBiometrico(data.config);
      }
    } catch (error) {
      console.error("Erro ao carregar config:", error);
    }
  };

  // 🔥 FUNÇÃO CORRIGIDA - ESTAVA FALTANDO A REQUISIÇÃO
  const carregarFaltas = async () => {
    if (!empresaSelecionada) {
      setFaltas([]);
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = `https://sirexa-api.onrender.com/api/faltas?empresaId=${empresaSelecionada}&page=${paginaAtual}&limit=20`;
      if (filtroStatus) url += `&status=${filtroStatus}`;
      if (filtroTipo) url += `&tipoFalta=${filtroTipo}`;
      
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        mostrarMensagem("Acesso negado", "erro");
        setFaltas([]);
        return;
      }
      
      const data = await response.json();
      if (data.sucesso) {
        setFaltas(data.dados || []);
        setTotalPaginas(data.totalPaginas || 1);
      } else {
        setFaltas([]);
      }
    } catch (error) {
      console.error("Erro ao carregar faltas:", error);
      setFaltas([]);
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
      console.error("Erro ao carregar funcionários:", error);
      setFuncionarios([]);
    }
  };

  // 🔥 FUNÇÃO CORRIGIDA - REMOVIDO O token undefined
  const excluirFalta = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta falta?")) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/faltas/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        mostrarMensagem("Falta excluída!", "sucesso");
        await carregarFaltas();
      } else {
        const error = await response.json();
        mostrarMensagem(error.mensagem || "Erro ao excluir", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao excluir", "erro");
    }
  };

  const carregarEstatisticas = async () => {
    // Esta função pode ser vazia ou chamar carregarFaltas
    await carregarFaltas();
  };

  const calcularPreviewDesconto = async (funcionarioId, tipoFalta, dataInicio, dataFim, motivo, justificada) => {
    if (!funcionarioId || !tipoFalta || justificada) {
      setPreviewDesconto(0);
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/funcionarios/${funcionarioId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      const funcionario = data.dados || data;
      
      if (!funcionario) return;
      
      const salarioBase = funcionario.salarioBase || 0;
      const horasSemanais = funcionario.horasSemanais || 40;
      const horasDiarias = funcionario.horasDiarias || 8;
      
      const salarioHora = (salarioBase * 12) / (52 * horasSemanais);
      const valorDia = salarioHora * horasDiarias;
      
      let desconto = 0;
      
      if (tipoFalta === 'Atraso') {
        let horasAtrasoVal = 1;
        const matchHoras = motivo?.match(/(\d+(?:[.,]\d+)?)\s*(?:hora|horas|h)/i);
        if (matchHoras) {
          horasAtrasoVal = parseFloat(matchHoras[1].replace(',', '.'));
        }
        desconto = salarioHora * horasAtrasoVal;
      } else if (tipoFalta === 'Falta Injustificada' || tipoFalta === 'Falta Não Justificada') {
        const inicio = new Date(dataInicio);
        const fim = dataFim ? new Date(dataFim) : inicio;
        const diasFalta = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)) + 1;
        desconto = valorDia * diasFalta;
      }
      
      setPreviewDesconto(Math.round(desconto * 100) / 100);
    } catch (error) {
      console.error('Erro ao calcular preview:', error);
    }
  };

  useEffect(() => {
    if (modalOpen) {
      calcularPreviewDesconto(
        formData.funcionarioId,
        formData.tipoFalta,
        formData.dataInicio,
        formData.dataFim,
        formData.motivo,
        formData.justificada
      );
    }
  }, [formData.funcionarioId, formData.tipoFalta, formData.dataInicio, formData.dataFim, formData.motivo, formData.justificada, modalOpen]);

  const testarConexaoBiometrico = async () => {
    if (!configBiometrico.apiUrl && !configBiometrico.ip) {
      mostrarMensagem("Configure a URL da API ou o IP do dispositivo primeiro", "erro");
      return;
    }
    
    setTestandoConexao(true);
    try {
      const payload = {
        apiUrl: configBiometrico.apiUrl,
        apiToken: configBiometrico.apiToken,
        ip: configBiometrico.ip,
        porta: configBiometrico.porta,
        tipo: configBiometrico.tipo
      };
      
      const response = await fetch(`https://sirexa-api.onrender.com/api/faltas/biometrico/testar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.sucesso && data.conectado) {
        mostrarMensagem(data.mensagem || "✅ Conexão estabelecida com sucesso!", "sucesso");
      } else {
        mostrarMensagem(data.mensagem || "❌ Falha na conexão", "erro");
      }
    } catch (error) {
      console.error("Erro no teste:", error);
      mostrarMensagem("Erro ao testar conexão: " + error.message, "erro");
    } finally {
      setTestandoConexao(false);
    }
  };

  const sincronizarBiometrico = async () => {
    if (!empresaSelecionada) {
      mostrarMensagem("Selecione uma empresa primeiro", "erro");
      return;
    }
    
    if (!configBiometrico.apiUrl && !configBiometrico.ip) {
      mostrarMensagem("Configure a URL da API ou o IP do dispositivo primeiro", "erro");
      return;
    }
    
    setSincronizando(true);
    mostrarMensagem("🔄 Sincronizando com dispositivo biométrico... Aguarde", "sucesso");
    
    try {
      const payload = {
        empresaId: empresaSelecionada,
        apiUrl: configBiometrico.apiUrl,
        apiToken: configBiometrico.apiToken,
        ip: configBiometrico.ip,
        porta: configBiometrico.porta,
        dataInicio: new Date().toISOString().split('T')[0],
        dataFim: new Date().toISOString().split('T')[0]
      };
      
      const response = await fetch(`https://sirexa-api.onrender.com/api/faltas/biometrico/sincronizar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.sucesso) {
        mostrarMensagem(data.mensagem || "✅ Sincronização concluída com sucesso!", "sucesso");
        await carregarFaltas();
        await carregarEstatisticas();
        setModalBiometrico(false);
      } else {
        mostrarMensagem(data.mensagem || "❌ Erro na sincronização", "erro");
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
      mostrarMensagem("Erro ao sincronizar: " + error.message, "erro");
    } finally {
      setSincronizando(false);
    }
  };

  const salvarConfigBiometrico = async () => {
    if (!empresaSelecionada) {
      mostrarMensagem("Selecione uma empresa primeiro", "erro");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        empresaId: empresaSelecionada,
        ativo: configBiometrico.ativo,
        tipo: configBiometrico.tipo,
        apiUrl: configBiometrico.apiUrl,
        apiToken: configBiometrico.apiToken,
        ip: configBiometrico.ip,
        porta: configBiometrico.porta,
        timeout: configBiometrico.timeout
      };
      
      const response = await fetch(`https://sirexa-api.onrender.com/api/faltas/biometrico/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.sucesso) {
        mostrarMensagem(data.mensagem || "✅ Configuração salva com sucesso!", "sucesso");
        setModalBiometrico(false);
      } else {
        mostrarMensagem(data.mensagem || "❌ Erro ao salvar configuração", "erro");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      mostrarMensagem("Erro ao salvar configuração: " + error.message, "erro");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FUNÇÃO CORRIGIDA - REMOVIDO O BLOCO DE VERIFICAÇÃO
  const handleSubmit = async () => {
    if (!formData.funcionarioId || !formData.tipoFalta || !formData.dataInicio || !formData.motivo) {
      mostrarMensagem("Preencha todos os campos obrigatórios", "erro");
      return;
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem("token");
      const url = editando ? `https://sirexa-api.onrender.com/api/faltas/${editando}` : "https://sirexa-api.onrender.com/api/faltas";
      const method = editando ? "PUT" : "POST";
      
      const payload = {
        ...formData,
        empresaId: empresaSelecionada
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
        mostrarMensagem(data.mensagem || (editando ? "Falta atualizada!" : "Falta registrada!"), "sucesso");
        setModalOpen(false);
        setEditando(null);
        resetForm();
        await carregarFaltas();
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

  const resetForm = () => {
    setFormData({
      funcionarioId: "",
      funcionarioNome: "",
      tipoFalta: "",
      dataInicio: new Date().toISOString().split('T')[0],
      dataFim: new Date().toISOString().split('T')[0],
      motivo: "",
      observacao: "",
      status: "Pendente",
      justificada: false
    });
    setHorasAtraso("");
    setPreviewDesconto(0);
  };

  const verDetalhes = (doc) => {
    setDocumentoSelecionado(doc);
    setModalDetalhes(true);
  };

  const imprimirDocumento = async (doc) => {
    let empresaAtual;
    if (isTecnico()) {
      empresaAtual = { nome: userEmpresaNome, _id: userEmpresaId };
    } else {
      empresaAtual = empresas.find(e => e._id === empresaSelecionada);
    }
    await gerarDocumentoProfissional(doc, user, empresaAtual, []);
  };

  const getStatusColor = (status) => {
    const cores = {
      "Aprovado": "bg-green-600/20 text-green-400",
      "Rejeitado": "bg-red-600/20 text-red-400",
      "Pendente": "bg-yellow-600/20 text-yellow-400",
      "Em análise": "bg-blue-600/20 text-blue-400"
    };
    return cores[status] || "bg-gray-600/20 text-gray-400";
  };

  const funcionarioSelecionado = funcionarios.find(f => f._id === formData.funcionarioId);
  const empresaAtual = isTecnico() 
    ? { nome: userEmpresaNome, _id: userEmpresaId }
    : empresas.find(e => e._id === empresaSelecionada);
  const faltasFiltradas = faltas.filter(f => 
    f.funcionarioNome?.toLowerCase().includes(busca.toLowerCase()) ||
    f.tipoFalta?.toLowerCase().includes(busca.toLowerCase())
  );
  const totalDesconto = faltasFiltradas.reduce((acc, f) => acc + (f.descontoSalario || 0), 0);

  if (loadingEmpresas) {
    return (
      <Layout title="Gestão de Faltas" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin mx-auto text-blue-400" size={40} />
          <p className="text-gray-400 mt-4">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Gestão de Faltas" showBackButton={true} backToRoute="/menu">
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
          onRefresh={() => { carregarFaltas(); carregarFuncionarios(); }}
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
            {/* Cards de Estatísticas */}
            {estatisticas && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-4 border border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <div><p className="text-blue-300 text-sm">Total Faltas</p><p className="text-3xl font-bold text-white">{estatisticas.totalGeral || 0}</p></div>
                    <Calendar className="text-blue-400" size={28} />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-xl p-4 border border-yellow-500/30">
                  <div className="flex items-center justify-between">
                    <div><p className="text-yellow-300 text-sm">Pendentes</p><p className="text-3xl font-bold text-white">{estatisticas.pendentes || 0}</p></div>
                    <AlertCircle className="text-yellow-400" size={28} />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-xl p-4 border border-red-500/30">
                  <div className="flex items-center justify-between">
                    <div><p className="text-red-300 text-sm">Descontos (Kz)</p><p className="text-2xl font-bold text-white">{Math.round(estatisticas.totalDescontoGeral || 0).toLocaleString('pt-AO')}</p></div>
                    <DollarSign className="text-red-400" size={28} />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-4 border border-green-500/30">
                  <div className="flex items-center justify-between">
                    <div><p className="text-green-300 text-sm">Funcionários afetados</p><p className="text-3xl font-bold text-white">{estatisticas.porFuncionario?.length || 0}</p></div>
                    <Users className="text-green-400" size={28} />
                  </div>
                </div>
              </div>
            )}

            {/* Barra de Ações */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar por funcionário ou tipo..." 
                  className="w-full pl-10 p-3 rounded-xl bg-gray-800 border border-gray-700 text-white" 
                  value={busca} 
                  onChange={(e) => setBusca(e.target.value)} 
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select 
                  className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white" 
                  value={filtroStatus} 
                  onChange={(e) => { setFiltroStatus(e.target.value); setPaginaAtual(1); carregarFaltas(); }}
                >
                  <option value="">Todos status</option>
                  {statusLista.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select 
                  className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white" 
                  value={filtroTipo} 
                  onChange={(e) => { setFiltroTipo(e.target.value); setPaginaAtual(1); carregarFaltas(); }}
                >
                  <option value="">Todos tipos</option>
                  {tiposFalta.map(t => <option key={t.value} value={t.value}>{t.label.split(' ')[0]}</option>)}
                </select>
                <button 
                  onClick={() => setModalBiometrico(true)} 
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded-xl transition flex items-center gap-2"
                >
                  <Fingerprint size={18} /> Biometria
                </button>
                <button 
                  onClick={() => setModalCSV(true)} 
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl transition flex items-center gap-2"
                >
                  <Upload size={18} /> CSV
                </button>
                <button 
                  onClick={() => { setModalOpen(true); setEditando(null); resetForm(); }} 
                  className="bg-green-600 hover:bg-green-700 px-4 py-3 rounded-xl transition flex items-center gap-2"
                >
                  <Plus size={18} /> Registrar Falta
                </button>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded"></span> Com desconto</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-400 rounded"></span> Atraso</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded"></span> Sem desconto</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-400 rounded"></span> Biometria</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-400 rounded"></span> CSV/Manual</span>
            </div>

            {/* Tabela de Faltas */}
            {loading ? (
              <div className="text-center p-8 text-white"><Loader2 className="animate-spin mx-auto" size={40} /></div>
            ) : faltasFiltradas.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center">
                <Calendar className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">Nenhuma falta registrada</p>
                <button 
                  onClick={() => { setModalOpen(true); setEditando(null); resetForm(); }} 
                  className="mt-4 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition"
                >
                  Registrar Primeira Falta
                </button>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr className="text-white text-sm">
                        <th className="p-4 text-left">Período</th>
                        <th className="p-4 text-left">Funcionário</th>
                        <th className="p-4 text-left">Tipo</th>
                        <th className="p-4 text-left">Motivo</th>
                        <th className="p-4 text-center">Dias/Horas</th>
                        <th className="p-4 text-center">Desconto</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Origem</th>
                        <th className="p-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faltasFiltradas.map(f => (
                        <tr key={f._id} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                          <td className="p-4 text-gray-300 text-sm">
                            {new Date(f.dataInicio).toLocaleDateString()} - {new Date(f.dataFim).toLocaleDateString()}
                          </td>
                          <td className="p-4 font-medium text-white">{f.funcionarioNome}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-lg text-xs ${
                              f.tipoFalta === 'Falta Injustificada' ? 'bg-red-600/20 text-red-400' :
                              f.tipoFalta === 'Atraso' ? 'bg-yellow-600/20 text-yellow-400' :
                              'bg-green-600/20 text-green-400'
                            }`}>
                              {f.tipoFalta}
                            </span>
                          </td>
                          <td className="p-4 text-gray-300 text-sm max-w-xs truncate">{f.motivo}</td>
                          <td className="p-4 text-center text-white">
                            {f.horasFalta > 0 ? `${f.horasFalta}h` : `${f.diasFalta || 1}d`}
                          </td>
                          <td className="p-4 text-center">
                            {f.descontoSalario > 0 ? (
                              <span className="text-red-400 font-semibold">
                                {f.descontoSalario.toLocaleString()} Kz
                              </span>
                            ) : (
                              <span className="text-gray-500">0 Kz</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(f.status)}`}>
                              {f.status === 'Aprovado' ? '✓ Aprovado' : 
                               f.status === 'Rejeitado' ? '✗ Rejeitado' : 
                               '⏳ Pendente'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded-lg text-xs ${
                              f.origem === 'Biometrico' ? 'bg-purple-600/20 text-purple-400' : 
                              f.origem === 'CSV' ? 'bg-blue-600/20 text-blue-400' : 
                              'bg-gray-600/20 text-gray-400'
                            }`}>
                              {f.origem || 'Manual'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button 
                                onClick={() => { setEditando(f._id); setFormData(f); setModalOpen(true); }} 
                                className="p-2 bg-yellow-600/20 hover:bg-yellow-600/40 rounded-lg transition"
                              >
                                <Edit size={16} className="text-yellow-400" />
                              </button>
                              <button 
                                onClick={() => excluirFalta(f._id)} 
                                className="p-2 bg-red-600/20 hover:bg-red-600/40 rounded-lg transition"
                              >
                                <Trash2 size={16} className="text-red-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-700/50 border-t border-gray-600">
                      <tr>
                        <td colSpan="5" className="p-4 text-right font-medium text-gray-300">Total de descontos:</td>
                        <td className="p-4 text-center font-bold text-red-400">{totalDesconto.toLocaleString()} Kz</td>
                        <td colSpan="3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                {/* Paginação */}
                {totalPaginas > 1 && (
                  <div className="flex justify-center items-center gap-2 p-4 border-t border-gray-700">
                    <button 
                      onClick={() => { setPaginaAtual(p => Math.max(1, p - 1)); carregarFaltas(); }} 
                      disabled={paginaAtual === 1} 
                      className="px-4 py-2 bg-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-600 transition"
                    >
                      Anterior
                    </button>
                    <span className="text-gray-400">Página {paginaAtual} de {totalPaginas}</span>
                    <button 
                      onClick={() => { setPaginaAtual(p => Math.min(totalPaginas, p + 1)); carregarFaltas(); }} 
                      disabled={paginaAtual === totalPaginas} 
                      className="px-4 py-2 bg-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-600 transition"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Modal de Registro/Edição de Falta */}
            {modalOpen && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-gray-800 rounded-2xl w-full max-w-md">
                  <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-blue-400">{editando ? "Editar Falta" : "Registrar Falta"}</h2>
                    <button onClick={() => { setModalOpen(false); setEditando(null); resetForm(); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
                  </div>
                  <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                    {/* Funcionário */}
                    <div>
                      <label className="block text-gray-300 mb-1">Funcionário *</label>
                      <select 
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                        value={formData.funcionarioId} 
                        onChange={(e) => setFormData({...formData, funcionarioId: e.target.value})}
                      >
                        <option value="">Selecione</option>
                        {funcionarios.map(f => (
                          <option key={f._id} value={f._id}>
                            {f.nome} - {f.cargo || 'Sem cargo'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tipo de Falta */}
                    <div>
                      <label className="block text-gray-300 mb-1">Tipo de Falta *</label>
                      <select 
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                        value={formData.tipoFalta} 
                        onChange={(e) => setFormData({...formData, tipoFalta: e.target.value})}
                      >
                        <option value="">Selecione</option>
                        {tiposFalta.map(t => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Datas */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-300 mb-1">Data Início *</label>
                        <input 
                          type="date" 
                          className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                          value={formData.dataInicio} 
                          onChange={(e) => setFormData({...formData, dataInicio: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1">Data Fim</label>
                        <input 
                          type="date" 
                          className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                          value={formData.dataFim} 
                          onChange={(e) => setFormData({...formData, dataFim: e.target.value})} 
                        />
                      </div>
                    </div>

                    {/* Horas de Atraso */}
                    {formData.tipoFalta === 'Atraso' && !formData.justificada && (
                      <div>
                        <label className="block text-gray-300 mb-1">Horas de Atraso</label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            step="0.5"
                            className="flex-1 p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                            placeholder="Ex: 2 (horas)"
                            value={horasAtraso}
                            onChange={(e) => {
                              setHorasAtraso(e.target.value);
                              setFormData({...formData, motivo: `Atraso de ${e.target.value} horas`});
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Motivo */}
                    <div>
                      <label className="block text-gray-300 mb-1">Motivo *</label>
                      <textarea 
                        rows={2} 
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" 
                        placeholder="Descreva o motivo da falta..." 
                        value={formData.motivo} 
                        onChange={(e) => setFormData({...formData, motivo: e.target.value})} 
                      />
                    </div>

                    {/* Observação */}
                    <div>
                      <label className="block text-gray-300 mb-1">Observação</label>
                      <textarea 
                        rows={2} 
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" 
                        placeholder="Observações adicionais..." 
                        value={formData.observacao} 
                        onChange={(e) => setFormData({...formData, observacao: e.target.value})} 
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-gray-300 mb-1">Status</label>
                      <select 
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                        value={formData.status} 
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                      >
                        {statusLista.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Justificada */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.justificada} 
                        onChange={(e) => setFormData({...formData, justificada: e.target.checked})} 
                        className="w-4 h-4"
                      />
                      <span className="text-gray-300">Falta justificada (sem desconto)</span>
                    </label>

                    {/* Preview do Desconto */}
                    {!formData.justificada && (formData.tipoFalta === 'Atraso' || formData.tipoFalta === 'Falta Injustificada') && previewDesconto > 0 && (
                      <div className="bg-red-600/10 rounded-lg p-3 border border-red-500/30">
                        <div className="flex justify-between items-center">
                          <span className="text-red-400 text-sm font-medium">💰 Desconto estimado:</span>
                          <span className="text-red-400 font-bold text-lg">{previewDesconto.toLocaleString()} Kz</span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">
                          {formData.tipoFalta === 'Atraso' 
                            ? 'Desconto proporcional às horas de atraso' 
                            : 'Desconto de 1 dia de salário por falta não justificada'}
                        </p>
                      </div>
                    )}

                    {/* Informações do Funcionário */}
                    {funcionarioSelecionado && (
                      <div className="bg-gray-700/30 rounded-lg p-3">
                        <h4 className="text-blue-400 text-sm font-medium mb-2">📋 Informações do Funcionário</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">Salário Base:</span>
                            <span className="text-white ml-2">
                              {funcionarioSelecionado.salarioBase?.toLocaleString('pt-AO') || '0,00'} Kz
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Carga Horária:</span>
                            <span className="text-white ml-2">
                              {funcionarioSelecionado.horasSemanais || 40}h/semana
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Valor hora:</span>
                            <span className="text-white ml-2">
                              {(() => {
                                const salarioBase = funcionarioSelecionado.salarioBase || 0;
                                const horasSemanais = funcionarioSelecionado.horasSemanais || 40;
                                const salarioHora = (salarioBase * 12) / (52 * horasSemanais);
                                return salarioHora.toLocaleString('pt-AO');
                              })()} Kz
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Valor dia:</span>
                            <span className="text-white ml-2">
                              {(() => {
                                const salarioBase = funcionarioSelecionado.salarioBase || 0;
                                const horasSemanais = funcionarioSelecionado.horasSemanais || 40;
                                const horasDiarias = funcionarioSelecionado.horasDiarias || 8;
                                const salarioHora = (salarioBase * 12) / (52 * horasSemanais);
                                const valorDia = salarioHora * horasDiarias;
                                return valorDia.toLocaleString('pt-AO');
                              })()} Kz
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={handleSubmit} 
                      disabled={loading} 
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 py-3 rounded-xl transition disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : (editando ? "Atualizar" : "Registrar")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Configuração Biométrica */}
            {modalBiometrico && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-2xl w-full max-w-md">
                  <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="text-purple-400" />
                      <h2 className="text-xl font-bold text-purple-400">Configuração Biométrica</h2>
                    </div>
                    <button onClick={() => setModalBiometrico(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="bg-yellow-600/10 rounded-lg p-3 text-sm text-yellow-400">
                      <p className="font-medium">⚠️ Configuração para integração biométrica</p>
                      <p className="text-xs mt-1">Preencha os dados do seu dispositivo ou API de biometria</p>
                    </div>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={configBiometrico.ativo} 
                        onChange={(e) => setConfigBiometrico({...configBiometrico, ativo: e.target.checked})} 
                        className="w-4 h-4"
                      />
                      <span className="text-gray-300">Ativar integração biométrica</span>
                    </label>
                    
                    <div>
                      <label className="block text-gray-300 mb-1">Tipo de Integração</label>
                      <select 
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                        value={configBiometrico.tipo}
                        onChange={(e) => setConfigBiometrico({...configBiometrico, tipo: e.target.value})}
                      >
                        <option value="restapi">API REST</option>
                        <option value="zkteco">Dispositivo ZKTeco</option>
                      </select>
                    </div>
                    
                    {configBiometrico.tipo === 'restapi' ? (
                      <>
                        <div>
                          <label className="block text-gray-300 mb-1">URL da API Biométrica</label>
                          <input 
                            type="text" 
                            className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white font-mono text-sm" 
                            placeholder="http://192.168.1.100:8080/api" 
                            value={configBiometrico.apiUrl} 
                            onChange={(e) => setConfigBiometrico({...configBiometrico, apiUrl: e.target.value})} 
                          />
                          <p className="text-xs text-gray-400 mt-1">Ex: http://192.168.1.100:8080/api</p>
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Token de Autenticação</label>
                          <input 
                            type="password" 
                            className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                            placeholder="Bearer token" 
                            value={configBiometrico.apiToken} 
                            onChange={(e) => setConfigBiometrico({...configBiometrico, apiToken: e.target.value})} 
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-gray-300 mb-1">Endereço IP do Dispositivo</label>
                          <input 
                            type="text" 
                            className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white font-mono" 
                            placeholder="192.168.1.201" 
                            value={configBiometrico.ip} 
                            onChange={(e) => setConfigBiometrico({...configBiometrico, ip: e.target.value})} 
                          />
                          <p className="text-xs text-gray-400 mt-1">IP padrão ZKTeco: 192.168.1.201</p>
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Porta</label>
                          <input 
                            type="number" 
                            className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                            value={configBiometrico.porta} 
                            onChange={(e) => setConfigBiometrico({...configBiometrico, porta: parseInt(e.target.value)})} 
                          />
                          <p className="text-xs text-gray-400 mt-1">Porta padrão: 4370</p>
                        </div>
                      </>
                    )}
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={testarConexaoBiometrico} 
                        disabled={testandoConexao || (!configBiometrico.apiUrl && !configBiometrico.ip)} 
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 py-3 rounded-xl transition disabled:opacity-50"
                      >
                        {testandoConexao ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Testar Conexão"}
                      </button>
                      <button 
                        onClick={sincronizarBiometrico} 
                        disabled={sincronizando || !configBiometrico.ativo || (!configBiometrico.apiUrl && !configBiometrico.ip)} 
                        className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {sincronizando ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                        Sincronizar
                      </button>
                    </div>
                    
                    <button onClick={salvarConfigBiometrico} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-xl transition">
                      {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Salvar Configuração"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Importação CSV */}
            {modalCSV && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-2xl w-full max-w-md">
                  <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <div className="flex items-center gap-2"><FileSpreadsheet className="text-blue-400" /><h2 className="text-xl font-bold text-blue-400">Importar CSV</h2></div>
                    <button onClick={() => setModalCSV(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="bg-blue-600/10 rounded-lg p-3 text-sm text-blue-400">
                      <p>Formato esperado do CSV:</p>
                      <code className="text-xs block mt-1">funcionario,nif,data,tipo,motivo,status,justificada</code>
                      <p className="text-xs mt-2">Exemplo: João Silva,123456789,2024-01-15,Doença,Gripe,Pendente,não</p>
                    </div>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                      <input type="file" accept=".csv" className="hidden" id="csvFile" onChange={(e) => setArquivoCSV(e.target.files[0])} />
                      <label htmlFor="csvFile" className="cursor-pointer flex flex-col items-center gap-2">
                        <Upload size={40} className="text-gray-400" />
                        <span className="text-gray-400">{arquivoCSV ? arquivoCSV.name : "Clique para selecionar arquivo"}</span>
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => {}} disabled={importando || !arquivoCSV} className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
                        {importando ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                        Importar
                      </button>
                      <button onClick={() => setModalCSV(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl transition">Cancelar</button>
                    </div>
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

export default GestaoFaltas;