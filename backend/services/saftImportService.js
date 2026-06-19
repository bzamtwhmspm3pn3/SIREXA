const xml2js = require('xml2js');
const Factura = require('../models/Factura');
const crypto = require('crypto');

class SAFTImportService {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true,
    });
  }

  async importFromSAFTXML(xmlBuffer, empresaNif, empresaId) {
    const xmlContent = xmlBuffer.toString('utf8');
    const result = await this.parser.parseStringPromise(xmlContent);
    const auditFile = result.AuditFile || result['audit:AuditFile'] || result['saft:AuditFile'];

    if (!auditFile) {
      throw new Error('Ficheiro SAFT inválido: estrutura AuditFile não encontrada');
    }

    const header = auditFile.Header || {};
    const sourceDocs = auditFile.SourceDocuments || {};

    const resultados = {
      sucessos: [],
      erros: [],
      totais: { processados: 0, importados: 0, ignorados: 0 },
    };

    if (sourceDocs.SalesInvoices) {
      const invoices = sourceDocs.SalesInvoices.Invoice;
      const invoiceList = Array.isArray(invoices) ? invoices : [invoices];

      for (const inv of invoiceList) {
        try {
          const existente = await Factura.findOne({
            empresaNif,
            serie: this._getSerie(inv.InvoiceNo || ''),
            numeroFactura: this._getNumero(inv.InvoiceNo || ''),
          });

          if (existente) {
            resultados.totais.ignorados++;
            resultados.erros.push({ ref: inv.InvoiceNo, erro: 'Já existe' });
            continue;
          }

          const dataEmissao = new Date(inv.InvoiceDate || inv.SystemEntryDate || new Date());
          const invoiceType = inv.InvoiceType || 'FT';
          const tipoMapping = {
            FT: 'Factura', FS: 'Factura Simplificada', FR: 'Factura Recibo',
            NC: 'Nota Credito', ND: 'Nota Debito', FP: 'Factura Proforma',
            RC: 'Recibo', OR: 'Orcamento',
          };

          const lines = Array.isArray(inv.Line) ? inv.Line : (inv.Line ? [inv.Line] : []);
          const itens = lines.map((line, idx) => {
            const qtd = parseFloat(line.Quantity) || 1;
            const preco = parseFloat(line.UnitPrice) || 0;
            const taxPct = line.Tax ? (parseFloat(line.Tax.TaxPercentage) || 14) : 14;
            const subtotal = qtd * preco;
            const iva = subtotal * (taxPct / 100);
            return {
              linha: idx + 1,
              produtoOuServico: line.ProductDescription || line.Description || `Item ${idx + 1}`,
              codigoProduto: line.ProductCode || '',
              quantidade: qtd,
              precoUnitario: preco,
              desconto: 0,
              total: subtotal,
              taxaIVA: taxPct,
              iva,
              tipo: 'produto',
            };
          });

          const docTotals = inv.DocumentTotals || {};
          const subtotal = itens.reduce((s, i) => s + i.total, 0);
          const totalIva = parseFloat(docTotals.TaxPayable) || itens.reduce((s, i) => s + i.iva, 0);
          const total = parseFloat(docTotals.GrossTotal) || (subtotal + totalIva);

          const serie = this._getSerie(inv.InvoiceNo || '') || this._getTipoSerie(invoiceType);
          const numeroFactura = this._getNumero(inv.InvoiceNo || '');

          const factura = new Factura({
            numeroFactura,
            serie,
            tipo: tipoMapping[invoiceType] || 'Factura',
            empresaNif,
            empresaId,
            cliente: inv.Customer?.CompanyName || 'Cliente SAFT',
            nifCliente: inv.Customer?.CustomerTaxID || '---',
            enderecoCliente: inv.Customer?.Address?.AddressDetail || '',
            itens,
            subtotal,
            totalIva,
            desconto: 0,
            total,
            formaPagamento: 'A definir',
            status: 'emitido',
            usuario: 'Importado SAFT-X',
            dataEmissao,
            impressoes: 0,
          });

          const hashStr = `${empresaNif}|${numeroFactura}|${dataEmissao.toISOString()}|${total}`;
          factura.hashDocumento = crypto.createHash('sha256').update(hashStr).digest('hex');

          await factura.save();
          resultados.sucessos.push({ ref: inv.InvoiceNo, id: factura._id });
          resultados.totais.importados++;
        } catch (err) {
          resultados.erros.push({ ref: inv.InvoiceNo, erro: err.message });
        }
        resultados.totais.processados++;
      }
    }

    return resultados;
  }

  _getSerie(invoiceNo) {
    const parts = String(invoiceNo || '').split(' ');
    return parts.length > 0 && parts[0].length <= 4 ? parts[0] : 'FT';
  }

  _getNumero(invoiceNo) {
    const parts = String(invoiceNo || '').split(' ');
    if (parts.length > 1) {
      return parseInt(parts[parts.length - 1], 10) || Math.floor(Math.random() * 9999);
    }
    return parseInt(invoiceNo.replace(/\D/g, ''), 10) || Math.floor(Math.random() * 9999);
  }

  _getTipoSerie(tipo) {
    const map = {
      FT: 'FT', FS: 'FT', FR: 'FR', NC: 'NC', ND: 'ND',
      FP: 'FP', RC: 'RC', OR: 'OR',
    };
    return map[tipo] || 'FT';
  }
}

module.exports = new SAFTImportService();
