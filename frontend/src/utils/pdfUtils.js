const API_URL = import.meta.env.VITE_API_URL || 'https://sirexa-api.onrender.com/api';
const BASE_URL = API_URL.replace('/api', '');

export async function carregarLogoBase64(empresa) {
  if (!empresa?.logotipo) return null;
  try {
    const response = await fetch(`${BASE_URL}/uploads/${empresa.logotipo}`);
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
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
  } catch {}
  return { nome: 'Empresa', nif: '---' };
}

export function drawCabecalhoProfissional(doc, empresa, logoBase64, yStart = 15) {
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const rMargin = pageWidth - margin;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 2, 'F');

  if (empresa) {
    const nomeEmpresa = empresa.nome || 'Empresa';
    const nif = empresa.nif || '---';
    const telefone = empresa.telefone || empresa.contactos?.telefone || '';
    const email = empresa.email || empresa.contactos?.email || '';
    const endereco = empresa.endereco?.cidade || empresa.endereco || '';

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, yStart, 16, 16);
    } else {
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, yStart, 16, 16, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SG', margin + 3, yStart + 11);
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(nomeEmpresa.substring(0, 50), margin + 20, yStart + 7);

    const extras = [];
    if (nif) extras.push(`NIF: ${nif}`);
    if (telefone) extras.push(`Tel: ${telefone}`);
    if (email) extras.push(email);
    if (endereco && extras.length < 3) extras.push(endereco);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    if (extras.length > 0) {
      doc.text(extras.join(' | ').substring(0, 120), margin + 20, yStart + 14);
    }

    doc.setDrawColor(200, 200, 210);
    doc.setLineWidth(0.3);
    doc.line(margin, yStart + 22, rMargin, yStart + 22);
  }

  return yStart + 26;
}

export function drawRodape(doc, empresaNome, pageCount) {
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const rMargin = pageWidth - margin;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 200, 210);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 11, rMargin, pageHeight - 11);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 140);
    const nome = (empresaNome || 'Sistema').substring(0, 35);
    doc.text(`${nome} | Pag ${i}/${pageCount}`, margin, pageHeight - 5);
    doc.text(new Date().toLocaleString('pt-PT'), rMargin, pageHeight - 5, { align: 'right' });
  }
}
