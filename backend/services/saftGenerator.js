const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');

class SAFTGenerator {
  constructor() {
    this.builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ' }
    });
  }

  gerarSAFT(empresa, vendas, periodoInicio, periodoFim) {
    const saft = {
      'AuditFile': {
        $: { xmlns: "urn:OECD:StandardAuditFile-Tax:PT_1.04_01" },
        'Header': this.gerarHeader(empresa, periodoInicio, periodoFim),
        'MasterFiles': this.gerarMasterFiles(empresa, vendas),
        'SourceDocuments': this.gerarSourceDocuments(vendas)
      }
    };

    return this.builder.buildObject(saft);
  }

  gerarHeader(empresa, periodoInicio, periodoFim) {
    return {
      'AuditFileVersion': '1.04_01',
      'Company': {
        'Name': empresa.nome,
        'TaxRegistrationNumber': empresa.nif,
        'Address': {
          'AddressDetail': empresa.endereco || '',
          'City': empresa.cidade || 'Luanda',
          'Country': 'AO'
        }
      },
      'Period': {
        'StartDate': periodoInicio,
        'EndDate': periodoFim
      },
      'FileGenerated': new Date().toISOString(),
      'GenerationDate': new Date().toISOString(),
      'GenerationTime': new Date().toTimeString().split(' ')[0],
      'PrimaryUser': empresa.contacto || 'Sistema'
    };
  }

  gerarMasterFiles(empresa, vendas) {
    const clientesMap = new Map();
    vendas.forEach(venda => {
      if (!clientesMap.has(venda.nifCliente)) {
        clientesMap.set(venda.nifCliente, {
          CustomerID: venda.nifCliente,
          AccountID: venda.nifCliente,
          CustomerTaxID: venda.nifCliente,
          CompanyName: venda.cliente,
          Address: venda.enderecoCliente || '',
          Country: venda.paisCliente || 'AO'
        });
      }
    });

    const clientes = Array.from(clientesMap.values());

    return {
      'Customer': clientes.map(cliente => ({ 'Customer': cliente }))
    };
  }

  gerarSourceDocuments(vendas) {
    const salesInvoices = vendas.map(venda => ({
      'Invoice': {
        'InvoiceNo': `${venda.serie || 'FT'} ${venda.numeroFactura}`,
        'InvoiceDate': new Date(venda.dataEmissao || venda.data).toISOString().split('T')[0],
        'InvoiceType': this._mapTipoAGT(venda.tipo),
        'SystemEntryDate': venda.updatedAt || venda.createdAt || venda.data || new Date().toISOString(),
        'Customer': {
          'CustomerTaxID': venda.nifCliente,
          'CompanyName': venda.cliente
        },
        'Line': (venda.itens || []).map((item, idx) => ({
          'LineNumber': idx + 1,
          'ProductCode': item.codigoProduto || item.produtoOuServico,
          'ProductDescription': item.produtoOuServico,
          'Quantity': item.quantidade,
          'UnitPrice': item.precoUnitario,
          'TaxPointDate': new Date(venda.dataEmissao || venda.data).toISOString().split('T')[0],
          'Description': item.produtoOuServico,
          'Amount': item.total,
          'Tax': {
            'TaxType': 'IVA',
            'TaxCountryRegion': 'AO',
            'TaxCode': 'NOR',
            'TaxPercentage': item.taxaIVA != null ? item.taxaIVA : 14,
            'TaxAmount': item.iva != null ? item.iva : (item.total * ((item.taxaIVA != null ? item.taxaIVA : 14) / 100))
          }
        })),
        'DocumentTotals': {
          'TaxPayable': venda.totalIva || 0,
          'NetTotal': (venda.subtotal || 0) - (venda.desconto || 0),
          'GrossTotal': venda.total || 0
        },
        ...(venda.atcud ? { 'ATCUD': venda.atcud } : {}),
        ...(venda.hash ? { 'Hash': venda.hash } : {}),
        ...(venda.hashAnterior ? { 'HashPrevious': venda.hashAnterior } : {}),
      }
    }));

    return {
      'SalesInvoices': salesInvoices
    };
  }

  _mapTipoAGT(tipo) {
    const map = {
      'Factura': 'FT',
      'Factura Simplificada': 'FS',
      'Factura Recibo': 'FR',
      'Nota Credito': 'NC',
      'Nota Debito': 'ND',
      'Factura Proforma': 'FP',
      'Recibo': 'RC',
      'Orcamento': 'OR',
    };
    return map[tipo] || 'FT';
  }
}

module.exports = new SAFTGenerator();
