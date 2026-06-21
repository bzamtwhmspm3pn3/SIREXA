const API_URL = import.meta.env.VITE_API_URL || 'https://sirexa-api.onrender.com/api';
const BASE_URL = API_URL.replace('/api', '');

export function getImageUrl(logotipo) {
  if (!logotipo) return null;
  if (logotipo.startsWith('http')) return logotipo;
  return `${BASE_URL}/uploads/${logotipo}`;
}

export async function carregarLogoBase64(empresa) {
  if (!empresa?.logotipo) return null;
  try {
    const url = empresa.logotipo.startsWith('http') ? empresa.logotipo : `${BASE_URL}/uploads/${empresa.logotipo}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { console.warn('Erro ao carregar logo base64'); return null; }
}

function detectarFormatoImagem(logotipo, base64) {
  if (/\.jpe?g$/i.test(logotipo)) return 'JPEG';
  if (base64?.startsWith('data:image/jpeg')) return 'JPEG';
  return 'PNG';
}

export async function carregarDadosEmpresa(empresaId) {
  if (!empresaId) return { nome: 'Empresa', nif: '---', telefone: '', email: '', endereco: '' };
  try {
    const response = await fetch(`${API_URL}/empresa/${empresaId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (response.ok) {
      const data = await response.json();
      return data.dados || data;
    }
  } catch { console.warn('Erro ao carregar dados empresa'); }
  return { nome: 'Empresa', nif: '---' };
}

export const COR_PRIMARIA = [37, 99, 235];
export const COR_SECUNDARIA = [59, 130, 246];
export const COR_ESCURA = [30, 58, 138];
export const COR_CINZA_CLARO = [245, 247, 250];
export const COR_CINZA_MEDIO = [156, 163, 175];
export const COR_TEXTO = [55, 65, 81];
export const COR_BORDA = [209, 213, 219];

export function drawCabecalhoProfissional(doc, empresa, logoBase64, yStart = 15) {
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const rMargin = pageWidth - margin;

  doc.setFillColor(COR_ESCURA[0], COR_ESCURA[1], COR_ESCURA[2]);
  doc.rect(0, 0, pageWidth, 3, 'F');

  doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
  doc.rect(0, 3, pageWidth, 1.5, 'F');

  if (empresa) {
    const nomeEmpresa = empresa.nome || 'Empresa';
    const nif = empresa.nif || '---';
    const telefone = empresa.telefone || empresa.contactos?.telefone || '';
    const email = empresa.email || empresa.contactos?.email || '';
    let endereco = '';
    if (typeof empresa.endereco === 'string') {
      endereco = empresa.endereco;
    } else if (empresa.endereco?.cidade) {
      endereco = empresa.endereco.cidade;
      if (empresa.endereco.provincia) endereco += `, ${empresa.endereco.provincia}`;
    }

    if (logoBase64) {
      const formato = detectarFormatoImagem(empresa.logotipo, logoBase64);
      doc.addImage(logoBase64, formato, margin, yStart + 2, 20, 20);
    } else {
      doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
      doc.roundedRect(margin, yStart + 2, 20, 20, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('S', margin + 8, yStart + 14);
    }

    doc.setTextColor(COR_ESCURA[0], COR_ESCURA[1], COR_ESCURA[2]);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(nomeEmpresa.substring(0, 50), margin + 25, yStart + 10);

    const extras = [];
    if (nif) extras.push(`NIF: ${nif}`);
    if (telefone) extras.push(`Tel: ${telefone}`);
    if (email) extras.push(email);
    if (endereco) extras.push(endereco);

    doc.setTextColor(COR_CINZA_MEDIO[0], COR_CINZA_MEDIO[1], COR_CINZA_MEDIO[2]);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    if (extras.length > 0) {
      const linha1 = extras.slice(0, 2).join(' | ');
      doc.text(linha1.substring(0, 120), margin + 25, yStart + 18);
      if (extras.length > 2) {
        const linha2 = extras.slice(2, 4).join(' | ');
        doc.text(linha2.substring(0, 120), margin + 25, yStart + 24);
      }
    }
  }

  doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, yStart + 28, rMargin, yStart + 28);

  return yStart + 32;
}

export function drawRodape(doc, empresaNome, documentoInfo = {}) {
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const rMargin = pageWidth - margin;

  for (let i = 1; i <= doc.internal.getNumberOfPages(); i++) {
    doc.setPage(i);

    doc.setFillColor(COR_CINZA_CLARO[0], COR_CINZA_CLARO[1], COR_CINZA_CLARO[2]);
    doc.rect(margin, pageHeight - 15, rMargin - margin, 13, 'F');

    doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, rMargin, pageHeight - 15);

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COR_CINZA_MEDIO[0], COR_CINZA_MEDIO[1], COR_CINZA_MEDIO[2]);
    const nome = (empresaNome || 'Sistema').substring(0, 35);
    doc.text(`${nome} | Pag ${i}/${doc.internal.getNumberOfPages()}`, margin + 1, pageHeight - 9);

    if (documentoInfo.numeroDocumento) {
      doc.text(`Doc: ${documentoInfo.numeroDocumento}`, margin + 1, pageHeight - 4);
    }
    if (documentoInfo.hash) {
      doc.text(`Hash: ${documentoInfo.hash.substring(0, 20)}...`, rMargin - 1, pageHeight - 9, { align: 'right' });
    }
    doc.text(new Date().toLocaleString('pt-PT'), rMargin - 1, pageHeight - 4, { align: 'right' });
  }
}

export function drawClientSection(doc, documento, yPos) {
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const rMargin = pageWidth - margin;

  doc.setFillColor(COR_CINZA_CLARO[0], COR_CINZA_CLARO[1], COR_CINZA_CLARO[2]);
  doc.roundedRect(margin, yPos, rMargin - margin, 28, 3, 3, 'F');
  doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
  doc.roundedRect(margin, yPos, rMargin - margin, 28, 3, 3, 'S');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
  doc.text('CLIENTE', margin + 4, yPos + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
  const nomeCliente = documento.cliente || '---';
  doc.text(`Nome: ${nomeCliente}`, margin + 4, yPos + 12);
  doc.text(`NIF: ${documento.nifCliente || '---'}`, margin + 4, yPos + 18);
  if (documento.enderecoCliente) {
    doc.text(`Endereço: ${documento.enderecoCliente}`, margin + 4, yPos + 24);
  }

  let infoColX = 115;
  if (documento.telefoneCliente) {
    doc.text(`Telefone: ${documento.telefoneCliente}`, infoColX, yPos + 12);
  }
  if (documento.emailCliente) {
    const email = documento.emailCliente.length > 35
      ? documento.emailCliente.substring(0, 32) + '...'
      : documento.emailCliente;
    doc.text(`Email: ${email}`, infoColX, yPos + 18);
  }
  if (documento.cidadeCliente) {
    doc.text(`Cidade: ${documento.cidadeCliente}`, infoColX, yPos + 24);
  }

  return yPos + 32;
}

export function drawTotalsBox(doc, documento, startY, tipo) {
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const rMargin = pageWidth - margin;
  const boxWidth = 78;
  const boxX = rMargin - boxWidth;

  const subtotal = Math.abs(documento.subtotal || 0);
  const totalIVA = Math.abs(documento.totalIva || 0);
  const desconto = Math.abs(documento.desconto || 0);
  const totalRetencao = Math.abs(documento.totalRetencao || 0);
  const total = Math.abs(documento.total || 0);
  const taxaIVA = documento.taxaIVA || 14;

  let taxaRetencao = documento.taxaRetencao || 0;
  const subtotalComDesconto = subtotal - desconto;
  if (taxaRetencao === 0 && totalRetencao > 0 && subtotalComDesconto > 0) {
    taxaRetencao = Math.round((totalRetencao / subtotalComDesconto) * 100 * 10) / 10;
  }

  let linhas = 3;
  if (desconto > 0) linhas++;
  if (documento.incluiIVA !== false && totalIVA > 0) linhas++;
  if (totalRetencao > 0) linhas++;
  if (tipo === 'Recibo') linhas += 2;

  const lineH = 5.2;
  const boxAltura = 17 + (linhas * lineH);

  doc.setFillColor(COR_CINZA_CLARO[0], COR_CINZA_CLARO[1], COR_CINZA_CLARO[2]);
  doc.roundedRect(boxX, startY, boxWidth, boxAltura, 3, 3, 'F');
  doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
  doc.roundedRect(boxX, startY, boxWidth, boxAltura, 3, 3, 'S');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
  doc.text('RESUMO FINANCEIRO', boxX + 3, startY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
  let ly = 9.5;

  doc.text('Mercadoria/Serviços:', boxX + 3, startY + ly);
  doc.text(formatarMoeda(subtotal), boxX + boxWidth - 3, startY + ly, { align: 'right' });

  if (desconto > 0) {
    ly += lineH;
    doc.setTextColor(220, 38, 38);
    doc.text('Desconto:', boxX + 3, startY + ly);
    doc.text(`- ${formatarMoeda(desconto)}`, boxX + boxWidth - 3, startY + ly, { align: 'right' });
    doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
  }

  ly += lineH;
  doc.text('Subtotal c/ Desc.:', boxX + 3, startY + ly);
  doc.text(formatarMoeda(subtotalComDesconto), boxX + boxWidth - 3, startY + ly, { align: 'right' });

  if (documento.incluiIVA !== false && totalIVA > 0) {
    ly += lineH;
    doc.text(`IVA (${taxaIVA}%):`, boxX + 3, startY + ly);
    doc.text(formatarMoeda(totalIVA), boxX + boxWidth - 3, startY + ly, { align: 'right' });
  }

  if (totalRetencao > 0) {
    ly += lineH;
    doc.setTextColor(220, 38, 38);
    const tx = Number.isInteger(taxaRetencao) ? taxaRetencao.toFixed(0) : taxaRetencao.toFixed(1);
    doc.text(`Retenção (${tx}%):`, boxX + 3, startY + ly);
    doc.text(`- ${formatarMoeda(totalRetencao)}`, boxX + boxWidth - 3, startY + ly, { align: 'right' });
    doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
  }

  ly += lineH + 1.5;
  doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2]);
  doc.line(boxX + 3, startY + ly, boxX + boxWidth - 3, startY + ly);

  ly += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COR_ESCURA[0], COR_ESCURA[1], COR_ESCURA[2]);

  if (tipo === 'Recibo') {
    const valorPago = documento.valorPago || total;
    const troco = valorPago > total ? valorPago - total : 0;
    ly += 1;
    doc.text('VALOR DA FACTURA:', boxX + 3, startY + ly);
    doc.text(formatarMoeda(total), boxX + boxWidth - 3, startY + ly, { align: 'right' });
    ly += lineH;
    doc.setTextColor(16, 185, 129);
    doc.text(`Valor Pago:`, boxX + 3, startY + ly);
    doc.text(formatarMoeda(valorPago), boxX + boxWidth - 3, startY + ly, { align: 'right' });
    if (troco > 0) {
      ly += lineH;
      doc.text('Troco:', boxX + 3, startY + ly);
      doc.text(formatarMoeda(troco), boxX + boxWidth - 3, startY + ly, { align: 'right' });
    }
  } else {
    ly += 1;
    const textoTotal = total < 0 ? 'VALOR A CREDITAR:' : 'TOTAL A PAGAR:';
    doc.text(textoTotal, boxX + 3, startY + ly);
    doc.text(formatarMoeda(total), boxX + boxWidth - 3, startY + ly, { align: 'right' });
  }

  return startY + boxAltura;
}

export function formatarMoeda(valor) {
  if (!valor && valor !== 0) return '0,00 Kz';
  return valor.toLocaleString('pt-AO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' Kz';
}

export const CORES = {
  primaria: COR_PRIMARIA,
  secundaria: COR_SECUNDARIA,
  escura: COR_ESCURA,
  cinzaClaro: COR_CINZA_CLARO,
  cinzaMedio: COR_CINZA_MEDIO,
  texto: COR_TEXTO,
  borda: COR_BORDA,
};

export function getCorTitulo(tipo) {
  const cores = {
    'Orcamento': [139, 92, 246],
    'Factura Proforma': [147, 51, 234],
    'Factura': [37, 99, 235],
    'Factura Recibo': [37, 99, 235],
    'Recibo': [245, 158, 11],
    'Nota Credito': [220, 38, 38],
    'Nota Debito': [220, 38, 38],
  };
  return cores[tipo] || COR_ESCURA;
}

export function getTextoObservacoes(tipo, total, formatarMoedaFn) {
  const textos = {
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
      `O valor de ${formatarMoedaFn ? formatarMoedaFn(total) : total} Kz será creditado na conta do cliente.`,
      'O crédito será efetivado no prazo máximo de 5 dias úteis.',
      'Esta operação não implica qualquer encargo adicional para o cliente.',
    ],
    'Factura': [
      'Documento válido para todos os efeitos legais.',
      'O IVA foi liquidado à taxa legal em vigor.',
      'Os bens e/ou serviços foram colocados à disposição do cliente.',
    ],
    'Factura Recibo': [
      'Documento válido para todos os efeitos legais e fiscais.',
      'Pagamento recebido no ato da emissão.',
      'O IVA foi liquidado à taxa legal em vigor.',
    ],
  };
  return textos[tipo] || ['Documento emitido eletronicamente.'];
}
