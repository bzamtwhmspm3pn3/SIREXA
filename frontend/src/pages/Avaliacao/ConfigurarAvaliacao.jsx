// src/pages/Avaliacao/ConfigurarAvaliacao.jsx
import React, { useState, useEffect } from "react";
import { Save, Settings, Plus, Trash2, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { metodosComCriterios } from "./metodosConfig";

const ConfigurarAvaliacao = ({ empresaId, onClose, onSave }) => {
  const [configuracao, setConfiguracao] = useState({
    metodosSelecionados: [],
    metodoPadrao: "",
    categorias: [],
    configuracao: { 
      escalas: { min: 1, max: 5, labels: { 1: "Péssimo", 2: "Ruim", 3: "Regular", 4: "Bom", 5: "Excelente" } }, 
      pesos: { avaliador: 1, autoavaliacao: 0, pares: 0, subordinados: 0, clientes: 0 } 
    }
  });
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});

  // Definir todos os métodos manualmente (sem pré-seleção)
  const metodosAvaliacao = {
    // Métodos com critérios pré-definidos (com estrela)
    escalas_graficas: {
      nome: "Escalas Gráficas",
      descricao: "Avaliação baseada em fatores e intensidade escalar (1 a 5)",
      categoria: "Tradicionais",
      icon: "📊",
      temCriterios: true,
      categorias: metodosComCriterios.escalas_graficas?.categorias || []
    },
    avaliacao_360: {
      nome: "Avaliação 360 Graus",
      descricao: "Feedback de superiores, pares, subordinados e autoavaliação",
      categoria: "Sistêmicos",
      icon: "🌐",
      temCriterios: true,
      categorias: metodosComCriterios.avaliacao_360?.categorias || []
    },
    competencias_cha: {
      nome: "Competências CHA",
      descricao: "Conhecimento, Habilidade e Atitude",
      categoria: "Sistêmicos",
      icon: "🧠",
      temCriterios: true,
      categorias: metodosComCriterios.competencias_cha?.categorias || []
    },
    okrs: {
      nome: "OKRs",
      descricao: "Objetivos e Resultados-Chave com metas trimestrais",
      categoria: "Tendências",
      icon: "🎯",
      temCriterios: true,
      categorias: metodosComCriterios.okrs?.categorias || []
    },
    avaliacao_objetivos: {
      nome: "Avaliação por Objetivos",
      descricao: "Baseada em metas quantitativas e percentual de alcance",
      categoria: "Modernos",
      icon: "🎯",
      temCriterios: true,
      categorias: metodosComCriterios.avaliacao_objetivos?.categorias || []
    },
    autoavaliacao: {
      nome: "Autoavaliação",
      descricao: "Autopercepção de competências e conquistas",
      categoria: "Modernos",
      icon: "🪞",
      temCriterios: true,
      categorias: metodosComCriterios.autoavaliacao?.categorias || []
    },
    feedback_continuo: {
      nome: "Feedback Contínuo",
      descricao: "Feedbacks semanais sobre obstáculos e prioridades",
      categoria: "Tendências",
      icon: "💬",
      temCriterios: true,
      categorias: metodosComCriterios.feedback_continuo?.categorias || []
    },
    // Métodos sem critérios pré-definidos (sem estrela)
    escolha_forcada: {
      nome: "Escolha Forçada",
      descricao: "Blocos de frases descritivas onde o avaliador escolhe o que mais/menos se aplica",
      categoria: "Tradicionais",
      icon: "✅",
      temCriterios: false,
      categorias: []
    },
    incidentes_criticos: {
      nome: "Incidentes Críticos",
      descricao: "Baseado em registro de sucessos notáveis ou falhas críticas",
      categoria: "Tradicionais",
      icon: "⚠️",
      temCriterios: false,
      categorias: []
    },
    listas_verificacao: {
      nome: "Listas de Verificação",
      descricao: "Checklist de competências e deveres do cargo",
      categoria: "Tradicionais",
      icon: "📋",
      temCriterios: false,
      categorias: []
    },
    comparacao_pares: {
      nome: "Comparação por Pares",
      descricao: "Classificação relativa comparando cada colaborador com os demais",
      categoria: "Tradicionais",
      icon: "👥",
      temCriterios: false,
      categorias: []
    },
    bars: {
      nome: "BARS (Escala Ancorada)",
      descricao: "Comportamentos críticos ancorados em exemplos reais",
      categoria: "Modernos",
      icon: "⚓",
      temCriterios: false,
      categorias: []
    },
    bos: {
      nome: "BOS (Escala de Observação)",
      descricao: "Mede frequência de comportamentos desejáveis",
      categoria: "Modernos",
      icon: "👁️",
      temCriterios: false,
      categorias: []
    },
    nine_box: {
      nome: "Matriz Nine Box",
      descricao: "Posicionamento matricial entre desempenho e potencial",
      categoria: "Modernos",
      icon: "🔲",
      temCriterios: false,
      categorias: []
    },
    avaliacao_180: {
      nome: "Avaliação 180 Graus",
      descricao: "Visão do líder + autoavaliação",
      categoria: "Sistêmicos",
      icon: "🔄",
      temCriterios: false,
      categorias: []
    },
    avaliacao_540: {
      nome: "Avaliação 540 Graus",
      descricao: "Inclui feedback de fornecedores e clientes externos",
      categoria: "Sistêmicos",
      icon: "🔁",
      temCriterios: false,
      categorias: []
    },
    balanced_scorecard: {
      nome: "Balanced Scorecard",
      descricao: "Perspectivas Financeira, Clientes, Processos e Aprendizado",
      categoria: "Sistêmicos",
      icon: "📈",
      temCriterios: false,
      categorias: []
    },
    gamificacao: {
      nome: "Gamificação",
      descricao: "Pontuação por missões, badges e rankings",
      categoria: "Tendências",
      icon: "🎮",
      temCriterios: false,
      categorias: []
    }
  };

  // Agrupar métodos por categoria
  const metodosPorCategoria = {};
  Object.entries(metodosAvaliacao).forEach(([key, value]) => {
    if (!metodosPorCategoria[value.categoria]) metodosPorCategoria[value.categoria] = [];
    metodosPorCategoria[value.categoria].push({ key, ...value });
  });

  useEffect(() => { 
    if (empresaId) carregarConfiguracao(); 
  }, [empresaId]);

  const mostrarMensagem = (texto, tipo) => { 
    setMensagem({ texto, tipo }); 
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000); 
  };

  const toggleCategoriaExpandida = (categoriaId) => {
    setCategoriasExpandidas(prev => ({ ...prev, [categoriaId]: !prev[categoriaId] }));
  };

  const carregarConfiguracao = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://sirexa-api.onrender.com/api/avaliacoes/configuracao/${empresaId}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await response.json();
      if (data.sucesso && data.config) {
        setConfiguracao({
          metodosSelecionados: data.config.metodosSelecionados || [],
          metodoPadrao: data.config.metodoPadrao || "",
          categorias: data.config.categorias || [],
          configuracao: data.config.configuracao || { escalas: { min: 1, max: 5 }, pesos: { avaliador: 1, autoavaliacao: 0, pares: 0, subordinados: 0, clientes: 0 } }
        });
      }
    } catch (error) { 
      console.error("Erro:", error); 
    } finally {
      setLoading(false);
    }
  };

  const toggleMetodo = (metodoKey, metodo) => {
    setConfiguracao(prev => {
      const isSelected = prev.metodosSelecionados.some(m => m.key === metodoKey);
      let novosMetodos;
      let novasCategorias = [...prev.categorias];
      
      if (isSelected) {
        novosMetodos = prev.metodosSelecionados.filter(m => m.key !== metodoKey);
        novasCategorias = prev.categorias.filter(c => c.origemMetodo !== metodoKey);
      } else {
        novosMetodos = [...prev.metodosSelecionados, { key: metodoKey, nome: metodo.nome, descricao: metodo.descricao }];
        
        if (metodo.categorias && metodo.categorias.length > 0) {
          const categoriasDoMetodo = metodo.categorias.map(cat => ({
            ...cat,
            origemMetodo: metodoKey,
            id: `${metodoKey}_${cat.id}`,
            criterios: cat.criterios.map(crit => ({
              ...crit,
              id: `${metodoKey}_${crit.id}`
            }))
          }));
          novasCategorias = [...prev.categorias, ...categoriasDoMetodo];
        }
      }
      
      const novoMetodoPadrao = novosMetodos.length > 0 
        ? (prev.metodoPadrao && novosMetodos.some(m => m.key === prev.metodoPadrao) ? prev.metodoPadrao : novosMetodos[0].key)
        : "";
      
      return { 
        ...prev, 
        metodosSelecionados: novosMetodos,
        metodoPadrao: novoMetodoPadrao,
        categorias: novasCategorias
      };
    });
  };

  const selecionarMetodoPadrao = (metodoKey) => {
    setConfiguracao(prev => ({ ...prev, metodoPadrao: metodoKey }));
  };

  const adicionarCategoria = () => {
    const newId = Date.now().toString();
    setConfiguracao(prev => ({
      ...prev,
      categorias: [...prev.categorias, { id: newId, nome: "", descricao: "", peso: 1, criterios: [], origemMetodo: "manual" }]
    }));
    setCategoriasExpandidas(prev => ({ ...prev, [newId]: true }));
  };

  const removerCategoria = (categoriaId) => {
    setConfiguracao(prev => ({ ...prev, categorias: prev.categorias.filter(c => c.id !== categoriaId) }));
  };

  const atualizarCategoria = (categoriaId, campo, valor) => {
    setConfiguracao(prev => ({
      ...prev,
      categorias: prev.categorias.map(c => c.id === categoriaId ? { ...c, [campo]: valor } : c)
    }));
  };

  const adicionarCriterio = (categoriaId) => {
    setConfiguracao(prev => ({
      ...prev,
      categorias: prev.categorias.map(c => c.id === categoriaId ? {
        ...c,
        criterios: [...c.criterios, { id: Date.now().toString(), nome: "", descricao: "", peso: 1 }]
      } : c)
    }));
  };

  const removerCriterio = (categoriaId, criterioId) => {
    setConfiguracao(prev => ({
      ...prev,
      categorias: prev.categorias.map(c => c.id === categoriaId ? {
        ...c,
        criterios: c.criterios.filter(crit => crit.id !== criterioId)
      } : c)
    }));
  };

  const atualizarCriterio = (categoriaId, criterioId, campo, valor) => {
    setConfiguracao(prev => ({
      ...prev,
      categorias: prev.categorias.map(c => c.id === categoriaId ? {
        ...c,
        criterios: c.criterios.map(crit => crit.id === criterioId ? { ...crit, [campo]: valor } : crit)
      } : c)
    }));
  };

 const salvarConfiguracao = async () => {
  if (configuracao.metodosSelecionados.length === 0) { 
    mostrarMensagem("Selecione pelo menos um método de avaliação", "erro"); 
    return; 
  }
  
  setSalvando(true);
  try {
    const response = await fetch(`https://sirexa-api.onrender.com/api/avaliacoes/configuracao`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${localStorage.getItem("token")}` 
      },
      body: JSON.stringify({ 
        empresaId, 
        metodosSelecionados: configuracao.metodosSelecionados,
        metodoPadrao: configuracao.metodoPadrao,
        categorias: configuracao.categorias,
        configuracao: configuracao.configuracao
      })
    });
    const data = await response.json();
    
    if (data.sucesso) { 
      mostrarMensagem("✅ Configuração salva com sucesso!", "sucesso");
      setRedirecting(true);
      
      // Aguarda 500ms para mostrar o overlay
      setTimeout(() => {
        // Fecha o modal
        if (onClose) onClose();
        // Recarrega os dados no componente pai
        if (onSave) onSave();
        // Força o recarregamento da página
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }, 500);
    } else {
      mostrarMensagem(data.mensagem || "Erro ao salvar configuração", "erro");
      setSalvando(false);
    }
  } catch (error) { 
    console.error("Erro:", error);
    mostrarMensagem("Erro ao conectar ao servidor", "erro");
    setSalvando(false);
  }
};


  // Overlay de redirecionamento rápido
  if (redirecting) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-center max-w-sm mx-4 shadow-2xl border border-green-500/30 animate-scale-in">
          <div className="relative mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500 animate-pulse" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Sucesso!</h3>
          <p className="text-gray-300 text-sm">Configuração salva com sucesso.</p>
          <p className="text-green-400 text-xs mt-2">Redirecionando...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-12 text-center">
        <Loader2 className="animate-spin text-purple-400 mx-auto" size={40} />
        <p className="text-gray-400 mt-4">Carregando configuração...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5" /> Configurar Avaliação de Desempenho
        </h2>
        <p className="text-sm text-gray-400">Selecione os métodos e defina os critérios de avaliação</p>
      </div>
      
      <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
        {mensagem.texto && !redirecting && (
          <div className={`p-3 rounded-lg text-center text-sm ${
            mensagem.tipo === "sucesso" 
              ? "bg-green-600/20 text-green-400 border border-green-500/30" 
              : "bg-red-600/20 text-red-400 border border-red-500/30"
          }`}>
            {mensagem.texto}
          </div>
        )}

        {/* 1. Seleção de Métodos */}
        <div>
          <h3 className="text-md font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">1</span>
            Selecione os Métodos de Avaliação
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            ✨ Métodos com critérios pré-definidos. Selecione pelo menos um método.
          </p>
          
          {Object.entries(metodosPorCategoria).map(([categoria, metodos]) => (
            <div key={categoria} className="mb-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-2">{categoria}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {metodos.map(metodo => {
                  const isSelected = configuracao.metodosSelecionados.some(m => m.key === metodo.key);
                  const isPadrao = configuracao.metodoPadrao === metodo.key;
                  const temCriterios = metodo.temCriterios;
                  
                  return (
                    <div
                      key={metodo.key}
                      className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? "border-purple-500 bg-purple-600/20" 
                          : "border-gray-600 bg-gray-700/30 hover:border-purple-500/50"
                      }`}
                      onClick={() => toggleMetodo(metodo.key, metodo)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{metodo.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-white text-sm">
                            {metodo.nome}
                            {temCriterios && <span className="ml-1 text-xs text-yellow-400">✨</span>}
                          </p>
                          {isPadrao && isSelected && (
                            <span className="text-xs text-green-400">★ Padrão</span>
                          )}
                        </div>
                        {isSelected && <CheckCircle size={16} className="text-green-400" />}
                      </div>
                      {isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selecionarMetodoPadrao(metodo.key);
                          }}
                          className="absolute bottom-1 right-2 text-xs text-purple-400 hover:text-purple-300"
                        >
                          Definir como padrão
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 2. Configuração de Categorias e Critérios */}
        {configuracao.metodosSelecionados.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-md font-semibold text-green-400 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center">2</span>
                Categorias e Critérios de Avaliação
              </h3>
              <button onClick={adicionarCategoria} className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition">
                <Plus size={14} /> Nova Categoria
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {configuracao.categorias.length === 0 
                ? "Nenhuma categoria configurada. Selecione um método com ✨ para carregar categorias pré-definidas ou clique em 'Nova Categoria'."
                : `${configuracao.categorias.length} categoria(s) configurada(s).`}
            </p>
            
            {configuracao.categorias.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-gray-700/30 rounded-xl">
                <Settings size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhuma categoria configurada</p>
                <p className="text-xs mt-1">Selecione um método com ✨ ou clique em "Nova Categoria"</p>
                <button onClick={adicionarCategoria} className="mt-2 text-green-400 hover:text-green-300 transition">
                  Clique aqui para adicionar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {configuracao.categorias.map((categoria, idx) => (
                  <div key={categoria.id} className="bg-gray-700/30 rounded-xl border border-gray-600 overflow-hidden">
                    <div className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-700/50 transition" onClick={() => toggleCategoriaExpandida(categoria.id)}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500 text-sm">#{idx + 1}</span>
                          <input 
                            type="text" 
                            placeholder="Nome da Categoria" 
                            className="text-lg font-semibold bg-transparent border-b border-gray-500 text-white focus:border-green-500 outline-none min-w-[200px]" 
                            value={categoria.nome} 
                            onChange={(e) => atualizarCategoria(categoria.id, "nome", e.target.value)}
                            onClick={(e) => e.stopPropagation()} 
                          />
                          {categoria.origemMetodo && metodosAvaliacao[categoria.origemMetodo] && (
                            <span className="text-xs text-purple-400 bg-purple-600/20 px-2 py-0.5 rounded">
                              {metodosAvaliacao[categoria.origemMetodo]?.nome}
                            </span>
                          )}
                        </div>
                        <input 
                          type="text" 
                          placeholder="Descrição da categoria" 
                          className="mt-1 text-sm bg-transparent border-b border-gray-600 text-gray-300 focus:border-green-500 outline-none w-full max-w-md"
                          value={categoria.descricao} 
                          onChange={(e) => atualizarCategoria(categoria.id, "descricao", e.target.value)}
                          onClick={(e) => e.stopPropagation()} 
                        />
                      </div>
                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Peso:</span>
                          <input 
                            type="number" 
                            step="0.5" 
                            min="0" 
                            max="10" 
                            className="w-16 p-1 rounded bg-gray-600 text-white text-center text-sm" 
                            value={categoria.peso} 
                            onChange={(e) => atualizarCategoria(categoria.id, "peso", parseFloat(e.target.value))} 
                          />
                        </div>
                        <button onClick={() => removerCategoria(categoria.id)} className="text-red-400 hover:text-red-300 p-1 rounded">
                          <Trash2 size={16} />
                        </button>
                        {categoriasExpandidas[categoria.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                    
                    {categoriasExpandidas[categoria.id] && (
                      <div className="p-4 pt-0 border-t border-gray-600 mt-2">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-medium text-gray-300">Critérios de Avaliação</h4>
                          <button onClick={() => adicionarCriterio(categoria.id)} className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                            <Plus size={14} /> Adicionar Critério
                          </button>
                        </div>
                        
                        {categoria.criterios.length === 0 ? (
                          <p className="text-gray-500 text-sm italic text-center py-4">Nenhum critério definido.</p>
                        ) : (
                          <div className="space-y-2">
                            {categoria.criterios.map((criterio, critIdx) => (
                              <div key={criterio.id} className="flex items-center gap-3 bg-gray-800/50 p-2 rounded-lg">
                                <span className="text-gray-500 text-xs w-6">{critIdx + 1}.</span>
                                <input 
                                  type="text" 
                                  placeholder="Nome do critério" 
                                  className="flex-1 p-2 rounded bg-gray-700 text-white text-sm focus:border-blue-500 outline-none" 
                                  value={criterio.nome} 
                                  onChange={(e) => atualizarCriterio(categoria.id, criterio.id, "nome", e.target.value)} 
                                />
                                <input 
                                  type="text" 
                                  placeholder="Descrição" 
                                  className="flex-1 p-2 rounded bg-gray-700 text-white text-sm focus:border-blue-500 outline-none" 
                                  value={criterio.descricao} 
                                  onChange={(e) => atualizarCriterio(categoria.id, criterio.id, "descricao", e.target.value)} 
                                />
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400">Peso:</span>
                                  <input 
                                    type="number" 
                                    step="0.5" 
                                    min="0" 
                                    max="10" 
                                    className="w-14 p-1 rounded bg-gray-600 text-white text-center text-sm" 
                                    value={criterio.peso} 
                                    onChange={(e) => atualizarCriterio(categoria.id, criterio.id, "peso", parseFloat(e.target.value))} 
                                  />
                                </div>
                                <button onClick={() => removerCriterio(categoria.id, criterio.id)} className="text-red-400 hover:text-red-300 p-1 rounded">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resumo dos Métodos Selecionados */}
        {configuracao.metodosSelecionados.length > 0 && (
          <div className="bg-purple-600/10 rounded-xl p-4 border border-purple-500/30">
            <h3 className="text-sm font-semibold text-purple-400 mb-2">📋 Métodos Selecionados</h3>
            <div className="flex flex-wrap gap-2">
              {configuracao.metodosSelecionados.map(metodo => (
                <span key={metodo.key} className={`px-2 py-1 rounded-lg text-xs ${
                  configuracao.metodoPadrao === metodo.key 
                    ? "bg-green-600/30 text-green-400 border border-green-500/50" 
                    : "bg-gray-700/50 text-gray-300"
                }`}>
                  {metodo.nome}
                  {configuracao.metodoPadrao === metodo.key && " ★"}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Total de categorias: {configuracao.categorias.length} | 
              Total de critérios: {configuracao.categorias.reduce((acc, cat) => acc + (cat.criterios?.length || 0), 0)}
            </p>
          </div>
        )}
      </div>
      
      <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Cancelar</button>
        <button onClick={salvarConfiguracao} disabled={salvando || redirecting || configuracao.metodosSelecionados.length === 0} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition flex items-center gap-2 disabled:opacity-50">
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {salvando ? "Salvando..." : "Salvar Configuração"}
        </button>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ConfigurarAvaliacao;