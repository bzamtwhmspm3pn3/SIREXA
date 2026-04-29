import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import { TrendingUp, TrendingDown, Target, Plus, Edit, Trash2 } from "lucide-react";

const Estimativas = () => {
  const [estimativas, setEstimativas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({ categoria: "", valorEstimado: 0, periodo: "", tipo: "receita" });
  const { user } = useAuth();

  useEffect(() => { carregarEstimativas(); }, []);

  const mostrarMensagem = (texto, tipo) => { setMensagem({ texto, tipo }); setTimeout(() => setMensagem({ texto: "", tipo: "" }), 5000); };

  const carregarEstimativas = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/estimativa?empresaId=${user?.empresaId}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await response.json();
      setEstimativas(Array.isArray(data) ? data : []);
    } catch (error) { console.error("Erro:", error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!formData.categoria || !formData.valorEstimado) { mostrarMensagem("Preencha todos os campos", "erro"); return; }
    setLoading(true);
    try {
      const url = editando ? `http://localhost:5000/api/estimativa/${editando}` : "http://localhost:5000/api/estimativa";
      const method = editando ? "PUT" : "POST";
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ ...formData, empresaId: user?.empresaId }) });
      if (response.ok) { mostrarMensagem(editando ? "Estimativa atualizada!" : "Estimativa adicionada!", "sucesso"); setModalOpen(false); setEditando(null); setFormData({ categoria: "", valorEstimado: 0, periodo: "", tipo: "receita" }); carregarEstimativas(); }
      else { const error = await response.json(); mostrarMensagem(error.mensagem || "Erro ao salvar", "erro"); }
    } catch (error) { mostrarMensagem("Erro ao conectar", "erro"); }
    finally { setLoading(false); }
  };

  const excluirEstimativa = async (id) => {
    if (!window.confirm("Tem certeza?")) return;
    try {
      const response = await fetch(`http://localhost:5000/api/estimativa/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } });
      if (response.ok) { mostrarMensagem("Estimativa excluída!", "sucesso"); carregarEstimativas(); }
    } catch (error) { mostrarMensagem("Erro ao excluir", "erro"); }
  };

  const receitas = estimativas.filter(e => e.tipo === "receita");
  const despesas = estimativas.filter(e => e.tipo === "despesa");
  const totalReceitas = receitas.reduce((acc, e) => acc + (e.valorEstimado || 0), 0);
  const totalDespesas = despesas.reduce((acc, e) => acc + (e.valorEstimado || 0), 0);
  const resultadoEstimado = totalReceitas - totalDespesas;

  return (
    <Layout title="Estimativas Financeiras" showBackButton={true} backToRoute="/menu">
      {mensagem.texto && <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"} text-white`}>{mensagem.texto}</div>}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-900 rounded-lg p-4 text-center"><TrendingUp className="mx-auto mb-2 text-green-400" size={24} /><p className="text-2xl font-bold text-green-400">{totalReceitas.toLocaleString()} Kz</p><p className="text-sm text-gray-300">Receitas Estimadas</p></div>
          <div className="bg-red-900 rounded-lg p-4 text-center"><TrendingDown className="mx-auto mb-2 text-red-400" size={24} /><p className="text-2xl font-bold text-red-400">{totalDespesas.toLocaleString()} Kz</p><p className="text-sm text-gray-300">Despesas Estimadas</p></div>
          <div className={`rounded-lg p-4 text-center ${resultadoEstimado >= 0 ? 'bg-blue-900' : 'bg-orange-900'}`}><Target className="mx-auto mb-2 text-white" size={24} /><p className="text-2xl font-bold text-white">{resultadoEstimado.toLocaleString()} Kz</p><p className="text-sm text-gray-300">Resultado Estimado</p></div>
        </div>
        <div className="flex justify-end"><button onClick={() => { setModalOpen(true); setEditando(null); setFormData({ categoria: "", valorEstimado: 0, periodo: "", tipo: "receita" }); }} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition flex items-center gap-2"><Plus size={18} /> Nova Estimativa</button></div>
        {loading ? <div className="text-center p-8 text-white">Carregando...</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg overflow-hidden"><h3 className="text-lg font-bold text-green-400 p-4 border-b border-gray-700">Receitas</h3><table className="w-full text-white"><thead className="bg-gray-700"><tr><th className="p-2">Categoria</th><th className="p-2 text-right">Valor</th><th className="p-2 text-center">Ações</th></tr></thead><tbody>{receitas.map(r => <tr key={r._id} className="border-t border-gray-700"><td className="p-2">{r.categoria}</td><td className="p-2 text-right text-green-400">{r.valorEstimado?.toLocaleString()} Kz</td><td className="p-2 text-center"><button onClick={() => { setEditando(r._id); setFormData(r); setModalOpen(true); }} className="bg-yellow-600 hover:bg-yellow-700 p-1 rounded mx-1"><Edit size={14} /></button><button onClick={() => excluirEstimativa(r._id)} className="bg-red-600 hover:bg-red-700 p-1 rounded"><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>
            <div className="bg-gray-800 rounded-lg overflow-hidden"><h3 className="text-lg font-bold text-red-400 p-4 border-b border-gray-700">Despesas</h3><table className="w-full text-white"><thead className="bg-gray-700"><tr><th className="p-2">Categoria</th><th className="p-2 text-right">Valor</th><th className="p-2 text-center">Ações</th></tr></thead><tbody>{despesas.map(d => <tr key={d._id} className="border-t border-gray-700"><td className="p-2">{d.categoria}</td><td className="p-2 text-right text-red-400">{d.valorEstimado?.toLocaleString()} Kz</td><td className="p-2 text-center"><button onClick={() => { setEditando(d._id); setFormData(d); setModalOpen(true); }} className="bg-yellow-600 hover:bg-yellow-700 p-1 rounded mx-1"><Edit size={14} /></button><button onClick={() => excluirEstimativa(d._id)} className="bg-red-600 hover:bg-red-700 p-1 rounded"><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>
          </div>
        )}
      </div>
      {modalOpen && (<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"><div className="bg-gray-800 rounded-lg w-full max-w-md"><div className="flex justify-between items-center p-4 border-b border-gray-700"><h2 className="text-xl font-bold text-blue-400">{editando ? "Editar Estimativa" : "Nova Estimativa"}</h2><button onClick={() => { setModalOpen(false); setEditando(null); }} className="text-gray-400 hover:text-white">✕</button></div><div className="p-4 space-y-3"><div><label className="block text-gray-300 mb-1">Tipo</label><select className="w-full p-2 rounded bg-gray-700 text-white" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}><option value="receita">Receita</option><option value="despesa">Despesa</option></select></div><div><label className="block text-gray-300 mb-1">Categoria</label><input type="text" className="w-full p-2 rounded bg-gray-700 text-white" value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})} placeholder="Ex: Vendas, Salários" /></div><div><label className="block text-gray-300 mb-1">Valor Estimado (Kz)</label><input type="number" className="w-full p-2 rounded bg-gray-700 text-white" value={formData.valorEstimado} onChange={(e) => setFormData({...formData, valorEstimado: parseFloat(e.target.value) || 0})} /></div><div><label className="block text-gray-300 mb-1">Período</label><input type="text" className="w-full p-2 rounded bg-gray-700 text-white" value={formData.periodo} onChange={(e) => setFormData({...formData, periodo: e.target.value})} placeholder="Ex: 2024, Q1, Janeiro" /></div><button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition">{loading ? "Processando..." : (editando ? "Atualizar" : "Adicionar")}</button></div></div></div>)}
    </Layout>
  );
};

export default Estimativas;