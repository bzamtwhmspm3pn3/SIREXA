// src/pages/Admin/Licencas.jsx
import React, { useState, useEffect } from 'react';
import LayoutAdmin from './LayoutAdmin';
import { useAuth } from '../../contexts/AuthContext';
import { Key, CheckCircle, XCircle, Eye, Copy, Loader2 } from 'lucide-react';

const Licencas = () => {
  const { token } = useAuth();
  const [licencas, setLicencas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarLicencas();
  }, []);

  const carregarLicencas = async () => {
    try {
      const response = await fetch('https://sirexa-api.onrender.com/api/gestor/admin/licencas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setLicencas(data.licencas || []);
    } catch (error) {
      console.error('Erro ao carregar licenças:', error);
    } finally {
      setLoading(false);
    }
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
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">Todas as Licenças</h2>
            </div>
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
                <th className="p-4 text-left">Data Criação</th>
                <th className="p-4 text-left">Expiração</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {licencas.map((licenca) => (
                <tr key={licenca._id} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                  <td className="p-4">
                    <code className="text-yellow-400 text-sm font-mono">{licenca.chave}</code>
                  </td>
                  <td className="p-4 text-gray-300">{licenca.email}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                      {licenca.plano}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300">
                    {new Date(licenca.createdAt).toLocaleDateString('pt-PT')}
                  </td>
                  <td className="p-4 text-gray-300">
                    {licenca.dataExpiracao ? new Date(licenca.dataExpiracao).toLocaleDateString('pt-PT') : '—'}
                  </td>
                  <td className="p-4 text-center">
                    {licenca.status === 'ativa' ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs flex items-center gap-1 justify-center w-24 mx-auto">
                        <CheckCircle size={10} /> Ativa
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs flex items-center gap-1 justify-center w-24 mx-auto">
                        <XCircle size={10} /> {licenca.status}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1 text-blue-400 hover:text-blue-300 transition" title="Copiar chave">
                        <Copy size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {licencas.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    Nenhuma licença encontrada
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

export default Licencas;