// src/pages/Fornecedores/RelatorioFornecedor.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Building, 
  FileText, 
  Download, 
  Printer, 
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  CreditCard,
  DollarSign,
  Loader2,
  Truck,
  User,
  Building2,
  Package,
  Wrench,
  Fuel,
  Computer,
  Globe,
  Home,
  Percent,
  Wallet,
  TrendingUp
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getImageUrl } from '../../utils/pdfUtils';

// Helper para escapar caracteres especiais e garantir UTF-8
const sanitizeText = (text) => {
  if (!text) return "";
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[&<>]/g, "")
    .trim();
};

const RelatorioFornecedor = () => {
  const [fornecedor, setFornecedor] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const navigate = useNavigate();
  const { id } = useParams();

  const NOME_SISTEMA = "SIREXA";
  const NOME_SISTEMA_COMPLETO = "SIREXA - Plataforma Integrada";

  const tiposFornecedorConfig = {
    mercadoria: { icon: Package, cor: "blue", label: "Mercadoria/Produto", descricao: "Produtos fisicos para revenda ou consumo" },
    renda: { icon: Home, cor: "green", label: "Renda (Aluguer)", descricao: "Servicos de arrendamento" },
    servicoProfissional: { icon: Briefcase, cor: "indigo", label: "Servico Profissional", descricao: "Consultoria, advocacia, contabilidade" },
    internet: { icon: Globe, cor: "cyan", label: "Internet/Telecom", descricao: "Servicos de comunicacao" },
    manutencao: { icon: Wrench, cor: "orange", label: "Manutencao", descricao: "Servicos de manutencao" },
    abastecimento: { icon: Fuel, cor: "yellow", label: "Abastecimento", descricao: "Combustivel e lubrificantes" },
    equipamento: { icon: Computer, cor: "purple", label: "Equipamento", descricao: "Aquisicao de equipamentos" },
    servicoGeral: { icon: FileText, cor: "gray", label: "Outro Servico", descricao: "Outros tipos de servico" }
  };

  useEffect(() => {
    carregarDados();
  }, [id]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      const responseFornecedor = await fetch(`https://sirexa-api.onrender.com/api/fornecedores/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const dataFornecedor = await responseFornecedor.json();
      setFornecedor(dataFornecedor);
      
      if (dataFornecedor.empresaId) {
        const responseEmpresa = await fetch(`https://sirexa-api.onrender.com/api/empresa/${dataFornecedor.empresaId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (responseEmpresa.ok) {
          const dataEmpresa = await responseEmpresa.json();
          setEmpresa(dataEmpresa.dados || dataEmpresa);
        }
      }
      
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUsuario(user);
      }
      
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao carregar dados", "erro");
    } finally {
      setLoading(false);
    }
  };

  const imprimir = () => {
    window.print();
  };

  const voltarParaLista = () => {
    navigate("/fornecedores");
  };

  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "---";
    return new Intl.NumberFormat('pt-AO', { 
      style: 'currency', 
      currency: 'AOA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor).replace("AOA", "Kz");
  };

  const formatarData = (data) => {
    if (!data) return "---";
    return new Date(data).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatarDataHora = (data) => {
    if (!data) return "---";
    return new Date(data).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calcularValorTotalItens = () => {
    if (!fornecedor?.itensFornecidos?.length && !fornecedor?.itens?.length) return 0;
    const itens = fornecedor.itensFornecidos || fornecedor.itens || [];
    return itens.reduce((sum, item) => sum + (item.valorTotal || item.valor || item.valorMensal || 0), 0);
  };

  const calcularValorTotalContratos = () => {
    if (!fornecedor?.contratos?.length) return 0;
    return fornecedor.contratos.reduce((sum, c) => sum + (c.valor || 0), 0);
  };

  const getItensExibicao = () => {
    return fornecedor?.itensFornecidos || fornecedor?.itens || [];
  };

  const getTipoInfo = () => {
    return tiposFornecedorConfig[fornecedor?.tipoFornecedor] || { icon: Truck, cor: "gray", label: "Fornecedor", descricao: "Fornecedor geral" };
  };

  const exportarPDFProfissional = async () => {
    if (!fornecedor) return;
    
    setExportando(true);
    mostrarMensagem("Gerando PDF profissional...", "info");
    
    try {
      // Configurar o PDF com suporte a UTF-8
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Adicionar fonte que suporta UTF-8 (usar fallback para caracteres especiais)
      doc.setFont("helvetica");
      
      const dataAtual = new Date();
      const dataFormatada = dataAtual.toISOString().slice(0, 10).replace(/-/g, "");
      const numeroRelatorio = `${dataFormatada}-FOR-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
      
      const nomeEmpresa = sanitizeText(empresa?.nome) || sanitizeText(localStorage.getItem("empresaNome")) || "Empresa";
      const nifEmpresa = sanitizeText(empresa?.nif) || "---";
      const emailEmpresa = sanitizeText(empresa?.email) || "---";
      const telefoneEmpresa = sanitizeText(empresa?.telefone) || "---";
      const enderecoEmpresa = sanitizeText(empresa?.endereco) || "---";
      
      let yPos = 20;

      // CARREGAR LOGO
      let logoTentativa = null;
      if (empresa?.logotipo) {
        try {
          const logoUrl = getImageUrl(empresa.logotipo);
          const logoResponse = await fetch(logoUrl);
          const logoBlob = await logoResponse.blob();
          logoTentativa = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(logoBlob);
          });
        } catch (e) { logoTentativa = null; }
      }

      // CABECALHO CORPORATIVO
      if (logoTentativa) {
        doc.addImage(logoTentativa, "PNG", 14, 8, 35, 35);
      } else {
        doc.setFillColor(37, 99, 235);
        doc.rect(14, 10, 40, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("S", 30, 35);
        doc.setFontSize(14);
        doc.text("G", 38, 35);
      }
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(nomeEmpresa.substring(0, 50), 60, 20);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`NIF: ${nifEmpresa}`, 60, 26);
      doc.text(`Email: ${emailEmpresa.substring(0, 40)}`, 60, 31);
      doc.text(`Tel: ${telefoneEmpresa}`, 60, 36);
      
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.3);
      doc.line(14, 48, 196, 48);
      
      doc.setFontSize(9);
      doc.setTextColor(37, 99, 235);
      doc.text(`N: ${numeroRelatorio}`, 195, 14, { align: "right" });
      doc.text(`Data: ${dataAtual.toLocaleDateString("pt-PT")}`, 195, 20, { align: "right" });
      doc.text(`Hora: ${dataAtual.toLocaleTimeString("pt-PT")}`, 195, 26, { align: "right" });

      yPos = 58;

      // TITULO PRINCIPAL
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("RELATORIO DE FORNECEDOR", 14, yPos);
      
      yPos += 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      const nomeFornecedor = sanitizeText(fornecedor.nome).substring(0, 60);
      doc.text(nomeFornecedor, 14, yPos);
      
      yPos += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Documento: Ficha Cadastral de Fornecedor", 14, yPos);

      yPos += 12;

      // RESPONSAVEL PELA EXPORTACAO
      doc.setFillColor(240, 248, 255);
      doc.rect(14, yPos - 3, 180, 16, 'F');
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("RESPONSAVEL PELA EXPORTACAO", 14, yPos);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const nomeUsuario = sanitizeText(usuario?.nome) || "Usuario";
      doc.text(nomeUsuario.substring(0, 40), 14, yPos + 6);
      const cargoUsuario = sanitizeText(usuario?.cargo) || "Tecnico";
      doc.text(`Cargo: ${cargoUsuario.substring(0, 30)}`, 100, yPos + 6);
      yPos += 16;

      // TIPO DE FORNECEDOR
      const tipoInfo = getTipoInfo();
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("TIPO DE FORNECEDOR", 14, yPos);
      
      autoTable(doc, {
        startY: yPos + 5,
        body: [
          ["Categoria", sanitizeText(tipoInfo.label).substring(0, 40)],
          ["Descricao", sanitizeText(tipoInfo.descricao).substring(0, 60)],
        ],
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 45 },
          1: { cellWidth: "auto" }
        },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 248, 255] },
        margin: { left: 14, right: 14 }
      });
      
      yPos = doc.lastAutoTable.finalY + 8;

      // EMPRESA
      if (empresa?.nome) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("EMPRESA", 14, yPos);
        
        autoTable(doc, {
          startY: yPos + 5,
          body: [
            ["Nome da Empresa", sanitizeText(empresa.nome).substring(0, 50)],
            ["NIF", sanitizeText(empresa.nif) || "---"],
            ["Email", sanitizeText(empresa.email) || "---"],
            ["Telefone", sanitizeText(empresa.telefone) || "---"],
            ["Endereco", sanitizeText(empresa.endereco)?.substring(0, 60) || "---"],
          ],
          theme: "striped",
          styles: { fontSize: 9, cellPadding: 4 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 45 },
            1: { cellWidth: "auto" }
          },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          margin: { left: 14, right: 14 }
        });
        
        yPos = doc.lastAutoTable.finalY + 8;
      }

      // INFORMACOES BASICAS
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("INFORMACOES BASICAS", 14, yPos);
      
      autoTable(doc, {
        startY: yPos + 5,
        body: [
          ["Nome / Razao Social", sanitizeText(fornecedor.nome)?.substring(0, 50) || "---"],
          ["NIF", sanitizeText(fornecedor.nif) || "---"],
          ["Status", fornecedor.status === "Ativo" ? "Ativo" : fornecedor.status === "Inativo" ? "Inativo" : fornecedor.status || "---"],
        ],
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 45 },
          1: { cellWidth: "auto" }
        },
        alternateRowStyles: { fillColor: [240, 248, 255] },
        margin: { left: 14, right: 14 }
      });
      
      yPos = doc.lastAutoTable.finalY + 8;

      // CONTACTOS
      if (fornecedor.email || fornecedor.telefone || fornecedor.endereco) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("CONTACTOS", 14, yPos);
        
        const contactosData = [];
        if (fornecedor.email) contactosData.push(["Email", sanitizeText(fornecedor.email).substring(0, 50)]);
        if (fornecedor.telefone) contactosData.push(["Telefone", sanitizeText(fornecedor.telefone)]);
        if (fornecedor.contato) contactosData.push(["Pessoa de Contacto", sanitizeText(fornecedor.contato).substring(0, 40)]);
        if (fornecedor.endereco) contactosData.push(["Endereco", sanitizeText(fornecedor.endereco).substring(0, 60)]);
        
        autoTable(doc, {
          startY: yPos + 5,
          body: contactosData,
          theme: "striped",
          styles: { fontSize: 9, cellPadding: 4 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 45 },
            1: { cellWidth: "auto" }
          },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          margin: { left: 14, right: 14 }
        });
        
        yPos = doc.lastAutoTable.finalY + 8;
      }

      // ITENS FORNECIDOS
      const itensExibicao = getItensExibicao();
      if (itensExibicao.length > 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("ITENS FORNECIDOS", 14, yPos);
        
        const itensData = itensExibicao.map((item, index) => [
          `${index + 1}`,
          sanitizeText(item.produto || item.descricao || item.nome || "Item").substring(0, 30),
          item.quantidade || "---",
          formatarMoeda(item.precoCompra || item.valor || item.valorMensal || 0),
          formatarMoeda(item.valorTotal || (item.quantidade * item.precoCompra) || item.valor || 0)
        ]);
        
        autoTable(doc, {
          startY: yPos + 5,
          head: [["#", "Descricao", "Qtd", "Preco Unit.", "Valor Total"]],
          body: itensData,
          theme: "striped",
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 55 },
            2: { cellWidth: 15, halign: "center" },
            3: { cellWidth: 30, halign: "right" },
            4: { cellWidth: 30, halign: "right" }
          }
        });
        
        const totalItens = calcularValorTotalItens();
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`Total em Itens: ${formatarMoeda(totalItens)}`, 150, doc.lastAutoTable.finalY + 5, { align: "right" });
        
        yPos = doc.lastAutoTable.finalY + 12;
      }

      // DADOS BANCARIOS
      if (fornecedor.pagamento?.banco || fornecedor.pagamento?.iban) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("DADOS BANCARIOS", 14, yPos);
        
        const bancariosData = [];
        if (fornecedor.pagamento?.banco) bancariosData.push(["Banco", sanitizeText(fornecedor.pagamento.banco).substring(0, 40)]);
        if (fornecedor.pagamento?.iban) bancariosData.push(["IBAN", sanitizeText(fornecedor.pagamento.iban).substring(0, 34)]);
        if (fornecedor.pagamento?.swift) bancariosData.push(["SWIFT/BIC", sanitizeText(fornecedor.pagamento.swift)]);
        if (fornecedor.pagamento?.formaPagamento) bancariosData.push(["Forma de Pagamento", sanitizeText(fornecedor.pagamento.formaPagamento)]);
        
        autoTable(doc, {
          startY: yPos + 5,
          body: bancariosData,
          theme: "striped",
          styles: { fontSize: 9, cellPadding: 4 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 45 },
            1: { cellWidth: "auto" }
          },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          margin: { left: 14, right: 14 }
        });
        
        yPos = doc.lastAutoTable.finalY + 8;
      }

      // CONFIGURACAO FISCAL
      if (fornecedor.regimeTributacao || fornecedor.fiscal?.taxaIVA > 0 || fornecedor.fiscal?.taxaRetencao > 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("CONFIGURACAO FISCAL", 14, yPos);
        
        const fiscaisData = [];
        if (fornecedor.regimeTributacao) fiscaisData.push(["Regime de Tributacao", sanitizeText(fornecedor.regimeTributacao)]);
        if (fornecedor.fiscal?.suportaIVA !== undefined) fiscaisData.push(["Suporta IVA", fornecedor.fiscal.suportaIVA ? "Sim" : "Nao"]);
        if (fornecedor.fiscal?.taxaIVA > 0) fiscaisData.push(["Taxa de IVA", `${fornecedor.fiscal.taxaIVA}%`]);
        if (fornecedor.fiscal?.retencaoFonte) {
          fiscaisData.push(["Retencao na Fonte", "Sim"]);
          if (fornecedor.fiscal?.tipoRetencao) fiscaisData.push(["Tipo de Retencao", sanitizeText(fornecedor.fiscal.tipoRetencao)]);
          if (fornecedor.fiscal?.taxaRetencao > 0) fiscaisData.push(["Taxa de Retencao", `${fornecedor.fiscal.taxaRetencao}%`]);
        }
        
        autoTable(doc, {
          startY: yPos + 5,
          body: fiscaisData,
          theme: "striped",
          styles: { fontSize: 9, cellPadding: 4 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 45 },
            1: { cellWidth: "auto" }
          },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          margin: { left: 14, right: 14 }
        });
        
        yPos = doc.lastAutoTable.finalY + 8;
      }

      // CONTRATOS
      if (fornecedor.contratos && fornecedor.contratos.length > 0) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("CONTRATOS", 14, yPos);
        
        const contratosData = fornecedor.contratos.map((contrato, index) => [
          `${index + 1}`,
          sanitizeText(contrato.descricao)?.substring(0, 35) || "Contrato",
          formatarMoeda(contrato.valor),
          sanitizeText(contrato.modalidadePagamento) || "---",
          formatarData(contrato.dataInicio),
          formatarData(contrato.dataFim)
        ]);
        
        autoTable(doc, {
          startY: yPos + 5,
          head: [["#", "Descricao", "Valor", "Modalidade", "Inicio", "Fim"]],
          body: contratosData,
          theme: "striped",
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 50 },
            2: { cellWidth: 28, halign: "right" },
            3: { cellWidth: 28 },
            4: { cellWidth: 22, halign: "center" },
            5: { cellWidth: 22, halign: "center" }
          }
        });
        
        const totalContratos = calcularValorTotalContratos();
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Mensal em Contratos: ${formatarMoeda(totalContratos)}`, 150, doc.lastAutoTable.finalY + 5, { align: "right" });
        
        yPos = doc.lastAutoTable.finalY + 12;
      }

      // RESUMO FINANCEIRO
      const totalItens = calcularValorTotalItens();
      const totalContratos = calcularValorTotalContratos();
      
      if (totalItens > 0 || totalContratos > 0) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("RESUMO FINANCEIRO", 14, yPos);
        
        autoTable(doc, {
          startY: yPos + 5,
          body: [
            ["Total em Itens", formatarMoeda(totalItens)],
            ["Total em Contratos", formatarMoeda(totalContratos)],
            ["Valor Total", formatarMoeda(totalItens + totalContratos)]
          ],
          theme: "striped",
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 50 },
            1: { cellWidth: "auto", fontStyle: "bold" }
          },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          margin: { left: 14, right: 14 }
        });
        
        yPos = doc.lastAutoTable.finalY + 8;
      }

      // OBSERVACOES
      if (fornecedor.observacoes) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("OBSERVACOES", 14, yPos);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        
        const observacoesSplit = doc.splitTextToSize(sanitizeText(fornecedor.observacoes).substring(0, 500), 170);
        doc.text(observacoesSplit, 14, yPos + 8);
        
        yPos += 15 + (observacoesSplit.length * 5);
      }

      // INFORMACOES DO SISTEMA
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("INFORMACOES DO SISTEMA", 14, yPos);
      
      autoTable(doc, {
        startY: yPos + 5,
        body: [
          ["Sistema", NOME_SISTEMA_COMPLETO],
          ["Empresa", nomeEmpresa.substring(0, 50)],
          ["ID do Fornecedor", fornecedor._id || "---"],
          ["Data de Cadastro", formatarDataHora(fornecedor.createdAt)],
          ["Ultima Atualizacao", formatarDataHora(fornecedor.updatedAt)],
          ["Gerado por", nomeUsuario.substring(0, 40)],
          ["Cargo", cargoUsuario.substring(0, 30)],
          ["Data de Geracao", formatarDataHora(new Date())],
          ["Versao do Relatorio", "2.0"]
        ],
        theme: "striped",
        styles: { fontSize: 8, cellPadding: 4 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 50 },
          1: { cellWidth: "auto" }
        },
        alternateRowStyles: { fillColor: [240, 248, 255] },
        margin: { left: 14, right: 14 }
      });

      // ASSINATURAS
      const finalY = doc.lastAutoTable.finalY + 15;
      const pageHeight = doc.internal.pageSize.height;
      
      if (finalY + 35 < pageHeight) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        
        doc.line(14, finalY + 5, 80, finalY + 5);
        doc.text("Assinatura do Tecnico Responsavel", 14, finalY + 11);
        
        doc.line(120, finalY + 5, 186, finalY + 5);
        doc.text(`Carimbo da ${nomeEmpresa.substring(0, 30)}`, 120, finalY + 11);
      }

      // RODAPE
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text(
        `${NOME_SISTEMA} - Relatorio gerado eletronicamente. Valido sem assinatura.`,
        14,
        pageHeight - 10
      );
      doc.text(
        `© ${new Date().getFullYear()} ${NOME_SISTEMA_COMPLETO} - Todos os direitos reservados.`,
        14,
        pageHeight - 5
      );

      // Salvar PDF
      const nomeArquivo = `relatorio_fornecedor_${sanitizeText(fornecedor.nome).replace(/\s/g, '_').substring(0, 30)}_${numeroRelatorio}.pdf`;
      doc.save(nomeArquivo);
      
      mostrarMensagem("PDF gerado com sucesso!", "sucesso");
      
      setTimeout(() => {
        navigate("/fornecedores");
      }, 2000);
      
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      mostrarMensagem("Erro ao gerar PDF. Tente novamente.", "erro");
    } finally {
      setExportando(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Relatorio do Fornecedor" showBackButton={true} backToRoute="/fornecedores">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-500 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-gray-400">Carregando dados...</p>
        </div>
      </Layout>
    );
  }

  if (!fornecedor) {
    return (
      <Layout title="Relatorio do Fornecedor" showBackButton={true} backToRoute="/fornecedores">
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12 text-center">
          <div className="bg-red-500/10 rounded-full p-6 mb-4 inline-flex">
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>
          <p className="text-gray-400 text-lg">Fornecedor nao encontrado</p>
          <button
            onClick={voltarParaLista}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Voltar para lista
          </button>
        </div>
      </Layout>
    );
  }

  const tipoInfo = getTipoInfo();
  const itensExibicao = getItensExibicao();
  const totalItens = calcularValorTotalItens();
  const totalContratos = calcularValorTotalContratos();

  return (
    <Layout title={`Relatorio - ${fornecedor.nome}`} showBackButton={true} backToRoute="/fornecedores">
      {mensagem.texto && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out`}>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" 
              ? "bg-green-600" 
              : mensagem.tipo === "info"
              ? "bg-blue-600"
              : "bg-red-600"
          } text-white text-sm`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : 
             mensagem.tipo === "info" ? <Loader2 className="w-4 h-4 animate-spin" /> : 
             <AlertTriangle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button
            onClick={voltarParaLista}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all duration-200"
          >
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="flex gap-3">
            <button
              onClick={imprimir}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200"
            >
              <Printer size={18} /> Imprimir
            </button>
            <button
              onClick={exportarPDFProfissional}
              disabled={exportando}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              {exportando ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Exportar PDF Profissional
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-white/10 flex items-center justify-center">
                <Truck className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{fornecedor.nome}</h1>
                <p className="text-blue-200">NIF: {fornecedor.nif}</p>
                {fornecedor.tipoFornecedor && (
                  <p className="text-blue-300 text-sm mt-1">{tipoInfo.label}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-8">
            {empresa?.nome && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={18} className="text-blue-600" />
                  <h3 className="font-semibold text-blue-800">Informacoes da Empresa</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-gray-600"><strong>Nome:</strong> {empresa?.nome || "---"}</p>
                  <p className="text-gray-600"><strong>NIF:</strong> {empresa?.nif || "---"}</p>
                  <p className="text-gray-600"><strong>Email:</strong> {empresa?.email || "---"}</p>
                  <p className="text-gray-600"><strong>Telefone:</strong> {empresa?.telefone || "---"}</p>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <User size={18} className="text-purple-600" />
                <h3 className="font-semibold text-purple-800">Responsavel pela Exportacao</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-gray-600"><strong>Nome:</strong> {usuario?.nome || "---"}</p>
                <p className="text-gray-600"><strong>Cargo:</strong> {usuario?.cargo || "Tecnico"}</p>
                <p className="text-gray-600"><strong>Email:</strong> {usuario?.email || "---"}</p>
                <p className="text-gray-600"><strong>Data:</strong> {new Date().toLocaleDateString('pt-PT')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm">NIF</p>
                <p className="text-lg font-bold text-gray-800">{fornecedor.nif || "---"}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm">Status</p>
                <p className={`text-lg font-bold ${fornecedor.status === "Ativo" ? "text-green-600" : "text-red-600"}`}>
                  {fornecedor.status || "---"}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm">Itens</p>
                <p className="text-lg font-bold text-gray-800">{itensExibicao.length}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm">Contratos</p>
                <p className="text-lg font-bold text-gray-800">{fornecedor.contratos?.length || 0}</p>
              </div>
            </div>

            {fornecedor.tipoFornecedor && (
              <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={18} className="text-indigo-600" />
                  <h3 className="font-semibold text-indigo-800">Tipo de Fornecedor</h3>
                </div>
                <p className="text-gray-700"><strong>Categoria:</strong> {tipoInfo.label}</p>
                <p className="text-gray-600 text-sm mt-1">{tipoInfo.descricao}</p>
              </div>
            )}

            {itensExibicao.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Package size={18} className="text-yellow-600" />
                  <h3 className="font-semibold text-gray-800">Itens Fornecidos ({itensExibicao.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Descricao</th>
                        <th className="p-2 text-center">Qtd</th>
                        <th className="p-2 text-right">Preco Unit.</th>
                        <th className="p-2 text-right">Valor Total</th>
                       </tr>
                    </thead>
                    <tbody>
                      {itensExibicao.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="p-2">{index + 1}</td>
                          <td className="p-2">{item.produto || item.descricao || item.nome || "Item"}</td>
                          <td className="p-2 text-center">{item.quantidade || "---"}</td>
                          <td className="p-2 text-right">{formatarMoeda(item.precoCompra || item.valor || item.valorMensal || 0)}</td>
                          <td className="p-2 text-right">{formatarMoeda(item.valorTotal || (item.quantidade * item.precoCompra) || item.valor || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan="4" className="p-2 text-right">Total:</td>
                        <td className="p-2 text-right text-green-600">{formatarMoeda(totalItens)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {(fornecedor.regimeTributacao || fornecedor.fiscal?.taxaIVA > 0) && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Percent size={18} className="text-red-600" />
                  <h3 className="font-semibold text-gray-800">Configuracao Fiscal</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {fornecedor.regimeTributacao && (
                    <p className="text-gray-600"><strong>Regime:</strong> {fornecedor.regimeTributacao}</p>
                  )}
                  {fornecedor.fiscal?.suportaIVA !== undefined && (
                    <p className="text-gray-600"><strong>Suporta IVA:</strong> {fornecedor.fiscal.suportaIVA ? "Sim" : "Nao"}</p>
                  )}
                  {fornecedor.fiscal?.taxaIVA > 0 && (
                    <p className="text-gray-600"><strong>Taxa IVA:</strong> {fornecedor.fiscal.taxaIVA}%</p>
                  )}
                </div>
              </div>
            )}

            {(totalItens > 0 || totalContratos > 0) && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={18} className="text-blue-600" />
                  <h3 className="font-semibold text-gray-800">Resumo Financeiro</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-gray-500 text-sm">Total em Itens</p>
                    <p className="text-lg font-bold text-green-600">{formatarMoeda(totalItens)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Total em Contratos</p>
                    <p className="text-lg font-bold text-purple-600">{formatarMoeda(totalContratos)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Valor Total</p>
                    <p className="text-xl font-bold text-blue-600">{formatarMoeda(totalItens + totalContratos)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-gray-700 mb-2">O PDF incluira:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Logotipo e dados da empresa</li>
                <li>• Responsavel pela exportacao</li>
                <li>• Tipo de fornecedor</li>
                <li>• Informacoes basicas do fornecedor</li>
                <li>• Contactos, dados bancarios e fiscais</li>
                <li>• Itens fornecidos com valores</li>
                <li>• Lista completa de contratos</li>
                <li>• Resumo financeiro completo</li>
              </ul>
            </div>

            <p className="text-center text-gray-500 py-8">
              Clique em "Exportar PDF Profissional" para gerar o relatorio completo em formato PDF com layout corporativo.
            </p>
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
    </Layout>
  );
};

export default RelatorioFornecedor;