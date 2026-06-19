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
  if (!empresaId) return { nome: 'Empresa', nif: '---' };
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

export function drawCabecalhoProfissional(doc, empresa, logoBase64, yStart = 10) {
  const margin = 14;
  let logoHeight = 0;

  if (empresa) {
    const nomeEmpresa = empresa.nome || 'Empresa';
    const nif = empresa.nif || '---';

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, yStart, 35, 35);
      logoHeight = 35;
    } else {
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, yStart, 35, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('S', margin + 12, yStart + 22);
      doc.setFontSize(14);
      doc.text('G', margin + 20, yStart + 22);
      logoHeight = 35;
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(nomeEmpresa.substring(0, 55), margin + 42, yStart + 12);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIF: ${nif}`, margin + 42, yStart + 19);

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, yStart + logoHeight + 5, 196, yStart + logoHeight + 5);
  }

  return yStart + logoHeight + 10;
}

export function drawRodape(doc, empresaNome, pageCount) {
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 200, 210);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, 196, pageHeight - 12);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 140);
    doc.text(`${empresaNome || 'Empresa'} | Pagina ${i} de ${pageCount}`, margin, pageHeight - 5);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-PT')}`, 196, pageHeight - 5, { align: 'right' });
  }
}
