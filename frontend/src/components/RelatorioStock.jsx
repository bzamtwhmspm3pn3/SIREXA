// src/components/RelatorioStock.jsx
import React, { useState, useEffect } from "react";
import { 
  X, Download, Printer, Package, TrendingUp, AlertTriangle, 
  Calendar, DollarSign, FileText, Loader2, CheckCircle,
  Building2, User
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const RelatorioStock = ({ produtos = [], onClose, empresaId }) => {
  const [exportando, setExportando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [empresa, setEmpresa] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Garantir que produtos é um array
  const produtosArray = Array.isArray(produtos) ? produtos : [];

  useEffect(() => {
    carregarDados();
  }, [empresaId]);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const idEmpresa = empresaId || localStorage.getItem("empresaId");
      const token = localStorage.getItem("token");
      
      console.log("=== CARREGANDO DADOS ===");
      console.log("empresaId:", idEmpresa);
      console.log("produtos recebidos:", produtosArray.length);
      
      if (idEmpresa && token) {
        const response = await fetch(`https://sirexa-api.onrender.com/api/empresa/${idEmpresa}`, {
          headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setEmpresa(data.dados || data);
        } else {
          // Fallback com dados da empresa que está no localStorage
          const empresaNome = localStorage.getItem("empresaNome");
          if (empresaNome) {
            setEmpresa({ nome: empresaNome });
          }
        }
      }
      
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUsuario(user);
      }
      
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setCarregando(false);
    }
  };

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "—";
    return new Intl.NumberFormat('pt-AO', { 
      style: 'currency', 
      currency: 'AOA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };

  const formatarData = (data) => {
    if (!data) return "—";
    try {
      return new Date(data).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return "—";
    }
  };

  const formatarDataHora = (data) => {
    if (!data) return "—";
    try {
      return new Date(data).toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "—";
    }
  };

  const imprimir = () => {
    window.print();
  };

  // Estatísticas com segurança
  const stats = {
    totalProdutos: produtosArray.length,
    totalQuantidade: produtosArray.reduce((acc, p) => acc + (p?.quantidade || 0), 0),
    valorTotalCompra: produtosArray.reduce((acc, p) => acc + ((p?.quantidade || 0) * (p?.precoCompra || 0)), 0),
    valorTotalVenda: produtosArray.reduce((acc, p) => acc + ((p?.quantidade || 0) * (p?.precoVenda || 0)), 0),
    lucroTotal: produtosArray.reduce((acc, p) => acc + ((p?.quantidade || 0) * ((p?.precoVenda || 0) - (p?.precoCompra || 0))), 0),
    produtosBaixoEstoque: produtosArray.filter(p => (p?.quantidade || 0) <= (p?.quantidadeMinima || 5)).length,
    produtosVencidos: produtosArray.filter(p => {
      if (!p?.dataValidade) return false;
      try {
        return new Date(p.dataValidade) < new Date();
      } catch {
        return false;
      }
    }).length,
    produtosProximosVencer: produtosArray.filter(p => {
      if (!p?.dataValidade) return false;
      try {
        const dias = Math.ceil((new Date(p.dataValidade) - new Date()) / (1000 * 60 * 60 * 24));
        return dias <= 30 && dias > 0;
      } catch {
        return false;
      }
    }).length
  };

  const margemMedia = stats.totalProdutos > 0 
    ? (produtosArray.reduce((acc, p) => {
        if (p?.precoCompra > 0) {
          return acc + ((p.precoVenda - p.precoCompra) / p.precoCompra * 100);
        }
        return acc;
      }, 0) / stats.totalProdutos).toFixed(1)
    : 0;

  const categorias = [...new Set(produtosArray.map(p => p?.categoria).filter(Boolean))];
  const categoriasCount = categorias.map(cat => ({
    nome: cat,
    quantidade: produtosArray.filter(p => p?.categoria === cat).length,
    valor: produtosArray.filter(p => p?.categoria === cat).reduce((acc, p) => acc + ((p?.quantidade || 0) * (p?.precoVenda || 0)), 0)
  })).sort((a, b) => b.valor - a.valor);

  const exportarPDFProfissional = async () => {
    if (produtosArray.length === 0) {
      mostrarMensagem("Nenhum produto para exportar", "erro");
      return;
    }
    
    setExportando(true);
    mostrarMensagem("Gerando PDF profissional...", "info");
    
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const dataAtual = new Date();
      const dataFormatada = dataAtual.toISOString().slice(0, 10).replace(/-/g, "");
      const numeroRelatorio = `${dataFormatada}-STK-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
      
      const nomeEmpresa = empresa?.nome || localStorage.getItem("empresaNome") || "Empresa";
      const nifEmpresa = empresa?.nif || "---";
      const emailEmpresa = empresa?.email || "---";
      const telefoneEmpresa = empresa?.telefone || "---";
      const enderecoEmpresa = empresa?.endereco || "---";
      
      let yPos = 20;

      // CABEÇALHO
      doc.setFillColor(37, 99, 235);
      doc.rect(14, 10, 40, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text(nomeEmpresa.charAt(0).toUpperCase(), 30, 35);
      doc.setFontSize(10);
      doc.text("G", 38, 35);
      doc.setFontSize(8);
      doc.text("est", 28, 42);
      
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(nomeEmpresa, 60, 20);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`NIF: ${nifEmpresa}`, 60, 28);
      doc.text(`Email: ${emailEmpresa}`, 60, 34);
      doc.text(`Telefone: ${telefoneEmpresa}`, 60, 40);
      doc.text(`Endereço: ${enderecoEmpresa}`, 60, 46);
      
      doc.setFontSize(9);
      doc.setTextColor(37, 99, 235);
      doc.text(`Nº: ${numeroRelatorio}`, 250, 20, { align: "right" });
      doc.text(`Data: ${dataAtual.toLocaleString("pt-AO")}`, 250, 26, { align: "right" });

      yPos = 55;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("RELATÓRIO DE STOCK", 14, yPos);
      
      yPos += 8;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text("Relatório Analítico de Inventário", 14, yPos);
      
      yPos += 12;

      // RESPONSÁVEL
      doc.setFillColor(240, 248, 255);
      doc.rect(14, yPos - 3, 270, 18, 'F');
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("RESPONSÁVEL PELA EXPORTAÇÃO", 14, yPos);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`${usuario?.nome || "Usuário"}`, 14, yPos + 6);
      doc.text(`Cargo: ${usuario?.cargo || "Técnico"}`, 100, yPos + 6);
      doc.text(`Email: ${usuario?.email || "---"}`, 180, yPos + 6);
      yPos += 20;

      // RESUMO EXECUTIVO
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("RESUMO EXECUTIVO", 14, yPos);
      yPos += 5;
      
      const cardWidth = 65;
      const cardHeight = 30;
      const cards = [
        { label: "Total de Produtos", value: stats.totalProdutos.toString(), color: [37, 99, 235] },
        { label: "Quantidade Total", value: stats.totalQuantidade.toLocaleString(), color: [34, 197, 94] },
        { label: "Valor Total (Venda)", value: formatarMoeda(stats.valorTotalVenda), color: [16, 185, 129] },
        { label: "Margem Média", value: `${margemMedia}%`, color: [245, 158, 11] }
      ];
      
      cards.forEach((card, idx) => {
        const x = 14 + (idx * (cardWidth + 5));
        doc.setFillColor(card.color[0], card.color[1], card.color[2], 0.1);
        doc.rect(x, yPos, cardWidth, cardHeight, 'F');
        doc.setDrawColor(card.color[0], card.color[1], card.color[2]);
        doc.rect(x, yPos, cardWidth, cardHeight, 'S');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(card.label, x + 5, yPos + 8);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(card.color[0], card.color[1], card.color[2]);
        doc.text(card.value, x + 5, yPos + 22);
      });
      
      yPos += cardHeight + 10;

      // LISTA DE PRODUTOS
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("LISTA COMPLETA DE PRODUTOS", 14, yPos);
      yPos += 5;
      
      const produtosData = produtosArray.map(p => [
        p?.produto?.substring(0, 25) || "—",
        p?.codigoBarras || "—",
        (p?.quantidade || 0).toLocaleString(),
        formatarMoeda(p?.precoCompra),
        formatarMoeda(p?.precoVenda),
        p?.precoCompra > 0 ? `${((p.precoVenda - p.precoCompra) / p.precoCompra * 100).toFixed(1)}%` : "0%",
        formatarData(p?.dataValidade),
        p?.categoria?.substring(0, 12) || "Geral"
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [["Produto", "Código", "Qtd", "Compra", "Venda", "Margem", "Validade", "Categoria"]],
        body: produtosData,
        theme: "striped",
        styles: { fontSize: 7, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 248, 255] },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20, halign: "right" },
          3: { cellWidth: 25, halign: "right" },
          4: { cellWidth: 25, halign: "right" },
          5: { cellWidth: 18, halign: "right" },
          6: { cellWidth: 22, halign: "center" },
          7: { cellWidth: 22 }
        },
        didDrawPage: (data) => {
          const pageHeight = doc.internal.pageSize.height;
          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(100, 100, 100);
          doc.text(
            `${nomeEmpresa} - Relatório de Stock | Página ${data.pageNumber}`,
            14,
            pageHeight - 10
          );
          doc.text(
            `© ${new Date().getFullYear()} ${nomeEmpresa} - Todos os direitos reservados`,
            14,
            pageHeight - 5
          );
        }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;

      // ANÁLISE POR CATEGORIA
      if (categoriasCount.length > 0 && yPos < 180) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("ANÁLISE POR CATEGORIA", 14, yPos);
        yPos += 5;
        
        const categoriasData = categoriasCount.map(cat => [
          cat.nome,
          cat.quantidade.toString(),
          formatarMoeda(cat.valor),
          stats.valorTotalVenda > 0 ? `${((cat.valor / stats.valorTotalVenda) * 100).toFixed(1)}%` : "0%"
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [["Categoria", "Produtos", "Valor Total", "% do Stock"]],
          body: categoriasData,
          theme: "striped",
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          margin: { left: 14, right: 14 }
        });
      }

      doc.save(`relatorio_stock_${nomeEmpresa.replace(/\s/g, '_')}_${numeroRelatorio}.pdf`);
      mostrarMensagem("✅ PDF gerado com sucesso!", "sucesso");
      
      setTimeout(() => onClose(), 2000);
      
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      mostrarMensagem("Erro ao gerar PDF. Tente novamente.", "erro");
    } finally {
      setExportando(false);
    }
  };

  const nomeEmpresa = empresa?.nome || localStorage.getItem("empresaNome") || "Empresa";

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

      <div className="bg-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Relatório de Stock</h2>
                <p className="text-sm text-gray-400">
                  {produtosArray.length} produtos • {new Date().toLocaleDateString('pt-PT')}
                </p>
                <p className="text-xs text-blue-400 mt-1">Empresa: {nomeEmpresa}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={imprimir} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition print:hidden">
                <Printer size={20} className="text-gray-300" />
              </button>
              <button onClick={exportarPDFProfissional} disabled={exportando} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50 print:hidden">
                {exportando ? <><Loader2 size={18} className="animate-spin" /> Gerando...</> : <><Download size={18} /> Exportar PDF</>}
              </button>
              <button onClick={onClose} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition print:hidden">
                <X size={20} className="text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-8 text-white">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-white/10 flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Relatório de Stock</h1>
                  <p className="text-blue-200">Análise completa do inventário</p>
                  <p className="text-sm text-blue-300 mt-2">Empresa: {nomeEmpresa}</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="text-center">
                  <p className="text-gray-500 text-sm">Total de Produtos</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalProdutos}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-sm">Valor Total (Venda)</p>
                  <p className="text-2xl font-bold text-green-600">{formatarMoeda(stats.valorTotalVenda)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-sm">Margem Média</p>
                  <p className="text-2xl font-bold text-blue-600">{margemMedia}%</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-sm">Baixo Estoque</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.produtosBaixoEstoque}</p>
                </div>
              </div>

              {carregando ? (
                <div className="text-center py-8">
                  <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
                  <p className="text-gray-500 mt-2">Carregando dados...</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 size={18} className="text-blue-600" />
                      <h3 className="font-semibold text-blue-800">Informações da Empresa</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-gray-600"><strong>Nome:</strong> {nomeEmpresa}</p>
                      <p className="text-gray-600"><strong>NIF:</strong> {empresa?.nif || "---"}</p>
                      <p className="text-gray-600"><strong>Email:</strong> {empresa?.email || "---"}</p>
                      <p className="text-gray-600"><strong>Telefone:</strong> {empresa?.telefone || "---"}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={18} className="text-purple-600" />
                      <h3 className="font-semibold text-purple-800">Responsável pela Exportação</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-gray-600"><strong>Nome:</strong> {usuario?.nome || "---"}</p>
                      <p className="text-gray-600"><strong>Cargo:</strong> {usuario?.cargo || "Técnico"}</p>
                      <p className="text-gray-600 col-span-2"><strong>Email:</strong> {usuario?.email || "---"}</p>
                    </div>
                  </div>
                </>
              )}

              <p className="text-center text-gray-500 py-8">
                Clique em "Exportar PDF" para gerar o relatório completo.
              </p>
            </div>
          </div>
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