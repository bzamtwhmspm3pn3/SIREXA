// src/components/DevolucaoModal.jsx
import React, { useState } from 'react';
import { X, RotateCcw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const DevolucaoModal = ({ produto, onClose, onSuccess }) => {
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const handleSubmit = async () => {
    if (quantidade <= 0 || quantidade > produto.quantidade) {
      setMensagem(`Quantidade inválida. Máximo: ${produto.quantidade}`);
      return;
    }

    if (!motivo) {
      setMensagem("Informe o motivo da devolução");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/stock/${produto._id}/devolver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ quantidade, motivo })
      });

      if (response.ok) {
        setMensagem("✅ Devolução registrada com sucesso!");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        const error = await response.json();
        setMensagem(error.mensagem || "Erro ao registrar devolução");
      }
    } catch (error) {
      setMensagem("Erro ao conectar ao servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <RotateCcw className="text-purple-400" size={20} />
            <h3 className="text-lg font-bold text-white">Registrar Devolução</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-gray-700/30 rounded-lg p-3">
            <p className="text-white font-medium">{produto.produto}</p>
            <p className="text-sm text-gray-400">Código: {produto.codigoBarras || '—'}</p>
            <p className="text-sm text-gray-400">Estoque atual: {produto.quantidade} {produto.unidadeMedida}</p>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Quantidade a devolver</label>
            <input
              type="number"
              min="1"
              max={produto.quantidade}
              className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
              value={quantidade}
              onChange={(e) => setQuantidade(Math.min(produto.quantidade, parseInt(e.target.value) || 1))}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Motivo da devolução</label>
            <select
              className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            >
              <option value="">Selecione</option>
              <option value="Produto vencido">Produto vencido</option>
              <option value="Produto danificado">Produto danificado</option>
              <option value="Erro no pedido">Erro no pedido</option>
              <option value="Produto com defeito">Produto com defeito</option>
              <option value="Cliente devolveu">Cliente devolveu</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          {mensagem && (
            <div className={`p-2 rounded-lg text-sm ${mensagem.includes('✅') ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
              {mensagem}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              Confirmar Devolução
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevolucaoModal;