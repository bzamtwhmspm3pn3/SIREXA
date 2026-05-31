// frontend/src/pages/Admin/Planos.jsx
import React, { useState, useEffect } from 'react';
import LayoutAdmin from './LayoutAdmin';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, Truck, ShoppingCart, Users, BookOpen, 
  BarChart3, Settings, Save, Loader2, CheckCircle,
  Building2, Zap, AlertCircle, Award, Calendar, Shield,
  Edit, Plus, X, Trash2, Car, Fuel, Wrench, Boxes,
  TrendingUp, PieChart, Eye, ArrowRightLeft, DollarSign,
  FileText, ClipboardList, Wallet, Gift, RefreshCw,LayoutDashboard 
} from 'lucide-react';

const Planos = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [planos, setPlanos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });
  
  const API_URL = 'https://sirexa-api.onrender.com/api/gestor';
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: 0,
    duracaoDias: 365,
    ordem: 0,
    limites: {
      maxEmpresas: 1,
      maxUsuarios: 1,
      maxFuncionarios: 5,
      maxProdutos: 100,
      maxFornecedores: 20,
      maxClientes: 50
    },
    modulos: {
      // Operacional (3)
      vendas: false,
      stock: false,
      facturacao: false,
      // Recursos Humanos (5)
      funcionarios: false,
      folhaSalarial: false,
      gestaoFaltas: false,
      gestaoAbonos: false,
      avaliacao: false,
      // Gestão Patrimonial (4)
      viaturas: false,
      abastecimentos: false,
      manutencoes: false,
      inventario: false,
      // Financeiro (10)
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
      // Relatórios (3)
      relatorios: false,
      graficos: false,
      analise: false,
      // Contabilidade (10)
      contabilidade: false,
      planoContas: false,
      lancamentos: false,
      diarioGeral: false,
      razaoGeral: false,
      balancete: false,
      saldosContas: false,
      balancoPatrimonial: false,
      periodosFiscais: false,
      encerramento: false
    },
    ativo: true
  });

  // 🔥 TODOS OS 35 MÓDULOS ORGANIZADOS POR CATEGORIA
  const modulosDisponiveis = [
    // Operacional (3)
    { id: 'vendas', nome: 'Vendas', icone: ShoppingCart, categoria: 'Operacional' },
    { id: 'stock', nome: 'Stock', icone: Package, categoria: 'Operacional' },
    { id: 'facturacao', nome: 'Facturação', icone: FileText, categoria: 'Operacional' },
    
    // Recursos Humanos (5)
    { id: 'funcionarios', nome: 'Funcionários', icone: Users, categoria: 'Recursos Humanos' },
    { id: 'folhaSalarial', nome: 'Folha Salarial', icone: Wallet, categoria: 'Recursos Humanos' },
    { id: 'gestaoFaltas', nome: 'Gestão de Faltas', icone: Calendar, categoria: 'Recursos Humanos' },
    { id: 'gestaoAbonos', nome: 'Gestão de Abonos', icone: Gift, categoria: 'Recursos Humanos' },
    { id: 'avaliacao', nome: 'Avaliação', icone: BarChart3, categoria: 'Recursos Humanos' },
    
    // Gestão Patrimonial (4)
    { id: 'viaturas', nome: 'Viaturas', icone: Car, categoria: 'Gestão Patrimonial' },
    { id: 'abastecimentos', nome: 'Abastecimentos', icone: Fuel, categoria: 'Gestão Patrimonial' },
    { id: 'manutencoes', nome: 'Manutenções', icone: Wrench, categoria: 'Gestão Patrimonial' },
    { id: 'inventario', nome: 'Inventário', icone: Boxes, categoria: 'Gestão Patrimonial' },
    
    // Financeiro (10)
    { id: 'fornecedores', nome: 'Fornecedores', icone: Truck, categoria: 'Financeiro' },
    { id: 'fluxoCaixa', nome: 'Fluxo de Caixa', icone: TrendingUp, categoria: 'Financeiro' },
    { id: 'contaCorrente', nome: 'Conta Corrente', icone: Wallet, categoria: 'Financeiro' },
    { id: 'controloPagamento', nome: 'Controlo de Pagamentos', icone: FileText, categoria: 'Financeiro' },
    { id: 'custosReceitas', nome: 'Custos e Receitas', icone: PieChart, categoria: 'Financeiro' },
    { id: 'orcamentos', nome: 'Orçamentos', icone: ClipboardList, categoria: 'Financeiro' },
    { id: 'dre', nome: 'DRE', icone: BarChart3, categoria: 'Financeiro' },
    { id: 'indicadores', nome: 'Indicadores', icone: Eye, categoria: 'Financeiro' },
    { id: 'transferencias', nome: 'Transferências', icone: ArrowRightLeft, categoria: 'Financeiro' },
    { id: 'reconciliacao', nome: 'Reconciliação Bancária', icone: RefreshCw, categoria: 'Financeiro' },
    
    // Relatórios (3)
    { id: 'relatorios', nome: 'Relatórios', icone: FileText, categoria: 'Relatórios' },
    { id: 'graficos', nome: 'Gráficos', icone: BarChart3, categoria: 'Relatórios' },
    { id: 'analise', nome: 'Análise Geral', icone: PieChart, categoria: 'Relatórios' },
    
    // Contabilidade (10)
    { id: 'contabilidade', nome: 'Contabilidade', icone: BookOpen, categoria: 'Contabilidade' },
    { id: 'planoContas', nome: 'Plano de Contas', icone: BookOpen, categoria: 'Contabilidade' },
    { id: 'lancamentos', nome: 'Lançamentos', icone: FileText, categoria: 'Contabilidade' },
    { id: 'diarioGeral', nome: 'Diário Geral', icone: ClipboardList, categoria: 'Contabilidade' },
    { id: 'razaoGeral', nome: 'Razão Geral', icone: LayoutDashboard, categoria: 'Contabilidade' },
    { id: 'balancete', nome: 'Balancete', icone: TrendingUp, categoria: 'Contabilidade' },
    { id: 'saldosContas', nome: 'Saldos de Contas', icone: Wallet, categoria: 'Contabilidade' },
    { id: 'balancoPatrimonial', nome: 'Balanço Patrimonial', icone: PieChart, categoria: 'Contabilidade' },
    { id: 'periodosFiscais', nome: 'Períodos Fiscais', icone: Calendar, categoria: 'Contabilidade' },
    { id: 'encerramento', nome: 'Encerramento', icone: RefreshCw, categoria: 'Contabilidade' }
  ];

  // Agrupar módulos por categoria
  const modulosPorCategoria = modulosDisponiveis.reduce((acc, modulo) => {
    if (!acc[modulo.categoria]) acc[modulo.categoria] = [];
    acc[modulo.categoria].push(modulo);
    return acc;
  }, {});

  const planosPadrao = [
    { 
      nome: 'FREE', descricao: 'Teste gratuito por 7 dias', preco: 0, duracaoDias: 7, ordem: 1, 
      limites: { maxEmpresas: 1, maxUsuarios: 1, maxProdutos: 50, maxFornecedores: 10, maxClientes: 20, maxFuncionarios: 3 }, 
      modulos: { vendas: true, stock: true, facturacao: true, funcionarios: true, folhaSalarial: true, gestaoFaltas: true, gestaoAbonos: true, avaliacao: true, viaturas: true, abastecimentos: true, manutencoes: true, inventario: true, fornecedores: true, fluxoCaixa: true, contaCorrente: true, controloPagamento: true, custosReceitas: true, orcamentos: true, dre: true, indicadores: true, transferencias: true, reconciliacao: true, relatorios: true, graficos: true, analise: true, contabilidade: true, planoContas: true, lancamentos: true, diarioGeral: true, razaoGeral: true, balancete: true, saldosContas: true, balancoPatrimonial: true, periodosFiscais: true, encerramento: true },
      ativo: true 
    },
    { 
      nome: 'BÁSICO', descricao: 'Para pequenas empresas', preco: 29900, duracaoDias: 365, ordem: 2, 
      limites: { maxEmpresas: 1, maxUsuarios: 1, maxProdutos: 100, maxFornecedores: 20, maxClientes: 50, maxFuncionarios: 5 }, 
      modulos: { vendas: true, stock: true, facturacao: true, funcionarios: true, folhaSalarial: true, gestaoFaltas: true, gestaoAbonos: false, avaliacao: false, viaturas: false, abastecimentos: false, manutencoes: false, inventario: false, fornecedores: true, fluxoCaixa: true, contaCorrente: true, controloPagamento: true, custosReceitas: false, orcamentos: false, dre: true, indicadores: false, transferencias: false, reconciliacao: false, relatorios: true, graficos: true, analise: false, contabilidade: false, planoContas: false, lancamentos: false, diarioGeral: false, razaoGeral: false, balancete: false, saldosContas: false, balancoPatrimonial: false, periodosFiscais: false, encerramento: false },
      ativo: true 
    },
    { 
      nome: 'PROFISSIONAL', descricao: 'Para empresas em crescimento', preco: 79900, duracaoDias: 365, ordem: 3, 
      limites: { maxEmpresas: 3, maxUsuarios: 5, maxProdutos: 500, maxFornecedores: 100, maxClientes: 200, maxFuncionarios: 20 }, 
      modulos: { vendas: true, stock: true, facturacao: true, funcionarios: true, folhaSalarial: true, gestaoFaltas: true, gestaoAbonos: true, avaliacao: true, viaturas: true, abastecimentos: true, manutencoes: true, inventario: true, fornecedores: true, fluxoCaixa: true, contaCorrente: true, controloPagamento: true, custosReceitas: true, orcamentos: true, dre: true, indicadores: true, transferencias: true, reconciliacao: true, relatorios: true, graficos: true, analise: true, contabilidade: false, planoContas: false, lancamentos: false, diarioGeral: false, razaoGeral: false, balancete: false, saldosContas: false, balancoPatrimonial: false, periodosFiscais: false, encerramento: false },
      ativo: true 
    },
    { 
      nome: 'EMPRESARIAL', descricao: 'Solução completa', preco: 149900, duracaoDias: 365, ordem: 4, 
      limites: { maxEmpresas: 10, maxUsuarios: 20, maxProdutos: 5000, maxFornecedores: 500, maxClientes: 1000, maxFuncionarios: 100 }, 
      modulos: { vendas: true, stock: true, facturacao: true, funcionarios: true, folhaSalarial: true, gestaoFaltas: true, gestaoAbonos: true, avaliacao: true, viaturas: true, abastecimentos: true, manutencoes: true, inventario: true, fornecedores: true, fluxoCaixa: true, contaCorrente: true, controloPagamento: true, custosReceitas: true, orcamentos: true, dre: true, indicadores: true, transferencias: true, reconciliacao: true, relatorios: true, graficos: true, analise: true, contabilidade: true, planoContas: true, lancamentos: true, diarioGeral: true, razaoGeral: true, balancete: true, saldosContas: true, balancoPatrimonial: true, periodosFiscais: true, encerramento: true },
      ativo: true 
    },
    { 
      nome: 'PLATINUM', descricao: 'Ilimitado + Suporte prioritário', preco: 299900, duracaoDias: 365, ordem: 5, 
      limites: { maxEmpresas: -1, maxUsuarios: -1, maxProdutos: -1, maxFornecedores: -1, maxClientes: -1, maxFuncionarios: -1 }, 
      modulos: { vendas: true, stock: true, facturacao: true, funcionarios: true, folhaSalarial: true, gestaoFaltas: true, gestaoAbonos: true, avaliacao: true, viaturas: true, abastecimentos: true, manutencoes: true, inventario: true, fornecedores: true, fluxoCaixa: true, contaCorrente: true, controloPagamento: true, custosReceitas: true, orcamentos: true, dre: true, indicadores: true, transferencias: true, reconciliacao: true, relatorios: true, graficos: true, analise: true, contabilidade: true, planoContas: true, lancamentos: true, diarioGeral: true, razaoGeral: true, balancete: true, saldosContas: true, balancoPatrimonial: true, periodosFiscais: true, encerramento: true },
      ativo: true 
    }
  ];

  useEffect(() => {
    carregarPlanos();
  }, []);

  const carregarPlanos = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log('🔄 Carregando planos...');
      
      const response = await fetch(`${API_URL}/admin/planos`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Planos carregados:', data.planos?.length || 0);
        setPlanos(data.planos || []);
      } else {
        console.warn('⚠️ Erro ao carregar planos, usando padrão');
        setPlanos(planosPadrao);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar planos:', error);
      setPlanos(planosPadrao);
    } finally {
      setLoading(false);
    }
  };

  const salvarPlano = async () => {
    if (!formData.nome || formData.nome.trim() === '') {
      setMensagem({ texto: '❌ Nome do plano é obrigatório', tipo: 'erro' });
      setTimeout(() => setMensagem({ texto: '', tipo: '' }), 3000);
      return;
    }
    
    setSalvando(true);
    try {
      const token = localStorage.getItem("token");
      console.log('💾 Salvando plano:', formData.nome);
      
      const response = await fetch(`${API_URL}/admin/planos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Plano salvo:', data);
        setMensagem({ texto: `✅ Plano ${formData.nome} salvo com sucesso!`, tipo: 'sucesso' });
        setModalOpen(false);
        carregarPlanos();
        setTimeout(() => setMensagem({ texto: '', tipo: '' }), 3000);
      } else {
        const error = await response.json();
        console.error('❌ Erro ao salvar:', error);
        setMensagem({ texto: error.mensagem || '❌ Erro ao salvar plano', tipo: 'erro' });
      }
    } catch (error) {
      console.error('❌ Erro de conexão:', error);
      setMensagem({ texto: '❌ Erro ao conectar ao servidor', tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  };

  const toggleModulo = (moduloId) => {
    setFormData(prev => ({
      ...prev,
      modulos: { ...prev.modulos, [moduloId]: !prev.modulos[moduloId] }
    }));
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-AO').format(valor);
  };

  const getCorPlano = (nome) => {
    const cores = { FREE: 'gray', BÁSICO: 'blue', PROFISSIONAL: 'green', EMPRESARIAL: 'purple', PLATINUM: 'yellow' };
    return cores[nome] || 'gray';
  };

  if (loading) {
    return (
      <LayoutAdmin title="Planos">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-purple-400" size={40} />
        </div>
      </LayoutAdmin>
    );
  }

  return (
    <LayoutAdmin title="Planos e Módulos">
      {mensagem.texto && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === 'sucesso' ? 'bg-green-600' : 'bg-red-600'
          } text-white text-sm`}>
            {mensagem.tipo === 'sucesso' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {mensagem.texto}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Configuração de Planos</h2>
          <p className="text-gray-400 text-sm">Gerencie os planos e módulos disponíveis para os clientes</p>
        </div>
        <button 
          onClick={() => { setEditando(null); setFormData({...planosPadrao[1], _id: undefined}); setModalOpen(true); }}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-4 py-2 rounded-xl flex items-center gap-2"
        >
          <Plus size={18} /> Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {planos.map((plano) => (
          <div key={plano.nome} className={`bg-gradient-to-br from-${getCorPlano(plano.nome)}-600/20 to-${getCorPlano(plano.nome)}-800/20 rounded-2xl border border-${getCorPlano(plano.nome)}-500/30 overflow-hidden transition-all hover:scale-105`}>
            <div className={`p-4 border-b border-${getCorPlano(plano.nome)}-500/30 bg-${getCorPlano(plano.nome)}-600/10`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className={`text-${getCorPlano(plano.nome)}-400`} size={24} />
                  <h3 className="text-xl font-bold text-white">{plano.nome}</h3>
                </div>
                {plano.ativo ? (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Ativo</span>
                ) : (
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">Inativo</span>
                )}
              </div>
              <p className="text-gray-400 text-xs mt-1">{plano.descricao}</p>
            </div>

            <div className="p-4 text-center border-b border-gray-700/50">
              {plano.preco === 0 ? (
                <span className="text-2xl font-bold text-green-400">Grátis</span>
              ) : (
                <>
                  <span className="text-2xl font-bold text-white">{formatarMoeda(plano.preco)}</span>
                  <span className="text-gray-400 text-sm"> Kz</span>
                </>
              )}
              <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mt-1">
                <Calendar size={12} />
                {plano.duracaoDias === 7 ? '7 dias' : `${plano.duracaoDias} dias`}
              </div>
            </div>

            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 size={14} className="text-blue-400" />
                <span className="text-gray-300">
                  {plano.limites?.maxEmpresas === -1 ? 'Empresas Ilimitadas' : `Até ${plano.limites?.maxEmpresas || 1} empresa(s)`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users size={14} className="text-green-400" />
                <span className="text-gray-300">
                  {plano.limites?.maxUsuarios === -1 ? 'Usuários Ilimitados' : `Até ${plano.limites?.maxUsuarios || 1} usuário(s)`}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-gray-700/50 flex gap-2">
              <button 
                onClick={() => { setEditando(plano.nome); setFormData(plano); setModalOpen(true); }}
                className="flex-1 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition flex items-center justify-center gap-1"
              >
                <Edit size={14} /> Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Edição/Criação de Plano */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600 p-2 rounded-lg"><Package className="text-white" size={20} /></div>
                  <h2 className="text-xl font-bold text-white">{editando ? 'Editar' : 'Novo'} Plano</h2>
                </div>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Dados Básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome do Plano *</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:outline-none" 
                    value={formData.nome} 
                    onChange={(e) => setFormData({...formData, nome: e.target.value.toUpperCase()})} 
                    placeholder="EX: PROFISSIONAL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Preço (Kz)</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:outline-none" 
                    value={formData.preco} 
                    onChange={(e) => setFormData({...formData, preco: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                  <textarea 
                    rows="2" 
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:outline-none" 
                    value={formData.descricao} 
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duração (dias)</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:outline-none" 
                    value={formData.duracaoDias} 
                    onChange={(e) => setFormData({...formData, duracaoDias: parseInt(e.target.value) || 365})} 
                  />
                  <p className="text-xs text-gray-400 mt-1">Use 7 para FREE, 365 para planos anuais</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Ordem</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:outline-none" 
                    value={formData.ordem} 
                    onChange={(e) => setFormData({...formData, ordem: parseInt(e.target.value) || 0})} 
                  />
                </div>
              </div>

              {/* Limites */}
              <div className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Shield size={16} /> Limites do Plano</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Empresas</label>
                    <input type="number" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" value={formData.limites.maxEmpresas} onChange={(e) => setFormData({...formData, limites: {...formData.limites, maxEmpresas: parseInt(e.target.value) || 1}})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Usuários</label>
                    <input type="number" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" value={formData.limites.maxUsuarios} onChange={(e) => setFormData({...formData, limites: {...formData.limites, maxUsuarios: parseInt(e.target.value) || 1}})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Funcionários</label>
                    <input type="number" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" value={formData.limites.maxFuncionarios || 5} onChange={(e) => setFormData({...formData, limites: {...formData.limites, maxFuncionarios: parseInt(e.target.value) || 5}})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Produtos</label>
                    <input type="number" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" value={formData.limites.maxProdutos} onChange={(e) => setFormData({...formData, limites: {...formData.limites, maxProdutos: parseInt(e.target.value) || 100}})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Fornecedores</label>
                    <input type="number" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" value={formData.limites.maxFornecedores} onChange={(e) => setFormData({...formData, limites: {...formData.limites, maxFornecedores: parseInt(e.target.value) || 20}})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Clientes</label>
                    <input type="number" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" value={formData.limites.maxClientes || 50} onChange={(e) => setFormData({...formData, limites: {...formData.limites, maxClientes: parseInt(e.target.value) || 50}})} />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">Use -1 para ilimitado</p>
              </div>

              {/* Módulos - Organizados por Categoria */}
              <div className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="text-md font-semibold text-green-400 mb-4 flex items-center gap-2"><Zap size={16} /> Módulos Habilitados</h3>
                
                {Object.entries(modulosPorCategoria).map(([categoria, modulos]) => (
                  <div key={categoria} className="mb-6 last:mb-0">
                    <h4 className="text-sm font-semibold text-blue-400 mb-3 border-b border-blue-500/30 pb-2">{categoria}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {modulos.map((modulo) => (
                        <label key={modulo.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-700/50 transition">
                          <input 
                            type="checkbox" 
                            checked={formData.modulos[modulo.id] || false} 
                            onChange={() => toggleModulo(modulo.id)} 
                            className="w-4 h-4 rounded border-gray-600 accent-purple-500" 
                          />
                          <span className="text-gray-300 text-sm">{modulo.nome}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-400">
                    Total de módulos: <span className="text-green-400 font-bold">
                      {Object.values(formData.modulos).filter(v => v === true).length}
                    </span> / {modulosDisponiveis.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.ativo} 
                    onChange={(e) => setFormData({...formData, ativo: e.target.checked})} 
                    className="w-4 h-4 rounded border-gray-600 accent-green-500" 
                  />
                  <span className="text-gray-300">Plano Ativo</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={salvarPlano} disabled={salvando} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 rounded-xl flex items-center justify-center gap-2 transition">
                  {salvando ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {salvando ? 'Salvando...' : 'Salvar Plano'}
                </button>
                <button onClick={() => setModalOpen(false)} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
      `}</style>
    </LayoutAdmin>
  );
};

export default Planos;