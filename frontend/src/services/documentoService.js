// src/services/documentoService.js - VERSÃO CORRIGIDA (FONTE NORMAL)
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

export const gerarDocumentoProfissional = async (documento, usuario, empresa, contasBancarias = []) => {
  try {
    if (!documento) {
      console.error("Nenhum documento para gerar");
      return;
    }

    console.log("📄 Gerando PDF para:", documento.tipo, documento.numeroDocumento || documento.numeroFactura);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const dataAgora = new Date();
    const ano = dataAgora.getFullYear();
    const mes = String(dataAgora.getMonth() + 1).padStart(2, '0');
    const numero = documento.numeroFactura || documento.numeroDocumento || String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    
    // Determinar o número do documento e título
    let numeroDocumento = "";
    let titulo = "";
    let corTitulo = [41, 98, 255];
    
    switch (documento.tipo) {
      case "Orcamento":
        numeroDocumento = `ORC/${ano}/${mes}/${numero}`;
        titulo = "ORÇAMENTO";
        corTitulo = [139, 92, 246];
        break;
      case "Factura Proforma":
        numeroDocumento = `FP/${ano}/${mes}/${numero}`;
        titulo = "FACTURA PROFORMA";
        corTitulo = [139, 92, 246];
        break;
      case "Recibo":
        numeroDocumento = `RC/${ano}/${mes}/${numero}`;
        titulo = "RECIBO";
        corTitulo = [245, 158, 11];
        break;
      case "Nota Credito":
        numeroDocumento = `NC/${ano}/${mes}/${numero}`;
        titulo = "NOTA DE CRÉDITO";
        corTitulo = [220, 38, 38];
        break;
      default:
        numeroDocumento = `FT/${ano}/${mes}/${numero}`;
        titulo = "FACTURA";
        corTitulo = [41, 98, 255];
    }
    
    // Cores
    const corPrimaria = [41, 98, 255];
    const corCinza = [100, 100, 100];
    const corTexto = [50, 50, 50];
    
    // Função para formatar moeda
    const formatarMoeda = (valor) => {
      if (!valor && valor !== 0) return "0,00 Kz";
      return valor.toLocaleString('pt-AO', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }) + " Kz";
    };
    
    // Valores
    const subtotal = Math.abs(documento.subtotal || 0);
    const totalIVA = Math.abs(documento.totalIva || 0);
    const desconto = Math.abs(documento.desconto || 0);
    const totalRetencao = Math.abs(documento.totalRetencao || 0);
    const total = Math.abs(documento.total || 0);
    const taxaIVA = documento.taxaIVA || 14;
    
    let taxaRetencao = documento.taxaRetencao || 0;
    const subtotalComDesconto = subtotal - desconto;
    
    if (taxaRetencao === 0 && totalRetencao > 0 && subtotalComDesconto > 0) {
      taxaRetencao = (totalRetencao / subtotalComDesconto) * 100;
      taxaRetencao = Math.round(taxaRetencao * 10) / 10;
    }
    
    const valorPago = documento.valorPago || total;
    const troco = valorPago > total ? valorPago - total : 0;
    
    let yPos = 15;

    // CABEÇALHO
    doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    
    const nomeEmpresa = empresa?.nome || "AnDioGest";
    doc.text(nomeEmpresa, 14, yPos + 5);
    
    doc.setTextColor(corCinza[0], corCinza[1], corCinza[2]);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`NIF: ${empresa?.nif || '---'}`, 14, yPos + 11);
    doc.text(`Email: ${empresa?.email || '---'}`, 14, yPos + 16);
    doc.text(`Telefone: ${empresa?.telefone || '---'}`, 14, yPos + 21);
    
    const enderecoStr = typeof empresa?.endereco === 'string' 
      ? empresa.endereco 
      : (empresa?.endereco?.rua || empresa?.endereco?.endereco || 'Luanda, Angola');
    
    if (doc.getTextWidth(enderecoStr) > 70) {
      const parte1 = enderecoStr.substring(0, 45);
      const parte2 = enderecoStr.substring(45);
      doc.text(`Endereço: ${parte1}`, 14, yPos + 26);
      doc.text(`${parte2}`, 18, yPos + 31);
      yPos = 52;
    } else {
      doc.text(`Endereço: ${enderecoStr}`, 14, yPos + 26);
      yPos = 48;
    }

    // TÍTULO
