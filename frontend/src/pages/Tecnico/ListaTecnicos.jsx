// src/pages/Tecnico/ListaTecnicos.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { 
  Plus, Edit, Trash2, Search, Users, UserCog, Shield, 
  CheckCircle, AlertCircle, Building2, Key, RefreshCw, 
  XCircle, Phone, PowerOff, Eye, EyeOff
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const ListaTecnicos = () => {
  const [tecnicos, setTecnicos] = useState([]);
  const [pendentes, setPendentes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [busca, setBusca] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showDespromoverModal, setShowDespromoverModal] = useState(false);
  const [selectedTecnico, setSelectedTecnico] = useState(null);
  
  const [modulosTemp, setModulosTemp] = useState({
    // Operacional
    vendas: false,
    stock: false,
    facturacao: false,
    // Recursos Humanos
    funcionarios: false,
    folhaSalarial: false,
    gestaoFaltas: false,
    gestaoAbonos: false,
    avaliacao: false,
    // Gestão Patrimonial
    viaturas: false,
    abastecimentos: false,
    manutencoes: false,
    inventario: false,
    // Financeiro
    fornecedores: false,
    fluxoCaixa: false,
    contaCorrente: false,
    controloPagamento: false,
    custosReceitas: false,
    orcamentos: false,
    dre: false,
    indicadores: false,
    transferencias: false,
    reconciliacao: false,
    // Relatórios
    relatorios: false,
    graficos: false,
    analise: false
  });

  const navigate = useNavigate();

  useEffect(() => {
    carregarEmpresas();
  }, []);

  useEffect(() => {
    if (selectedEmpresaId) {
      carregarDados();
    }
  }, [selectedEmpresaId]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  // Funções para marcar/desmarcar grupos de módulos
  const toggleGrupoOperacional = () => {
    const novoValor = !(modulosTemp.vendas && modulosTemp.stock && modulosTemp.facturacao);
    setModulosTemp(prev => ({
      ...prev,
      vendas: novoValor,
      stock: novoValor,
      facturacao: novoValor
    }));
  };

  const toggleGrupoRH = () => {
    const novoValor = !(modulosTemp.funcionarios && modulosTemp.folhaSalarial && 
                        modulosTemp.gestaoFaltas && modulosTemp.gestaoAbonos && modulosTemp.avaliacao);
    setModulosTemp(prev => ({
      ...prev,
      funcionarios: novoValor,
      folhaSalarial: novoValor,
      gestaoFaltas: novoValor,
      gestaoAbonos: novoValor,
      avaliacao: novoValor
    }));
  };

  const toggleGrupoPatrimonial = () => {
    const novoValor = !(modulosTemp.viaturas && modulosTemp.abastecimentos && 
                        modulosTemp.manutencoes && modulosTemp.inventario);
    setModulosTemp(prev => ({
      ...prev,
      viaturas: novoValor,
      abastecimentos: novoValor,
      manutencoes: novoValor,
      inventario: novoValor
    }));
  };

  const toggleGrupoFinanceiro = () => {
    const novoValor = !(modulosTemp.fornecedores && modulosTemp.fluxoCaixa && 
                        modulosTemp.contaCorrente && modulosTemp.controloPagamento &&
                        modulosTemp.custosReceitas && modulosTemp.orcamentos &&
                        modulosTemp.dre && modulosTemp.indicadores &&
                        modulosTemp.transferencias && modulosTemp.reconciliacao);
    setModulosTemp(prev => ({
      ...prev,
      fornecedores: novoValor,
      fluxoCaixa: novoValor,
      contaCorrente: novoValor,
      controloPagamento: novoValor,
      custosReceitas: novoValor,
      orcamentos: novoValor,
      dre: novoValor,
      indicadores: novoValor,
      transferencias: novoValor,
      reconciliacao: novoValor
    }));
  };

  const toggleGrupoRelatorios = () => {
    const novoValor = !(modulosTemp.relatorios && modulosTemp.graficos && modulosTemp.analise);
    setModulosTemp(prev => ({
      ...prev,
      relatorios: novoValor,
      graficos: novoValor,
      analise: novoValor
    }));
  };

  const marcarTodosModulos = () => {
    const todosAtivos = Object.values(modulosTemp).every(v => v === true);
    const novoValor = !todosAtivos;
    const novosModulos = {};
    Object.keys(modulosTemp).forEach(key => {
      novosModulos[key] = novoValor;
    });
    setModulosTemp(novosModulos);
  };

  const carregarEmpresas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://sirexa-api.onrender.com/api/empresa", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      setEmpresas(Array.isArray(data) ? data : []);
      
      if (data.length > 0) {
        setSelectedEmpresaId(data[0]._id);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      mostrarMensagem("Erro ao carregar empresas", "erro");
    } finally {
      setLoading(false);
    }
  };

  const carregarDados = async () => {
    if (!selectedEmpresaId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      const tecnicosRes = await fetch(`https://sirexa-api.onrender.com/api/tecnico/empresa/${selectedEmpresaId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const tecnicosData = await tecnicosRes.json();
      setTecnicos(Array.isArray(tecnicosData) ? tecnicosData : []);
      
      const funcionariosRes = await fetch(`https://sirexa-api.onrender.com/api/funcionarios?empresaId=${selectedEmpresaId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const funcionariosData = await funcionariosRes.json();
      
      const pendentesList = (Array.isArray(funcionariosData) ? funcionariosData : [])
        .filter(f => !f.isTecnico);
      setPendentes(pendentesList);
      
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      mostrarMensagem("Erro ao carregar dados", "erro");
    } finally {
      setLoading(false);
    }
  };

  const excluirTecnico = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este técnico permanentemente?")) return;

    try {
      const response = await fetch(`https://sirexa-api.onrender.com/api/tecnico/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        mostrarMensagem("✅ Técnico excluído com sucesso!", "sucesso");
        carregarDados();
      } else {
        mostrarMensagem("Erro ao excluir técnico", "erro");
      }
    } catch (error) {
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    }
  };

  const despromoverTecnico = async () => {
    if (!selectedTecnico) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/tecnico/despromover/${selectedTecnico._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        mostrarMensagem(`✅ ${selectedTecnico.nome} foi despromovido de técnico!`, "sucesso");
        setShowDespromoverModal(false);
        setSelectedTecnico(null);
        carregarDados();
      } else {
        const result = await response.json();
        mostrarMensagem(result.mensagem || "Erro ao despromover", "erro");
      }
    } catch (error) {
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    }
  };

  const abrirModalAtivacao = (funcionario) => {
    setSelectedFuncionario(funcionario);
    setShowPasswordModal(true);
    setNewPassword("");
    setConfirmPassword("");
    setModulosTemp({
      vendas: false,
      stock: false,
      facturacao: false,
      funcionarios: false,
      folhaSalarial: false,
      gestaoFaltas: false,
      gestaoAbonos: false,
      avaliacao: false,
      viaturas: false,
      abastecimentos: false,
      manutencoes: false,
      inventario: false,
      fornecedores: false,
      fluxoCaixa: false,
      contaCorrente: false,
      controloPagamento: false,
      custosReceitas: false,
      orcamentos: false,
      dre: false,
      indicadores: false,
      transferencias: false,
      reconciliacao: false,
      relatorios: false,
      graficos: false,
      analise: false
    });
  };

  const ativarTecnico = async () => {
    if (!newPassword) {
      mostrarMensagem("Digite uma senha", "erro");
      return;
    }
    if (newPassword !== confirmPassword) {
      mostrarMensagem("As senhas não coincidem", "erro");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/tecnico/ativar/${selectedFuncionario._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          senha: newPassword, 
          modulos: modulosTemp, 
          empresaId: selectedEmpresaId 
        })
      });
      
      if (response.ok) {
        mostrarMensagem("✅ Técnico ativado com sucesso!", "sucesso");
        setShowPasswordModal(false);
        setSelectedFuncionario(null);
        carregarDados();
      } else {
        const result = await response.json();
        mostrarMensagem(result.mensagem || "Erro ao ativar técnico", "erro");
      }
    } catch (error) {
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    }
  };

  const abrirModalDespromover = (tecnico) => {
    setSelectedTecnico(tecnico);
    setShowDespromoverModal(true);
  };

  const filtrarLista = (item) => {
    const termo = busca.toLowerCase();
    return item.nome?.toLowerCase().includes(termo) ||
           item.email?.toLowerCase().includes(termo) ||
           (item.funcao || item.cargo || "")?.toLowerCase().includes(termo);
  };

  const tecnicosFiltrados = tecnicos.filter(filtrarLista);
  const pendentesFiltrados = pendentes.filter(filtrarLista);

  if (loading) {
    return (
      <Layout title="Técnicos" showBackButton={true} backToRoute="/menu">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-400">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Técnicos" showBackButton={true} backToRoute="/menu">
      {/* Modal de Despromover */}
      {showDespromoverModal && selectedTecnico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl border border-red-500/30">
            <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 px-6 py-4 border-b border-gray-700 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-red-600 p-2 rounded-lg">
                    <PowerOff className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Despromover Técnico</h3>
                </div>
                <button
                  onClick={() => setShowDespromoverModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-700"
                >
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-700/30 rounded-xl p-3">
                <p className="text-xs text-gray-400">Técnico</p>
                <p className="text-white font-medium">{selectedTecnico.nome}</p>
                <p className="text-sm text-gray-400">{selectedTecnico.email}</p>
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                <p className="text-yellow-400 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  Atenção!
                </p>
                <p className="text-gray-300 text-sm mt-1">
                  Ao despromover este técnico, ele perderá acesso ao sistema. 
                  Ele voltará a ser apenas um funcionário normal.
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowDespromoverModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={despromoverTecnico}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 flex items-center gap-2"
              >
                <PowerOff size={16} />
                Despromover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ativação */}
      {showPasswordModal && selectedFuncionario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl border border-purple-500/30">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600 p-2 rounded-lg">
                    <Key className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Ativar Técnico</h3>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-700"
                >
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-700/30 rounded-xl p-3">
                <p className="text-xs text-gray-400">Funcionário</p>
                <p className="text-white font-medium">{selectedFuncionario.nome}</p>
                <p className="text-sm text-gray-400">{selectedFuncionario.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Senha *</label>
                <input
                  type="password"
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a senha"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirmar Senha *</label>
                <input
                  type="password"
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a senha"
                />
              </div>
              
              {/* Módulos de Acesso - Versão Completa */}
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-purple-400">Módulos de Acesso</label>
                  <button 
                    onClick={marcarTodosModulos}
                    className="text-xs px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-purple-300"
                  >
                    {Object.values(modulosTemp).every(v => v) ? "Desmarcar Todos" : "Marcar Todos"}
                  </button>
                </div>

                {/* Módulo Operacional */}
                <div className="bg-gray-700/30 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-gray-700/50">
                    <span className="font-semibold text-blue-400">📦 Módulo Operacional</span>
                    <button 
                      onClick={toggleGrupoOperacional}
                      className="text-xs px-2 py-1 bg-gray-600 rounded-lg hover:bg-gray-500"
                    >
                      {modulosTemp.vendas && modulosTemp.stock && modulosTemp.facturacao ? "Desmarcar" : "Marcar"} Grupo
                    </button>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.vendas} onChange={(e) => setModulosTemp({...modulosTemp, vendas: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-gray-300 text-sm">Vendas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.stock} onChange={(e) => setModulosTemp({...modulosTemp, stock: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-gray-300 text-sm">Estoque</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.facturacao} onChange={(e) => setModulosTemp({...modulosTemp, facturacao: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-gray-300 text-sm">Facturação</span>
                    </label>
                  </div>
                </div>

                {/* Recursos Humanos */}
                <div className="bg-gray-700/30 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-gray-700/50">
                    <span className="font-semibold text-green-400">👥 Recursos Humanos</span>
                    <button 
                      onClick={toggleGrupoRH}
                      className="text-xs px-2 py-1 bg-gray-600 rounded-lg hover:bg-gray-500"
                    >
                      {modulosTemp.funcionarios && modulosTemp.folhaSalarial && modulosTemp.gestaoFaltas && modulosTemp.gestaoAbonos && modulosTemp.avaliacao ? "Desmarcar" : "Marcar"} Grupo
                    </button>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.funcionarios} onChange={(e) => setModulosTemp({...modulosTemp, funcionarios: e.target.checked})} className="w-4 h-4 text-green-600 rounded" />
                      <span className="text-gray-300 text-sm">Funcionários</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.folhaSalarial} onChange={(e) => setModulosTemp({...modulosTemp, folhaSalarial: e.target.checked})} className="w-4 h-4 text-green-600 rounded" />
                      <span className="text-gray-300 text-sm">Folha Salarial</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.gestaoFaltas} onChange={(e) => setModulosTemp({...modulosTemp, gestaoFaltas: e.target.checked})} className="w-4 h-4 text-green-600 rounded" />
                      <span className="text-gray-300 text-sm">Gestão de Faltas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.gestaoAbonos} onChange={(e) => setModulosTemp({...modulosTemp, gestaoAbonos: e.target.checked})} className="w-4 h-4 text-green-600 rounded" />
                      <span className="text-gray-300 text-sm">Gestão de Abonos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.avaliacao} onChange={(e) => setModulosTemp({...modulosTemp, avaliacao: e.target.checked})} className="w-4 h-4 text-green-600 rounded" />
                      <span className="text-gray-300 text-sm">Avaliação de Desempenho</span>
                    </label>
                  </div>
                </div>

                {/* Gestão Patrimonial */}
                <div className="bg-gray-700/30 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-gray-700/50">
                    <span className="font-semibold text-yellow-400">🏗️ Gestão Patrimonial</span>
                    <button 
                      onClick={toggleGrupoPatrimonial}
                      className="text-xs px-2 py-1 bg-gray-600 rounded-lg hover:bg-gray-500"
                    >
                      {modulosTemp.viaturas && modulosTemp.abastecimentos && modulosTemp.manutencoes && modulosTemp.inventario ? "Desmarcar" : "Marcar"} Grupo
                    </button>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.viaturas} onChange={(e) => setModulosTemp({...modulosTemp, viaturas: e.target.checked})} className="w-4 h-4 text-yellow-600 rounded" />
                      <span className="text-gray-300 text-sm">Viaturas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.abastecimentos} onChange={(e) => setModulosTemp({...modulosTemp, abastecimentos: e.target.checked})} className="w-4 h-4 text-yellow-600 rounded" />
                      <span className="text-gray-300 text-sm">Abastecimentos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.manutencoes} onChange={(e) => setModulosTemp({...modulosTemp, manutencoes: e.target.checked})} className="w-4 h-4 text-yellow-600 rounded" />
                      <span className="text-gray-300 text-sm">Manutenções</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.inventario} onChange={(e) => setModulosTemp({...modulosTemp, inventario: e.target.checked})} className="w-4 h-4 text-yellow-600 rounded" />
                      <span className="text-gray-300 text-sm">Inventário</span>
                    </label>
                  </div>
                </div>

                {/* Financeiro */}
                <div className="bg-gray-700/30 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-gray-700/50">
                    <span className="font-semibold text-purple-400">💰 Financeiro</span>
                    <button 
                      onClick={toggleGrupoFinanceiro}
                      className="text-xs px-2 py-1 bg-gray-600 rounded-lg hover:bg-gray-500"
                    >
                      {modulosTemp.fornecedores && modulosTemp.fluxoCaixa && modulosTemp.contaCorrente && modulosTemp.controloPagamento && modulosTemp.custosReceitas && modulosTemp.orcamentos && modulosTemp.dre && modulosTemp.indicadores && modulosTemp.transferencias && modulosTemp.reconciliacao ? "Desmarcar" : "Marcar"} Grupo
                    </button>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.fornecedores} onChange={(e) => setModulosTemp({...modulosTemp, fornecedores: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                      <span className="text-gray-300 text-sm">Fornecedores</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.fluxoCaixa} onChange={(e) => setModulosTemp({...modulosTemp, fluxoCaixa: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                      <span className="text-gray-300 text-sm">Fluxo de Caixa</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.contaCorrente} onChange={(e) => setModulosTemp({...modulosTemp, contaCorrente: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                      <span className="text-gray-300 text-sm">Conta Corrente</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.controloPagamento} onChange={(e) => setModulosTemp({...modulosTemp, controloPagamento: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                      <span className="text-gray-300 text-sm">Controlo de Pagamento</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.custosReceitas} onChange={(e) => setModulosTemp({...modulosTemp, custosReceitas: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                      <span className="text-gray-300 text-sm">Custos e Receitas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.orcamentos} onChange={(e) => setModulosTemp({...modulosTemp, orcamentos: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                      <span className="text-gray-300 text-sm">Orçamentos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.dre} onChange={(e) => setModulosTemp({...modulosTemp, dre: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                      <span className="text-gray-300 text-sm">DRE</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.indicadores} onChange={(e) => setModulosTemp({...modulosTemp, indicadores: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                      <span className="text-gray-300 text-sm">Indicadores</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.transferencias} onChange={(e) => setModulosTemp({...modulosTemp, transferencias: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                      <span className="text-gray-300 text-sm">Transferências</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.reconciliacao} onChange={(e) => setModulosTemp({...modulosTemp, reconciliacao: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                      <span className="text-gray-300 text-sm">Reconciliação Bancária</span>
                    </label>
                  </div>
                </div>

                {/* Relatórios e Análises */}
                <div className="bg-gray-700/30 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-gray-700/50">
                    <span className="font-semibold text-orange-400">📊 Relatórios e Análises</span>
                    <button 
                      onClick={toggleGrupoRelatorios}
                      className="text-xs px-2 py-1 bg-gray-600 rounded-lg hover:bg-gray-500"
                    >
                      {modulosTemp.relatorios && modulosTemp.graficos && modulosTemp.analise ? "Desmarcar" : "Marcar"} Grupo
                    </button>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.relatorios} onChange={(e) => setModulosTemp({...modulosTemp, relatorios: e.target.checked})} className="w-4 h-4 text-orange-600 rounded" />
                      <span className="text-gray-300 text-sm">Relatórios</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.graficos} onChange={(e) => setModulosTemp({...modulosTemp, graficos: e.target.checked})} className="w-4 h-4 text-orange-600 rounded" />
                      <span className="text-gray-300 text-sm">Gráficos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={modulosTemp.analise} onChange={(e) => setModulosTemp({...modulosTemp, analise: e.target.checked})} className="w-4 h-4 text-orange-600 rounded" />
                      <span className="text-gray-300 text-sm">Análise Geral</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={ativarTecnico}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700"
              >
                Ativar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
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
        {empresas.length > 0 && (
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl p-4 border border-gray-700/50">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Building2 className="w-5 h-5 text-blue-400" />
                <span className="text-gray-300">Empresa:</span>
                <select
                  className="flex-1 md:w-64 p-2 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500"
                  value={selectedEmpresaId}
                  onChange={(e) => setSelectedEmpresaId(e.target.value)}
                >
                  {empresas.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.nome}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Pesquisar..." 
                    className="w-full pl-10 p-2 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={busca} 
                    onChange={(e) => setBusca(e.target.value)} 
                  />
                </div>
                <button 
                  onClick={carregarDados}
                  className="p-2 rounded-xl bg-gray-700/50 border border-gray-600 text-gray-400 hover:text-white"
                >
                  <RefreshCw size={18} />
                </button>
                <button 
                  onClick={() => navigate("/funcionarios/cadastrar")} 
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-4 py-2 rounded-xl transition flex items-center gap-2"
                >
                  <Plus size={18} /> Novo Funcionário
                </button>
              </div>
            </div>
          </div>
        )}

        {empresas.length === 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8 text-center">
            <Building2 className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <p className="text-yellow-400 text-lg">Nenhuma empresa encontrada</p>
            <p className="text-gray-400 mt-2">Cadastre uma empresa primeiro</p>
            <button
              onClick={() => navigate("/empresa/cadastrar")}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              Cadastrar Empresa
            </button>
          </div>
        )}

        {/* Pendentes de Ativação */}
        {empresas.length > 0 && pendentesFiltrados.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" /> Pendentes de Ativação ({pendentesFiltrados.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendentesFiltrados.map(f => (
                <div key={f._id} className="bg-gradient-to-br from-yellow-900/30 to-amber-900/30 rounded-2xl p-5 border border-yellow-500/30">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-600 to-amber-600 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">{f.nome}</h3>
                      <p className="text-sm text-gray-400">{f.email}</p>
                    </div>
                    <span className="px-2 py-1 rounded-lg text-xs font-medium bg-yellow-500/20 text-yellow-400">
                      Pendente
                    </span>
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <p className="text-gray-300 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" /> {f.telefone || "—"}
                    </p>
                    <p className="text-gray-300 flex items-center gap-2">
                      <UserCog className="w-4 h-4 text-gray-500" /> {f.funcao || f.cargo || "Função não definida"}
                    </p>
                  </div>
                  <button
                    onClick={() => abrirModalAtivacao(f)}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 py-2 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Key size={16} /> Ativar Técnico
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Técnicos Ativos */}
        {empresas.length > 0 && tecnicosFiltrados.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Técnicos Ativos ({tecnicosFiltrados.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tecnicosFiltrados.map(t => (
                <div key={t._id} className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl p-5 border border-gray-700/50">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                        <UserCog className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{t.nome}</h3>
                        <p className="text-sm text-gray-400">{t.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => navigate(`/tecnico/editar/${t._id}`)} 
                        className="bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white p-2 rounded-xl transition"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => abrirModalDespromover(t)} 
                        className="bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white p-2 rounded-xl transition"
                        title="Despromover (remover acesso)"
                      >
                        <PowerOff size={16} />
                      </button>
                      <button 
                        onClick={() => excluirTecnico(t._id)} 
                        className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-2 rounded-xl transition"
                        title="Excluir permanentemente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" /> {t.telefone || "—"}
                    </p>
                    <p className="text-gray-300 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-500" /> {t.funcao || "Técnico"}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.modulos?.vendas && <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Vendas</span>}
                      {t.modulos?.stock && <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Estoque</span>}
                      {t.modulos?.funcionarios && <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Funcionários</span>}
                      {t.modulos?.financeiro && <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">Financeiro</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nenhum resultado */}
        {empresas.length > 0 && tecnicosFiltrados.length === 0 && pendentesFiltrados.length === 0 && (
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl p-12 text-center border border-gray-700/50">
            <div className="bg-gray-700/30 rounded-full p-6 mb-4 inline-flex">
              <Users className="w-12 h-12 text-gray-500" />
            </div>
            <p className="text-gray-400 text-lg">Nenhum técnico encontrado para esta empresa</p>
            <p className="text-gray-500 text-sm mt-1">
              {busca ? "Tente ajustar os filtros de busca" : "Cadastre um funcionário e marque como técnico"}
            </p>
            <button
              onClick={() => navigate("/funcionarios/cadastrar")}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              Cadastrar Funcionário
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
      `}</style>
    </Layout>
  );
};

export default ListaTecnicos;