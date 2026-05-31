// frontend/src/pages/Admin/Gestores.jsx
import React, { useState, useEffect } from 'react';
import LayoutAdmin from './LayoutAdmin';
import { Users, CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';

const Gestores = () => {
  const [gestores, setGestores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarGestores();
  }, []);

  const carregarGestores = async () => {
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        throw new Error("Token não encontrado");
      }
      
      const response = await fetch('https://sirexa-api.onrender.com/api/gestor/admin/gestores', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setGestores(data.gestores || []);
    } catch (error) {
      console.error('Erro ao carregar gestores:', error);
    } finally {
      setLoading(false);
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-bold text-white">Todos os Gestores</h2>
            </div>
            <span className="text-sm text-gray-400">Total: {gestores.length}</span>
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
              {gestores.map((gestor) => (
                <tr key={gestor._id} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                  <td className="p-4 text-white font-medium">{gestor.nome}</td>
                  <td className="p-4 text-gray-300">{gestor.email}</td>
                  <td className="p-4 text-gray-300">{gestor.telefone || '—'}</td>
                  <td className="p-4 text-gray-300">
                    {gestor.createdAt ? new Date(gestor.createdAt).toLocaleDateString('pt-PT') : '—'}
                  </td>
                  <td className="p-4 text-center">
                    {gestor.ativo !== false ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs flex items-center gap-1 justify-center w-20 mx-auto">
                        <CheckCircle size={10} /> Ativo
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs flex items-center gap-1 justify-center w-20 mx-auto">
                        <XCircle size={10} /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button className="p-1 text-blue-400 hover:text-blue-300 transition" title="Visualizar">
                      <Eye size={16} />
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