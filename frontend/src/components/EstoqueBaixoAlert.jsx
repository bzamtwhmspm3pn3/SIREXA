// src/components/EstoqueBaixoAlert.jsx
import React from 'react';
import { AlertTriangle, Package, TrendingUp } from 'lucide-react';

const EstoqueBaixoAlert = ({ produtos, onAjustar }) => {
  const produtosBaixo = produtos.filter(p => (p.quantidade || 0) <= (p.quantidadeMinima || 5) && (p.quantidade || 0) > 0);
  const produtosEsgotados = produtos.filter(p => (p.quantidade || 0) === 0);

  if (produtosBaixo.length === 0 && produtosEsgotados.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-xl p-4 border border-yellow-500/30">
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle className="text-yellow-400" size={24} />
        <h3 className="text-lg font-bold text-white">⚠️ Alerta de Estoque</h3>
      </div>
      
      {produtosEsgotados.length > 0 && (
        <div className="mb-3">
          <p className="text-red-400 font-medium mb-2">❌ Produtos Esgotados ({produtosEsgotados.length})</p>
          <div className="space-y-1">
            {produtosEsgotados.slice(0, 3).map(p => (
              <div key={p._id} className="flex justify-between items-center text-sm">
                <span className="text-gray-300">{p.produto}</span>
                <button onClick={() => onAjustar(p)} className="text-blue-400 text-xs hover:underline">
                  Repor Estoque
                </button>
              </div>
            ))}
            {produtosEsgotados.length > 3 && (
              <p className="text-gray-500 text-xs">+{produtosEsgotados.length - 3} produtos</p>
            )}
          </div>
        </div>
      )}
      
      {produtosBaixo.length > 0 && (
        <div>
          <p className="text-yellow-400 font-medium mb-2">⚠️ Estoque Baixo ({produtosBaixo.length})</p>
          <div className="space-y-1">
            {produtosBaixo.slice(0, 3).map(p => (
              <div key={p._id} className="flex justify-between items-center text-sm">
                <span className="text-gray-300">{p.produto}</span>
                <span className="text-yellow-400">{p.quantidade} / {p.quantidadeMinima}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EstoqueBaixoAlert;