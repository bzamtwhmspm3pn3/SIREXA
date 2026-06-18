import React, { useState, useEffect } from 'react';
import LayoutAdmin from './LayoutAdmin';
import { Users, Building2, Key, TrendingUp, Loader2, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import API_URL from '../../config/api';

const Estatisticas = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      const token = localStorage.getItem("token");
      const [gestoresRes, empresasRes, licencasRes] = await Promise.all([
        fetch(`${API_URL}/gestor/admin/gestores`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/gestor/admin/empresas`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/gestor/admin/licencas`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const gestores = await gestoresRes.json();
      const empresas = await empresasRes.json();
      const licencas = await licencasRes.json();

      const g = gestores.gestores || [];
      const e = empresas.empresas || [];
      const l = licencas.licencas || [];

      setStats({
        totalGestores: g.length,
        totalEmpresas: e.length,
        totalLicencas: l.length,
        licencasAtivas: l.filter(x => x.status === 'ativa').length,
        modulosMaisUsados: {},
        empresasPorPlano: {}
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { label: "Gestores", value: stats?.totalGestores || 0, icon: Users, cor: "from-blue-500 to-cyan-500" },
    { label: "Empresas", value: stats?.totalEmpresas || 0, icon: Building2, cor: "from-green-500 to-emerald-500" },
    { label: "Licenças Totais", value: stats?.totalLicencas || 0, icon: Key, cor: "from-yellow-500 to-orange-500" },
    { label: "Licenças Activas", value: stats?.licencasAtivas || 0, icon: CheckCircle, cor: "from-purple-500 to-pink-500" },
  ];

  return (
    <LayoutAdmin title="Estatísticas do Sistema">
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-400" size={40} /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, i) => (
              <div key={i} className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${card.cor}`}>
                    <card.icon size={24} className="text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{card.value}</p>
                <p className="text-gray-400 text-sm mt-1">{card.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </LayoutAdmin>
  );
};

export default Estatisticas;
