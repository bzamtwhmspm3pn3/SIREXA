// src/pages/Contabilidade/NovoLancamento.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { Save, X, Plus, Trash2, AlertCircle } from "lucide-react";

const NovoLancamento = () => {
  const navigate = useNavigate();
  const { empresaId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [lancamento, setLancamento] = useState({
    descricao: "",
    dataLancamento: new Date().toISOString().split("T")[0],
    partidas: [
      { contaCodigo: "", contaDescricao: "", debito: 0, credito: 0 }
    ],
    observacoes: ""
  });

  const handleAddPartida = () => {
    setLancamento({
      ...lancamento,
      partidas: [...lancamento.partidas, { contaCodigo: "", contaDescricao: "", debito: 0, credito: 0 }]
    });
  };

  const handleRemovePartida = (index) => {
    const novasPartidas = lancamento.partidas.filter((_, i) => i !== index);
    setLancamento({ ...lancamento, partidas: novasPartidas });
  };

  const handlePartidaChange = (index, field, value) => {
    const novasPartidas = [...lancamento.partidas];
    novasPartidas[index][field] = field === "debito" || field === "credito" ? parseFloat(value) || 0 : value;
    
    // Se definir débito, zera crédito e vice-versa
    if (field === "debito" && value > 0) {
      novasPartidas[index].credito = 0;
    }
    if (field === "credito" && value > 0) {
      novasPartidas[index].debito = 0;
    }
    
    setLancamento({ ...lancamento, partidas: novasPartidas });
  };

  const calcularTotais = () => {
    const totalDebito = lancamento.partidas.reduce((sum, p) => sum + (p.debito || 0), 0);
    const totalCredito = lancamento.partidas.reduce((sum, p) => sum + (p.credito || 0), 0);
    return { totalDebito, totalCredito, diferenca: totalDebito - totalCredito };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { totalDebito, totalCredito, diferenca } = calcularTotais();
    
    if (diferenca !== 0) {
      alert(`❌ Os valores de Débito (${totalDebito}) e Crédito (${totalCredito}) devem ser iguais!`);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch("https://sirexa-api.onrender.com/api/contabilidade/lancamentos/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          empresaId,
          ...lancamento,
          partidas: lancamento.partidas.filter(p => p.contaCodigo && (p.debito > 0 || p.credito > 0))
        })
      });
      
      if (response.ok) {
        alert("✅ Lançamento criado com sucesso!");
        navigate("/contabilidade/lancamentos");
      } else {
        const error = await response.json();
        alert(`❌ Erro: ${error.mensagem}`);
      }
    } catch (error) {
      console.error("Erro ao criar lançamento:", error);
      alert("❌ Erro ao criar lançamento");
    } finally {
      setLoading(false);
    }
  };

  const { totalDebito, totalCredito, diferenca } = calcularTotais();

  return (
    <Layout title="Novo Lançamento Contabilístico" showBackButton backToRoute="/contabilidade/lancamentos">
      <form onSubmit={handleSubmit} className="space-y-6 p-4">
        {/* Informações Básicas */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">Informações do Lançamento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Descrição *</label>
              <input
                type="text"
                required
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={lancamento.descricao}
                onChange={(e) => setLancamento({...lancamento, descricao: e.target.value})}
                placeholder="Ex: Pagamento de salários - Março 2024"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Data do Lançamento *</label>
              <input
                type="date"
                required
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={lancamento.dataLancamento}
                onChange={(e) => setLancamento({...lancamento, dataLancamento: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Partidas Contabilísticas */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Partidas Contabilísticas</h3>
            <button
              type="button"
              onClick={handleAddPartida}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg text-white flex items-center gap-2"
            >
              <Plus size={16} /> Adicionar Linha
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr className="text-left text-gray-300">
                  <th className="p-2">Código da Conta</th>
                  <th className="p-2">Descrição</th>
                  <th className="p-2 text-right">Débito (Kz)</th>
                  <th className="p-2 text-right">Crédito (Kz)</th>
                  <th className="p-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lancamento.partidas.map((partida, index) => (
                  <tr key={index} className="border-t border-gray-700">
                    <td className="p-2">
                      <input
                        type="text"
                        className="bg-gray-700 rounded px-2 py-1 text-white w-32 font-mono text-xs"
                        value={partida.contaCodigo}
                        onChange={(e) => handlePartidaChange(index, "contaCodigo", e.target.value)}
                        placeholder="Ex: 45.1.1"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        className="bg-gray-700 rounded px-2 py-1 text-white w-48"
                        value={partida.contaDescricao}
                        onChange={(e) => handlePartidaChange(index, "contaDescricao", e.target.value)}
                        placeholder="Descrição da conta"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        className="bg-gray-700 rounded px-2 py-1 text-white w-32 text-right"
                        value={partida.debito || ""}
                        onChange={(e) => handlePartidaChange(index, "debito", e.target.value)}
                        placeholder="0,00"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        className="bg-gray-700 rounded px-2 py-1 text-white w-32 text-right"
                        value={partida.credito || ""}
                        onChange={(e) => handlePartidaChange(index, "credito", e.target.value)}
                        placeholder="0,00"
                      />
                    </td>
                    <td className="p-2 text-center">
                      {lancamento.partidas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePartida(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-700">
                <tr>
                  <td colSpan="2" className="p-2 text-right font-bold text-white">Totais:</td>
                  <td className="p-2 text-right font-bold text-green-400">{totalDebito.toFixed(2)}</td>
                  <td className="p-2 text-right font-bold text-red-400">{totalCredito.toFixed(2)}</td>
                  <td></td>
                </tr>
                {diferenca !== 0 && (
                  <tr>
                    <td colSpan="5" className="p-2 text-center text-red-400">
                      <AlertCircle size={16} className="inline mr-1" />
                      Diferença: {Math.abs(diferenca).toFixed(2)} Kz (Débito deve igualar Crédito)
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>

        {/* Observações */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <label className="block text-sm text-gray-400 mb-1">Observações</label>
          <textarea
            className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
            rows="3"
            value={lancamento.observacoes}
            onChange={(e) => setLancamento({...lancamento, observacoes: e.target.value})}
            placeholder="Informações adicionais sobre este lançamento..."
          />
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/contabilidade/lancamentos")}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg text-white flex items-center gap-2"
          >
            <X size={18} /> Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || diferenca !== 0}
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg text-white flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} /> {loading ? "A processar..." : "Contabilizar"}
          </button>
        </div>

        {/* Aviso Partidas Dobradas */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
          <h4 className="text-blue-400 font-semibold mb-1 flex items-center gap-2">
            <AlertCircle size={16} /> Princípio das Partidas Dobradas
          </h4>
          <p className="text-sm text-gray-300">
            Em cada lançamento, o <strong className="text-green-400">total dos Débitos</strong> deve ser igual 
            ao <strong className="text-red-400">total dos Créditos</strong>. Este princípio garante a integridade 
            da informação contabilística.
          </p>
        </div>
      </form>
    </Layout>
  );
};

export default NovoLancamento;