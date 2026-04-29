// src/pages/Abastecimentos.jsx - VERSÃO COMPLETA CORRIGIDA
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import { 
  Plus, Edit, Trash2, Search, Fuel, Car, Calendar, TrendingUp,
  CheckCircle, AlertCircle, Loader2, X, ChevronLeft, ChevronRight,
  Building2, Download, FileText, DollarSign, MapPin, Clock
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Abastecimentos = () => {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [abastecimentos, setAbastecimentos] = useState([]);
  const [viaturas, setViaturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(15);
  const [recarregar, setRecarregar] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [estatisticas, setEstatisticas] = useState({
    totalLitros: 0,
    totalGasto: 0,
    totalAbastecimentos: 0,
    mediaPreco: 0
  });
  
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();

  const [formData, setFormData] = useState({
    dataAbastecimento: new Date().toISOString().split('T')[0],
    viaturaId: "",
    quantidade: 0,
    precoLitro: 0,
    tipoCombustivel: "Diesel",
    km: 0,
    postoCombustivel: "",
    observacao: ""
  });

  const tiposCombustivel = ["Gasolina", "Diesel", "Elétrico", "Híbrido", "GNV"];

  // Funções auxiliares
  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "0 Kz";
    return valor.toLocaleString() + " Kz";
  };

  const calcularTotal = (litros, precoLitro) => {
    return (litros || 0) * (precoLitro || 0);
  };

  // Para técnico: definir empresa automaticamente
  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarAbastecimentos();
      carregarViaturas();
    } else {
      setAbastecimentos([]);
      setViaturas([]);
    }
  }, [empresaSelecionada, recarregar]);

  // Calcular estatísticas localmente quando abastecimentos mudar
  useEffect(() => {
    const totalLitros = abastecimentos.reduce((acc, a) => acc + (a.quantidade || 0), 0);
    const totalGasto = abastecimentos.reduce((acc, a) => acc + (a.total || 0), 0);
    const totalAbastecimentos = abastecimentos.length;
    const mediaPreco = totalLitros > 0 ? totalGasto / totalLitros : 0;
    
    setEstatisticas({
      totalLitros,
      totalGasto,
      totalAbastecimentos,
      mediaPreco
    });
  }, [abastecimentos]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const carregarEmpresas = async () => {
    if (isTecnico()) {
      setLoadingEmpresas(false);
      return;
    }
    
    setLoadingEmpresas(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://sirexa-api.onrender.com/api/empresa", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        setEmpresas([]);
        mostrarMensagem("Acesso negado", "erro");
        return;
      }
      
      const data = await response.json();
      const empresasList = Array.isArray(data) ? data : [];
      setEmpresas(empresasList);
      
      const empresaPadrao = empresasList[0]?._id || user?.empresaId;
      if (empresaPadrao && !empresaSelecionada) {
        setEmpresaSelecionada(empresaPadrao);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      mostrarMensagem("Erro ao carregar empresas", "erro");
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarAbastecimentos = async () => {
    if (!empresaSelecionada) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/abastecimentos?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        mostrarMensagem("Acesso negado a esta empresa", "erro");
        setEmpresaSelecionada("");
        setAbastecimentos([]);
        return;
      }
      
      const data = await response.json();
      setAbastecimentos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro:", error);
      setAbastecimentos([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarViaturas = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/viaturas?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        setViaturas([]);
        return;
      }
      
      const data = await response.json();
      setViaturas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro:", error);
      setViaturas([]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.viaturaId || !formData.quantidade || !formData.precoLitro) {
      mostrarMensagem("Viatura, quantidade e preço são obrigatórios", "erro");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = editando ? `https://sirexa-api.onrender.com/api/abastecimentos/${editando}` : "https://sirexa-api.onrender.com/api/abastecimentos";
      const method = editando ? "PUT" : "POST";

      const dadosEnvio = {
        viaturaId: formData.viaturaId,
        quantidade: parseFloat(formData.quantidade),
        precoLitro: parseFloat(formData.precoLitro),
        tipoCombustivel: formData.tipoCombustivel,
        km: parseInt(formData.km) || 0,
        postoCombustivel: formData.postoCombustivel,
        observacao: formData.observacao,
        dataAbastecimento: formData.dataAbastecimento,
        empresaId: empresaSelecionada
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(dadosEnvio)
      });

      const result = await response.json();

      if (response.ok) {
        mostrarMensagem(editando ? "✅ Abastecimento atualizado!" : "✅ Abastecimento registrado!", "sucesso");
        setRedirecting(true);
        setModalOpen(false);
        setEditando(null);
        resetForm();
        setRecarregar(prev => !prev);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao salvar", "erro");
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setLoading(false);
    }
  };

  const excluirAbastecimento = async (id) => {
    if (!window.confirm("⚠️ Tem certeza que deseja excluir este abastecimento?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/abastecimentos/${id}?empresaId=${empresaSelecionada}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        mostrarMensagem("✅ Abastecimento excluído!", "sucesso");
        setRecarregar(prev => !prev);
      } else {
        const result = await response.json();
        mostrarMensagem(result.mensagem || "Erro ao excluir", "erro");
      }
    } catch (error) {
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    }
  };

  const editarAbastecimento = (abastecimento) => {
    setEditando(abastecimento._id);
    setFormData({
      dataAbastecimento: new Date(abastecimento.dataAbastecimento).toISOString().split('T')[0],
      viaturaId: abastecimento.viaturaId || "",
      quantidade: abastecimento.quantidade || 0,
      precoLitro: abastecimento.precoLitro || 0,
      tipoCombustivel: abastecimento.tipoCombustivel || "Diesel",
      km: abastecimento.km || 0,
      postoCombustivel: abastecimento.postoCombustivel || "",
      observacao: abastecimento.observacao || ""
    });
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      dataAbastecimento: new Date().toISOString().split('T')[0],
      viaturaId: "",
      quantidade: 0,
      precoLitro: 0,
      tipoCombustivel: "Diesel",
      km: 0,
      postoCombustivel: "",
      observacao: ""
    });
  };

  const exportarPDF = async () => {
    if (abastecimentos.length === 0) {
      mostrarMensagem("Nenhum abastecimento para exportar", "erro");
      return;
    }

    setExportando(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const dataAtual = new Date();
      const empresaAtual = isTecnico() 
        ? { nome: userEmpresaNome, nif: user?.nif || "---" }
        : empresas.find(e => e._id === empresaSelecionada);
      
      // Cabeçalho
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("CONTROLE DE ABASTECIMENTOS", 148.5, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(empresaAtual?.nome || "Empresa", 148.5, 30, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em: ${dataAtual.toLocaleDateString("pt-AO")}`, 148.5, 38, { align: "center" });
      
      doc.setDrawColor(37, 99, 235);
      doc.line(15, 44, 282, 44);
      
      // Estatísticas
      let y = 52;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`Total de Abastecimentos: ${estatisticas.totalAbastecimentos}`, 20, y);
      doc.text(`Total de Litros: ${estatisticas.totalLitros.toLocaleString()} L`, 120, y);
      doc.text(`Total Gasto: ${formatarMoeda(estatisticas.totalGasto)}`, 200, y);
      
      y += 10;
      
      // Tabela de abastecimentos
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("LISTA DE ABASTECIMENTOS", 20, y);
      
      const tabelaDados = abastecimentos.map(a => [
        new Date(a.dataAbastecimento).toLocaleDateString('pt-PT'),
        a.viaturaMatricula || "-",
        a.postoCombustivel || "-",
        (a.quantidade || 0).toLocaleString(),
        formatarMoeda(a.precoLitro),
        formatarMoeda(a.total),
        (a.km || 0).toLocaleString(),
        a.tipoCombustivel || "-"
      ]);
      
      autoTable(doc, {
        startY: y + 5,
        head: [["Data", "Viatura", "Posto", "Litros", "Preco/L", "Total", "Km", "Combustivel"]],
        body: tabelaDados,
        theme: "striped",
        styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [0, 0, 0] },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 250, 255] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: 35 },
          3: { cellWidth: 20, halign: "right" },
          4: { cellWidth: 25, halign: "right" },
          5: { cellWidth: 28, halign: "right" },
          6: { cellWidth: 20, halign: "right" },
          7: { cellWidth: 25 }
        },
        margin: { left: 20, right: 20 }
      });
      
      // Rodapé
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(120, 120, 120);
        doc.text(`Gerado por: ${user?.nome || user?.email || "Sistema"}`, 148.5, 195, { align: "center" });
        doc.text(`© ${new Date().getFullYear()} AnDioGest - Gestao Corporativa`, 148.5, 200, { align: "center" });
      }
      
      doc.save(`abastecimentos_${empresaAtual?.nome}_${dataAtual.toISOString().split('T')[0]}.pdf`);
      mostrarMensagem("PDF exportado com sucesso!", "sucesso");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      mostrarMensagem("Erro ao gerar PDF", "erro");
    } finally {
      setExportando(false);
    }
  };

  const abastecimentosFiltrados = abastecimentos.filter(a =>
    a.viaturaMatricula?.toLowerCase().includes(busca.toLowerCase()) ||
    a.postoCombustivel?.toLowerCase().includes(busca.toLowerCase())
  );

  const totalPaginas = Math.ceil(abastecimentosFiltrados.length / itensPorPagina);
  const indexOfLastItem = paginaAtual * itensPorPagina;
  const indexOfFirstItem = indexOfLastItem - itensPorPagina;
  const currentItems = abastecimentosFiltrados.slice(indexOfFirstItem, indexOfLastItem);

  if (redirecting) {
    return (
      <Layout title="Abastecimentos" showBackButton={true} backToRoute="/menu">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-center max-w-sm mx-4 shadow-2xl border border-green-500/30">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Sucesso!</h3>
            <p className="text-gray-300 text-sm">{editando ? "Abastecimento atualizado." : "Abastecimento registrado."}</p>
            <p className="text-green-400 text-xs mt-2">Redirecionando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loadingEmpresas) {
    return (
      <Layout title="Abastecimentos" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Abastecimentos" showBackButton={true} backToRoute="/menu">
      {mensagem.texto && !redirecting && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
          } text-white text-sm whitespace-nowrap`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => { setRecarregar(prev => !prev); }}
          loading={loadingEmpresas}
        />

        {!empresaSelecionada ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <Building2 className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">
              {isTecnico() ? "Carregando sua empresa..." : "Selecione uma empresa para começar"}
            </p>
          </div>
        ) : (
          <>
            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-4 text-center border border-blue-500/30">
                <Fuel className="mx-auto mb-2 text-blue-400" size={28} />
                <p className="text-2xl font-bold text-white">{estatisticas.totalAbastecimentos}</p>
                <p className="text-xs text-gray-400">Total Abastecimentos</p>
              </div>
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-4 text-center border border-green-500/30">
                <Fuel className="mx-auto mb-2 text-green-400" size={28} />
                <p className="text-2xl font-bold text-green-400">{estatisticas.totalLitros.toLocaleString()} L</p>
                <p className="text-xs text-gray-400">Total de Litros</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-xl p-4 text-center border border-yellow-500/30">
                <DollarSign className="mx-auto mb-2 text-yellow-400" size={28} />
                <p className="text-2xl font-bold text-yellow-400">{formatarMoeda(estatisticas.totalGasto)}</p>
                <p className="text-xs text-gray-400">Total Gasto</p>
              </div>
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-4 text-center border border-purple-500/30">
                <TrendingUp className="mx-auto mb-2 text-purple-400" size={28} />
                <p className="text-2xl font-bold text-purple-400">{estatisticas.mediaPreco.toFixed(2)} Kz/L</p>
                <p className="text-xs text-gray-400">Média Preço</p>
              </div>
            </div>

            {/* Barra de pesquisa e botões */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Pesquisar por viatura ou posto..."
                  className="w-full pl-10 p-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:border-blue-500 transition"
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPaginaAtual(1); }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportarPDF}
                  disabled={exportando || abastecimentos.length === 0}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {exportando ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                  {exportando ? "Exportando..." : "Exportar PDF"}
                </button>
                <button
                  onClick={() => { resetForm(); setEditando(null); setModalOpen(true); }}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg"
                >
                  <Plus size={18} /> Novo Abastecimento
                </button>
              </div>
            </div>

            {/* Tabela de Abastecimentos */}
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin mx-auto text-blue-400" size={40} />
                <p className="text-gray-400 mt-2">Carregando abastecimentos...</p>
              </div>
            ) : abastecimentosFiltrados.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center border border-gray-700">
                <Fuel className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">Nenhum abastecimento registrado</p>
                <button
                  onClick={() => { resetForm(); setEditando(null); setModalOpen(true); }}
                  className="mt-4 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition"
                >
                  <Plus size={16} className="inline mr-2" /> Registrar Primeiro Abastecimento
                </button>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr className="text-white text-sm">
                        <th className="p-3 text-center">Data</th>
                        <th className="p-3 text-left">Viatura</th>
                        <th className="p-3 text-left">Posto</th>
                        <th className="p-3 text-right">Litros</th>
                        <th className="p-3 text-right">Preco/L</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-right">Km</th>
                        <th className="p-3 text-center">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map(a => (
                        <tr key={a._id} className="border-t border-gray-700 hover:bg-gray-750 transition">
                          <td className="p-3 text-center text-gray-300">
                            {new Date(a.dataAbastecimento).toLocaleDateString('pt-PT')}
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-white">{a.viaturaMatricula}</div>
                            <div className="text-xs text-gray-400">{a.tipoCombustivel}</div>
                          </td>
                          <td className="p-3 text-gray-300">{a.postoCombustivel || "—"}</td>
                          <td className="p-3 text-right text-gray-300">{a.quantidade?.toLocaleString()} L</td>
                          <td className="p-3 text-right text-gray-300">{formatarMoeda(a.precoLitro)}</td>
                          <td className="p-3 text-right text-green-400 font-medium">{formatarMoeda(a.total)}</td>
                          <td className="p-3 text-right text-gray-300">{a.km?.toLocaleString()} km</td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => editarAbastecimento(a)}
                                className="p-1.5 bg-yellow-600/20 hover:bg-yellow-600/40 rounded-lg transition"
                                title="Editar"
                              >
                                <Edit size={16} className="text-yellow-400" />
                              </button>
                              <button
                                onClick={() => excluirAbastecimento(a._id)}
                                className="p-1.5 bg-red-600/20 hover:bg-red-600/40 rounded-lg transition"
                                title="Excluir"
                              >
                                <Trash2 size={16} className="text-red-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {totalPaginas > 1 && (
                  <div className="flex justify-center items-center gap-2 p-4 border-t border-gray-700">
                    <button
                      onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                      disabled={paginaAtual === 1}
                      className="p-2 bg-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-600 transition"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-gray-400 text-sm">
                      Página {paginaAtual} de {totalPaginas}
                    </span>
                    <button
                      onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                      disabled={paginaAtual === totalPaginas}
                      className="p-2 bg-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-600 transition"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {modalOpen && !redirecting && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg"><Fuel className="text-white" size={20} /></div>
                  <h2 className="text-xl font-bold text-white">{editando ? "Editar Abastecimento" : "Novo Abastecimento"}</h2>
                </div>
                <button onClick={() => { setModalOpen(false); setEditando(null); }} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Data *</label>
                <input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.dataAbastecimento} onChange={(e) => setFormData({...formData, dataAbastecimento: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Viatura *</label>
                <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.viaturaId} onChange={(e) => setFormData({...formData, viaturaId: e.target.value})}>
                  <option value="">Selecione uma viatura</option>
                  {viaturas.map(v => (
                    <option key={v._id} value={v._id}>{v.matricula} - {v.marca} {v.modelo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Posto</label>
                <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.postoCombustivel} onChange={(e) => setFormData({...formData, postoCombustivel: e.target.value})} placeholder="Ex: Pumangol" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Combustível</label>
                <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.tipoCombustivel} onChange={(e) => setFormData({...formData, tipoCombustivel: e.target.value})}>
                  {tiposCombustivel.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Litros *</label>
                <input type="number" step="0.1" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white text-right" value={formData.quantidade} onChange={(e) => setFormData({...formData, quantidade: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Preço por Litro (Kz) *</label>
                <input type="number" step="0.01" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white text-right" value={formData.precoLitro} onChange={(e) => setFormData({...formData, precoLitro: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Odômetro (km)</label>
                <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white text-right" value={formData.km} onChange={(e) => setFormData({...formData, km: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Observação</label>
                <textarea rows={2} className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.observacao} onChange={(e) => setFormData({...formData, observacao: e.target.value})} placeholder="Observações adicionais..." />
              </div>
              
              <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                <p className="text-sm text-gray-400">Total a pagar</p>
                <p className="text-2xl font-bold text-green-400">{formatarMoeda(calcularTotal(formData.quantidade, formData.precoLitro))}</p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                  {loading ? "Processando..." : (editando ? "Atualizar" : "Registrar")}
                </button>
                <button onClick={() => { setModalOpen(false); setEditando(null); }} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out { animation: fade-in-out 2.5s ease forwards; }
        .bg-gray-750 { background-color: #2a2a3a; }
      `}</style>
    </Layout>
  );
};

export default Abastecimentos;