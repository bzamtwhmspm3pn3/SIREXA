// src/pages/Tecnico/EditarTecnico.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Save, ArrowLeft, Shield, Mail, Phone, CheckCircle, AlertCircle, Loader2,
  TrendingUp, Users, Car, DollarSign, FileText, Package, ShoppingCart, Receipt,
  ClipboardList, Calendar, Gift, BarChart3, Fuel, Wrench, Boxes,
  Wallet, PieChart, ArrowRightLeft, Truck, Eye
} from "lucide-react";

const EditarTecnico = () => {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    funcao: "",
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
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  
  const [expandedSections, setExpandedSections] = useState({
    operacional: true,
    recursosHumanos: false,
    gestaoPatrimonial: false,
    financeiro: false,
    relatorios: false
  });
  
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    carregarTecnico();
  }, []);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 2000);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const carregarTecnico = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/tecnico/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      
      // Carregar os módulos existentes ou usar valores padrão
      const modulosCarregados = data.modulos || {};
      
      setFormData({
        nome: data.nome || "",
        email: data.email || "",
        telefone: data.telefone || "",
        funcao: data.funcao || data.cargo || "",
        modulos: {
          // Operacional
          vendas: modulosCarregados.vendas || false,
          stock: modulosCarregados.stock || false,
          facturacao: modulosCarregados.facturacao || false,
          // Recursos Humanos
          funcionarios: modulosCarregados.funcionarios || false,
          folhaSalarial: modulosCarregados.folhaSalarial || false,
          gestaoFaltas: modulosCarregados.gestaoFaltas || false,
          gestaoAbonos: modulosCarregados.gestaoAbonos || false,
          avaliacao: modulosCarregados.avaliacao || false,
          // Gestão Patrimonial
          viaturas: modulosCarregados.viaturas || false,
          abastecimentos: modulosCarregados.abastecimentos || false,
          manutencoes: modulosCarregados.manutencoes || false,
          inventario: modulosCarregados.inventario || false,
          // Financeiro
          fornecedores: modulosCarregados.fornecedores || false,
          fluxoCaixa: modulosCarregados.fluxoCaixa || false,
          contaCorrente: modulosCarregados.contaCorrente || false,
          controloPagamento: modulosCarregados.controloPagamento || false,
          custosReceitas: modulosCarregados.custosReceitas || false,
          orcamentos: modulosCarregados.orcamentos || false,
          dre: modulosCarregados.dre || false,
          indicadores: modulosCarregados.indicadores || false,
          transferencias: modulosCarregados.transferencias || false,
          reconciliacao: modulosCarregados.reconciliacao || false,
          // Relatórios
          relatorios: modulosCarregados.relatorios || false,
          graficos: modulosCarregados.graficos || false,
          analise: modulosCarregados.analise || false
        }
      });
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao carregar técnico", "erro");
    } finally {
      setLoadingData(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const dadosEnvio = {
      nome: formData.nome,
      email: formData.email,
      telefone: formData.telefone,
      funcao: formData.funcao,
      modulos: formData.modulos
    };
    
    if (novaSenha && novaSenha === confirmarSenha) {
      dadosEnvio.senha = novaSenha;
    } else if (novaSenha || confirmarSenha) {
      mostrarMensagem("As senhas não coincidem", "erro");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/tecnico/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(dadosEnvio)
      });
      
      if (response.ok) {
        setMensagem({ texto: "✅ Técnico atualizado!", tipo: "sucesso" });
        setRedirecting(true);
        setTimeout(() => {
          window.location.href = "/tecnico";
        }, 500);
      } else {
        const error = await response.json();
        mostrarMensagem(error.mensagem || "Erro ao atualizar", "erro");
        setLoading(false);
      }
    } catch (error) {
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Layout title="Editar Técnico" showBackButton={true} backToRoute="/tecnico">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Editar Técnico" showBackButton={true} backToRoute="/tecnico">
      {redirecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-center max-w-sm mx-4 shadow-2xl border border-green-500/30 animate-scale-in">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Sucesso!</h3>
            <p className="text-gray-300 text-sm">Técnico atualizado.</p>
            <p className="text-green-400 text-xs mt-2">Redirecionando...</p>
          </div>
        </div>
      )}

      {mensagem.texto && !redirecting && (
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
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Editar Técnico</h2>
                <p className="text-sm text-gray-400">Atualize os dados e permissões do técnico</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Dados Básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome Completo *</label>
                <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                <input type="email" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label>
                <input type="tel" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Função</label>
                <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all" placeholder="Ex: Técnico de Vendas" value={formData.funcao} onChange={(e) => setFormData({...formData, funcao: e.target.value})} />
              </div>
            </div>

            {/* Alterar Senha */}
            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-md font-semibold text-purple-400 mb-3">Alterar Senha (opcional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nova Senha</label>
                  <input type="password" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Digite a nova senha" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirmar Senha</label>
                  <input type="password" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Confirme a nova senha" />
                </div>
              </div>
            </div>

            {/* Módulos - Seção Operacional */}
            <div className="bg-gray-700/30 rounded-xl overflow-hidden">
              <button type="button" onClick={() => toggleSection('operacional')} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:bg-green-600/30 transition">
                <div className="flex items-center gap-3"><TrendingUp className="text-green-400" size={20} /><span className="font-semibold text-white">Módulo Operacional</span></div>
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
                <div className="flex items-center gap-3"><Users className="text-purple-400" size={20} /><span className="font-semibold text-white">Recursos Humanos</span></div>
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
              <button type="submit" disabled={loading || redirecting} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-3 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</> : <><Save className="w-5 h-5" /> Salvar Alterações</>}
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
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </Layout>
  );
};

export default EditarTecnico;