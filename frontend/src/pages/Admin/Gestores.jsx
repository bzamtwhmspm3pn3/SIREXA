// src/pages/Admin/Gestores.jsx
import React, { useState, useEffect } from 'react';
import LayoutAdmin from './LayoutAdmin';
import { Users, CheckCircle, XCircle, Eye, Loader2, Power } from 'lucide-react';
import API_URL from '../../config/api';

const Gestores = () => {
  const [gestores, setGestores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    carregarGestores();
  }, []);

  const carregarGestores = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/gestor/admin/gestores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setGestores(data.gestores || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (gestorId, ativo) => {
    setActionLoading(gestorId);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/gestor/admin/gestores/${gestorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ativo: !ativo })
      });
      
      if (response.ok) {
        await carregarGestores();
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <LayoutAdmin title="Gestores">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-purple-400" size={40} />
        </div>
      </LayoutAdmin>
    );
  }

  return (
    <LayoutAdmin title="Gestores Cadastrados">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-bold text-white">Todos os Gestores</h2>
            <span className="text-sm text-gray-400 ml-auto">Total: {gestores.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr className="text-gray-300 text-sm">
                <th className="p-4 text-left">Nome</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Telefone</th>
                <th className="p-4 text-left">Empresas</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {gestores.map((gestor) => (
                <tr key={gestor._id} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                  <td className="p-4 text-white font-medium">{gestor.nome}</td>
                  <td className="p-4 text-gray-300">{gestor.email}</td>
                  <td className="p-4 text-gray-300">{gestor.telefone || '—'}</td>
                  <td className="p-4 text-gray-300">{gestor.empresas?.length || 0} empresa(s)</td>
                  <td className="p-4 text-center">
                    {gestor.ativo !== false ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Ativo</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">Inativo</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => toggleStatus(gestor._id, gestor.ativo)} 
                      disabled={actionLoading === gestor._id} 
                      className="p-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition"
                      title={gestor.ativo !== false ? 'Desativar' : 'Ativar'}
                    >
                      {actionLoading === gestor._id ? <Loader2 className="animate-spin" size={14} /> : <Power size={14} />}
                    </button>
                  </td>
                </tr>
              ))}
              {gestores.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
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

export default Gestores;