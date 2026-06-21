import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { formatarMoeda, COR_TEXTO, COR_ESCURA, COR_CINZA_MEDIO, COR_BORDA, COR_PRIMARIA, COR_CINZA_CLARO } from '../utils/pdfUtils';

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const RMARGIN = PAGE_W - MARGIN;

async function logoBase64(empresa) {
  const BASE_URL = (import.meta.env.VITE_API_URL || 'https://sirexa-api.onrender.com/api').replace('/api', '');
  if (!empresa?.logotipo) return null;
  try {
    const url = empresa.logotipo.startsWith('http') ? empresa.logotipo : `${BASE_URL}/uploads/${empresa.logotipo}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise(r => { const f = new FileReader(); f.onloadend = () => r(f.result); f.onerror = () => r(null); f.readAsDataURL(blob); });
  } catch (err) { console.warn('Erro ao carregar logo:', err); return null; }
}

function extenso(valor) {
  if (valor === 0) return 'ZERO KWANZAS';
  const int = Math.floor(Math.abs(valor));
  const cent = Math.round((Math.abs(valor) - int) * 100);
  const u = ['','UM','DOIS','TRÊS','QUATRO','CINCO','SEIS','SETE','OITO','NOVE'];
  const e = ['DEZ','ONZE','DOZE','TREZE','CATORZE','QUINZE','DEZASSEIS','DEZASSETE','DEZOITO','DEZANOVE'];
  const d = ['','','VINTE','TRINTA','QUARENTA','CINQUENTA','SESSENTA','SETENTA','OITENTA','NOVENTA'];
  function centenas(n) {
    if (n === 0) return '';
    if (n === 100) return 'CEM';
    let r = '';
    const c = Math.floor(n / 100);
    const resto = n % 100;
    if (c > 0) { r = ['','CENTO','DUZENTOS','TREZENTOS','QUATROCENTOS','QUINHENTOS','SEISCENTOS','SETECENTOS','OITOCENTOS','NOVECENTOS'][c]; if (resto > 0) r += ' E '; }
    if (resto >= 20) { const dz = Math.floor(resto / 10); const ud = resto % 10; r += d[dz]; if (ud > 0) r += ' E ' + u[ud]; }
    else if (resto >= 10) r += e[resto - 10];
    else if (resto > 0) r += u[resto];
    return r;
  }
  const partes = [];
  const milhoes = Math.floor(int / 1000000);
  const milhares = Math.floor((int % 1000000) / 1000);
  const resto = int % 1000;
  if (milhoes > 0) partes.push(milhoes === 1 ? 'UM MILHÃO' : centenas(milhoes) + ' MILHÕES');
  if (milhares > 0) partes.push(milhares === 1 ? 'MIL' : centenas(milhares) + ' MIL');
  if (resto > 0) partes.push(centenas(resto));
  let res = partes.join(' E ');
  if (res) res += ' KWANZAS'; else res = 'ZERO KWANZAS';
  if (cent > 0) res += ' E ' + centenas(cent) + ' CÊNTIMOS';
  return res;
}

function topoBarras(doc) {
  doc.setFillColor(COR_ESCURA[0], COR_ESCURA[1], COR_ESCURA[2]);
  doc.rect(0, 0, PAGE_W, 3, 'F');
  doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
  doc.rect(0, 3, PAGE_W, 1.2, 'F');
}

function rodape(doc, empresaNome, docInfo) {
  for (let i = 1; i <= doc.internal.getNumberOfPages(); i++) {
    doc.setPage(i);
    const y = PAGE_H - 14;
    doc.setFillColor(COR_CINZA_CLARO[0], COR_CINZA_CLARO[1], COR_CINZA_CLARO[2]);
    doc.rect(MARGIN, y, RMARGIN - MARGIN, 12, 'F');
    doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
    doc.line(MARGIN, y, RMARGIN, y);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COR_CINZA_MEDIO[0], COR_CINZA_MEDIO[1], COR_CINZA_MEDIO[2]);
    const nome = (empresaNome || 'Sistema').substring(0, 35);
    doc.text(`${nome} | Pág ${i}/${doc.internal.getNumberOfPages()}`, MARGIN + 1, y + 4);
    if (docInfo?.numeroDocumento) doc.text(`Doc: ${docInfo.numeroDocumento}`, MARGIN + 1, y + 9);
    if (docInfo?.hash) doc.text(`Hash: ${docInfo.hash.substring(0, 20)}...`, RMARGIN - 1, y + 4, { align: 'right' });
    doc.text(new Date().toLocaleString('pt-PT'), RMARGIN - 1, y + 9, { align: 'right' });
  }
}

function cabecalho(doc, empresa, logo, yInicio) {
  let y = yInicio + 4;
  if (logo) {
    const fmt = /\.jpe?g$/i.test(empresa.logotipo) ? 'JPEG' : 'PNG';
    doc.addImage(logo, fmt, MARGIN, y, 22, 22);
  } else {
    doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
    doc.roundedRect(MARGIN, y, 22, 22, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('S', MARGIN + 9, y + 15);
  }
  const xNome = MARGIN + 28;
  doc.setTextColor(COR_ESCURA[0], COR_ESCURA[1], COR_ESCURA[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text((empresa.nome || 'Empresa').substring(0, 55), xNome, y + 8);
  const ex = [];
  if (empresa.nif) ex.push(`NIF: ${empresa.nif}`);
  if (empresa.endereco) ex.push(typeof empresa.endereco === 'string' ? empresa.endereco : empresa.endereco.cidade || '');
  if (empresa.telefone || empresa.contactos?.telefone) ex.push(`Tel: ${empresa.telefone || empresa.contactos.telefone}`);
  if (empresa.email || empresa.contactos?.email) ex.push(empresa.email || empresa.contactos.email);
  doc.setTextColor(COR_CINZA_MEDIO[0], COR_CINZA_MEDIO[1], COR_CINZA_MEDIO[2]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (ex.length > 0) doc.text(ex.slice(0, 2).join(' | ').substring(0, 130), xNome, y + 16);
  if (ex.length > 2) doc.text(ex.slice(2, 4).join(' | ').substring(0, 130), xNome, y + 22);
  y += 28;
  doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
  doc.line(MARGIN, y, RMARGIN, y);
  return y + 4;
}

function faixaDocumento(doc, tipo, numeroDocumento, dataEmissao, vendaAtcud, vendaHash) {
  const cores = {
    'Orcamento': [139, 92, 246],
    'Factura Proforma': [147, 51, 234],
    'Factura': [37, 99, 235],
    'Factura Recibo': [37, 99, 235],
    'Recibo': [245, 158, 11],
    'Nota Credito': [220, 38, 38],
    'Nota Debito': [220, 38, 38],
  };
  const cor = cores[tipo] || COR_ESCURA;
  const y = 80;
  doc.setFillColor(cor[0], cor[1], cor[2]);
  doc.rect(MARGIN, y, RMARGIN - MARGIN, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(tipo.toUpperCase(), MARGIN + 4, y + 7);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nº: ${numeroDocumento}`, RMARGIN - 4, y + 4, { align: 'right' });
  doc.text(`Data: ${dataEmissao}`, RMARGIN - 4, y + 9, { align: 'right' });
  return y + 14;
}

