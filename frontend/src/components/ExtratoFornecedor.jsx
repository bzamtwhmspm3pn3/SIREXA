// frontend/src/components/ExtratoFornecedor.jsx
import React, { useState, useEffect } from "react";
import { X, Printer, Loader2, FileText, AlertCircle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ExtratoFornecedor = ({ fornecedor, empresaId, onClose }) => {
  const [movimentos, setMovimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saldoAtual, setSaldoAtual] = useState(0);
  const [totais, setTotais] = useState({ totalCredito: 0, totalDebito: 0 });
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState(null);

  const BASE_URL = "https://sirexa-api.onrender.com";

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    carregarExtrato();
  }, [fornecedor, empresaId]);

  const carregarExtrato = async () => {
    setLoading(true);
    setErro(null);
    try {
      console.log("Carregando extrato para:", fornecedor);
      console.log("Empresa ID:", empresaId);
      
      const response = await fetch(
        `${BASE_URL}/api/contacorrente/movimentos/fornecedor?empresaId=${empresaId}&fornecedorId=${fornecedor.id}`,
        { headers: getHeaders() }
      );
      
      const data = await response.json();
      console.log("Resposta do extrato:", data);
      
      if (data.sucesso !== false) {
        setMovimentos(data.dados || []);
        setSaldoAtual(data.saldo || 0);
        calcularTotais(data.dados || []);
      } else {
        setErro(data.mensagem || "Erro ao carregar movimentos");
        setMovimentos([]);
      }
    } catch (error) {
      console.error("Erro ao carregar extrato:", error);
      setErro("Erro ao conectar ao servidor");
      setMovimentos([]);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotais = (movs) => {
    const totalCredito = movs.reduce((sum, m) => {
      if (m.tipo === 'Recebimento' || m.tipo === 'Crédito') {
        return sum + (m.valor || 0);
      }
      return sum;
    }, 0);
    
    const totalDebito = movs.reduce((sum, m) => {
      if (m.tipo === 'Pagamento' || m.tipo === 'Débito' || m.tipo === 'Pagamento Fornecedor') {
        return sum + (m.valor || 0);
      }
      return sum;
    }, 0);
    
    setTotais({ totalCredito, totalDebito });
  };

  const formatarData = (data) => {
    if (!data) return "—";
    return new Date(data).toLocaleDateString("pt-AO");
  };

  const formatarNumero = (numero) => {
    if (numero === undefined || numero === null) return "0,00";
    return Number(numero).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const exportarPDF = async () => {
    if (movimentos.length === 0) {
      alert("Nenhum movimento para exportar");
      return;
    }
    
    setExportando(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      let yPos = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("EXTRATO DE CONTA CORRENTE", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Fornecedor: ${fornecedor.nome}`, 20, yPos);
      doc.text(`NIF: ${fornecedor.nif || "---"}`, 20, yPos + 7);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString("pt-AO")}`, pageWidth - 50, yPos);
      yPos += 20;
      
      const tableData = movimentos.map(m => [
        formatarData(m.data),
        m.documentoReferencia || m.referencia || "—",
        m.referencia || "—",
        m.descricao || "—",
        (m.tipo === 'Recebimento' || m.tipo === 'Crédito') ? formatarNumero(m.valor) : "—",
        (m.tipo === 'Pagamento' || m.tipo === 'Débito' || m.tipo === 'Pagamento Fornecedor') ? formatarNumero(m.valor) : "—",
        formatarNumero(m.saldoAtual)
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [["Data", "Nº Doc.", "Nº Recibo", "Descrição", "Crédito (Kz)", "Débito (Kz)", "Saldo (Kz)"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: 35 },
          3: { cellWidth: 55 },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' },
          6: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: 15, right: 15 }
      });
      
      const finalY = doc.lastAutoTable?.finalY || yPos + 50;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo do Período:", 20, finalY + 10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total de Débitos (Pagamentos): ${formatarNumero(totais.totalDebito)} Kz`, 30, finalY + 20);
      doc.text(`Saldo Atual: ${formatarNumero(Math.abs(saldoAtual))} Kz`, 30, finalY + 27);
      doc.text(`Situação: ${saldoAtual > 0 ? "Credor (Empresa deve)" : saldoAtual < 0 ? "Devedor (Fornecedor deve)" : "Zerado"}`, 30, finalY + 34);
      
      doc.save(`extrato_${fornecedor.nome}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF");
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
          <div>
            <h2 className="text-xl font-bold text-white">Extrato de Conta Corrente</h2>
            <p className="text-gray-300 text-sm mt-1">
              {fornecedor?.nome || "Fornecedor"} | NIF: {fornecedor?.nif || "---"}
            </p>
            <p className={`text-sm font-bold mt-1 ${saldoAtual > 0 ? 'text-red-400' : saldoAtual < 0 ? 'text-green-400' : 'text-gray-400'}`}>
              Saldo Atual: {formatarNumero(Math.abs(saldoAtual))} Kz 
              ({saldoAtual > 0 ? "Empresa deve" : saldoAtual < 0 ? "Fornecedor deve" : "Zerado"})
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportarPDF}
              disabled={exportando || movimentos.length === 0}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Printer size={16} /> {exportando ? "Exportando..." : "PDF"}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-blue-400" size={40} />
            </div>
          ) : erro ? (
            <div className="bg-red-600/20 rounded-xl p-8 text-center border border-red-500/30">
              <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
              <p className="text-red-400 text-lg">{erro}</p>
              <button
                onClick={carregarExtrato}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
              >
                Tentar Novamente
              </button>
            </div>
          ) : movimentos.length === 0 ? (
            <div className="bg-gray-700/30 rounded-xl p-12 text-center">
              <FileText className="mx-auto mb-4 text-gray-500" size={48} />
              <p className="text-gray-400 text-lg">Nenhum movimento encontrado</p>
              <p className="text-gray-500 text-sm mt-2">
                Este fornecedor ainda não tem movimentações registadas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700 sticky top-0">
                  <tr className="text-white">
                    <th className="p-3 text-left">Data</th>
                    <th className="p-3 text-left">Nº Doc/Factura</th>
                    <th className="p-3 text-left">Nº Recibo</th>
                    <th className="p-3 text-left">Descrição</th>
                    <th className="p-3 text-right">Crédito (Kz)</th>
                    <th className="p-3 text-right">Débito (Kz)</th>
                    <th className="p-3 text-right">Saldo (Kz)</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentos.map((mov, idx) => {
                    const isCredito = mov.tipo === 'Recebimento' || mov.tipo === 'Crédito';
                    const isDebito = mov.tipo === 'Pagamento' || mov.tipo === 'Débito' || mov.tipo === 'Pagamento Fornecedor';
                    
                    return (
                      <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                        <td className="p-3 text-white whitespace-nowrap">{formatarData(mov.data)}</td>
                        <td className="p-3 text-gray-300">{mov.documentoReferencia || mov.referencia || "—"}</td>
                        <td className="p-3 text-gray-300">{mov.referencia || "—"}</td>
                        <td className="p-3 text-gray-300">
                          {mov.descricao || "—"}
                          {mov.retencaoFonte > 0 && (
                            <span className="block text-xs text-orange-400 mt-1">
                              Retenção: {formatarNumero(mov.retencaoFonte)} Kz
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {isCredito ? (
                            <span className="text-green-400 font-bold">{formatarNumero(mov.valor)}</span>
                          ) : "—"}
                        </td>
                        <td className="p-3 text-right">
                          {isDebito ? (
                            <span className="text-red-400 font-bold">{formatarNumero(mov.valor)}</span>
                          ) : "—"}
                        </td>
                        <td className={`p-3 text-right font-bold ${mov.saldoAtual > 0 ? 'text-red-400' : mov.saldoAtual < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                          {formatarNumero(Math.abs(mov.saldoAtual))}
                          <span className="text-xs ml-1">
                            {mov.saldoAtual > 0 ? "C" : mov.saldoAtual < 0 ? "D" : ""}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-700/50 border-t border-gray-600 sticky bottom-0">
                  <tr className="text-white text-sm font-bold">
                    <td colSpan="4" className="p-3 text-right">TOTAIS:</td>
                    <td className="p-3 text-right text-green-400">{formatarNumero(totais.totalCredito)}</td>
                    <td className="p-3 text-right text-red-400">{formatarNumero(totais.totalDebito)}</td>
                    <td className={`p-3 text-right ${saldoAtual > 0 ? 'text-red-400' : saldoAtual < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                      {formatarNumero(Math.abs(saldoAtual))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-750 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Total de Movimentos: {movimentos.length}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExtratoFornecedor;