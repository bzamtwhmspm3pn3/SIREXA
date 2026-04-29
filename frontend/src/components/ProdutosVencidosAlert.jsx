// src/components/ProdutosVencidosAlert.jsx
import React, { useState } from 'react';
import { Calendar, AlertTriangle, Package, X, CheckCircle, Loader2, Trash2, RotateCcw } from 'lucide-react';

const ProdutosVencidosAlert = ({ produtos, onDevolver, onDescartar }) => {
  const [expanded, setExpanded] = useState(false);
  const [processando, setProcessando] = useState(null);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const produtosVencidos = produtos.filter(p => {
    if (!p.dataValidade) return false;
    const dataValidade = new Date(p.dataValidade);
    dataValidade.setHours(0, 0, 0, 0);
    return dataValidade < hoje && (p.quantidade || 0) > 0;
  });

  const produtosProximosVencer = produtos.filter(p => {
    if (!p.dataValidade) return false;
    const dataValidade = new Date(p.dataValidade);
    dataValidade.setHours(0, 0, 0, 0);
    const diasDiff = Math.ceil((dataValidade - hoje) / (1000 * 60 * 60 * 24));
    return diasDiff <= 30 && diasDiff > 0 && (p.quantidade || 0) > 0;
  });

  if (produtosVencidos.length === 0 && produtosProximosVencer.length === 0) {
    return (
      <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl p-4 border border-green-500/30">
        <div className="flex items-center gap-3">
          <CheckCircle className="text-green-400" size={24} />
          <div>
            <h3 className="text-lg font-bold text-white">✅ Validade em Dia</h3>
            <p className="text-sm text-gray-400">Nenhum produto vencido ou próximo a vencer</p>
          </div>
        </div>
      </div>
    );
  }

  const handleAcao = async (produto, acao) => {
    setProcessando(produto._id);
    try {
      if (acao === 'devolver' && onDevolver) {
        await onDevolver(produto);
      } else if (acao === 'descartar' && onDescartar) {
        await onDescartar(produto);
      }
    } finally {
      setProcessando(null);
    }
  };

  return (
    <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-xl border border-red-500/30 overflow-hidden">
      {/* Cabeçalho */}
      <div 
        className="p-4 cursor-pointer hover:bg-red-600/10 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="text-red-400" size={24} />
            <div>
              <h3 className="text-lg font-bold text-white">
                {produtosVencidos.length > 0 ? (
                  <span>⚠️ {produtosVencidos.length} Produto(s) Vencido(s)</span>
                ) : (
                  <span>⏰ Produtos Próximos ao Vencimento</span>
                )}
              </h3>
              {produtosProximosVencer.length > 0 && produtosVencidos.length === 0 && (
                <p className="text-sm text-orange-300">{produtosProximosVencer.length} produto(s) vencem nos próximos 30 dias</p>
              )}
            </div>
          </div>
          <div className="text-gray-400">
            {expanded ? <X size={20} /> : <AlertTriangle size={20} />}
          </div>
        </div>
      </div>

      {/* Conteúdo Expandido */}
      {expanded && (
        <div className="border-t border-red-500/30 p-4 space-y-4">
          {/* Produtos Vencidos */}
          {produtosVencidos.length > 0 && (
            <div>
              <h4 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle size={16} />
                Produtos Vencidos ({produtosVencidos.length})
              </h4>
              <div className="space-y-2">
                {produtosVencidos.map(produto => {
                  const dataValidade = new Date(produto.dataValidade);
                  const diasVencido = Math.ceil((hoje - dataValidade) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div key={produto._id} className="bg-red-900/30 rounded-lg p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-white">{produto.produto}</p>
                            {produto.codigoBarras && (
                              <span className="text-xs text-gray-400">({produto.codigoBarras})</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-sm">
                            <span className="text-red-400">
                              Vencido há {diasVencido} dia(s)
                            </span>
                            <span className="text-gray-400">
                              Quantidade: {produto.quantidade} {produto.unidadeMedida}
                            </span>
                            {produto.numeroLote && (
                              <span className="text-gray-400">
                                Lote: {produto.numeroLote}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Validade: {new Date(produto.dataValidade).toLocaleDateString('pt-PT')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcao(produto, 'devolver')}
                            disabled={processando === produto._id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition disabled:opacity-50"
                          >
                            {processando === produto._id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <RotateCcw size={14} />
                            )}
                            Devolver
                          </button>
                          <button
                            onClick={() => handleAcao(produto, 'descartar')}
                            disabled={processando === produto._id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition disabled:opacity-50"
                          >
                            {processando === produto._id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            Descartar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Produtos Próximos a Vencer */}
          {produtosProximosVencer.length > 0 && (
            <div>
              <h4 className="text-orange-400 font-semibold mb-3 flex items-center gap-2">
                <Clock size={16} />
                Produtos Próximos ao Vencimento ({produtosProximosVencer.length})
              </h4>
              <div className="space-y-2">
                {produtosProximosVencer.map(produto => {
                  const dataValidade = new Date(produto.dataValidade);
                  const diasRestantes = Math.ceil((dataValidade - hoje) / (1000 * 60 * 60 * 24));
                  
                  let bgColor = 'bg-yellow-900/30';
                  let textColor = 'text-yellow-400';
                  if (diasRestantes <= 7) {
                    bgColor = 'bg-orange-900/30';
                    textColor = 'text-orange-400';
                  }
                  
                  return (
                    <div key={produto._id} className={`${bgColor} rounded-lg p-3`}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-white">{produto.produto}</p>
                            {produto.codigoBarras && (
                              <span className="text-xs text-gray-400">({produto.codigoBarras})</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-sm">
                            <span className={textColor}>
                              Vence em {diasRestantes} dia(s)
                            </span>
                            <span className="text-gray-400">
                              Qtd: {produto.quantidade} {produto.unidadeMedida}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Validade: {new Date(produto.dataValidade).toLocaleDateString('pt-PT')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcao(produto, 'devolver')}
                            disabled={processando === produto._id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition disabled:opacity-50"
                          >
                            {processando === produto._id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <RotateCcw size={14} />
                            )}
                            Devolver
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Deseja marcar ${produto.produto} como promocional por estar próximo ao vencimento?`)) {
                                // Abrir modal de edição para aplicar desconto
                                if (onDevolver) onDevolver(produto);
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition"
                          >
                            <Package size={14} />
                            Oferta
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ações em massa */}
          {(produtosVencidos.length > 0 || produtosProximosVencer.length > 0) && (
            <div className="flex gap-3 pt-2 border-t border-gray-700 mt-3">
              <button
                onClick={() => {
                  if (window.confirm(`Deseja gerar relatório de produtos ${produtosVencidos.length > 0 ? 'vencidos' : 'próximos ao vencimento'}?`)) {
                    // Gerar relatório
                    const dados = produtosVencidos.length > 0 ? produtosVencidos : produtosProximosVencer;
                    const csv = [
                      ['Produto', 'Código', 'Quantidade', 'Data Validade', 'Fornecedor', 'Valor Total'],
                      ...dados.map(p => [
                        p.produto,
                        p.codigoBarras || p.codigoInterno || '-',
                        p.quantidade,
                        new Date(p.dataValidade).toLocaleDateString('pt-PT'),
                        p.fornecedor || '-',
                        (p.quantidade * p.precoCompra).toLocaleString()
                      ])
                    ].map(row => row.join(',')).join('\n');
                    
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `produtos_${produtosVencidos.length > 0 ? 'vencidos' : 'proximos_vencer'}_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition"
              >
                📊 Exportar Relatório
              </button>
            </div>
          )}
        </div>
      )}

      {/* Badge de resumo quando minimizado */}
      {!expanded && (produtosVencidos.length > 0 || produtosProximosVencer.length > 0) && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {produtosVencidos.slice(0, 3).map(p => (
            <span key={p._id} className="text-xs bg-red-700/50 px-2 py-1 rounded-full text-red-200">
              {p.produto}
            </span>
          ))}
          {produtosVencidos.length > 3 && (
            <span className="text-xs bg-gray-700 px-2 py-1 rounded-full text-gray-300">
              +{produtosVencidos.length - 3}
            </span>
          )}
          {produtosProximosVencer.length > 0 && (
            <span className="text-xs bg-orange-700/50 px-2 py-1 rounded-full text-orange-200">
              {produtosProximosVencer.length} próximo(s) a vencer
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProdutosVencidosAlert;