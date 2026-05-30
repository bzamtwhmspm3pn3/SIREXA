// src/pages/Admin/Licencas.jsx
import React, { useState } from 'react';
import LayoutAdmin from './LayoutAdmin';
import { Key, CheckCircle, XCircle, Clock, Eye, Copy } from 'lucide-react';

const Licencas = () => {
  // Dados mockados para exemplo
  const [licencas] = useState([
    { id: 1, chave: 'ABCD-1234-EFGH-5678', cliente: 'empresa1@gmail.com', plano: 'Empresarial', status: 'ativa', dataCriacao: '2024-01-15', dataExpiracao: '2025-01-15' },
    { id: 2, chave: 'IJKL-9012-MNOP-3456', cliente: 'empresa2@gmail.com', plano: 'Profissional', status: 'ativa', dataCriacao: '2024-02-20', dataExpiracao: '2025-02-20' },
    { id: 3, chave: 'QRST-7890-UVWX-1234', cliente: 'empresa3@gmail.com', plano: 'Básico', status: 'expirada', dataCriacao: '2023-03-10', dataExpiracao: '2024-03-10' },
  ]);

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
                <tr key={licenca.id} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                  <td className="p-4">
                    <code className="text-yellow-400 text-sm font-mono">{licenca.chave}</code>
                  </td>
                  <td className="p-4 text-gray-300">{licenca.cliente}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                      {licenca.plano}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300">{new Date(licenca.dataCriacao).toLocaleDateString('pt-PT')}</td>
                  <td className="p-4 text-gray-300">{new Date(licenca.dataExpiracao).toLocaleDateString('pt-PT')}</td>
                  <td className="p-4 text-center">
                    {licenca.status === 'ativa' ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs flex items-center gap-1 justify-center w-24 mx-auto">
                        <CheckCircle size={10} /> Ativa
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs flex items-center gap-1 justify-center w-24 mx-auto">
                        <XCircle size={10} /> Expirada
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1 text-blue-400 hover:text-blue-300 transition" title="Visualizar">
                        <Eye size={16} />
                      </button>
                      <button className="p-1 text-yellow-400 hover:text-yellow-300 transition" title="Copiar chave">
                        <Copy size={16} />
                      </button>
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