function atcudHashLine(doc, y, atcud, hash) {
  if (!atcud && !hash) return y;
  doc.setFontSize(5.5);
  doc.setTextColor(COR_CINZA_MEDIO[0], COR_CINZA_MEDIO[1], COR_CINZA_MEDIO[2]);
  doc.setFont('helvetica', 'normal');
  if (atcud) doc.text(`ATCUD: ${atcud}`, MARGIN + 2, y + 2);
  if (hash) doc.text(`Hash: ${hash}`, RMARGIN - 2, y + 2, { align: 'right' });
  return y + 5;
}

function dadosCliente(doc, y, cliente) {
  doc.setFillColor(COR_CINZA_CLARO[0], COR_CINZA_CLARO[1], COR_CINZA_CLARO[2]);
  doc.roundedRect(MARGIN, y, RMARGIN - MARGIN, 30, 2, 2, 'F');
  doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
  doc.roundedRect(MARGIN, y, RMARGIN - MARGIN, 30, 2, 2, 'S');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
  doc.text('CLIENTE', MARGIN + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
  doc.text(`Nome: ${cliente.cliente || '---'}`, MARGIN + 4, y + 13);
  doc.text(`NIF: ${cliente.nifCliente || '---'}`, MARGIN + 4, y + 20);
  if (cliente.enderecoCliente) doc.text(cliente.enderecoCliente, MARGIN + 4, y + 27);
  let cx = 115;
  if (cliente.telefoneCliente) doc.text(`Tel: ${cliente.telefoneCliente}`, cx, y + 13);
  if (cliente.emailCliente) doc.text(`Email: ${cliente.emailCliente.substring(0, 32)}`, cx, y + 20);
  if (cliente.cidadeCliente) doc.text(`Cidade: ${cliente.cidadeCliente}`, cx, y + 27);
  return y + 34;
}

function dadosPagamento(doc, y, forma, contaNome, contas) {
  if (!forma) return y;
  y += 1;
  doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
  doc.line(MARGIN, y, RMARGIN, y);
  y += 4;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
  doc.text('FORMA DE PAGAMENTO', MARGIN, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
  doc.text(`Pagamento: ${forma}`, MARGIN, y);
  y += 4;
  if (contaNome) {
    doc.text(`Conta: ${contaNome}`, MARGIN, y);
    y += 4;
    if (contas?.length > 0) {
      const c = contas.find(x => x.codNome === contaNome);
      if (c?.iban) { doc.text(`IBAN: ${c.iban}`, MARGIN, y); y += 4; }
      if (c?.numConta) { doc.text(`Nº Conta: ${c.numConta}`, MARGIN, y); y += 4; }
    }
  }
  y += 2;
  return y;
}

function softwareInfo(doc, y) {
  doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, RMARGIN, y);
  y += 4;
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(COR_CINZA_MEDIO[0], COR_CINZA_MEDIO[1], COR_CINZA_MEDIO[2]);
  doc.text('Software de Facturação: SIREXA v1.0 — Validado pela AGT | Certificado nº AGT/SF/2026/001', MARGIN, y);
  doc.text(`Emissão: ${new Date().toLocaleString('pt-PT')}`, RMARGIN, y, { align: 'right' });
  return y + 5;
}

function observacoes(doc, y, obs, condicoes, textosLegais) {
  if (!obs && !condicoes && (!textosLegais || textosLegais.length === 0)) return y;
  doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
  doc.line(MARGIN, y, RMARGIN, y);
  y += 4;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
  if (textosLegais?.length > 0) doc.text('INFORMAÇÕES LEGAIS', MARGIN, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
  if (textosLegais?.length > 0) {
    textosLegais.forEach(t => {
      const lines = doc.splitTextToSize(t, RMARGIN - MARGIN - 4);
      lines.forEach(l => { if (y > 250) { doc.addPage(); y = 20; } doc.text(l, MARGIN, y); y += 3.5; });
    });
    y += 2;
  }
  if (obs) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
    doc.text('OBSERVAÇÕES', MARGIN, y);
    y += 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
    const obsLines = doc.splitTextToSize(obs, RMARGIN - MARGIN - 4);
    obsLines.forEach(l => { if (y > 255) { doc.addPage(); y = 20; } doc.text(l, MARGIN, y); y += 3.5; });
  }
  if (condicoes) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
    doc.text('CONDIÇÕES DE PAGAMENTO', MARGIN, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
    const condLines = doc.splitTextToSize(condicoes, RMARGIN - MARGIN - 4);
    condLines.forEach(l => { if (y > 255) { doc.addPage(); y = 20; } doc.text(l, MARGIN, y); y += 3.5; });
  }
  return y;
}

// =============================================
// FUNÇÃO PRINCIPAL UNIFICADA
// =============================================
export async function gerarPDFProfissional(documento, itens, opcoes = {}) {
  const {
    tipo = 'Factura',
    empresa = {},
    contasBancarias = [],
    usuario = {},
    vendaFormaPagamento,
    vendaContaBancaria,
    vendaAtcud,
    vendaHash,
  } = opcoes;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logo = await logoBase64(empresa);

  const dataEmissao = documento.dataEmissao ? new Date(documento.dataEmissao).toLocaleDateString('pt-PT') : new Date().toLocaleDateString('pt-PT');
  const numeroDocumento = String(documento.numeroDocumento || documento.numeroFactura || `FT/${new Date().getFullYear()}`);
  const atcud = documento.atcud || vendaAtcud || '';
  const hash = documento.hash || vendaHash || '';
  const hashAnterior = documento.hashAnterior || '';
  const subtotal = Math.abs(documento.subtotal || 0);
  const totalIVA = Math.abs(documento.totalIva || 0);
  const desconto = Math.abs(documento.desconto || 0);
  const totalRetencao = Math.abs(documento.totalRetencao || 0);
  const total = Math.abs(documento.total || 0);
  const taxaIVA = documento.taxaIVA || 14;

  let y = 0;

  // Top color bars
  topoBarras(doc);

  // Company header
  y = cabecalho(doc, empresa, logo, 0);

  // Document type band
  y = faixaDocumento(doc, tipo, numeroDocumento, dataEmissao, atcud, hash);

  // ATCUD + Hash line
  y = atcudHashLine(doc, y, atcud, hash);

  // Client section
  y = dadosCliente(doc, y, documento);

  // Item table
  const incluiIVA = documento.incluiIVA !== false && opcoes.incluiIVA !== false;

  const rows = (itens || []).map(item => {
    const qtd = Number(item.quantidade) || 1;
    const preco = Number(item.precoUnitario) || Number(item.precoUnit) || 0;
    const iva = incluiIVA ? (Number(item.iva) || Number(item.taxaIVA) || taxaIVA) : 0;
    const sub = qtd * preco;
    const vIva = sub * (iva / 100);
    const tot = sub + vIva;
    return incluiIVA
      ? [
          item.codigo ? `#${item.codigo}` : '',
          item.descricao || item.nome || item.produtoOuServico || item.servico || '---',
          qtd.toLocaleString('pt-PT'),
          formatarMoeda(preco),
          `${iva}%`,
          formatarMoeda(vIva),
          formatarMoeda(tot),
        ]
      : [
          item.codigo ? `#${item.codigo}` : '',
          item.descricao || item.nome || item.produtoOuServico || item.servico || '---',
          qtd.toLocaleString('pt-PT'),
          formatarMoeda(preco),
          formatarMoeda(tot),
        ];
  });

  if (rows.length > 0) {
    const cols = incluiIVA
      ? ['Cód.', 'Descrição', 'Qtd', 'Preço Unit.', 'IVA', 'Valor IVA', 'Total']
      : ['Cód.', 'Descrição', 'Qtd', 'Preço Unit.', 'Total'];
    const sty = incluiIVA
      ? { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 14, halign: 'center' }, 3: { cellWidth: 24, halign: 'right' }, 4: { cellWidth: 14, halign: 'center' }, 5: { cellWidth: 24, halign: 'right' }, 6: { cellWidth: 24, halign: 'right' } }
      : { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 14, halign: 'center' }, 3: { cellWidth: 24, halign: 'right' }, 4: { cellWidth: 24, halign: 'right' } };

    autoTable(doc, {
      startY: y,
      head: [cols],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: COR_ESCURA, textColor: 255, fontSize: 6.5, fontStyle: 'bold', halign: 'center', cellPadding: 2 },
      bodyStyles: { fontSize: 6.5, textColor: COR_TEXTO, cellPadding: 2 },
      alternateRowStyles: { fillColor: COR_CINZA_CLARO },
      columnStyles: sty,
      margin: { left: MARGIN, right: MARGIN },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // Totals box
  const boxW = 80;
  const boxX = RMARGIN - boxW;
  const subDesc = subtotal - desconto;
  const lineH = 5.2;
  let totalLines = 2;
  if (desconto > 0) totalLines++;
  if (incluiIVA && totalIVA > 0) totalLines++;
  if (totalRetencao > 0) totalLines++;
  const boxH = 15 + totalLines * lineH;

  doc.setFillColor(COR_CINZA_CLARO[0], COR_CINZA_CLARO[1], COR_CINZA_CLARO[2]);
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, 'F');
  doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, 'S');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
  doc.text('RESUMO', boxX + 3, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
  let ly = 9;
  doc.text('Subtotal:', boxX + 3, y + ly);
  doc.text(formatarMoeda(subtotal), boxX + boxW - 3, y + ly, { align: 'right' });

  if (desconto > 0) {
    ly += lineH;
    doc.setTextColor(220, 38, 38);
    doc.text('Desconto:', boxX + 3, y + ly);
    doc.text(`- ${formatarMoeda(desconto)}`, boxX + boxW - 3, y + ly, { align: 'right' });
    doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
  }

  ly += lineH;
  doc.text('Subtotal c/ Desc.:', boxX + 3, y + ly);
  doc.text(formatarMoeda(subDesc), boxX + boxW - 3, y + ly, { align: 'right' });

  if (incluiIVA && totalIVA > 0) {
    ly += lineH;
    doc.text(`IVA (${taxaIVA}%):`, boxX + 3, y + ly);
    doc.text(formatarMoeda(totalIVA), boxX + boxW - 3, y + ly, { align: 'right' });
  }

  if (totalRetencao > 0) {
    ly += lineH;
    doc.setTextColor(220, 38, 38);
    doc.text('Retenção:', boxX + 3, y + ly);
    doc.text(`- ${formatarMoeda(totalRetencao)}`, boxX + boxW - 3, y + ly, { align: 'right' });
    doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
  }

  ly += lineH + 1;
  doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
  doc.line(boxX + 3, y + ly, boxX + boxW - 3, y + ly);
  ly += 2.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COR_ESCURA[0], COR_ESCURA[1], COR_ESCURA[2]);
  doc.text('TOTAL:', boxX + 3, y + ly);
  doc.text(formatarMoeda(total), boxX + boxW - 3, y + ly, { align: 'right' });
  y += boxH + 4;

  // Total por extenso
  if (y < PAGE_H - 55) {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(COR_CINZA_MEDIO[0], COR_CINZA_MEDIO[1], COR_CINZA_MEDIO[2]);
    doc.text(`Valor por extenso: ${extenso(total)}`, MARGIN, y);
    y += 5;
  }

  // Motivo justificativo da não liquidação do IVA (requisito f)
  if (!incluiIVA) {
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(220, 38, 38);
    doc.text('Motivo de não liquidação do IVA: Operação isenta nos termos da alínea a) do artigo 15.º do Código do IVA.', MARGIN, y);
    y += 4;
  }

  // Pagamento info
  const formaPg = documento.formaPagamento || vendaFormaPagamento;
  const contaPg = documento.contaBancaria || vendaContaBancaria;
  y = dadosPagamento(doc, y, formaPg, contaPg, contasBancarias);

  // Software info
  y = softwareInfo(doc, y);

  // Observations / Legal texts / Conditions
  const textosLegais = documentosTextoLegal(tipo, total, formatarMoeda);
  y = observacoes(doc, y, documento.observacoes, documento.condicoesPagamento, textosLegais);

  // QR Code at bottom-right (opcional)
  try {
    const qrPayload = {
      empresa: empresa.nome || '',
      nif: empresa.nif || '',
      documento: numeroDocumento,
      data: dataEmissao,
      total: `${total.toFixed(2)} Kz`,
      cliente: documento.cliente || '',
      nifCliente: documento.nifCliente || '',
      atcud: atcud || '',
      hash: hash || '',
      software: 'SIREXA v1.0 — AGT Certificado',
    };
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), { width: 30, margin: 1 });
    doc.addImage(qrDataUrl, 'PNG', RMARGIN - 32, PAGE_H - 72, 22, 22);
    doc.setFontSize(4.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(COR_CINZA_MEDIO[0], COR_CINZA_MEDIO[1], COR_CINZA_MEDIO[2]);
    doc.text('QR Code AGT', RMARGIN - 21, PAGE_H - 72, { align: 'center' });
  } catch (err) { console.warn('QR Code nao gerado:', err); }

  // Footer
  rodape(doc, empresa.nome, { numeroDocumento, hash });

  return { doc, fileName: `${tipo.replace(/\s+/g, '_')}_${numeroDocumento.replace(/\//g, '_')}.pdf` };
}

