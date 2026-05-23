// src/pages/Contabilidade/NovoLancamento.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { Save, X, Plus, Trash2, AlertCircle, Search, Building2 } from "lucide-react";

const NovoLancamento = () => {
  const navigate = useNavigate();
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [loading, setLoading] = useState(false);
  const [contas, setContas] = useState([]);
  const [showContas, setShowContas] = useState(false);
  const [contaIndex, setContaIndex] = useState(null);
  
  const [lancamento, setLancamento] = useState({
    descricao: "",
    dataLancamento: new Date().toISOString().split("T")[0],
    partidas: [
      { contaCodigo: "", contaDescricao: "", debito: 0, credito: 0 }
    ],
    observacoes: ""
  });

  const BASE_URL = "https://sirexa-api.onrender.com";

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  // Para técnico: definir empresa automaticamente
  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => {
    buscarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarContas();
    }
  }, [empresaSelecionada]);

  const buscarEmpresas = async () => {
    if (isTecnico()) {
      setLoadingEmpresas(false);
      return;
    }
    
    setLoadingEmpresas(true);
    try {
      const response = await fetch(`${BASE_URL}/api/empresa`, { headers: getHeaders() });
      if (response.status === 403) {
        setEmpresas([]);
        return;
      }
      const data = await response.json();
      const lista = Array.isArray(data) ? data : [];
      setEmpresas(lista);
      if (lista.length > 0 && !empresaSelecionada) {
        setEmpresaSelecionada(lista[0]._id);
      }
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarContas = async () => {
    if (!empresaSelecionada && !isTecnico()) return;
    
    try {
      const id = empresaSelecionada || userEmpresaId;
      const response = await fetch(`${BASE_URL}/api/contabilidade/plano-contas?empresaId=${id}`, {
        headers: getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          setContas(data.dados || []);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
    }
  };

  const handleAddPartida = () => {
    setLancamento({
      ...lancamento,
      partidas: [...lancamento.partidas, { contaCodigo: "", contaDescricao: "", debito: 0, credito: 0 }]
    });
  };

  const handleRemovePartida = (index) => {
    if (lancamento.partidas.length <= 2) {
      alert("❌ Um lançamento deve ter pelo menos 2 partidas!");
      return;
    }
    const novasPartidas = lancamento.partidas.filter((_, i) => i !== index);
    setLancamento({ ...lancamento, partidas: novasPartidas });
  };

  const handlePartidaChange = (index, field, value) => {
    const novasPartidas = [...lancamento.partidas];
    novasPartidas[index][field] = field === "debito" || field === "credito" ? parseFloat(value) || 0 : value;
    
    // Se definir débito, zera crédito e vice-versa
    if (field === "debito" && parseFloat(value) > 0) {
      novasPartidas[index].credito = 0;
    }
    if (field === "credito" && parseFloat(value) > 0) {
      novasPartidas[index].debito = 0;
    }
    
    setLancamento({ ...lancamento, partidas: novasPartidas });
  };

  const selecionarConta = (conta, index) => {
    const novasPartidas = [...lancamento.partidas];
    novasPartidas[index].contaCodigo = conta.codigo;
    novasPartidas[index].contaDescricao = conta.nome;
    setLancamento({ ...lancamento, partidas: novasPartidas });
    setShowContas(false);
    setContaIndex(null);
  };

  const calcularTotais = () => {
    const totalDebito = lancamento.partidas.reduce((sum, p) => sum + (p.debito || 0), 0);
    const totalCredito = lancamento.partidas.reduce((sum, p) => sum + (p.credito || 0), 0);
    return { totalDebito, totalCredito, diferenca: totalDebito - totalCredito };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { totalDebito, totalCredito, diferenca } = calcularTotais();
    
    // Validar se há pelo menos 2 partidas com valores
    const partidasValidas = lancamento.partidas.filter(p => p.contaCodigo && (p.debito > 0 || p.credito > 0));
    if (partidasValidas.length < 2) {
      alert("❌ É necessário pelo menos 2 partidas com valores válidos!");
      return;
    }
    
    if (diferenca !== 0) {
      alert(`❌ Os valores de Débito (${totalDebito.toFixed(2)}) e Crédito (${totalCredito.toFixed(2)}) devem ser iguais!`);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/lancamentos/manual`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          empresaId: empresaSelecionada || userEmpresaId,
          descricao: lancamento.descricao,
          dataLancamento: lancamento.dataLancamento,
          partidas: partidasValidas,
          observacoes: lancamento.observacoes
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

  // Se estiver carregando empresas
  if (loadingEmpresas && isGestor()) {
    return (
      <Layout title="Novo Lançamento Contabilístico" showBackButton backToRoute="/contabilidade/lancamentos">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  // Se for gestor e não tiver empresa selecionada
  if (isGestor() && !empresaSelecionada && empresas.length > 0) {
    return (
      <Layout title="Novo Lançamento Contabilístico" showBackButton backToRoute="/contabilidade/lancamentos">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Building2 size={48} className="mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400">Selecione uma empresa para continuar</p>
            <button 
              onClick={() => setEmpresaSelecionada(empresas[0]?._id)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white"
            >
              Selecionar Empresa
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Novo Lançamento Contabilístico" showBackButton backToRoute="/contabilidade/lancamentos">
      <form onSubmit={handleSubmit} className="space-y-6 p-4">
        {/* Seletor de Empresa (apenas para gestor) */}
        {isGestor() && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-gray-400" />
                <span className="text-sm text-gray-300">Empresa:</span>
              </div>
              <select
                className="bg-gray-700 rounded-lg px-3 py-2 text-white text-sm flex-1 min-w-[200px]"
                value={empresaSelecionada}
                onChange={(e) => setEmpresaSelecionada(e.target.value)}
                required
              >
                <option value="">Selecione uma empresa...</option>
                {empresas.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

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
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg text-white flex items-center gap-2 text-sm"
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
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          className="bg-gray-700 rounded px-2 py-1 text-white w-32 font-mono text-xs"
                          value={partida.contaCodigo}
                          onChange={(e) => handlePartidaChange(index, "contaCodigo", e.target.value)}
                          placeholder="Ex: 45.1.1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setContaIndex(index);
                            setShowContas(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 p-1 rounded text-white"
                          title="Buscar conta"
                        >
                          <Search size={14} />
                        </button>
                      </div>
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
                      <button
                        type="button"
                        onClick={() => handleRemovePartida(index)}
                        className="text-red-400 hover:text-red-300"
                        title="Remover partida"
                      >
                        <Trash2 size={16} />
                      </button>
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
          <p className="text-xs text-gray-500 mt-2">* O total de Débitos deve ser igual ao total de Créditos</p>
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

        {/* Modal de Seleção de Contas */}
        {showContas && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[70vh] overflow-y-auto border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Selecionar Conta</h3>
                <button onClick={() => setShowContas(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-2">
                {contas.filter(c => c.ativo !== false).map((conta) => (
                  <button
                    key={conta._id}
                    type="button"
                    onClick={() => selecionarConta(conta, contaIndex)}
                    className="w-full text-left p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition flex justify-between items-center"
                  >
                    <div>
                      <span className="font-mono text-xs text-blue-400">{conta.codigo}</span>
                      <p className="text-white text-sm">{conta.nome}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      conta.natureza === "Devedora" ? "bg-blue-900 text-blue-300" :
                      conta.natureza === "Credora" ? "bg-green-900 text-green-300" : "bg-gray-600 text-gray-300"
                    }`}>
                      {conta.natureza}
                    </span>
                  </button>
                ))}
                {contas.length === 0 && (
                  <p className="text-center text-gray-400 py-8">
                    Nenhuma conta encontrada. 
                    <Link to="/contabilidade/plano-contas" className="text-blue-400 block mt-2">
                      Ir para Plano de Contas →
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

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