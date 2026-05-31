// src/pages/Admin/Empresas.jsx
import React, { useState, useEffect } from 'react';
import LayoutAdmin from './LayoutAdmin';
import { Building2, CheckCircle, XCircle, Eye, Loader2, Power } from 'lucide-react';

const Empresas = () => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const carregarEmpresas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('https://sirexa-api.onrender.com/api/gestor/admin/empresas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setEmpresas(data.empresas || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (empresaId, ativo) => {
    setActionLoading(empresaId);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/empresa/${empresaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ativo: !ativo })
      });
      
      if (response.ok) {
        await carregarEmpresas();
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <LayoutAdmin title="Empresas">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-purple-400" size={40} />
        </div>
      </LayoutAdmin>
    );
  }

  return (
    <LayoutAdmin title="Empresas Cadastradas">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <Building2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Todas as Empresas</h2>
            <span className="text-sm text-gray-400">Total: {empresas.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr className="text-gray-300 text-sm">
                <th className="p-4 text-left">Nome</th>
                <th className="p-4 text-left">NIF</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Gestor</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr key={empresa._id} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                  <td className="p-4 text-white font-medium">{empresa.nome}</td>
                  <td className="p-4 text-gray-300">{empresa.nif}</td>
                  <td className="p-4 text-gray-300">{empresa.contactos?.email || '—'}</td>
                  <td className="p-4 text-gray-300">{empresa.gestorNome || '—'}</td>
                  <td className="p-4 text-center">
                    {empresa.ativo !== false ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Ativa</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">Inativa</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => toggleStatus(empresa._id, empresa.ativo)} disabled={actionLoading === empresa._id} className="p-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30">
                      {actionLoading === empresa._id ? <Loader2 className="animate-spin" size={14} /> : <Power size={14} />}
                    </button>
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

export default Empresas;