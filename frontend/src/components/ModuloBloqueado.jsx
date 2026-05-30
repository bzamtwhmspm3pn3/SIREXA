// src/components/ModuloBloqueado.jsx
import React from 'react';
import { Lock, ArrowUpCircle } from 'lucide-react';

const ModuloBloqueado = ({ modulo, plano, onUpgrade }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
        <Lock className="w-12 h-12 text-yellow-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Módulo Bloqueado</h2>
      <p className="text-gray-400 mb-4">
        O módulo <strong className="text-yellow-400">{modulo}</strong> não está disponível no seu plano atual.
      </p>
      <p className="text-gray-500 text-sm mb-6">
        Seu plano: <span className="text-blue-400">{plano || 'Trial'}</span>
      </p>
      <button
        onClick={onUpgrade}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-3 rounded-xl flex items-center gap-2 transition-all"
      >
        <ArrowUpCircle className="w-5 h-5" />
        Fazer Upgrade do Plano
      </button>
    </div>
  );
};

export default ModuloBloqueado;