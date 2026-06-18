import React, { useState, useEffect, useCallback } from 'react';
import LayoutAdmin from './LayoutAdmin';
import {
  Users, Building2, Key, CheckCircle, 
  Loader2, ShieldCheck, AlertTriangle, TrendingUp, Calendar,
  RefreshCw, Activity, UserCheck, DollarSign, BarChart3
} from 'lucide-react';
import API_URL from '../../config/api';

const SkeletonCard = () => (
  <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50 animate-pulse">
    <div className="h-4 bg-gray-700 rounded w-24 mb-3" />
    <div className="h-8 bg-gray-700 rounded w-16" />
  </div>
);

const StatCard = ({ label, value, icon: Icon, cor, formato }) => (
  <div className={`bg-gradient-to-br ${cor}/20 rounded-2xl p-5 border border-[${cor.replace('from-', '').split(' ')[0]}/30]`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-3xl font-bold text-white">
          {formato === 'moeda' ? `${Number(value).toLocaleString()} Kz` : value}
        </p>
      </div>
      <div className={`bg-[${cor.replace('from-', '').split(' ')[0]}/30] p-3 rounded-full`}>
        <Icon className={`text-[${cor.replace('from-', '').split(' ')[0]}]`} size={28} />
      </div>
    </div>
  </div>
);

const DashboardAdmin = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) { setError("Token não encontrado"); setLoading(false); return; }

    try {
      const [gestoresRes, empresasRes, licencasRes] = await Promise.all([
        fetch(`${API_URL}/gestor/admin/gestores`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/gestor/admin/empresas`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/gestor/admin/licencas`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!gestoresRes.ok || !empresasRes.ok || !licencasRes.ok) {
        throw new Error(`Erro HTTP: ${gestoresRes.status} / ${empresasRes.status} / ${licencasRes.status}`);
      }

      const [gestoresData, empresasData, licencasData] = await Promise.all([
        gestoresRes.json(), empresasRes.json(), licencasRes.json()
      ]);

      const gestores = gestoresData.gestores || [];
      const empresas = empresasData.empresas || [];
      const licencas = licencasData.licencas || [];
      const ativas = licencas.filter(l => l.status === 'ativa');

      setStats({
        totalGestores: gestores.length,
        totalEmpresas: empresas.length,
        totalLicencas: licencas.length,
        licencasAtivas: ativas.length,
        ultimosCadastros: gestores.slice(0, 5).map(g => ({
          _id: g._id, nome: g.nome, email: g.email,
          createdAt: g.createdAt, ativo: g.ativo !== false,
          empresasCount: g.empresas?.length || 0
        }))
      });
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  if (loading && !stats) {
    return (
      <LayoutAdmin title="Dashboard">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      </LayoutAdmin>
    );
  }

  return (
    <LayoutAdmin title="Dashboard Administrativo">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-purple-400" size={24} />
          <div>
            <h2 className="text-xl font-bold text-white">Visão Geral do Sistema</h2>
            <p className="text-gray-400 text-sm">Painel de Administração SIREXA</p>
          </div>
        </div>
        <button onClick={carregarDados} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm text-gray-300 transition disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'A atualizar...' : 'Actualizar'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Gestores" value={stats?.totalGestores || 0} icon={Users} cor="from-blue-600 to-blue-800" />
        <StatCard label="Total Empresas" value={stats?.totalEmpresas || 0} icon={Building2} cor="from-green-600 to-green-800" />
        <StatCard label="Licenças Activas" value={stats?.licencasAtivas || 0} icon={CheckCircle} cor="from-purple-600 to-purple-800" />
        <StatCard label="Total Licenças" value={stats?.totalLicencas || 0} icon={Key} cor="from-yellow-600 to-yellow-800" />
      </div>

      {error && (
        <div className="bg-red-600/10 border border-red-500/30 rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-400 shrink-0" size={20} />
              <div>
                <p className="text-red-400 text-sm font-medium">Erro ao carregar dados</p>
                <p className="text-gray-400 text-xs">{error}</p>
              </div>
            </div>
            <button onClick={carregarDados} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition">
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity size={18} className="text-blue-400" /> Gestores Recentes
            </h2>
          </div>
          <div>
            {stats?.ultimosCadastros?.length > 0 ? (
              <div className="divide-y divide-gray-700">
                {stats.ultimosCadastros.map((g) => (
                  <div key={g._id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-700/30 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{g.nome?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{g.nome}</p>
                        <p className="text-gray-400 text-xs">{g.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{g.empresasCount} empresa(s)</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${g.ativo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {g.ativo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">Nenhum gestor cadastrado</div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-green-400" /> Resumo do Sistema
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: 'Total Gestores', value: stats?.totalGestores || 0, icon: UserCheck, cor: 'blue' },
              { label: 'Total Empresas', value: stats?.totalEmpresas || 0, icon: Building2, cor: 'cyan' },
              { label: 'Licenças Activas', value: stats?.licencasAtivas || 0, icon: CheckCircle, cor: 'green' },
              { label: 'Licenças Expiradas', value: (stats?.totalLicencas || 0) - (stats?.licencasAtivas || 0), icon: AlertTriangle, cor: 'red' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-${item.cor}-600/20 flex items-center justify-center`}>
                    <item.icon size={16} className={`text-${item.cor}-400`} />
                  </div>
                  <span className="text-gray-300 text-sm">{item.label}</span>
                </div>
                <span className="text-white font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LayoutAdmin>
  );
};

export default DashboardAdmin;