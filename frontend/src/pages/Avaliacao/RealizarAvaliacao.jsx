// src/pages/Avaliacao/RealizarAvaliacao.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Star, Send, X, Loader2, CheckCircle, Settings } from "lucide-react";

const RealizarAvaliacao = ({ empresaId, funcionarios, configuracao, onSuccess, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    funcionarioId: "",
    periodo: "",
    ano: new Date().getFullYear(),
    data: new Date().toISOString().split('T')[0],
    notas: {},
    comentarios: "",
    status: "Concluído"
  });
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  // Inicializar notas baseadas na configuração
  useEffect(() => {
    if (configuracao && configuracao.categorias) {
      const notasIniciais = {};
      configuracao.categorias.forEach(categoria => {
        categoria.criterios.forEach(criterio => {
          notasIniciais[`${categoria.id}_${criterio.id}`] = 0;
        });
      });
      setFormData(prev => ({ ...prev, notas: notasIniciais }));
    }
  }, [configuracao]);

  const mostrarMensagem = (texto, tipo) => { 
    setMensagem({ texto, tipo }); 
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000); 
  };

  const handleNotaChange = (categoriaId, criterioId, valor) => {
    let newValor = parseFloat(valor) || 0;
    if (newValor < 0) newValor = 0;
    if (newValor > 100) newValor = 100;
    setFormData(prev => ({ 
      ...prev, 
      notas: { ...prev.notas, [`${categoriaId}_${criterioId}`]: newValor } 
    }));
  };

  const calcularNotaPorCategoria = (categoria) => {
    let soma = 0;
    let count = 0;
    categoria.criterios.forEach(criterio => {
      const nota = formData.notas[`${categoria.id}_${criterio.id}`] || 0;
      soma += nota * (criterio.peso || 1);
      count += (criterio.peso || 1);
    });
    return count > 0 ? soma / count : 0;
  };

  const calcularNotaTotal = () => {
    if (!configuracao || !configuracao.categorias) return 0;
    
    let somaPonderada = 0;
    let somaPesos = 0;
    
    configuracao.categorias.forEach(categoria => {
      const notaCategoria = calcularNotaPorCategoria(categoria);
      const pesoCategoria = categoria.peso || 1;
      somaPonderada += notaCategoria * pesoCategoria;
      somaPesos += pesoCategoria;
    });
    
    return somaPesos > 0 ? somaPonderada / somaPesos : 0;
  };

  const getClassificacao = (nota) => {
    if (nota >= 90) return "Excelente";
    if (nota >= 75) return "Muito Bom";
    if (nota >= 60) return "Bom";
    if (nota >= 40) return "Regular";
    return "Insuficiente";
  };

const handleSubmit = async () => {
  if (!formData.funcionarioId) { 
    mostrarMensagem("Selecione um funcionário", "erro"); 
    return; 
  }
  if (!formData.periodo) { 
    mostrarMensagem("Informe o período", "erro"); 
    return; 
  }
  
  const funcionario = funcionarios.find(f => f._id === formData.funcionarioId);
  const notaTotal = calcularNotaTotal();
  const classificacao = getClassificacao(notaTotal);
  
  const notasPorCategoria = [];
  if (configuracao && configuracao.categorias) {
    configuracao.categorias.forEach(categoria => {
      const criteriosAvaliados = [];
      categoria.criterios.forEach(criterio => {
        criteriosAvaliados.push({
          criterioId: criterio.id,
          criterioNome: criterio.nome,
          peso: criterio.peso || 1,
          nota: formData.notas[`${categoria.id}_${criterio.id}`] || 0,
          comentario: ""
        });
      });
      
      notasPorCategoria.push({
        categoriaId: categoria.id,
        categoriaNome: categoria.nome,
        peso: categoria.peso || 1,
        notaCategoria: calcularNotaPorCategoria(categoria),
        criterios: criteriosAvaliados
      });
    });
  }
  
  setLoading(true);
  try {
    const response = await fetch(`http://localhost:5000/api/avaliacoes`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${localStorage.getItem("token")}` 
      },
      body: JSON.stringify({
        funcionarioId: formData.funcionarioId,
        funcionarioNome: funcionario?.nome,
        funcionarioCargo: funcionario?.cargo || funcionario?.funcao,
        funcionarioDepartamento: funcionario?.departamento,
        periodo: formData.periodo,
        ano: formData.ano,
        data: formData.data,
        notas: formData.notas,
        notasPorCategoria: notasPorCategoria,
        notaTotal: notaTotal,
        notaGeral: notaTotal,
        classificacao: classificacao,
        comentarios: formData.comentarios,
        empresaId: empresaId,
        avaliadorId: user?._id,
        avaliadorNome: user?.nome || user?.email,
        status: formData.status,
        configuracaoId: configuracao?._id
      })
    });
    
    const data = await response.json();
    
    if (response.ok || data.sucesso) { 
      mostrarMensagem("✅ Avaliação realizada com sucesso!", "sucesso");
      setRedirecting(true);
      
      // 🔒 Fecha o modal e recarrega os dados após 500ms (mesmo padrão do ConfigurarAvaliacao)
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
        // Força o recarregamento da página para garantir que os dados sejam atualizados
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }, 500);
    } else { 
      mostrarMensagem(data.mensagem || "Erro ao salvar avaliação", "erro"); 
      setLoading(false);
    }
  } catch (error) { 
    console.error("Erro:", error);
    mostrarMensagem("Erro ao conectar ao servidor", "erro"); 
    setLoading(false);
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
        <p className="text-gray-300 text-sm">Avaliação registrada com sucesso.</p>
        <p className="text-green-400 text-xs mt-2">Redirecionando...</p>
      </div>
    </div>
  );
}

  // Verificar se há configuração
  if (!configuracao || !configuracao.categorias || configuracao.categorias.length === 0) {
    return (
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Star className="w-5 h-5" /> Realizar Avaliação
          </h2>
        </div>
        <div className="p-12 text-center">
          <div className="bg-yellow-600/20 rounded-full p-4 inline-flex mb-4">
            <Settings size={32} className="text-yellow-400" />
          </div>
          <p className="text-gray-300 text-lg mb-2">Nenhum critério de avaliação configurado</p>
          <p className="text-gray-400 text-sm mb-4">Configure os critérios de avaliação antes de realizar uma avaliação.</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
      <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Star className="w-5 h-5" /> Realizar Avaliação
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Método: {configuracao?.metodoPadrao ? configuracao.metodosSelecionados?.find(m => m.key === configuracao.metodoPadrao)?.nome : "Não definido"} | 
            Avaliador: {user?.nome || user?.email || "Sistema"}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="bg-purple-600/10 rounded-lg p-3 border border-purple-500/30">
          <p className="text-xs text-purple-400 mb-1">Avaliador (usuário logado)</p>
          <p className="text-white font-medium">{user?.nome || user?.email || "Usuário"}</p>
          <p className="text-xs text-gray-400">ID: {user?._id?.slice(-8) || "N/A"}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300 mb-1 text-sm">
              Funcionário <span className="text-red-400">*</span>
            </label>
            <select 
              className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 transition" 
              value={formData.funcionarioId} 
              onChange={(e) => setFormData({...formData, funcionarioId: e.target.value})}
            >
              <option value="">Selecione um funcionário</option>
              {funcionarios.map(f => (
                <option key={f._id} value={f._id}>{f.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-300 mb-1 text-sm">
              Período <span className="text-red-400">*</span>
            </label>
            <input 
              type="text" 
              className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 transition" 
              placeholder="Ex: Q1 2024, Semestre 1, Ano 2024" 
              value={formData.periodo} 
              onChange={(e) => setFormData({...formData, periodo: e.target.value})} 
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-300 mb-1 text-sm">Data da Avaliação</label>
          <input 
            type="date" 
            className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 transition" 
            value={formData.data} 
            onChange={(e) => setFormData({...formData, data: e.target.value})} 
          />
        </div>

        {/* Critérios Dinâmicos baseados na configuração */}
        <div className="bg-gray-700/30 rounded-xl p-4">
          <h3 className="text-md font-semibold text-green-400 mb-3 flex items-center gap-2">
            <Star size={16} /> Critérios de Avaliação (0 a 100)
          </h3>
          <p className="text-xs text-gray-500 mb-3">Avalie cada critério de 0 a 100</p>
          
          {configuracao.categorias.map((categoria, catIdx) => (
            <div key={categoria.id} className="mb-6 last:mb-0">
              <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">{catIdx + 1}</span>
                {categoria.nome}
                {categoria.peso !== 1 && <span className="text-xs text-gray-500">(Peso: {categoria.peso})</span>}
              </h4>
              <p className="text-xs text-gray-500 mb-3">{categoria.descricao}</p>
              
              <div className="space-y-3 ml-4">
                {categoria.criterios.map(criterio => {
                  const notaKey = `${categoria.id}_${criterio.id}`;
                  return (
                    <div key={criterio.id} className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-white text-sm font-medium">{criterio.nome}</p>
                          <p className="text-xs text-gray-500">{criterio.descricao}</p>
                        </div>
                        {criterio.peso !== 1 && <span className="text-xs text-gray-500">Peso: {criterio.peso}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" 
                          min="0" max="100" step="5" 
                          className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-gray-700 accent-green-500"
                          value={formData.notas[notaKey] || 0} 
                          onChange={(e) => handleNotaChange(categoria.id, criterio.id, e.target.value)} 
                        />
                        <input 
                          type="number" 
                          min="0" max="100" step="5" 
                          className="w-20 p-1 rounded-lg bg-gray-700 text-white text-center text-sm" 
                          value={formData.notas[notaKey] || 0} 
                          onChange={(e) => handleNotaChange(categoria.id, criterio.id, e.target.value)} 
                        />
                        <span className="text-xs text-gray-500">/ 100</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Nota da categoria */}
              <div className="mt-2 text-right">
                <span className="text-xs text-gray-400">Nota da categoria: </span>
                <span className="text-sm font-semibold text-green-400">{calcularNotaPorCategoria(categoria).toFixed(1)}</span>
              </div>
            </div>
          ))}
          
          {/* Nota Total */}
          <div className="mt-4 pt-3 border-t border-gray-600 flex justify-between items-center">
            <span className="text-gray-300 text-sm">Nota Total:</span>
            <div className="flex items-center gap-2">
              <Star className="text-yellow-400" size={18} />
              <span className="text-2xl font-bold text-white">{calcularNotaTotal().toFixed(1)}</span>
              <span className="text-gray-400 text-sm">/ 100</span>
            </div>
          </div>
          
          {/* Classificação */}
          <div className="mt-2 text-right">
            <span className="text-xs text-gray-400">Classificação: </span>
            <span className={`text-sm font-semibold ${
              calcularNotaTotal() >= 90 ? "text-purple-400" :
              calcularNotaTotal() >= 75 ? "text-blue-400" :
              calcularNotaTotal() >= 60 ? "text-green-400" :
              calcularNotaTotal() >= 40 ? "text-yellow-400" : "text-red-400"
            }`}>
              {getClassificacao(calcularNotaTotal())}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-gray-300 mb-1 text-sm">Comentários / Observações</label>
          <textarea 
            rows={3} 
            className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 transition resize-none" 
            placeholder="Adicione comentários sobre o desempenho do funcionário..." 
            value={formData.comentarios} 
            onChange={(e) => setFormData({...formData, comentarios: e.target.value})} 
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1 text-sm">Status</label>
          <select 
            className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 transition" 
            value={formData.status} 
            onChange={(e) => setFormData({...formData, status: e.target.value})}
          >
            <option value="Concluído">Concluído</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Pendente">Pendente</option>
          </select>
        </div>

        {mensagem.texto && !redirecting && (
          <div className={`p-2 rounded-lg text-center text-sm ${
            mensagem.tipo === "sucesso" 
              ? "bg-green-600/20 text-green-400 border border-green-500/30" 
              : "bg-red-600/20 text-red-400 border border-red-500/30"
          }`}>
            {mensagem.texto}
          </div>
        )}
      </div>
      
      <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
        <button 
          onClick={onClose} 
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button 
          onClick={handleSubmit} 
          disabled={loading || redirecting} 
          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {loading ? "Salvando..." : "Finalizar Avaliação"}
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

export default RealizarAvaliacao;