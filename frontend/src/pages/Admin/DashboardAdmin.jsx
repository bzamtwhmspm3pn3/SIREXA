// frontend/src/pages/Admin/DashboardAdmin.jsx
import React, { useState, useEffect } from 'react';
import LayoutAdmin from './LayoutAdmin';
import { 
  Users, Building2, Key, CheckCircle, 
  Loader2, ShieldCheck, AlertTriangle
} from 'lucide-react';

const DashboardAdmin = () => {
  const [stats, setStats] = useState({
    totalGestores: 0,
    totalEmpresas: 0,
    totalLicencas: 0,
    licencasAtivas: 0,
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
      const token = localStorage.getItem("token");
      
      if (!token) {
        throw new Error("Token não encontrado. Faça login novamente.");
      }
      
      // Buscar gestores
      const gestoresRes = await fetch('https://sirexa-api.onrender.com/api/gestor/admin/gestores', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!gestoresRes.ok) {
        throw new Error(`Erro ${gestoresRes.status} ao buscar gestores`);
      }
      const gestoresData = await gestoresRes.json();
      const gestores = gestoresData.gestores || [];
      
      // Buscar empresas
      const empresasRes = await fetch('https://sirexa-api.onrender.com/api/gestor/admin/empresas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const empresasData = await empresasRes.json();
      const empresas = empresasData.empresas || [];
      
      // Buscar licenças
      const licencasRes = await fetch('https://sirexa-api.onrender.com/api/gestor/admin/licencas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const licencasData = await licencasRes.json();
      const licencas = licencasData.licencas || [];
      
      setStats({
        totalGestores: gestores.length,
        totalEmpresas: empresas.length,
        totalLicencas: licencas.length,
        licencasAtivas: licencas.filter(l => l.status === 'ativa').length,
        ultimosCadastros: gestores.slice(0, 5)
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

      <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4 mb-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-blue-400" size={20} />
          <div>
            <p className="text-blue-400 text-sm font-medium">Painel Administrativo</p>
            <p className="text-gray-300 text-xs">Email: admin@sirexa.ao | Role: admin_sistema</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Últimos Gestores Cadastrados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr className="text-gray-300 text-sm">
                <th className="p-4 text-left">Nome</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Data</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.ultimosCadastros.map((gestor, index) => (
                <tr key={index} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                  <td className="p-4 text-white font-medium">{gestor.nome}</td>
                  <td className="p-4 text-gray-300">{gestor.email}</td>
                  <td className="p-4 text-gray-300">
                    {gestor.createdAt ? new Date(gestor.createdAt).toLocaleDateString('pt-PT') : '—'}
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                      Ativo
                    </span>
                  </td>
                </tr>
              ))}
              {stats.ultimosCadastros.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">
                    Nenhum gestor cadastrado ainda
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </LayoutAdmin>
  );
};

export default DashboardAdmin;