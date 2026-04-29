// src/components/EmpresaSelector.jsx
import React, { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Building2, RefreshCw } from "lucide-react";

const EmpresaSelector = ({ 
  empresas, 
  empresaSelecionada, 
  setEmpresaSelecionada, 
  onRefresh,
  loading = false 
}) => {
  const { isGestor, isTecnico, empresaId, empresaNome, empresaNif, empresaEmail, empresaTelefone } = useAuth();

  // Para técnico: definir automaticamente a empresa dele
  useEffect(() => {
    if (isTecnico() && empresaId && !empresaSelecionada) {
      setEmpresaSelecionada(empresaId);
    }
  }, [isTecnico, empresaId, empresaSelecionada, setEmpresaSelecionada]);

  // Se for técnico, mostrar apenas a empresa dele (sem select)
  if (isTecnico()) {
    return (
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-5 border border-blue-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Empresa</h2>
              <p className="text-sm text-gray-400">Sua empresa designada</p>
            </div>
          </div>
          <div className="flex-1 max-w-md">
            <div className="w-full px-4 py-3 rounded-xl bg-blue-600/30 border border-blue-500/50 text-white">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{empresaNome || "Carregando..."}</span>
                  <div className="bg-blue-500/30 p-2 rounded-lg">
                    <Building2 size={18} className="text-blue-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                  <div>
                    <span className="text-blue-300">NIF:</span>
                    <span className="text-white ml-1">{empresaNif || "---"}</span>
                  </div>
                  <div>
                    <span className="text-blue-300">ID:</span>
                    <span className="text-white ml-1">{empresaId || "---"}</span>
                  </div>
                  {empresaEmail && (
                    <div className="col-span-2">
                      <span className="text-blue-300">Email:</span>
                      <span className="text-white ml-1 text-xs">{empresaEmail}</span>
                    </div>
                  )}
                  {empresaTelefone && (
                    <div className="col-span-2">
                      <span className="text-blue-300">Telefone:</span>
                      <span className="text-white ml-1">{empresaTelefone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={onRefresh} 
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition"
            disabled={loading}
          >
            <RefreshCw size={18} className={`text-gray-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {empresaId && (
          <div className="mt-3 text-sm text-gray-300 flex flex-wrap gap-4">
            <span>🏢 Você está operando exclusivamente nesta empresa</span>
          </div>
        )}
      </div>
    );
  }

  // Para gestor: mostrar select com todas as empresas
  return (
    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-5 border border-blue-500/30">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Building2 className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Empresa</h2>
            <p className="text-sm text-gray-400">Selecione a empresa para gerenciar</p>
          </div>
        </div>
        <div className="flex-1 max-w-md">
          {empresas.length === 0 ? (
            <div className="text-yellow-400 text-sm p-3 bg-yellow-600/10 rounded-xl">
              Nenhuma empresa encontrada. Cadastre uma empresa primeiro.
            </div>
          ) : (
            <select 
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:border-blue-500" 
              value={empresaSelecionada} 
              onChange={(e) => setEmpresaSelecionada(e.target.value)}
            >
              <option value="">Selecione uma empresa</option>
              {empresas.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.nome}</option>
              ))}
            </select>
          )}
        </div>
        <button 
          onClick={onRefresh} 
          className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition"
          disabled={loading}
        >
          <RefreshCw size={18} className={`text-gray-300 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default EmpresaSelector;