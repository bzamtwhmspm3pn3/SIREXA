// src/pages/Tecnico/CadastroTecnico.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate } from "react-router-dom";
import { 
  Save, ArrowLeft, Shield, Building2, AlertCircle, 
  CheckCircle, Loader2, Users, TrendingUp, Users as UsersIcon,
  Car, DollarSign, FileText, Package, ShoppingCart, Receipt,
  ClipboardList, Calendar, Gift, BarChart3, Fuel, Wrench, Boxes,
  Wallet, PieChart, ArrowRightLeft, Truck, Eye
} from "lucide-react";

const CadastroTecnico = () => {
  const [empresas, setEmpresas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  
  // Estrutura completa de módulos
  const [formData, setFormData] = useState({
    empresaId: "",
    funcionarioId: "",
    senha: "",
    confirmarSenha: "",
    modulos: {
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
    }
  });
  
  // Estados para controle de expansão das seções
  const [expandedSections, setExpandedSections] = useState({
    operacional: true,
    recursosHumanos: false,
    gestaoPatrimonial: false,
    financeiro: false,
    relatorios: false
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    carregarEmpresas();
  }, []);

  useEffect(() => {
    if (formData.empresaId) {
      carregarFuncionariosPorEmpresa(formData.empresaId);
    } else {
      setFuncionarios([]);
    }
  }, [formData.empresaId]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const carregarEmpresas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/empresa", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      setEmpresas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      mostrarMensagem("Erro ao carregar empresas", "erro");
    } finally {
      setLoadingData(false);
    }
  };

  const carregarFuncionariosPorEmpresa = async (empresaId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/funcionarios?empresaId=${empresaId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      const funcionariosList = Array.isArray(data) ? data : (data.dados || []);
      
      // Filtrar funcionários que NÃO são técnicos
      const funcionariosNaoTecnicos = funcionariosList.filter(f => !f.isTecnico);
      
      console.log(`Funcionários da empresa ${empresaId}:`, funcionariosNaoTecnicos.length);
      setFuncionarios(funcionariosNaoTecnicos);
      setFormData(prev => ({ ...prev, funcionarioId: "" }));
      
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
      setFuncionarios([]);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.empresaId) {
      mostrarMensagem("Selecione uma empresa", "erro");
      return;
    }
    
    if (!formData.funcionarioId) {
      mostrarMensagem("Selecione um funcionário", "erro");
      return;
    }
    
    if (!formData.senha) {
      mostrarMensagem("Digite uma senha para o técnico", "erro");
      return;
    }
    
    if (formData.senha !== formData.confirmarSenha) {
      mostrarMensagem("As senhas não coincidem", "erro");
      return;
    }

    setLoading(true);
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/tecnico/promover/${formData.funcionarioId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          senha: formData.senha,
          modulos: formData.modulos,
          empresaId: formData.empresaId
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        mostrarMensagem("✅ Técnico cadastrado com sucesso!", "sucesso");
        setTimeout(() => {
          navigate("/tecnico");
        }, 2000);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao cadastrar", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (category, modules) => {
    const allSelected = modules.every(m => formData.modulos[m]);
    const newModulos = { ...formData.modulos };
    modules.forEach(m => {
      newModulos[m] = !allSelected;
    });
    setFormData({ ...formData, modulos: newModulos });
  };

  if (loadingData) {
    return (
      <Layout title="Cadastrar Técnico" showBackButton={true} backToRoute="/tecnico">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  const selectedFuncionario = funcionarios.find(f => f._id === formData.funcionarioId);

  return (
    <Layout title="Cadastrar Técnico" showBackButton={true} backToRoute="/tecnico">
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

      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Cadastrar Técnico</h2>
                <p className="text-sm text-gray-400">Selecione os módulos que o técnico terá acesso</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Empresa <span className="text-red-400">*</span>
              </label>
              <select
                className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                value={formData.empresaId}
                onChange={(e) => setFormData({...formData, empresaId: e.target.value, funcionarioId: ""})}
                required
              >
                <option value="">Selecione uma empresa</option>
                {empresas.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.nome}</option>
                ))}
              </select>
            </div>

            {/* Funcionário */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Funcionário <span className="text-red-400">*</span>
              </label>
              <select
                className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                value={formData.funcionarioId}
                onChange={(e) => setFormData({...formData, funcionarioId: e.target.value})}
                disabled={!formData.empresaId}
                required
              >
                <option value="">Selecione um funcionário</option>
                {funcionarios.map(func => (
                  <option key={func._id} value={func._id}>
                    {func.nome} - {func.funcao || func.cargo || "Sem função"}
                  </option>
                ))}
              </select>
            </div>

            {/* Informações do Funcionário */}
            {selectedFuncionario && (
              <div className="bg-purple-600/10 rounded-xl p-4 border border-purple-500/30">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-xs text-gray-400">Funcionário selecionado</p>
                    <p className="text-white font-medium">{selectedFuncionario.nome}</p>
                    <p className="text-sm text-gray-400">
                      {selectedFuncionario.funcao || selectedFuncionario.cargo || "Função não definida"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Senha */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Senha <span className="text-red-400">*</span></label>
                <input type="password" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" placeholder="Digite a senha" value={formData.senha} onChange={(e) => setFormData({...formData, senha: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirmar Senha <span className="text-red-400">*</span></label>
                <input type="password" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" placeholder="Confirme a senha" value={formData.confirmarSenha} onChange={(e) => setFormData({...formData, confirmarSenha: e.target.value})} required />
              </div>
            </div>

            {/* Módulos - Seção Operacional */}
            <div className="bg-gray-700/30 rounded-xl overflow-hidden">
              <button type="button" onClick={() => toggleSection('operacional')} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:bg-green-600/30 transition">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-green-400" size={20} />
                  <span className="font-semibold text-white">Módulo Operacional</span>
                </div>
                <span className="text-gray-400">{expandedSections.operacional ? '▼' : '▶'}</span>
              </button>
              {expandedSections.operacional && (
                <div className="p-4 space-y-3 border-t border-gray-600">
                  <div className="flex justify-end mb-2">
                    <button type="button" onClick={() => handleSelectAll('operacional', ['vendas', 'stock', 'facturacao'])} className="text-xs text-blue-400 hover:text-blue-300">
                      {formData.modulos.vendas && formData.modulos.stock && formData.modulos.facturacao ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                  </div>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><ShoppingCart size={18} className="text-green-400" /><span className="text-gray-300">Vendas</span></div>
                    <input type="checkbox" checked={formData.modulos.vendas} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, vendas: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><Package size={18} className="text-yellow-400" /><span className="text-gray-300">Stock</span></div>
                    <input type="checkbox" checked={formData.modulos.stock} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, stock: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><Receipt size={18} className="text-blue-400" /><span className="text-gray-300">Facturação</span></div>
                    <input type="checkbox" checked={formData.modulos.facturacao} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, facturacao: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                </div>
              )}
            </div>

            {/* Módulos - Seção RH */}
            <div className="bg-gray-700/30 rounded-xl overflow-hidden">
              <button type="button" onClick={() => toggleSection('recursosHumanos')} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:bg-purple-600/30 transition">
                <div className="flex items-center gap-3"><UsersIcon className="text-purple-400" size={20} /><span className="font-semibold text-white">Recursos Humanos</span></div>
                <span className="text-gray-400">{expandedSections.recursosHumanos ? '▼' : '▶'}</span>
              </button>
              {expandedSections.recursosHumanos && (
                <div className="p-4 space-y-3 border-t border-gray-600">
                  <div className="flex justify-end mb-2">
                    <button type="button" onClick={() => handleSelectAll('recursosHumanos', ['funcionarios', 'folhaSalarial', 'gestaoFaltas', 'gestaoAbonos', 'avaliacao'])} className="text-xs text-blue-400 hover:text-blue-300">Marcar Todos</button>
                  </div>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><ClipboardList size={18} className="text-blue-400" /><span className="text-gray-300">Funcionários</span></div>
                    <input type="checkbox" checked={formData.modulos.funcionarios} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, funcionarios: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><Wallet size={18} className="text-green-400" /><span className="text-gray-300">Folha Salarial</span></div>
                    <input type="checkbox" checked={formData.modulos.folhaSalarial} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, folhaSalarial: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><Calendar size={18} className="text-red-400" /><span className="text-gray-300">Gestão de Faltas</span></div>
                    <input type="checkbox" checked={formData.modulos.gestaoFaltas} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, gestaoFaltas: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><Gift size={18} className="text-yellow-400" /><span className="text-gray-300">Gestão de Abonos</span></div>
                    <input type="checkbox" checked={formData.modulos.gestaoAbonos} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, gestaoAbonos: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><BarChart3 size={18} className="text-purple-400" /><span className="text-gray-300">Avaliação de Desempenho</span></div>
                    <input type="checkbox" checked={formData.modulos.avaliacao} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, avaliacao: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                </div>
              )}
            </div>

            {/* Módulos - Seção Gestão Patrimonial */}
            <div className="bg-gray-700/30 rounded-xl overflow-hidden">
              <button type="button" onClick={() => toggleSection('gestaoPatrimonial')} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 hover:bg-cyan-600/30 transition">
                <div className="flex items-center gap-3"><Car className="text-cyan-400" size={20} /><span className="font-semibold text-white">Gestão Patrimonial</span></div>
                <span className="text-gray-400">{expandedSections.gestaoPatrimonial ? '▼' : '▶'}</span>
              </button>
              {expandedSections.gestaoPatrimonial && (
                <div className="p-4 space-y-3 border-t border-gray-600">
                  <div className="flex justify-end mb-2">
                    <button type="button" onClick={() => handleSelectAll('gestaoPatrimonial', ['viaturas', 'abastecimentos', 'manutencoes', 'inventario'])} className="text-xs text-blue-400 hover:text-blue-300">Marcar Todos</button>
                  </div>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><Car size={18} className="text-blue-400" /><span className="text-gray-300">Viaturas</span></div>
                    <input type="checkbox" checked={formData.modulos.viaturas} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, viaturas: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><Fuel size={18} className="text-green-400" /><span className="text-gray-300">Abastecimentos</span></div>
                    <input type="checkbox" checked={formData.modulos.abastecimentos} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, abastecimentos: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><Wrench size={18} className="text-red-400" /><span className="text-gray-300">Manutenções</span></div>
                    <input type="checkbox" checked={formData.modulos.manutencoes} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, manutencoes: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><Boxes size={18} className="text-yellow-400" /><span className="text-gray-300">Inventário</span></div>
                    <input type="checkbox" checked={formData.modulos.inventario} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, inventario: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                </div>
              )}
            </div>

            {/* Módulos - Seção Financeiro */}
            <div className="bg-gray-700/30 rounded-xl overflow-hidden">
              <button type="button" onClick={() => toggleSection('financeiro')} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:bg-emerald-600/30 transition">
                <div className="flex items-center gap-3"><DollarSign className="text-emerald-400" size={20} /><span className="font-semibold text-white">Financeiro</span></div>
                <span className="text-gray-400">{expandedSections.financeiro ? '▼' : '▶'}</span>
              </button>
              {expandedSections.financeiro && (
                <div className="p-4 space-y-3 border-t border-gray-600 max-h-96 overflow-y-auto">
                  <div className="flex justify-end mb-2">
                    <button type="button" onClick={() => handleSelectAll('financeiro', ['fornecedores', 'fluxoCaixa', 'contaCorrente', 'controloPagamento', 'custosReceitas', 'orcamentos', 'dre', 'indicadores', 'transferencias', 'reconciliacao'])} className="text-xs text-blue-400 hover:text-blue-300">Marcar Todos</button>
                  </div>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><Truck size={18} className="text-purple-400" /><span className="text-gray-300">Fornecedores</span></div>
                    <input type="checkbox" checked={formData.modulos.fornecedores} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, fornecedores: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><TrendingUp size={18} className="text-green-400" /><span className="text-gray-300">Fluxo de Caixa</span></div>
                    <input type="checkbox" checked={formData.modulos.fluxoCaixa} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, fluxoCaixa: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><Wallet size={18} className="text-blue-400" /><span className="text-gray-300">Conta Corrente</span></div>
                    <input type="checkbox" checked={formData.modulos.contaCorrente} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, contaCorrente: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><FileText size={18} className="text-yellow-400" /><span className="text-gray-300">Controlo de Pagamento</span></div>
                    <input type="checkbox" checked={formData.modulos.controloPagamento} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, controloPagamento: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><PieChart size={18} className="text-purple-400" /><span className="text-gray-300">Custos e Receitas</span></div>
                    <input type="checkbox" checked={formData.modulos.custosReceitas} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, custosReceitas: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><ClipboardList size={18} className="text-orange-400" /><span className="text-gray-300">Orçamentos</span></div>
                    <input type="checkbox" checked={formData.modulos.orcamentos} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, orcamentos: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><BarChart3 size={18} className="text-red-400" /><span className="text-gray-300">DRE</span></div>
                    <input type="checkbox" checked={formData.modulos.dre} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, dre: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><Eye size={18} className="text-cyan-400" /><span className="text-gray-300">Indicadores</span></div>
                    <input type="checkbox" checked={formData.modulos.indicadores} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, indicadores: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><ArrowRightLeft size={18} className="text-teal-400" /><span className="text-gray-300">Transferências</span></div>
                    <input type="checkbox" checked={formData.modulos.transferencias} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, transferencias: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><Wallet size={18} className="text-indigo-400" /><span className="text-gray-300">Reconciliação Bancária</span></div>
                    <input type="checkbox" checked={formData.modulos.reconciliacao} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, reconciliacao: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                </div>
              )}
            </div>

            {/* Módulos - Seção Relatórios */}
            <div className="bg-gray-700/30 rounded-xl overflow-hidden">
              <button type="button" onClick={() => toggleSection('relatorios')} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-rose-600/20 to-pink-600/20 hover:bg-rose-600/30 transition">
                <div className="flex items-center gap-3"><FileText className="text-rose-400" size={20} /><span className="font-semibold text-white">Relatórios e Análises</span></div>
                <span className="text-gray-400">{expandedSections.relatorios ? '▼' : '▶'}</span>
              </button>
              {expandedSections.relatorios && (
                <div className="p-4 space-y-3 border-t border-gray-600">
                  <div className="flex justify-end mb-2">
                    <button type="button" onClick={() => handleSelectAll('relatorios', ['relatorios', 'graficos', 'analise'])} className="text-xs text-blue-400 hover:text-blue-300">Marcar Todos</button>
                  </div>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><FileText size={18} className="text-blue-400" /><span className="text-gray-300">Relatórios</span></div>
                    <input type="checkbox" checked={formData.modulos.relatorios} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, relatorios: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><BarChart3 size={18} className="text-green-400" /><span className="text-gray-300">Gráficos</span></div>
                    <input type="checkbox" checked={formData.modulos.graficos} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, graficos: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                    <div className="flex items-center gap-3"><PieChart size={18} className="text-purple-400" /><span className="text-gray-300">Análise Geral</span></div>
                    <input type="checkbox" checked={formData.modulos.analise} onChange={(e) => setFormData({...formData, modulos: {...formData.modulos, analise: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" />
                  </label>
                </div>
              )}
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-3 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Cadastrando...</> : <><Shield className="w-5 h-5" /> Cadastrar Técnico</>}
              </button>
              <button type="button" onClick={() => navigate("/tecnico")} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all duration-200 flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" /> Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-out { 0% { opacity: 0; transform: translateY(-20px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
      `}</style>
    </Layout>
  );
};

export default CadastroTecnico;