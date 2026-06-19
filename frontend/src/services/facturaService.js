import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { carregarLogoBase64, carregarDadosEmpresa, drawCabecalhoProfissional, drawRodape, drawClientSection, drawTotalsBox, formatarMoeda, COR_TEXTO, COR_ESCURA, COR_CINZA_MEDIO, COR_BORDA, COR_PRIMARIA, COR_CINZA_CLARO } from '../utils/pdfUtils';

export const gerarFacturaProfissional = async (venda, usuario, empresa, contasBancarias = []) => {
  try {
    if (!venda) {
      console.error("Nenhuma venda para gerar factura");
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const rMargin = pageWidth - margin;

    const dataAgora = new Date();
    const ano = dataAgora.getFullYear();
    const mes = String(dataAgora.getMonth() + 1).padStart(2, '0');
    const numero = venda.numeroFactura || String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    const numeroFactura = `FT/${ano}/${mes}/${numero}`;

    const subtotal = venda.subtotal || 0;
    const totalIVA = venda.totalIva || 0;
    const desconto = venda.desconto || 0;
    const totalRetencao = venda.totalRetencao || 0;
    const total = venda.total || 0;
    const taxaIVA = venda.taxaIVA || 14;

    let taxaRetencao = venda.taxaRetencao || 0;
    const subtotalComDesconto = subtotal - desconto;
    if (taxaRetencao === 0 && totalRetencao > 0 && subtotalComDesconto > 0) {
      taxaRetencao = Math.round((totalRetencao / subtotalComDesconto) * 100 * 10) / 10;
    }

    const logoBase64 = await carregarLogoBase64(empresa);

    let yPos = drawCabecalhoProfissional(doc, empresa, logoBase64);

    doc.setDrawColor(...COR_PRIMARIA);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, rMargin - margin, 9, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COR_ESCURA);
    doc.text('FACTURA', margin + 3, yPos + 6.5);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COR_TEXTO);
    doc.text(`Nº: ${numeroFactura}`, rMargin - 3, yPos + 4, { align: 'right' });
    doc.text(`Data: ${dataAgora.toLocaleDateString('pt-PT')}`, rMargin - 3, yPos + 9, { align: 'right' });

    yPos += 13;

    if (venda.atcud) {
      doc.setFontSize(5.5);
      doc.setTextColor(...COR_CINZA_MEDIO);
      doc.text(`ATCUD: ${venda.atcud.substring(0, 25)}...`, margin + 3, yPos + 1);
    }
    yPos += 5;

    yPos = drawClientSection(doc, {
      cliente: venda.cliente,
      nifCliente: venda.nifCliente,
      enderecoCliente: venda.enderecoCliente,
      telefoneCliente: venda.telefoneCliente,
      emailCliente: venda.emailCliente,
      cidadeCliente: venda.cidadeCliente,
    }, yPos);

    yPos += 3;

    const itensTabela = venda.itens?.map((item) => {
      const qtd = Number(item.quantidade) || 1;
      const precoUnit = Number(item.precoUnitario) || 0;
      const iva = Number(item.iva) || Number(item.taxaIva) || taxaIVA;
      const subLinha = qtd * precoUnit;
      const valorIva = subLinha * (iva / 100);
      const totalLinha = subLinha + valorIva;
      return [
        item.produtoOuServico || item.descricao || '---',
        qtd.toLocaleString('pt-PT'),
        formatarMoeda(precoUnit),
        `${iva}%`,
        formatarMoeda(valorIva),
        formatarMoeda(totalLinha),
      ];
    }) || [];

    if (itensTabela.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Descrição', 'Qtd', 'Preço Unit.', 'IVA', 'Valor IVA', 'Total']],
        body: itensTabela,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 6.5,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 2,
        },
        bodyStyles: { fontSize: 6.5, textColor: [55, 65, 81], cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 14, halign: 'center' },
          2: { cellWidth: 26, halign: 'right' },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 26, halign: 'right' },
          5: { cellWidth: 28, halign: 'right' },
        },
        margin: { left: 14, right: 14 },
      });

      yPos = doc.lastAutoTable.finalY + 8;
    } else {
      yPos += 5;
    }

    yPos = drawTotalsBox(doc, {
      subtotal,
      totalIva: totalIVA,
      desconto,
      totalRetencao,
      total,
      taxaIVA,
      taxaRetencao,
    }, yPos, 'Factura');

    yPos += 6;

    if (venda.formaPagamento) {
      yPos += 3;
      doc.setDrawColor(...COR_BORDA);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, rMargin, yPos);
      yPos += 4;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COR_PRIMARIA);
      doc.text('INFORMAÇÕES DE PAGAMENTO', margin, yPos);
      yPos += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COR_TEXTO);
      doc.text(`Forma de Pagamento: ${venda.formaPagamento}`, margin, yPos);
      yPos += 4;

      if (venda.contaBancaria) {
        doc.text(`Conta Bancária: ${venda.contaBancaria}`, margin, yPos);
        yPos += 4;
        const contaEncontrada = contasBancarias.find(c => c.codNome === venda.contaBancaria);
        if (contaEncontrada?.iban) {
          doc.text(`IBAN: ${contaEncontrada.iban}`, margin, yPos);
          yPos += 4;
        }
      }
      yPos += 2;
    }

    const pageHeight = doc.internal.pageSize.height;

    try {
      const qrPayload = {
        empresa: empresa?.nome || '',
        nif: empresa?.nif || '',
        factura: numeroFactura,
        data: dataAgora.toLocaleDateString('pt-PT'),
        total: `${total.toFixed(2)} Kz`,
        cliente: venda.cliente || '',
        nifCliente: venda.nifCliente || '',
      };

      if (venda.atcud) qrPayload.atcud = venda.atcud;
      if (venda.hash) qrPayload.hash = venda.hash;

      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), { width: 35, margin: 1 });
      doc.addImage(qrCodeUrl, 'PNG', rMargin - 40, pageHeight - 48, 26, 26);

      doc.setFontSize(5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COR_CINZA_MEDIO);
      doc.text('QR Code', rMargin - 27, pageHeight - 48, { align: 'center' });
      doc.text('AGT', rMargin - 27, pageHeight - 44, { align: 'center' });
    } catch (qrError) {
      console.error("Erro ao gerar QR Code:", qrError);
    }

    if (yPos < pageHeight - 55) {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COR_CINZA_MEDIO);
      doc.text(`Total por extenso: ${numeroPorExtenso(total)}`, margin, pageHeight - 52);
    }

    const docInfo = { numeroDocumento: numeroFactura, hash: venda.hash };
    drawRodape(doc, empresa?.nome, docInfo);

    doc.save(`Factura_${numeroFactura.replace(/\//g, '_')}.pdf`);

  } catch (err) {
    console.error("Erro ao gerar a factura:", err);
    alert("Erro ao gerar a factura. Verifique o console para mais detalhes.");
  }
};

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
      const centenas = ["", "CENTO", "DUZENTOS", "TREZENTOS", "QUATROCENTOS", "QUINHENTOS", "SEISCENTOS", "SETECENTOS", "OITOCENTOS", "NOVECENTOS"];
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
    if (milhoes === 1) partes.push("UM MILHÃO");
    else partes.push(converterAbaixoMil(milhoes) + " MILHÕES");
  }

  if (milhares > 0) {
    if (milhares === 1) partes.push("MIL");
    else partes.push(converterAbaixoMil(milhares) + " MIL");
  }

  if (resto > 0) partes.push(converterAbaixoMil(resto));

  let resultado = partes.join(" E ");
  if (resultado) resultado += " KWANZAS";
  else resultado = "ZERO KWANZAS";

  if (centavos > 0) resultado += ` E ${converterAbaixoMil(centavos)} CÊNTIMOS`;

  return resultado;
}
