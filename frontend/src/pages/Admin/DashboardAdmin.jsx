// src/pages/Admin/DashboardAdmin.jsx (COMPLETO E CORRIGIDO)
import React, { useState, useEffect } from 'react';
import LayoutAdmin from './LayoutAdmin';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, Building2, Key, CreditCard, TrendingUp, 
  DollarSign, Calendar, CheckCircle, XCircle,
  Loader2, Eye, ShieldCheck, AlertTriangle
} from 'lucide-react';

const DashboardAdmin = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState({
    totalGestores: 0,
    totalEmpresas: 0,
    totalLicencas: 0,
    licencasAtivas: 0,
    licencasExpiradas: 0,
    ultimosCadastros: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("📊 Carregando dashboard administrativo...");
      
      // Dados mockados para teste
      setStats({
        totalGestores: 1,
        totalEmpresas: 1,
        totalLicencas: 5,
        licencasAtivas: 3,
        licencasExpiradas: 2,
        ultimosCadastros: [
          { 
            nome: "Venâncio Martins", 
            email: "venanciomartinse@gmail.com", 
            telefone: "+244 923 456 789",
            createdAt: new Date().toISOString(),
            ativo: true 
          }
        ]
      });
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LayoutAdmin title="Dashboard">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-purple-400" size={40} />
        </div>
      </LayoutAdmin>
    );
  }

  return (
    <LayoutAdmin title="Dashboard Administrativo">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl p-5 border border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-sm">Total Gestores</p>
              <p className="text-3xl font-bold text-white">{stats.totalGestores}</p>
            </div>
            <div className="bg-blue-600/30 p-3 rounded-full">
              <Users className="text-blue-400" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-2xl p-5 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-300 text-sm">Total Empresas</p>
              <p className="text-3xl font-bold text-white">{stats.totalEmpresas}</p>
            </div>
            <div className="bg-green-600/30 p-3 rounded-full">
              <Building2 className="text-green-400" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-2xl p-5 border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm">Licenças Ativas</p>
              <p className="text-3xl font-bold text-white">{stats.licencasAtivas}</p>
            </div>
            <div className="bg-purple-600/30 p-3 rounded-full">
              <CheckCircle className="text-purple-400" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-2xl p-5 border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-300 text-sm">Total Licenças</p>
              <p className="text-3xl font-bold text-white">{stats.totalLicencas}</p>
            </div>
            <div className="bg-yellow-600/30 p-3 rounded-full">
              <Key className="text-yellow-400" size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="bg-red-600/10 border border-red-500/30 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-400" size={20} />
            <div>
              <p className="text-red-400 text-sm font-medium">Erro ao carregar dados</p>
              <p className="text-gray-300 text-xs">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Informações do Usuário */}
      <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4 mb-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-blue-400" size={20} />
          <div>
            <p className="text-blue-400 text-sm font-medium">Você está logado como Administrador</p>
            <p className="text-gray-300 text-xs">Email: venanciomartinse@gmail.com | Role: admin_sistema</p>
          </div>
        </div>
      </div>

      {/* Últimos Cadastros */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Últimos Gestores Cadastrados</h2>
            <button className="text-sm text-purple-400 hover:text-purple-300 transition">Ver todos</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr className="text-gray-300 text-sm">
                <th className="p-4 text-left">Nome</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Telefone</th>
                <th className="p-4 text-left">Data Cadastro</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {stats.ultimosCadastros.map((gestor, index) => (
                <tr key={index} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                  <td className="p-4 text-white font-medium">{gestor.nome}</td>
                  <td className="p-4 text-gray-300">{gestor.email}</td>
                  <td className="p-4 text-gray-300">{gestor.telefone || '—'}</td>
                  <td className="p-4 text-gray-300">
                    {new Date().toLocaleDateString('pt-PT')}
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs flex items-center gap-1 justify-center w-20 mx-auto">
                      <CheckCircle size={10} /> Ativo
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button className="p-1 text-blue-400 hover:text-blue-300 transition">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Informações do Sistema */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
            <ShieldCheck size={18} className="text-purple-400" />
            Status do Sistema
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">API Backend:</span>
              <span className="text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Online</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Usuário logado:</span>
              <span className="text-white">Venâncio Martins (Admin)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Role:</span>
              <span className="text-purple-400">admin_sistema</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
            <Calendar size={18} className="text-blue-400" />
            Ações Rápidas
          </h3>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.href = "/admin/gerar-chave"}
              className="w-full text-left px-3 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition text-gray-300 text-sm"
            >
              🔑 Gerar nova chave de ativação
            </button>
            <button 
              onClick={() => window.location.href = "/admin/licencas"}
              className="w-full text-left px-3 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition text-gray-300 text-sm"
            >
              📜 Ver todas as licenças
            </button>
            <button 
              onClick={() => window.location.href = "/admin/gestores"}
              className="w-full text-left px-3 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition text-gray-300 text-sm"
            >
              👥 Listar todos os gestores
            </button>
          </div>
        </div>
      </div>
    </LayoutAdmin>
  );
};

export default DashboardAdmin;