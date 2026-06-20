import { gerarPDFProfissional } from './sirexaPdfService';
import { carregarDadosEmpresa } from '../utils/pdfUtils';

export async function gerarDocumentoPDF(documento, items, config = {}) {
  const empresa = await carregarDadosEmpresa(documento.empresaId);
  const pdf = await gerarPDFProfissional(documento, items, {
    tipo: documento.tipo || 'Factura',
    empresa: { ...empresa, ...(config.empresa || {}) },
    contasBancarias: config.contasBancarias || [],
    vendaFormaPagamento: documento.formaPagamento,
    vendaContaBancaria: documento.contaBancaria,
    vendaAtcud: documento.atcud,
    vendaHash: documento.hash,
    incluiIVA: documento.incluiIVA,
  });
  return pdf;
}

export const gerarDocumentoProfissional = gerarDocumentoPDF;
