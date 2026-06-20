import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { carregarLogoBase64, carregarDadosEmpresa, drawCabecalhoProfissional, drawRodape, drawClientSection, drawTotalsBox, formatarMoeda, getCorTitulo, getTextoObservacoes, COR_TEXTO, COR_ESCURA, COR_CINZA_MEDIO, COR_BORDA, COR_PRIMARIA } from '../utils/pdfUtils';

export async function gerarDocumentoPDF(documento, items, config = {}) {
  const doc = new jsPDF('p', 'mm', 'A4');
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const rMargin = pageWidth - margin;

  const empresa = await carregarDadosEmpresa(documento.empresaId);
  const logoBase64 = await carregarLogoBase64(empresa);
  const tipo = documento.tipo || 'Documento';

  let yPos = drawCabecalhoProfissional(doc, empresa, logoBase64);

  const corTitulo = getCorTitulo(tipo);
  doc.setDrawColor(corTitulo[0], corTitulo[1], corTitulo[2]);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, rMargin - margin, 9, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(corTitulo[0], corTitulo[1], corTitulo[2]);
  doc.text(tipo.toUpperCase(), margin + 3, yPos + 6.5);

  const doisCampos = [];

  if (documento.dataEmissao) {
    doisCampos.push(`Data: ${new Date(documento.dataEmissao).toLocaleDateString('pt-PT')}`);
  }
  if (documento.dataVencimento) {
    doisCampos.push(`Vencimento: ${new Date(documento.dataVencimento).toLocaleDateString('pt-PT')}`);
  }

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
  if (doisCampos.length > 0) {
    doc.text(doisCampos[0] || '', rMargin - 3, yPos + 4, { align: 'right' });
    if (doisCampos.length > 1) {
      doc.text(doisCampos[1], rMargin - 3, yPos + 9, { align: 'right' });
    }
  }

  yPos += 12;

  if (documento.numeroDocumento) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COR_ESCURA[0], COR_ESCURA[1], COR_ESCURA[2]);
    doc.text(`Nº: ${documento.numeroDocumento}`, margin + 3, yPos + 1);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COR_CINZA_MEDIO[0], COR_CINZA_MEDIO[1], COR_CINZA_MEDIO[2]);

    const extrasDoc = [];
    if (documento.atcud) extrasDoc.push(`ATCUD: ${documento.atcud.substring(0, 15)}...`);
    if (documento.codigoValidacao) extrasDoc.push(`Validação: ${documento.codigoValidacao}`);

    let extraText = '';
    if (extrasDoc.length > 0) {
      extraText = extrasDoc.join(' | ');
    }
    if (extraText) {
      doc.text(extraText, rMargin - 3, yPos + 1, { align: 'right' });
    }
    yPos += 5;
  }

  if (documento.moeda) {
    doc.setFontSize(6);
    doc.setTextColor(COR_CINZA_MEDIO[0], COR_CINZA_MEDIO[1], COR_CINZA_MEDIO[2]);
    doc.text(`Moeda: ${documento.moeda}`, margin + 3, yPos + 1);
    yPos += 4;
  }

  yPos += 2;
  yPos = drawClientSection(doc, documento, yPos);
  yPos += 3;

  if (items?.length > 0) {
    const incluiIVA = documento.incluiIVA !== false;

    const tableRows = items.map((item) => {
      const qtd = Number(item.quantidade) || 1;
      const precoUnit = Number(item.precoUnitario) || Number(item.precoUnit) || 0;
      const iva = incluiIVA ? (Number(item.iva) || Number(item.taxaIVA) || 14) : 0;
      const subtotalLinha = qtd * precoUnit;
      const valorIva = subtotalLinha * (iva / 100);
      const totalLinha = subtotalLinha + valorIva;

      const descontoLinha = Number(item.desconto) || 0;

      if (incluiIVA) {
        return [
          item.codigo || '',
          item.descricao || item.nome || item.servico || '',
          qtd.toLocaleString('pt-PT'),
          formatarMoeda(precoUnit),
          formatarMoeda(subtotalLinha - descontoLinha),
          `${iva}%`,
          formatarMoeda(valorIva),
          formatarMoeda(totalLinha - descontoLinha),
        ];
      }
      return [
        item.codigo || '',
        item.descricao || item.nome || item.servico || '',
        qtd.toLocaleString('pt-PT'),
        formatarMoeda(precoUnit),
        formatarMoeda(subtotalLinha - descontoLinha),
        formatarMoeda(totalLinha - descontoLinha),
      ];
    });

    const hasDiscount = items.some(item => Number(item.desconto) > 0);

    const colHead = incluiIVA
      ? ['Cód.', 'Descrição', 'Qtd', 'Preço Unit.', 'Subtotal', 'IVA', 'Valor IVA', 'Total']
      : ['Cód.', 'Descrição', 'Qtd', 'Preço Unit.', 'Subtotal', 'Total'];
    const colStyles = incluiIVA
      ? {
          0: { cellWidth: 16, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 14, halign: 'center' },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 14, halign: 'center' },
          6: { cellWidth: 22, halign: 'right' },
          7: { cellWidth: 24, halign: 'right' },
        }
      : {
          0: { cellWidth: 16, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 14, halign: 'center' },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 24, halign: 'right' },
        };

    doc.autoTable({
      startY: yPos,
      head: [colHead],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: 255,
        fontSize: 6.5,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2,
      },
      bodyStyles: {
        fontSize: 6.5,
        textColor: [55, 65, 81],
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: colStyles,
      margin: { left: 14, right: 14 },
      tableWidth: 'auto',
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 0 && !data.cell.raw) {
          data.cell.text = ['---'];
        }
      },
    });

    yPos = doc.lastAutoTable.finalY + 8;
    yPos = drawTotalsBox(doc, documento, yPos, tipo);
    yPos += 6;
  } else if (documento.descricao) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
    doc.text(documento.descricao, margin, yPos + 5);

    yPos += 15;
    yPos = drawTotalsBox(doc, documento, yPos, tipo);
    yPos += 6;
  }

  const textosObrig = getTextoObservacoes(tipo, documento.total, formatarMoeda);

  if (documento.observacoes) {
    doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
    doc.line(margin, yPos, rMargin, yPos);
    yPos += 3;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
    doc.text('OBSERVAÇÕES', margin, yPos);
    yPos += 4;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
    const obsLines = doc.splitTextToSize(documento.observacoes, rMargin - margin - 4);
    obsLines.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 4;
    });
    yPos += 3;
  } else {
    yPos += 3;
  }

  if (textosObrig?.length > 0) {
    doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, rMargin, yPos);
    yPos += 3;

    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(COR_CINZA_MEDIO[0], COR_CINZA_MEDIO[1], COR_CINZA_MEDIO[2]);
    textosObrig.forEach(t => {
      const lines = doc.splitTextToSize(t, rMargin - margin - 4);
      lines.forEach(line => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin, yPos);
        yPos += 3.5;
      });
    });
  }

  if (documento.atcud && documento.hash) {
    yPos += 3;
    doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, rMargin, yPos);
    yPos += 3;
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COR_CINZA_MEDIO[0], COR_CINZA_MEDIO[1], COR_CINZA_MEDIO[2]);
    doc.text(`ATCUD: ${documento.atcud}`, margin, yPos);
    yPos += 3;
    doc.text(`Hash: ${documento.hash}`, margin, yPos);
    if (documento.hashAnterior) {
      yPos += 3;
      doc.text(`Hash Anterior: ${documento.hashAnterior}`, margin, yPos);
    }
  }

  if (documento.condicoesPagamento) {
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    yPos += 5;
    doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
    doc.line(margin, yPos, rMargin, yPos);
    yPos += 3;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
    doc.text('CONDIÇÕES DE PAGAMENTO', margin, yPos);
    yPos += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
    const pagLines = doc.splitTextToSize(documento.condicoesPagamento, rMargin - margin - 4);
    pagLines.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 4;
    });
  }

  const docInfo = { numeroDocumento: documento.numeroDocumento, hash: documento.hash };
  drawRodape(doc, empresa.nome, docInfo);

  const fileName = `${tipo.replace(/\s+/g, '_')}_${documento.numeroDocumento || Date.now()}.pdf`;
  return { doc, fileName };
}

export const gerarDocumentoProfissional = gerarDocumentoPDF;
