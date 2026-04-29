// src/pages/Empresa/ListaEmpresas.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { Plus, Building2, Eye, Edit, Trash2, RefreshCw } from "lucide-react";

const ListaEmpresas = () => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const carregarEmpresas = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/empresa", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setEmpresas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar empresas:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Empresas" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando empresas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Empresas" showBackButton={true} backToRoute="/menu">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 mb-4">Erro ao carregar empresas: {error}</p>
          <button
            onClick={carregarEmpresas}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Empresas" showBackButton={true} backToRoute="/menu">
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Empresas</h1>
            <p className="text-gray-400 mt-1">Gerencie suas empresas cadastradas</p>
          </div>
          <button
            onClick={() => navigate("/empresa/cadastrar")}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg"
          >
            <Plus size={18} /> Nova Empresa
          </button>
        </div>

        {/* Lista de Empresas */}
        {empresas.length === 0 ? (
          <div className="bg-gray-800/50 rounded-2xl p-12 text-center border border-gray-700">
            <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Nenhuma empresa cadastrada</p>
            <p className="text-gray-500 text-sm mt-1">Clique em "Nova Empresa" para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {empresas.map((emp) => (
              <div
                key={emp._id}
                className="bg-gray-800/50 rounded-2xl border border-gray-700 hover:border-blue-500/50 transition-all duration-300 overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {emp.logotipo ? (
                        <img
                          src={`http://localhost:5000/uploads/${emp.logotipo}`}
                          alt={emp.nome}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-white">{emp.nome}</h3>
                        <p className="text-xs text-gray-400">NIF: {emp.nif}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      emp.ativo 
                        ? "bg-green-500/20 text-green-400" 
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {emp.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  {emp.contactos?.email && (
                    <p className="text-sm text-gray-400 truncate">{emp.contactos.email}</p>
                  )}
                  {emp.contactos?.telefone && (
                    <p className="text-sm text-gray-400">{emp.contactos.telefone}</p>
                  )}

                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => navigate(`/empresa/visualizar/${emp._id}`)}
                      className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Eye size={16} /> Ver
                    </button>
                    <button
                      onClick={() => navigate(`/empresa/editar/${emp._id}`)}
                      className="flex-1 py-2 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Edit size={16} /> Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ListaEmpresas;