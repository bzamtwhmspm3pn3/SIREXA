// src/pages/Avaliacao/VisualizarAvaliacao.jsx
import React, { useState } from "react";
import { Eye, Star, Calendar, User, Award, FileText, X, ChevronDown, ChevronUp, TrendingUp, Target, ClipboardList, MessageCircle } from "lucide-react";

const VisualizarAvaliacao = ({ avaliacao, onClose }) => {
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});

  const toggleCategoriaExpandida = (categoriaId) => {
    setCategoriasExpandidas(prev => ({ ...prev, [categoriaId]: !prev[categoriaId] }));
  };

  // Classificação baseada em nota (0-100)
  const getClassificacaoColor = (nota) => {
    if (nota >= 90) return "text-purple-400";
    if (nota >= 75) return "text-blue-400";
    if (nota >= 60) return "text-green-400";
    if (nota >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const getClassificacaoBg = (nota) => {
    if (nota >= 90) return "bg-purple-600/20 border-purple-500/30";
    if (nota >= 75) return "bg-blue-600/20 border-blue-500/30";
    if (nota >= 60) return "bg-green-600/20 border-green-500/30";
    if (nota >= 40) return "bg-yellow-600/20 border-yellow-500/30";
    return "bg-red-600/20 border-red-500/30";
  };

  const getClassificacaoTexto = (nota) => {
    if (nota >= 90) return "Excelente";
    if (nota >= 75) return "Muito Bom";
    if (nota >= 60) return "Bom";
    if (nota >= 40) return "Regular";
    return "Insuficiente";
  };

  // Verificar se a avaliação tem a nova estrutura (notasPorCategoria)
  const temNovaEstrutura = avaliacao.notasPorCategoria && avaliacao.notasPorCategoria.length > 0;
  
  // Para compatibilidade com avaliações antigas (notas 0-5)
  const notaMaxima = temNovaEstrutura ? 100 : 5;
  const notaDisplay = temNovaEstrutura ? avaliacao.notaGeral || avaliacao.notaTotal : avaliacao.notaTotal;
  const classificacao = avaliacao.classificacao || getClassificacaoTexto(notaDisplay);
  const notaPercentual = notaDisplay ? (notaDisplay / notaMaxima) * 100 : 0;

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5" /> Detalhes da Avaliação
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {temNovaEstrutura ? "Avaliação baseada em categorias e critérios" : "Avaliação simplificada (0-5)"}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Informações do Funcionário e Status */}
        <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{avaliacao.funcionarioNome || avaliacao.funcionario}</p>
              <p className="text-sm text-gray-400">{avaliacao.periodo}</p>
              {avaliacao.funcionarioCargo && (
                <p className="text-xs text-gray-500">{avaliacao.funcionarioCargo}</p>
              )}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
            avaliacao.status === "Concluído" ? "bg-green-600/20 text-green-400" : 
            avaliacao.status === "Aprovado" ? "bg-blue-600/20 text-blue-400" : 
            "bg-yellow-600/20 text-yellow-400"
          }`}>
            {avaliacao.status}
          </span>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-700/30 rounded-xl p-4 text-center">
            <Calendar className="mx-auto mb-2 text-blue-400" size={24} />
            <p className="text-xs text-gray-400">Data</p>
            <p className="text-white font-medium">
              {new Date(avaliacao.dataAvaliacao || avaliacao.createdAt || avaliacao.data).toLocaleDateString()}
            </p>
          </div>
          
          <div className={`rounded-xl p-4 text-center ${getClassificacaoBg(notaDisplay)}`}>
            <Star className="mx-auto mb-2 text-yellow-400" size={24} />
            <p className="text-xs text-gray-400">Nota Total</p>
            <p className={`text-2xl font-bold ${getClassificacaoColor(notaDisplay)}`}>
              {notaDisplay?.toFixed(1)} / {notaMaxima}
            </p>
          </div>
          
          <div className={`rounded-xl p-4 text-center ${getClassificacaoBg(notaDisplay)}`}>
            <Award className="mx-auto mb-2 text-purple-400" size={24} />
            <p className="text-xs text-gray-400">Classificação</p>
            <p className={`text-sm font-semibold ${getClassificacaoColor(notaDisplay)}`}>
              {classificacao}
            </p>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Desempenho Geral</span>
            <span className={`text-sm font-semibold ${getClassificacaoColor(notaDisplay)}`}>
              {notaPercentual.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                notaPercentual >= 90 ? "bg-purple-500" :
                notaPercentual >= 75 ? "bg-blue-500" :
                notaPercentual >= 60 ? "bg-green-500" :
                notaPercentual >= 40 ? "bg-yellow-500" : "bg-red-500"
              }`}
              style={{ width: `${notaPercentual}%` }}
            />
          </div>
        </div>

        {/* Critérios Avaliados - Nova Estrutura (por Categoria) */}
        {temNovaEstrutura ? (
          <div className="bg-gray-700/30 rounded-xl p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Avaliação por Categorias
            </h3>
            
            {avaliacao.notasPorCategoria.map((categoria, idx) => {
              const notaCategoria = categoria.notaCategoria || 0;
              const isExpanded = categoriasExpandidas[categoria.categoriaId || idx];
              
              return (
                <div key={categoria.categoriaId || idx} className="mb-4 last:mb-0 border border-gray-600 rounded-xl overflow-hidden">
                  <div 
                    className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-700/50 transition"
                    onClick={() => toggleCategoriaExpandida(categoria.categoriaId || idx)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Target size={16} className="text-green-400" />
                        <h4 className="font-medium text-white">{categoria.categoriaNome}</h4>
                        {categoria.peso !== 1 && (
                          <span className="text-xs text-gray-500">(Peso: {categoria.peso})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                          <div 
                            className="h-1.5 rounded-full bg-green-500"
                            style={{ width: `${notaCategoria}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-green-400">
                          {notaCategoria.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                  
                  {isExpanded && (
                    <div className="p-3 pt-0 border-t border-gray-600 space-y-2">
                      {categoria.criterios?.map((criterio, critIdx) => (
                        <div key={criterio.criterioId || critIdx} className="bg-gray-800/50 rounded-lg p-2">
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <p className="text-sm font-medium text-white">{criterio.criterioNome}</p>
                              {criterio.comentario && (
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                  <MessageCircle size={12} /> {criterio.comentario}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Peso: {criterio.peso || 1}</span>
                              <span className="text-sm font-bold text-green-400">{criterio.nota || 0}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1">
                            <div 
                              className="h-1 rounded-full bg-green-500"
                              style={{ width: `${criterio.nota || 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Critérios Avaliados - Formato Antigo (notas 0-5) */
          <div className="bg-gray-700/30 rounded-xl p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Critérios Avaliados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(avaliacao.notas || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-2 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-300 capitalize">{key}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(value || 0) * 20}%` }} />
                    </div>
                    <span className="text-white font-medium">{value || 0}/5</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comentários */}
        {(avaliacao.comentarios || avaliacao.comentarioGeral) && (
          <div className="bg-gray-700/30 rounded-xl p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Comentários
            </h3>
            <p className="text-gray-300">{avaliacao.comentarios || avaliacao.comentarioGeral}</p>
          </div>
        )}

        {/* Recomendações */}
        {avaliacao.recomendacoes && (
          <div className="bg-gray-700/30 rounded-xl p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Recomendações
            </h3>
            <p className="text-gray-300">{avaliacao.recomendacoes}</p>
          </div>
        )}

        {/* Informações Adicionais */}
        <div className="flex justify-between items-center text-sm text-gray-400 pt-2 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <User size={14} />
            <span>Avaliador: {avaliacao.avaliador || avaliacao.avaliadorNome || "Sistema"}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText size={14} />
            <span>ID: {avaliacao._id?.slice(-8)}</span>
          </div>
        </div>

        {/* Método Utilizado */}
        {avaliacao.configuracaoId && (
          <div className="text-xs text-gray-500 text-center">
            Método de avaliação utilizado
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
        <button 
          onClick={onClose} 
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};

export default VisualizarAvaliacao;