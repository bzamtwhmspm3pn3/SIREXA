// src/components/RelatorioStock.jsx - PDF CORRIGIDO (sem cards com contorno)
import React, { useState, useEffect } from "react";
import { 
  X, Download, Printer, Package, TrendingUp, AlertTriangle, 
  Calendar, DollarSign, FileText, Loader2, CheckCircle,
  Building2, User, Box, Wrench
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import API_URL from "../config/api";

// Função para limpar caracteres especiais
const limparTexto = (texto) => {
  if (!texto) return "-";
  let str = String(texto);
  const mapa = {
    'ç': 'c', 'Ç': 'C', 'ã': 'a', 'Ã': 'A', 'õ': 'o', 'Õ': 'O',
    'á': 'a', 'Á': 'A', 'à': 'a', 'À': 'A', 'â': 'a', 'Â': 'A',
    'é': 'e', 'É': 'E', 'è': 'e', 'È': 'E', 'ê': 'e', 'Ê': 'E',
    'í': 'i', 'Í': 'I', 'ì': 'i', 'Ì': 'I', 'î': 'i', 'Î': 'I',
    'ó': 'o', 'Ó': 'O', 'ò': 'o', 'Ò': 'O', 'ô': 'o', 'Ô': 'O',
    'ú': 'u', 'Ú': 'U', 'ù': 'u', 'Ù': 'U', 'û': 'u', 'Û': 'U',
    'ü': 'u', 'Ü': 'U', 'ñ': 'n', 'Ñ': 'N', 'Ø': 'O', 'ø': 'o',
    'æ': 'ae', 'Æ': 'AE', 'ß': 'ss', '°': ' graus', '€': 'EUR',
    '©': '(c)', '®': '(r)', '™': '(tm)'
  };
  Object.keys(mapa).forEach(key => { str = str.split(key).join(mapa[key]); });
  str = str.replace(/[^\x20-\x7E]/g, '');
  if (str.length > 35) str = str.substring(0, 32) + "...";
  return str || "-";
};

const formatarMoeda = (valor) => {
  if (!valor && valor !== 0) return "0 Kz";
  return new Intl.NumberFormat('pt-AO').format(valor) + " Kz";
};

const formatarData = (data) => {
  if (!data) return "-";
  try { return new Date(data).toLocaleDateString('pt-PT'); } 
  catch { return "-"; }
};

const RelatorioStock = ({ produtos = [], servicos = [], onClose, empresaId }) => {
  const [exportando, setExportando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [empresa, setEmpresa] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("produtos");

  const produtosArray = Array.isArray(produtos) ? produtos : [];
  const servicosArray = Array.isArray(servicos) ? servicos : [];

  useEffect(() => {
    carregarDados();
  }, [empresaId]);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const idEmpresa = empresaId || localStorage.getItem("empresaId");
      const token = localStorage.getItem("token");
      
      if (idEmpresa && token) {
        const response = await fetch(`${API_URL}/empresa/${idEmpresa}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setEmpresa(data.dados || data);
        }
      }
      const userStr = localStorage.getItem("user");
      if (userStr) setUsuario(JSON.parse(userStr));
    } catch (error) { console.error("Erro:", error); }
    finally { setCarregando(false); }
  };

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const stats = {
    produtos: {
      total: produtosArray.length,
      quantidade: produtosArray.reduce((acc, p) => acc + (p?.quantidade || 0), 0),
      valor: produtosArray.reduce((acc, p) => acc + ((p?.quantidade || 0) * (p?.precoVenda || 0)), 0),
      baixoEstoque: produtosArray.filter(p => (p?.quantidade || 0) <= (p?.quantidadeMinima || 5)).length,
    },
    servicos: {
      total: servicosArray.length,
      valor: servicosArray.reduce((acc, s) => acc + (s?.precoVenda || 0), 0),
      comAgendamento: servicosArray.filter(s => s?.requerAgendamento === true).length
    }
  };

  const margemMedia = produtosArray.length > 0 
    ? (produtosArray.reduce((acc, p) => {
        if (p?.precoCompra > 0) 
          return acc + ((p.precoVenda - p.precoCompra) / p.precoCompra * 100);
        return acc;
      }, 0) / produtosArray.length).toFixed(1)
    : 0;

  const exportarPDF = async () => {
    if (produtosArray.length === 0 && servicosArray.length === 0) {
      mostrarMensagem("Nenhum dado para exportar", "erro");
      return;
    }
    
    setExportando(true);
    mostrarMensagem("Gerando PDF...", "info");
    
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const dataAtual = new Date();
      const nomeEmpresa = limparTexto(empresa?.nome || localStorage.getItem("empresaNome") || "Empresa");
      
      // CABECALHO
      doc.setFillColor(37, 99, 235);
      doc.rect(14, 10, 40, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("S", 30, 33);
      doc.setFontSize(14);
      doc.text("G", 36, 33);
      
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(14);
      doc.text(nomeEmpresa, 60, 20);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text(`NIF: ${empresa?.nif || "---"}`, 60, 28);
      doc.text(`Data: ${dataAtual.toLocaleDateString('pt-PT')}`, 60, 34);
      
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text("RELATORIO DE STOCK", 14, 55);
      
      // RESUMO EM TEXTO (sem cards com contorno)
      let yPos = 70;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("RESUMO EXECUTIVO", 14, yPos);
      yPos += 6;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`Total de Produtos: ${stats.produtos.total}`, 14, yPos);
      doc.text(`Quantidade em Stock: ${stats.produtos.quantidade} unidades`, 14, yPos + 5);
      doc.text(`Valor Total em Stock: ${formatarMoeda(stats.produtos.valor)}`, 14, yPos + 10);
      doc.text(`Margem Media: ${margemMedia}%`, 14, yPos + 15);
      doc.text(`Produtos com Baixo Estoque: ${stats.produtos.baixoEstoque}`, 14, yPos + 20);
      
      doc.text(`Total de Servicos: ${stats.servicos.total}`, 100, yPos);
      doc.text(`Faturamento Potencial: ${formatarMoeda(stats.servicos.valor)}`, 100, yPos + 5);
      doc.text(`Servicos com Agendamento: ${stats.servicos.comAgendamento}`, 100, yPos + 10);
      
      yPos += 35;
      
      // TABELA DE PRODUTOS
      if (produtosArray.length > 0) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("LISTA DE PRODUTOS", 14, yPos);
        yPos += 6;
        
        const produtosData = produtosArray.map(p => [
          limparTexto(p?.produto),
          (p?.quantidade || 0).toLocaleString(),
          formatarMoeda(p?.precoCompra),
          formatarMoeda(p?.precoVenda),
          p?.precoCompra > 0 ? `${((p.precoVenda - p.precoCompra) / p.precoCompra * 100).toFixed(1)}%` : "0%",
          formatarData(p?.dataValidade),
          limparTexto(p?.categoria) || "Geral"
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [["Produto", "Qtd", "Compra", "Venda", "Margem", "Validade", "Categoria"]],
          body: produtosData,
          theme: "striped",
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 18, halign: "right" },
            2: { cellWidth: 28, halign: "right" },
            3: { cellWidth: 28, halign: "right" },
            4: { cellWidth: 20, halign: "right" },
            5: { cellWidth: 22, halign: "center" },
            6: { cellWidth: 22 }
          }
        });
        yPos = doc.lastAutoTable.finalY + 10;
      }
      
      // TABELA DE SERVICOS
      if (servicosArray.length > 0) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(139, 92, 246);
        doc.text("LISTA DE SERVICOS", 14, yPos);
        yPos += 6;
        
        const servicosData = servicosArray.map(s => [
          limparTexto(s?.produto),
          formatarMoeda(s?.precoVenda),
          s?.duracaoEstimada ? `${s.duracaoEstimada} ${s.unidadeTempo === 'horas' ? 'h' : s.unidadeTempo === 'dias' ? 'd' : 'min'}` : "-",
          s?.requerAgendamento ? "Sim" : "Nao",
          limparTexto(s?.executadoPor) || "-",
          limparTexto(s?.categoria) || "Servicos"
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [["Servico", "Preco", "Duracao", "Agendamento", "Executado Por", "Categoria"]],
          body: servicosData,
          theme: "striped",
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 243, 255] },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 28, halign: "right" },
            2: { cellWidth: 20, halign: "center" },
            3: { cellWidth: 22, halign: "center" },
            4: { cellWidth: 30 },
            5: { cellWidth: 25 }
          }
        });
      }
      
      // RODAPE
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`${nomeEmpresa} - Relatorio de Stock | Pagina ${i} de ${pageCount}`, 14, 287);
      }
      
      doc.save(`relatorio_stock_${nomeEmpresa.replace(/\s/g, '_')}.pdf`);
      mostrarMensagem("PDF gerado com sucesso!", "sucesso");
      setTimeout(() => onClose(), 1500);
      
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao gerar PDF", "erro");
    } finally {
      setExportando(false);
    }
  };

  const nomeEmpresa = limparTexto(empresa?.nome || localStorage.getItem("empresaNome") || "Empresa");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      {mensagem.texto && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" ? "bg-green-600" : 
            mensagem.tipo === "info" ? "bg-blue-600" : "bg-red-600"
          } text-white text-sm`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : 
             mensagem.tipo === "info" ? <Loader2 className="w-4 h-4 animate-spin" /> : 
             <AlertTriangle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-800 to-indigo-900 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-xl">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Relatorio de Stock</h2>
                <p className="text-blue-200 text-sm">{stats.produtos.total} produtos • {stats.servicos.total} servicos</p>
                <p className="text-blue-300 text-xs mt-1">Empresa: {nomeEmpresa}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-white flex items-center gap-2">
                <Printer size={18} /> Imprimir
              </button>
              <button onClick={exportarPDF} disabled={exportando} className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition text-white flex items-center gap-2 disabled:opacity-50">
                {exportando ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {exportando ? "Gerando..." : "Exportar PDF"}
              </button>
              <button onClick={onClose} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-white">
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {carregando ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-blue-400" size={40} />
            </div>
          ) : (
            <>
              {/* Cards de Estatisticas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-5 text-white shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-blue-100 text-sm">Total de Produtos</p>
                      <p className="text-3xl font-bold mt-1">{stats.produtos.total}</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-lg"><Package size={24} /></div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-5 text-white shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-green-100 text-sm">Valor em Stock</p>
                      <p className="text-xl font-bold mt-1">{formatarMoeda(stats.produtos.valor)}</p>
                      <p className="text-green-200 text-xs mt-1">Margem: {margemMedia}%</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-lg"><TrendingUp size={24} /></div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xl p-5 text-white shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-yellow-100 text-sm">Alertas</p>
                      <p className="text-3xl font-bold mt-1">{stats.produtos.baixoEstoque}</p>
                      <p className="text-yellow-200 text-xs mt-1">Baixo Estoque</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-lg"><AlertTriangle size={24} /></div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-5 text-white shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-purple-100 text-sm">Servicos</p>
                      <p className="text-3xl font-bold mt-1">{stats.servicos.total}</p>
                      <p className="text-purple-200 text-xs mt-1">{stats.servicos.comAgendamento} com agendamento</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-lg"><Wrench size={24} /></div>
                  </div>
                </div>
              </div>

              {/* Abas */}
              <div className="border-b border-gray-700 mb-6">
                <div className="flex gap-1">
                  <button onClick={() => setAbaAtiva("produtos")} className={`px-6 py-2 rounded-t-lg font-medium transition-all ${abaAtiva === "produtos" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
                    <Package size={16} className="inline mr-2" /> Produtos ({stats.produtos.total})
                  </button>
                  <button onClick={() => setAbaAtiva("servicos")} className={`px-6 py-2 rounded-t-lg font-medium transition-all ${abaAtiva === "servicos" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
                    <Wrench size={16} className="inline mr-2" /> Servicos ({stats.servicos.total})
                  </button>
                </div>
              </div>

              {/* Lista de PRODUTOS em Cards */}
              {abaAtiva === "produtos" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {produtosArray.map((p, idx) => {
                    const isBaixoEstoque = (p?.quantidade || 0) <= (p?.quantidadeMinima || 5);
                    return (
                      <div key={idx} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-blue-500 transition-all">
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${isBaixoEstoque ? 'bg-yellow-500/20' : 'bg-blue-500/20'}`}>
                                <Package size={16} className={isBaixoEstoque ? 'text-yellow-400' : 'text-blue-400'} />
                              </div>
                              <h3 className="font-semibold text-white">{p?.produto}</h3>
                            </div>
                            {isBaixoEstoque && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">Baixo Estoque</span>}
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-400">Quantidade:</span><span className="text-white">{p?.quantidade || 0}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Preco Venda:</span><span className="text-green-400">{formatarMoeda(p?.precoVenda)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Margem:</span><span className="text-blue-400">{p?.precoCompra > 0 ? `${((p.precoVenda - p.precoCompra) / p.precoCompra * 100).toFixed(1)}%` : "0%"}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Categoria:</span><span className="text-gray-300">{p?.categoria || "Geral"}</span></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Lista de SERVICOS em Cards */}
              {abaAtiva === "servicos" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {servicosArray.map((s, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-purple-500 transition-all">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-purple-500/20"><Wrench size={16} className="text-purple-400" /></div>
                            <h3 className="font-semibold text-white">{s?.produto}</h3>
                          </div>
                          {s?.requerAgendamento && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">Agendamento</span>}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-400">Preco:</span><span className="text-purple-400">{formatarMoeda(s?.precoVenda)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Duracao:</span><span className="text-gray-300">{s?.duracaoEstimada ? `${s.duracaoEstimada} ${s.unidadeTempo || 'horas'}` : "-"}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Agendamento:</span><span className="text-gray-300">{s?.requerAgendamento ? "Sim" : "Nao"}</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">Categoria:</span><span className="text-gray-300">{s?.categoria || "Servicos"}</span></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
      `}</style>
    </div>
  );
};

export default RelatorioStock;