let tituloFontSize = 14;
let tituloWidth = doc.getTextWidth(titulo);

// Reduzir fonte para títulos longos
if (titulo === "FACTURA PROFORMA" || titulo === "NOTA DE CRÉDITO" || titulo === "ORÇAMENTO") {
  tituloFontSize = 11;
  doc.setFontSize(tituloFontSize);
  tituloWidth = doc.getTextWidth(titulo);
}

// Se ainda for muito largo, reduzir mais
if (tituloWidth > 65) {
  tituloFontSize = 10;
  doc.setFontSize(tituloFontSize);
  tituloWidth = doc.getTextWidth(titulo);
}
    
    doc.setFontSize(tituloFontSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(corTitulo[0], corTitulo[1], corTitulo[2]);
    
    const tituloX = 200 - tituloWidth - 5;
    doc.text(titulo, tituloX, yPos - 8);
    
    doc.setFontSize(7);
    doc.setTextColor(corCinza[0], corCinza[1], corCinza[2]);
    doc.setFont("helvetica", "normal");
    
    const numWidth = doc.getTextWidth(`Nº: ${numeroDocumento}`);
    doc.text(`Nº: ${numeroDocumento}`, 200 - numWidth - 5, yPos - 2);
    
    const dataWidth = doc.getTextWidth(`Data: ${dataAgora.toLocaleDateString('pt-PT')}`);
    doc.text(`Data: ${dataAgora.toLocaleDateString('pt-PT')}`, 200 - dataWidth - 5, yPos + 4);
    
    const horaWidth = doc.getTextWidth(`Hora: ${dataAgora.toLocaleTimeString('pt-PT')}`);
    doc.text(`Hora: ${dataAgora.toLocaleTimeString('pt-PT')}`, 200 - horaWidth - 5, yPos + 10);
    
    if (documento.dataVencimento) {
      const vencWidth = doc.getTextWidth(`Vencimento: ${new Date(documento.dataVencimento).toLocaleDateString('pt-PT')}`);
      doc.text(`Vencimento: ${new Date(documento.dataVencimento).toLocaleDateString('pt-PT')}`, 200 - vencWidth - 5, yPos + 16);
    }

    // DADOS DO CLIENTE
    doc.setFillColor(245, 248, 250);
    doc.rect(14, yPos, 186, 25, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(14, yPos, 186, 25, 'S');
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(corTexto[0], corTexto[1], corTexto[2]);
    doc.text("DADOS DO CLIENTE", 18, yPos + 5);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    
    const nomeCliente = documento.cliente || '---';
    if (doc.getTextWidth(nomeCliente) > 80) {
      const nomeParte1 = nomeCliente.substring(0, 35);
      const nomeParte2 = nomeCliente.substring(35);
      doc.text(`Nome: ${nomeParte1}`, 18, yPos + 11);
      doc.text(`${nomeParte2}`, 28, yPos + 16);
      doc.text(`NIF: ${documento.nifCliente || '---'}`, 18, yPos + 21);
    } else {
      doc.text(`Nome: ${nomeCliente}`, 18, yPos + 11);
      doc.text(`NIF: ${documento.nifCliente || '---'}`, 18, yPos + 17);
    }
    
    let infoY = yPos + 11;
    if (documento.telefoneCliente && documento.telefoneCliente !== '---' && documento.telefoneCliente !== '') {
      doc.text(`Telefone: ${documento.telefoneCliente}`, 120, yPos + 11);
      infoY = yPos + 17;
    }
    if (documento.emailCliente && documento.emailCliente !== '---' && documento.emailCliente !== '') {
      if (doc.getTextWidth(documento.emailCliente) > 60) {
        const emailParte1 = documento.emailCliente.substring(0, 25);
        const emailParte2 = documento.emailCliente.substring(25);
        doc.text(`Email: ${emailParte1}`, 120, infoY);
        doc.text(`${emailParte2}`, 126, infoY + 4);
      } else {
        doc.text(`Email: ${documento.emailCliente}`, 120, infoY);
      }
    }
    
    yPos += 32;

    // TABELA DE PRODUTOS
    const produtosTabela = documento.itens?.map((item, index) => [
      index + 1,
      item.produtoOuServico || '---',
      formatarMoeda(Math.abs(item.precoUnitario || 0)),
      item.quantidade || 0,
      formatarMoeda(Math.abs(item.total || 0))
    ]) || [];

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Descrição do Produto/Serviço', 'Preço Unit.', 'Qtd.', 'Total']],
      body: produtosTabela,
      theme: 'grid',
      styles: { 
        fontSize: 7, 
        cellPadding: 3, 
        valign: 'middle',
        textColor: [50, 50, 50],
        cellWidth: 'wrap'
      },
      headStyles: { 
        fillColor: corPrimaria, 
        textColor: [255, 255, 255], 
        fontStyle: "bold",
        halign: 'center',
        valign: 'middle',
        fontSize: 7
      },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: 14, right: 14 },
      overflow: 'linebreak'
    });

    const finalY = doc.lastAutoTable.finalY + 5;

    // TOTAIS
    const boxY = finalY;
    let linhasTotais = 3;
    if (desconto > 0) linhasTotais++;
    if (totalRetencao > 0) linhasTotais++;
    if (documento.tipo === "Recibo") linhasTotais += 2;
    
    const boxAltura = 16 + (linhasTotais * 5.5);
    
    doc.setFillColor(245, 248, 250);
    doc.rect(120, boxY, 80, boxAltura, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(120, boxY, 80, boxAltura, 'S');
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(corTexto[0], corTexto[1], corTexto[2]);
    doc.text("RESUMO DO DOCUMENTO", 124, boxY + 5);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    
    let linhaAtual = 12;
    
    doc.text("Mercadoria/Serviços:", 124, boxY + linhaAtual);
    doc.text(formatarMoeda(subtotal), 190, boxY + linhaAtual, { align: 'right' });
    
    if (desconto > 0) {
      linhaAtual += 5;
      doc.setTextColor(220, 38, 38);
      doc.text("Desconto:", 124, boxY + linhaAtual);
      doc.text(`- ${formatarMoeda(desconto)}`, 190, boxY + linhaAtual, { align: 'right' });
      doc.setTextColor(corTexto[0], corTexto[1], corTexto[2]);
    }
    
    linhaAtual += 5;
    doc.text("Subtotal c/ Desconto:", 124, boxY + linhaAtual);
    doc.text(formatarMoeda(subtotalComDesconto), 190, boxY + linhaAtual, { align: 'right' });
    
    linhaAtual += 5;
    doc.text(`IVA (${taxaIVA}%):`, 124, boxY + linhaAtual);
    doc.text(formatarMoeda(totalIVA), 190, boxY + linhaAtual, { align: 'right' });
    
    if (totalRetencao > 0) {
      linhaAtual += 5;
      doc.setTextColor(220, 38, 38);
      
      let taxaExibicao = taxaRetencao;
      if (Number.isInteger(taxaExibicao)) {
        taxaExibicao = taxaExibicao.toFixed(0);
      } else {
        taxaExibicao = taxaExibicao.toFixed(1);
      }
      
      doc.text(`Retenção (${taxaExibicao}%):`, 124, boxY + linhaAtual);
      doc.text(`- ${formatarMoeda(totalRetencao)}`, 190, boxY + linhaAtual, { align: 'right' });
      doc.setTextColor(corTexto[0], corTexto[1], corTexto[2]);
    }
    
    linhaAtual += 7;
    doc.setDrawColor(200, 200, 200);
    doc.line(124, boxY + linhaAtual - 1, 195, boxY + linhaAtual - 1);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(corTitulo[0], corTitulo[1], corTitulo[2]);
    
    if (documento.tipo === "Recibo") {
      linhaAtual += 2;
      doc.text("VALOR DA FACTURA:", 124, boxY + linhaAtual);
      doc.text(formatarMoeda(total), 190, boxY + linhaAtual, { align: 'right' });
      
      linhaAtual += 5;
      doc.setTextColor(16, 185, 129);
      doc.text(`Valor Pago: ${formatarMoeda(valorPago)}`, 124, boxY + linhaAtual);
      
      if (troco > 0) {
        linhaAtual += 5;
        doc.text(`Troco: ${formatarMoeda(troco)}`, 124, boxY + linhaAtual);
      }
      doc.setTextColor(corTexto[0], corTexto[1], corTexto[2]);
    } else {
      linhaAtual += 2;
      const textoTotal = documento.total < 0 ? "VALOR A CREDITAR:" : "TOTAL A PAGAR:";
      doc.text(textoTotal, 124, boxY + linhaAtual);
      doc.text(formatarMoeda(total), 190, boxY + linhaAtual, { align: 'right' });
    }
    
    // Total por extenso
    doc.setFontSize(6);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(corCinza[0], corCinza[1], corCinza[2]);
    doc.text(`Total por extenso: ${numeroPorExtenso(total)}`, 14, boxY + boxAltura + 3);
    
    // INFORMAÇÕES DE PAGAMENTO
    let pagamentoY = boxY + boxAltura + 10;
    
    doc.setDrawColor(220, 220, 220);
    doc.line(14, pagamentoY, 200, pagamentoY);
    pagamentoY += 4;
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    doc.text("INFORMAÇÕES DE PAGAMENTO", 14, pagamentoY);
    
    pagamentoY += 5;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(corCinza[0], corCinza[1], corCinza[2]);
    doc.text(`Forma de Pagamento: ${documento.formaPagamento || 'Dinheiro'}`, 14, pagamentoY);
    
    if (documento.contaBancaria) {
      pagamentoY += 4;
      doc.text(`Conta Bancária: ${documento.contaBancaria}`, 14, pagamentoY);
    }
    
    if (documento.tipo === "Recibo" && documento.dataPagamento) {
      pagamentoY += 4;
      doc.text(`Data do Pagamento: ${new Date(documento.dataPagamento).toLocaleDateString('pt-PT')}`, 14, pagamentoY);
    }
    
    // ==================== OBSERVAÇÕES PROFISSIONAIS (FONTE NORMAL) ====================
    pagamentoY += 8;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(corCinza[0], corCinza[1], corCinza[2]);
    
    // OBSERVAÇÕES ESPECÍFICAS POR TIPO DE DOCUMENTO
    if (documento.tipo === "Orcamento") {
      doc.text("Os bens e/ou serviços foram cotados conforme solicitação do cliente.", 14, pagamentoY);
      pagamentoY += 4;
      doc.text("Este orçamento tem validade de 30 dias a partir da data de emissão.", 14, pagamentoY);
      pagamentoY += 4;
      doc.text("Os preços apresentados podem sofrer alterações sem aviso prévio.", 14, pagamentoY);
      pagamentoY += 4;
      doc.text("Para aceitação do orçamento, solicitar a emissão da factura proforma.", 14, pagamentoY);
      
    } else if (documento.tipo === "Factura Proforma") {
      doc.text("Esta factura proforma não tem validade fiscal para efeitos de IVA.", 14, pagamentoY);
      pagamentoY += 4;
      doc.text("Após a confirmação do pagamento, será emitida a factura final.", 14, pagamentoY);
      pagamentoY += 4;
      doc.text("Os bens e/ou serviços serão disponibilizados após confirmação do pagamento.", 14, pagamentoY);
      pagamentoY += 4;
      doc.text("Esta proforma tem validade de 15 dias a partir da data de emissão.", 14, pagamentoY);
      
    } else if (documento.tipo === "Recibo") {
      doc.text("Este recibo confirma o pagamento do valor indicado.", 14, pagamentoY);
      pagamentoY += 4;
      doc.text("Documento válido como comprovativo de quitação para todos os efeitos legais.", 14, pagamentoY);
      pagamentoY += 4;
      doc.text("Os bens e/ou serviços encontram-se disponíveis para entrega imediata.", 14, pagamentoY);
      pagamentoY += 4;
      doc.text("Agradecemos a preferência e estamos ao dispor para futuros negócios.", 14, pagamentoY);
      
    } else if (documento.tipo === "Nota Credito") {
      doc.text("Esta nota de crédito anula o documento original referenciado.", 14, pagamentoY);
      pagamentoY += 4;
      doc.text(`O valor de ${formatarMoeda(total)} será creditado na conta do cliente.`, 14, pagamentoY);
      pagamentoY += 4;
      doc.text("O crédito será efetivado no prazo máximo de 5 dias úteis.", 14, pagamentoY);
      pagamentoY += 4;
      doc.text("Esta operação não implica qualquer encargo adicional para o cliente.", 14, pagamentoY);
      
    } else if (documento.tipo === "Factura") {
      doc.text("Os bens e/ou serviços foram colocados à disposição do cliente na data de emissão.", 14, pagamentoY);
      pagamentoY += 4;
      doc.text("Este documento é um comprovativo de venda válido para todos os efeitos legais.", 14, pagamentoY);
      pagamentoY += 4;
      doc.text("O IVA foi liquidado à taxa legal em vigor no território nacional.", 14, pagamentoY);
    }
    
    // OBSERVAÇÃO DE RETENÇÃO NA FONTE
    if (totalRetencao > 0 && documento.tipo !== "Nota Credito") {
      pagamentoY += 4;
      let taxaExibicaoObs = taxaRetencao;
      if (Number.isInteger(taxaExibicaoObs)) {
        taxaExibicaoObs = taxaExibicaoObs.toFixed(0);
      } else {
        taxaExibicaoObs = taxaExibicaoObs.toFixed(1);
      }
      doc.text(`Valor retido na fonte (${taxaExibicaoObs}%): ${formatarMoeda(totalRetencao)}`, 14, pagamentoY);
      pagamentoY += 4;
      doc.text("A retenção foi efetuada conforme legislação fiscal em vigor.", 14, pagamentoY);
    }
    
    // MOTIVO DA NOTA DE CRÉDITO
    if (documento.motivoNotaCredito) {
      pagamentoY += 4;
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(`Motivo da Nota de Crédito: ${documento.motivoNotaCredito}`, 14, pagamentoY);
    }
    
    // OBSERVAÇÕES ADICIONAIS DO USUÁRIO
    if (documento.observacoes) {
      pagamentoY += 5;
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(corCinza[0], corCinza[1], corCinza[2]);
      doc.text(`Observações: ${documento.observacoes}`, 14, pagamentoY);
    }
    
    // ==================== QR CODE ====================
    const pageHeight = doc.internal.pageSize.height;
    
    try {
      const qrData = {
        tipo: documento.tipo,
        numero: numeroDocumento,
        empresa: empresa?.nome || "AnDioGest",
        nif: empresa?.nif || "---",
        data: dataAgora.toLocaleDateString('pt-PT'),
        cliente: documento.cliente,
        nifCliente: documento.nifCliente || "---",
        total: formatarMoeda(total)
      };
      
      if (documento.tipo === "Recibo" && valorPago) {
        qrData.valorPago = formatarMoeda(valorPago);
      }
      
      const qrText = JSON.stringify(qrData);
      const qrCodeUrl = await QRCode.toDataURL(qrText, { width: 30, margin: 1 });
      doc.addImage(qrCodeUrl, 'PNG', 160, pageHeight - 45, 28, 28);
      
      doc.setFontSize(5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("Consulte a autenticidade", 160, pageHeight - 50);
      doc.text("deste documento via QR Code", 160, pageHeight - 46);
      
    } catch (qrError) {
      console.error("Erro ao gerar QR Code:", qrError);
    }
    
    // ==================== RODAPÉ ====================
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Documento gerado eletronicamente em ${dataAgora.toLocaleString('pt-PT')}`, 14, pageHeight - 10);
    doc.text(`por: ${usuario?.nome || 'Sistema'}`, 14, pageHeight - 6);
    doc.text(numeroDocumento, 200, pageHeight - 8, { align: 'right' });
    doc.text(`www.andiogest.com`, 200, pageHeight - 4, { align: 'right' });

    const nomeArquivo = `${documento.tipo.replace(/\s/g, '_')}_${numeroDocumento.replace(/\//g, '_')}.pdf`;
    doc.save(nomeArquivo);
    
    console.log("✅ PDF gerado com sucesso:", nomeArquivo);
    
  } catch (err) {
    console.error("❌ Erro ao gerar o documento:", err);
    alert("Erro ao gerar o documento. Verifique o console.");
  }
};

// Função para converter número por extenso
function numeroPorExtenso(valor) {
  if (valor === 0) return "ZERO KWANZAS";
  
  const valorInteiro = Math.floor(Math.abs(valor));
  const centavos = Math.round((Math.abs(valor) - valorInteiro) * 100);
  
  const unidades = ["", "UM", "DOIS", "TRÊS", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE"];
  const especiais = ["DEZ", "ONZE", "DOZE", "TREZE", "CATORZE", "QUINZE", "DEZASSEIS", "DEZASSETE", "DEZOITO", "DEZANOVE"];
  const dezenas = ["", "", "VINTE", "TRINTA", "QUARENTA", "CINQUENTA", "SESSENTA", "SETENTA", "OITENTA", "NOVENTA"];
  const centenas = ["", "CEM", "DUZENTOS", "TREZENTOS", "QUATROCENTOS", "QUINHENTOS", "SEISCENTOS", "SETECENTOS", "OITOCENTOS", "NOVECENTOS"];
  
  function converterAbaixoMil(num) {
    if (num === 0) return "";
    if (num === 100) return "CEM";
    
    let resultado = "";
    const centena = Math.floor(num / 100);
    const resto = num % 100;
    
    if (centena > 0) {
      resultado = centenas[centena];
      if (resto > 0) resultado += " E ";
    }
    
    if (resto >= 20) {
      const dezena = Math.floor(resto / 10);
      const unidade = resto % 10;
      resultado += dezenas[dezena];
      if (unidade > 0) resultado += ` E ${unidades[unidade]}`;
    } else if (resto >= 10) {
      resultado += especiais[resto - 10];
    } else if (resto > 0) {
      resultado += unidades[resto];
    }
    
    return resultado;
  }
  
  const partes = [];
  const milhoes = Math.floor(valorInteiro / 1000000);
  const milhares = Math.floor((valorInteiro % 1000000) / 1000);
  const resto = valorInteiro % 1000;
  
  if (milhoes > 0) {
    if (milhoes === 1) {
      partes.push("UM MILHÃO");
    } else {
      partes.push(converterAbaixoMil(milhoes) + " MILHÕES");
    }
  }
  
  if (milhares > 0) {
    if (milhares === 1) {
      partes.push("MIL");
    } else {
      partes.push(converterAbaixoMil(milhares) + " MIL");
    }
  }
  
  if (resto > 0) {
    partes.push(converterAbaixoMil(resto));
  }
  
  let resultado = partes.join(" E ");
  
  if (resultado) {
    resultado += " KWANZAS";
  } else {
    resultado = "ZERO KWANZAS";
  }
  
  if (centavos > 0) {
    resultado += ` E ${converterAbaixoMil(centavos)} CÊNTIMOS`;
  }
  
  return resultado;
}