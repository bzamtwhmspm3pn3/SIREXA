// src/pages/Gestor/ConfigurarModulos.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, Truck, ShoppingCart, Users, BookOpen, 
  BarChart3, Settings, Save, Loader2, CheckCircle,
  Building2, Zap, AlertCircle, Award, Calendar, Database, Shield
} from 'lucide-react';
import API_URL from '../../config/api';

const ConfigurarModulos = () => {
  const { token, empresaId, user, empresaPlano, empresaModulos: modulosIniciais } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const [modulosSelecionados, setModulosSelecionados] = useState([]);
  const [planoInfo, setPlanoInfo] = useState(null);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  const modulosDisponiveis = [
    { id: 'stock', nome: 'Stock', icone: Package, descricao: 'Gestão de inventário e produtos' },
    { id: 'fornecedores', nome: 'Fornecedores', icone: Truck, descricao: 'Cadastro e gestão de fornecedores' },
    { id: 'gestaoCompras', nome: 'Gestão de Compras', icone: ShoppingCart, descricao: 'Compras e entradas de mercadoria' },
    { id: 'vendas', nome: 'Vendas', icone: ShoppingCart, descricao: 'Registo de vendas e facturação' },
    { id: 'rh', nome: 'Recursos Humanos', icone: Users, descricao: 'Funcionários, folha salarial, faltas' },
    { id: 'contabilidade', nome: 'Contabilidade', icone: BookOpen, descricao: 'Plano de contas, lançamentos, DRE' },
    { id: 'financas', nome: 'Finanças', icone: BarChart3, descricao: 'Fluxo de caixa, indicadores' },
    { id: 'relatorios', nome: 'Relatórios', icone: BarChart3, descricao: 'Relatórios e análises' },
    { id: 'dashboard', nome: 'Dashboard', icone: Zap, descricao: 'Painel de controle' },
    { id: 'config', nome: 'Configurações', icone: Settings, descricao: 'Configurações do sistema' }
  ];

  // Planos disponíveis
  const planos = {
    FREE: { nome: 'FREE', cor: 'gray', descricao: 'Plano gratuito - 7 dias', limiteEmpresas: 1, limiteUsuarios: 1 },
    BASICO: { nome: 'BÁSICO', cor: 'blue', descricao: 'Para pequenas empresas', limiteEmpresas: 1, limiteUsuarios: 1 },
    PROFISSIONAL: { nome: 'PROFISSIONAL', cor: 'green', descricao: 'Para empresas em crescimento', limiteEmpresas: 3, limiteUsuarios: 5 },
    EMPRESARIAL: { nome: 'EMPRESARIAL', cor: 'purple', descricao: 'Solução completa', limiteEmpresas: 10, limiteUsuarios: 20 },
    PLATINUM: { nome: 'PLATINUM', cor: 'yellow', descricao: 'Ilimitado + Suporte prioritário', limiteEmpresas: -1, limiteUsuarios: -1 }
  };

  useEffect(() => {
    carregarEmpresa();
  }, [empresaId]);

  const carregarEmpresa = async () => {
    try {
      const response = await fetch(`${API_URL}/empresa/${empresaId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setEmpresa(data);
      setModulosSelecionados(data.modulosAtivos || ['stock', 'fornecedores']);
      
      const planoNome = data.plano || 'FREE';
      setPlanoInfo(planos[planoNome] || planos.FREE);
    } catch (error) {
      console.error('Erro:', error);
      setModulosSelecionados(modulosIniciais || ['stock', 'fornecedores']);
      setPlanoInfo(planos[empresaPlano || 'FREE'] || planos.FREE);
    } finally {
      setLoading(false);
    }
  };

  const toggleModulo = (moduloId) => {
    setModulosSelecionados(prev => 
      prev.includes(moduloId) 
        ? prev.filter(id => id !== moduloId)
        : [...prev, moduloId]
    );
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const response = await fetch(`${API_URL}/empresa/${empresaId}/modulos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ modulosAtivos: modulosSelecionados })
      });

      if (response.ok) {
        setMensagem({ texto: '✅ Módulos atualizados com sucesso!', tipo: 'sucesso' });
        setTimeout(() => setMensagem({ texto: '', tipo: '' }), 3000);
      } else {
        setMensagem({ texto: '❌ Erro ao salvar módulos', tipo: 'erro' });
      }
    } catch (error) {
      setMensagem({ texto: '❌ Erro ao conectar ao servidor', tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Configurar Módulos" showBackButton={true}>
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  const getCorClasse = (cor) => {
    const cores = {
      gray: 'gray',
      blue: 'blue',
      green: 'green',
      purple: 'purple',
      yellow: 'yellow'
    };
    return cores[cor] || 'gray';
  };

  return (
    <Layout title="Configurar Módulos" showBackButton={true}>
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

      <div className="max-w-4xl mx-auto">
        {/* Info do Plano */}
        <div className={`bg-gradient-to-r from-${getCorClasse(planoInfo.cor)}-600/20 to-${getCorClasse(planoInfo.cor)}-800/20 rounded-2xl p-6 mb-8 border border-${getCorClasse(planoInfo.cor)}-500/30`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Award className={`text-${getCorClasse(planoInfo.cor)}-400`} size={24} />
                <h2 className="text-2xl font-bold text-white">Plano {planoInfo.nome}</h2>
              </div>
              <p className="text-gray-300 mt-1">{planoInfo.descricao}</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Building2 size={14} />
                  {planoInfo.limiteEmpresas === -1 ? 'Empresas Ilimitadas' : `Até ${planoInfo.limiteEmpresas} empresa(s)`}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Users size={14} />
                  {planoInfo.limiteUsuarios === -1 ? 'Usuários Ilimitados' : `Até ${planoInfo.limiteUsuarios} usuário(s)`}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Calendar size={14} />
                  {empresa?.dataExpiracaoPlano ? `Expira em ${new Date(empresa.dataExpiracaoPlano).toLocaleDateString()}` : 'Sem expiração'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Empresa atual</p>
              <p className="text-white font-medium">{empresa?.nome || 'Carregando...'}</p>
            </div>
          </div>
        </div>

        {/* Grid de Módulos */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Módulos Disponíveis</h2>
            <p className="text-gray-400 text-sm">Selecione os módulos que deseja ativar no seu plano</p>
            {planoInfo.nome === 'FREE' && (
              <p className="text-yellow-400 text-xs mt-2 flex items-center gap-1">
                <Zap size={12} /> Plano FREE: Todos os módulos disponíveis durante o período de teste
              </p>
            )}
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modulosDisponiveis.map((modulo) => {
                const Icone = modulo.icone;
                const isSelected = modulosSelecionados.includes(modulo.id);
                
                return (
                  <button
                    key={modulo.id}
                    onClick={() => toggleModulo(modulo.id)}
                    className={`flex items-start gap-4 p-4 rounded-xl transition-all text-left ${
                      isSelected 
                        ? 'bg-blue-600/20 border border-blue-500/50' 
                        : 'bg-gray-700/30 border border-gray-600 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600/30' : 'bg-gray-600/30'}`}>
                      <Icone size={24} className={isSelected ? 'text-blue-400' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                          {modulo.nome}
                        </h3>
                        {isSelected && <CheckCircle size={16} className="text-green-400" />}
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{modulo.descricao}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700">
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {salvando ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {salvando ? 'Salvando...' : 'Salvar Configuração'}
              </button>
              <p className="text-gray-500 text-xs text-center mt-3">
                Os módulos ativados serão exibidos no menu principal do sistema
              </p>
            </div>
          </div>
        </div>

        {/* Limites do Plano */}
        <div className="mt-6 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <Shield size={14} /> Limites do seu plano
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Empresas</p>
              <p className="text-white font-medium">
                {planoInfo.limiteEmpresas === -1 ? 'Ilimitadas' : `${planoInfo.limiteEmpresas}`}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Usuários</p>
              <p className="text-white font-medium">
                {planoInfo.limiteUsuarios === -1 ? 'Ilimitados' : `${planoInfo.limiteUsuarios}`}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Produtos</p>
              <p className="text-white font-medium">
                {empresa?.limites?.maxProdutos || 100}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Fornecedores</p>
              <p className="text-white font-medium">
                {empresa?.limites?.maxFornecedores || 20}
              </p>
            </div>
          </div>
        </div>
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

export default ConfigurarModulos;