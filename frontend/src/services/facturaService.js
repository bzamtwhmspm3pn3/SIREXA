// src/services/facturaService.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

export const gerarFacturaProfissional = async (venda, usuario, empresa, contasBancarias = []) => {
  try {
    if (!venda) {
      console.error("Nenhuma venda para gerar factura");
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const dataAgora = new Date();
    const ano = dataAgora.getFullYear();
    const mes = String(dataAgora.getMonth() + 1).padStart(2, '0');
    const numero = venda.numeroFactura || String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    const numeroFactura = `FT/${ano}/${mes}/${numero}`;
    
    // Cores
    const corPrimaria = [41, 98, 255];
    const corCinza = [100, 100, 100];
    const corTexto = [50, 50, 50];
    
    // Função para formatar moeda com 2 casas decimais
    const formatarMoeda = (valor) => {
      if (!valor && valor !== 0) return "0,00 Kz";
      return valor.toLocaleString('pt-AO', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }) + " Kz";
    };
    
    // Valores
    const subtotal = venda.subtotal || 0;
    const totalIVA = venda.totalIva || 0;
    const desconto = venda.desconto || 0;
    const totalRetencao = venda.totalRetencao || 0;
    const total = venda.total || 0;
    const taxaIVA = venda.taxaIVA || 14;
    
    // Calcular a taxa de retenção real
    let taxaRetencao = venda.taxaRetencao || 0;
    const subtotalComDesconto = subtotal - desconto;
    
    if (taxaRetencao === 0 && totalRetencao > 0 && subtotalComDesconto > 0) {
      taxaRetencao = (totalRetencao / subtotalComDesconto) * 100;
      taxaRetencao = Math.round(taxaRetencao * 10) / 10;
    }
    
    let yPos = 15; // Reduzido o Y inicial

    // ==================== CABEÇALHO ====================
    doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    doc.setFontSize(14); // Reduzido
    doc.setFont("helvetica", "bold");
    doc.text(empresa?.nome || "AnDioGest - Gestão Corporativa", 14, yPos + 5);
    
    doc.setTextColor(corCinza[0], corCinza[1], corCinza[2]);
    doc.setFontSize(8); // Reduzido
    doc.setFont("helvetica", "normal");
    doc.text(`NIF: ${empresa?.nif || '---'}`, 14, yPos + 11);
    doc.text(`Email: ${empresa?.email || '---'}`, 14, yPos + 16);
    doc.text(`Telefone: ${empresa?.telefone || '---'}`, 14, yPos + 21);
    
    const enderecoStr = typeof empresa?.endereco === 'string' 
      ? empresa.endereco 
      : (empresa?.endereco?.rua || empresa?.endereco?.endereco || 'Luanda, Angola');
    doc.text(`Endereço: ${enderecoStr}`, 14, yPos + 26);
    
    // Título FACTURA
    doc.setFontSize(20); // Reduzido
    doc.setFont("helvetica", "bold");
    doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    doc.text("FACTURA", 155, yPos + 12);
    
    doc.setFontSize(8);
    doc.setTextColor(corCinza[0], corCinza[1], corCinza[2]);
    doc.text(`Nº: ${numeroFactura}`, 155, yPos + 20);
    doc.text(`Data: ${dataAgora.toLocaleDateString('pt-PT')}`, 155, yPos + 26);
    doc.text(`Hora: ${dataAgora.toLocaleTimeString('pt-PT')}`, 155, yPos + 32);
    
    yPos = 50; // Reduzido

    // ==================== DADOS DO CLIENTE ====================
    doc.setFillColor(245, 248, 250);
    doc.rect(14, yPos, 186, 25, 'F'); // Altura reduzida
    doc.setDrawColor(220, 220, 220);
    doc.rect(14, yPos, 186, 25, 'S');
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(corTexto[0], corTexto[1], corTexto[2]);
    doc.text("DADOS DO CLIENTE", 18, yPos + 6);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Nome: ${venda.cliente || '---'}`, 18, yPos + 12);
    doc.text(`NIF: ${venda.nifCliente || '---'}`, 18, yPos + 18);
    
    if (venda.telefoneCliente && venda.telefoneCliente !== '---' && venda.telefoneCliente !== '') {
      doc.text(`Telefone: ${venda.telefoneCliente}`, 120, yPos + 12);
    }
    if (venda.emailCliente && venda.emailCliente !== '---' && venda.emailCliente !== '') {
      doc.text(`Email: ${venda.emailCliente}`, 120, yPos + 18);
    }
    
    yPos += 30;

    // ==================== TABELA DE PRODUTOS ====================
    const produtosTabela = venda.itens?.map((item, index) => [
      index + 1,
      item.produtoOuServico || '---',
      formatarMoeda(item.precoUnitario || 0),
      item.quantidade || 0,
      formatarMoeda(item.total || 0)
    ]) || [];

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Descrição do Produto/Serviço', 'Preço Unit.', 'Qtd.', 'Total']],
      body: produtosTabela,
      theme: 'grid',
      styles: { 
        fontSize: 7, // Reduzido
        cellPadding: 3, // Reduzido
        valign: 'middle',
        textColor: [50, 50, 50]
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
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 85 },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 35, halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable.finalY + 6; // Reduzido

    // ==================== TOTAIS ====================
    // Calcular altura dinâmica da caixa de totais
    let linhasTotais = 3; // Subtotal, Subtotal c/ Desconto, IVA
    if (desconto > 0) linhasTotais++;
    if (totalRetencao > 0) linhasTotais++;
    
    const boxAltura = 20 + (linhasTotais * 6); // Altura dinâmica
    const boxY = finalY;
    
    doc.setFillColor(245, 248, 250);
    doc.rect(120, boxY, 80, boxAltura, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(120, boxY, 80, boxAltura, 'S');
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(corTexto[0], corTexto[1], corTexto[2]);
    doc.text("RESUMO DA FACTURA", 124, boxY + 5);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    
    let linhaAtual = 12;
    
    doc.text("Mercadoria/Serviços:", 124, boxY + linhaAtual);
    doc.text(formatarMoeda(subtotal), 190, boxY + linhaAtual, { align: 'right' });
    
    if (desconto > 0) {
      linhaAtual += 5.5;
      doc.setTextColor(220, 38, 38);
      doc.text("Desconto:", 124, boxY + linhaAtual);
      doc.text(`- ${formatarMoeda(desconto)}`, 190, boxY + linhaAtual, { align: 'right' });
      doc.setTextColor(corTexto[0], corTexto[1], corTexto[2]);
    }
    
    linhaAtual += 5.5;
    doc.text("Subtotal c/ Desconto:", 124, boxY + linhaAtual);
    doc.text(formatarMoeda(subtotalComDesconto), 190, boxY + linhaAtual, { align: 'right' });
    
    linhaAtual += 5.5;
    doc.text(`IVA (${taxaIVA}%):`, 124, boxY + linhaAtual);
    doc.text(formatarMoeda(totalIVA), 190, boxY + linhaAtual, { align: 'right' });
    
    if (totalRetencao > 0) {
      linhaAtual += 5.5;
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
    doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    doc.text("TOTAL A PAGAR:", 124, boxY + linhaAtual + 2);
    doc.text(formatarMoeda(total), 190, boxY + linhaAtual + 2, { align: 'right' });
    
    // Total por extenso - mover para próximo à caixa de totais
    doc.setFontSize(6);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(corCinza[0], corCinza[1], corCinza[2]);
    doc.text(`Total por extenso: ${numeroPorExtenso(total)}`, 14, boxY + boxAltura + 3);
    
    // ==================== INFORMAÇÕES DE PAGAMENTO ====================
    let infoY = boxY + boxAltura + 10;
    
    doc.setDrawColor(220, 220, 220);
    doc.line(14, infoY, 200, infoY);
    infoY += 4;
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    doc.text("INFORMAÇÕES DE PAGAMENTO", 14, infoY);
    
    infoY += 5;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(corCinza[0], corCinza[1], corCinza[2]);
    doc.text(`Forma de Pagamento: ${venda.formaPagamento || 'Dinheiro'}`, 14, infoY);
    
    if (venda.contaBancaria) {
      infoY += 4;
      doc.text(`Conta Bancária: ${venda.contaBancaria}`, 14, infoY);
      
      const contaEncontrada = contasBancarias.find(c => c.codNome === venda.contaBancaria);
      if (contaEncontrada && contaEncontrada.iban) {
        infoY += 4;
        doc.text(`IBAN: ${contaEncontrada.iban}`, 14, infoY);
      }
    }
    
    // ==================== OBSERVAÇÕES ====================
    infoY += 7;
    doc.setFontSize(6);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(corCinza[0], corCinza[1], corCinza[2]);
    doc.text("Os bens e/ou serviços foram colocados à disposição do cliente na data de emissão.", 14, infoY);
    infoY += 3.5;
    doc.text("Este documento é um comprovativo de venda válido para todos os efeitos legais.", 14, infoY);
    
    if (totalRetencao > 0) {
      infoY += 3.5;
      let taxaExibicaoObs = taxaRetencao;
      if (Number.isInteger(taxaExibicaoObs)) {
        taxaExibicaoObs = taxaExibicaoObs.toFixed(0);
      } else {
        taxaExibicaoObs = taxaExibicaoObs.toFixed(1);
      }
      doc.text(`Valor retido na fonte (${taxaExibicaoObs}%): ${formatarMoeda(totalRetencao)}`, 14, infoY);
    }
    
    // ==================== QR CODE ====================
    const pageHeight = doc.internal.pageSize.height;
    
    try {
      const qrData = {
        empresa: empresa?.nome || "AnDioGest",
        nif: empresa?.nif || "---",
        factura: numeroFactura,
        data: dataAgora.toLocaleDateString('pt-PT'),
        cliente: venda.cliente,
        nifCliente: venda.nifCliente || "---",
        total: `${total.toFixed(2)} Kz`,
        formaPagamento: venda.formaPagamento || "Dinheiro"
      };
      
      const qrText = JSON.stringify(qrData);
      const qrCodeUrl = await QRCode.toDataURL(qrText, { width: 35, margin: 1 });
      doc.addImage(qrCodeUrl, 'PNG', 155, pageHeight - 45, 30, 30);
      
      doc.setFontSize(5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("Consulte os dados", 155, pageHeight - 48);
      doc.text("através do QR Code", 155, pageHeight - 44);
      
    } catch (qrError) {
      console.error("Erro ao gerar QR Code:", qrError);
    }
    
    // ==================== RODAPÉ ====================
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em ${dataAgora.toLocaleString('pt-PT')} por ${usuario?.nome || 'Sistema'}`, 14, pageHeight - 8);
    doc.text(`Documento processado por AnDioGest - Gestão Corporativa v1.0`, 14, pageHeight - 4);
    doc.text(`${numeroFactura}`, 200, pageHeight - 8, { align: 'right' });

    doc.save(`Factura_${numeroFactura.replace(/\//g, '_')}.pdf`);
    
  } catch (err) {
    console.error("❌ Erro ao gerar a factura:", err);
    alert("Erro ao gerar a factura. Verifique o console para mais detalhes.");
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
  
  function converterAbaixoMil(num) {
    if (num === 0) return "";
    if (num === 100) return "CEM";
    
    let resultado = "";
    const centena = Math.floor(num / 100);
    const resto = num % 100;
    
    if (centena > 0) {
      if (centena === 1) {
        resultado = "CENTO";
      } else {
        const centenas = ["", "CENTO", "DUZENTOS", "TREZENTOS", "QUATROCENTOS", "QUINHENTOS", "SEISCENTOS", "SETECENTOS", "OITOCENTOS", "NOVECENTOS"];
        resultado = centenas[centena];
      }
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