function documentosTextoLegal(tipo, total, formatFn) {
  const m = {
    'Orcamento': [
      'Este orçamento tem validade de 30 dias a partir da data de emissão.',
      'Os preços podem sofrer alterações sem aviso prévio.',
      'Para aceitação, solicitar a emissão da factura proforma.',
    ],
    'Factura Proforma': [
      'Este documento não tem validade fiscal para efeitos de IVA.',
      'Após confirmação do pagamento, será emitida a factura final.',
      'Validade de 15 dias a partir da data de emissão.',
    ],
    'Recibo': [
      'Este recibo confirma o pagamento do valor indicado.',
      'Documento válido como comprovativo de quitação para todos os efeitos legais.',
      'Os bens e/ou serviços encontram-se disponíveis para entrega imediata.',
      'Agradecemos a preferência!',
    ],
    'Nota Credito': [
      'Nota de crédito emitida conforme o artigo 30.º do Código do IVA (Lei 18/14).',
      formatFn ? `Valor a creditar: ${formatFn(total)}` : '',
      'O crédito será efetivado no prazo máximo de 5 dias úteis.',
    ].filter(Boolean),
    'Nota Debito': [
      'Nota de débito emitida conforme os requisitos legais aplicáveis.',
      formatFn ? `Valor a debitar: ${formatFn(total)}` : '',
    ].filter(Boolean),
    'Factura': [
      'Documento válido para todos os efeitos legais e fiscais.',
      'O IVA foi liquidado à taxa legal em vigor.',
      'Os bens e/ou serviços foram colocados à disposição do adquirente nos termos da alínea g) do n.º 1 do artigo 29.º do Código do IVA.',
    ],
    'Factura Recibo': [
      'Documento válido para todos os efeitos legais e fiscais.',
      'Pagamento recebido no ato da emissão.',
      'O IVA foi liquidado à taxa legal em vigor.',
    ],
  };
  return m[tipo] || ['Documento emitido eletronicamente.'];
}
