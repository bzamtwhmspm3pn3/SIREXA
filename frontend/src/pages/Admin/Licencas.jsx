// src/pages/Admin/Licencas.jsx
import React, { useState, useEffect } from 'react';
import LayoutAdmin from './LayoutAdmin';
import { Key, CheckCircle, XCircle, Copy, Loader2, Power } from 'lucide-react';
import API_URL from '../../config/api';

const Licencas = () => {
  const [licencas, setLicencas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    carregarLicencas();
  }, []);

  const carregarLicencas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('${API_URL}/gestor/admin/licencas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setLicencas(data.licencas || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const revogarLicenca = async (chave) => {
    if (!confirm(`Tem certeza que deseja revogar a licença ${chave}?`)) return;
    
    setActionLoading(chave);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/gestor/admin/licencas/${chave}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        await carregarLicencas();
        alert(`Licença ${chave} revogada com sucesso!`);
      }
    } catch (error) {
      alert('Erro ao revogar licença');
    } finally {
      setActionLoading(null);
    }
  };

  const copiarChave = (chave) => {
    navigator.clipboard.writeText(chave);
    alert(`Chave ${chave} copiada!`);
  };

  if (loading) {
    return (
      <LayoutAdmin title="Licenças">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-purple-400" size={40} />
        </div>
      </LayoutAdmin>
    );
  }

  return (
    <LayoutAdmin title="Gerenciar Licenças">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <Key className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Todas as Licenças</h2>
            <span className="text-sm text-gray-400">Total: {licencas.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr className="text-gray-300 text-sm">
                <th className="p-4 text-left">Chave</th>
                <th className="p-4 text-left">Cliente</th>
                <th className="p-4 text-left">Plano</th>
                <th className="p-4 text-left">Expiração</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {licencas.map((licenca) => (
                <tr key={licenca._id} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                  <td className="p-4 font-mono text-yellow-400 text-sm">{licenca.chave}</td>
                  <td className="p-4 text-gray-300">{licenca.email}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">{licenca.plano}</span></td>
                  <td className="p-4 text-gray-300">{licenca.dataExpiracao ? new Date(licenca.dataExpiracao).toLocaleDateString('pt-PT') : '—'}</td>
                  <td className="p-4 text-center">
                    {licenca.status === 'ativa' ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Ativa</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">{licenca.status}</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => copiarChave(licenca.chave)} className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30">
                        <Copy size={14} />
                      </button>
                      {licenca.status === 'ativa' && (
                        <button onClick={() => revogarLicenca(licenca.chave)} disabled={actionLoading === licenca.chave} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                          {actionLoading === licenca.chave ? <Loader2 className="animate-spin" size={14} /> : <Power size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </LayoutAdmin>
  );
};

export default Licencas;