// backend/services/exportacaoBancoService.js
const XLSX = require('xlsx');
const ConfiguracaoBanco = require('../models/ConfiguracaoBanco');

// Array de meses para uso na exportação
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

class ExportacaoBancoService {
  
  // Mapeamento de campos padrão
  static mapeamentoCampos = {
    'numero': (folha, func, idx) => (idx + 1).toString(),
    'beneficiary': (folha, func) => func.nome,
    'nome': (folha, func) => func.nome,
    'nomeBeneficiario': (folha, func) => func.nome,
    'iban': (folha, func) => func.iban || '',
    'accountNumber': (folha, func) => func.iban || '',
    'bankName': (folha, func) => '', // Personalizável
    'bicCode': (folha, func) => '', // Personalizável
    'city': (folha, func) => '', // Personalizável
    'country': (folha, func) => 'AO',
    'amount': (folha, func) => func.salarioLiquido,
    'valor': (folha, func) => func.salarioLiquido,
    'valorPagamento': (folha, func) => func.salarioLiquido,
    'montante': (folha, func) => func.salarioLiquido,
    'nif': (folha, func) => func.nif || '',
    'documento': (folha, func) => func.nif || '',
    'identificacao': (folha, func) => func.nif || '',
    'referencia': (folha, func) => `SAL-${folha.anoReferencia}${String(folha.mesReferencia).padStart(2, '0')}-${func.id?.toString().slice(-4) || '0001'}`,
    'descricao': (folha, func) => `Salário ${meses[folha.mesReferencia - 1]}/${folha.anoReferencia}`,
    'observacao': (folha, func) => '',
    'dataPagamento': (folha, func) => new Date().toLocaleDateString('pt-AO'),
    'mesReferencia': (folha, func) => `${meses[folha.mesReferencia - 1]}/${folha.anoReferencia}`
  };
  
  /**
   * Obter configuração do banco
   */
  static async obterConfiguracao(empresaId, codigoBanco) {
    let config = await ConfiguracaoBanco.findOne({ empresaId, codigoBanco });
    
    if (!config) {
      config = await ConfiguracaoBanco.findOne({ codigoBanco, empresaId: null });
    }
    
    return config;
  }
  
  /**
   * Exportar folha conforme configuração do banco
   */
  static async exportar(empresaId, codigoBanco, folha, empresa) {
    try {
      // Obter configuração do banco
      let config = await this.obterConfiguracao(empresaId, codigoBanco);
      
      // Se não tem configuração personalizada, usar padrão
      if (!config) {
        config = this.getConfiguracaoPadrao(codigoBanco);
      }
      
      // Gerar dados conforme configuração
      const dados = [];
      
      for (let idx = 0; idx < folha.funcionarios.length; idx++) {
        const func = folha.funcionarios[idx];
        const linha = {};
        
        for (const coluna of config.colunas) {
          const campoOrigem = coluna.campoOrigem;
          const valor = this.mapeamentoCampos[campoOrigem] 
            ? this.mapeamentoCampos[campoOrigem](folha, func, idx)
            : this.obterValorCampo(func, campoOrigem);
          
          linha[coluna.nome] = valor;
        }
        
        dados.push(linha);
      }
      
      // Adicionar campos fixos
      if (config.camposFixos && config.camposFixos.length > 0) {
        for (const fixo of config.camposFixos) {
          for (const linha of dados) {
            linha[fixo.nome] = fixo.valor;
          }
        }
      }
      
      // Ordenar campos se especificado
      if (config.ordemCampos && config.ordemCampos.length > 0) {
        const dadosOrdenados = dados.map(linha => {
          const novaLinha = {};
          for (const campo of config.ordemCampos) {
            if (linha[campo] !== undefined) {
              novaLinha[campo] = linha[campo];
            }
          }
          return novaLinha;
        });
        dados.length = 0;
        dados.push(...dadosOrdenados);
      }
      
      // Criar worksheet
      let ws;
      if (config.extensao === 'csv') {
        ws = XLSX.utils.json_to_sheet(dados);
      } else {
        ws = XLSX.utils.json_to_sheet(dados);
      }
      
      // Ajustar largura das colunas
      const colunas = Object.keys(dados[0] || {});
      ws['!cols'] = colunas.map(() => ({ wch: 25 }));
      
      // Criar workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pagamento');
      
      // Adicionar sheet de resumo
      const wsResumo = XLSX.utils.aoa_to_sheet([
        ['RESUMO DA FOLHA SALARIAL'],
        [''],
        ['Banco', config.nomeBanco],
        ['Código', config.codigoBanco],
        ['Empresa', empresa?.nome || ''],
        ['NIF', empresa?.nif || ''],
        ['Período', `${meses[folha.mesReferencia - 1]}/${folha.anoReferencia}`],
        [''],
        ['Indicadores'],
        ['Total Funcionários', folha.funcionarios?.length || 0],
        ['Total Líquido a Pagar', (folha.totais?.totalLiquido || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })],
        [''],
        ['Data de Geração', new Date().toLocaleString('pt-AO')]
      ]);
      
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
      
      const nomeArquivo = `Pagamento_${config.codigoBanco}_${empresa?.nome?.replace(/\s/g, '_') || 'empresa'}_${meses[folha.mesReferencia - 1]}_${folha.anoReferencia}.${config.extensao}`;
      
      return { wb, nomeArquivo };
      
    } catch (error) {
      console.error('Erro ao exportar:', error);
      throw error;
    }
  }
  
  /**
   * Obter valor de campo do funcionário
   */
  static obterValorCampo(func, campo) {
    const campos = campo.split('.');
    let valor = func;
    for (const c of campos) {
      valor = valor?.[c];
    }
    return valor !== undefined && valor !== null ? valor : '';
  }
  
  /**
   * Configurações padrão para bancos
   */
  static getConfiguracaoPadrao(codigoBanco) {
    const configuracoes = {
      'BAI': {
        nomeBanco: 'Banco Angolano de Investimentos',
        codigoBanco: 'BAI',
        colunas: [
          { nome: 'Nº', campoOrigem: 'numero', posicao: 1, obrigatorio: true },
          { nome: 'Beneficiary', campoOrigem: 'nome', posicao: 2, obrigatorio: true },
          { nome: 'Account Number', campoOrigem: 'iban', posicao: 3, obrigatorio: true },
          { nome: 'Bank Name', campoOrigem: 'bankName', posicao: 4, obrigatorio: false },
          { nome: 'BIC Code', campoOrigem: 'bicCode', posicao: 5, obrigatorio: false },
          { nome: 'City', campoOrigem: 'city', posicao: 6, obrigatorio: false },
          { nome: 'Country', campoOrigem: 'country', posicao: 7, obrigatorio: false },
          { nome: 'Amount', campoOrigem: 'amount', posicao: 8, obrigatorio: true },
          { nome: 'IBAN', campoOrigem: 'iban', posicao: 9, obrigatorio: true }
        ],
        ordemCampos: ['Nº', 'Beneficiary', 'Account Number', 'Bank Name', 'BIC Code', 'City', 'Country', 'Amount', 'IBAN'],
        extensao: 'xlsx'
      },
      'BFA': {
        nomeBanco: 'Banco de Fomento Angola',
        codigoBanco: 'BFA',
        colunas: [
          { nome: 'Number', campoOrigem: 'numero', posicao: 1, obrigatorio: true },
          { nome: 'Beneficiary', campoOrigem: 'nome', posicao: 2, obrigatorio: true },
          { nome: 'IBAN', campoOrigem: 'iban', posicao: 3, obrigatorio: true },
          { nome: 'Valor', campoOrigem: 'valor', posicao: 4, obrigatorio: true },
          { nome: 'Descrição', campoOrigem: 'descricao', posicao: 5, obrigatorio: false }
        ],
        ordemCampos: ['Number', 'Beneficiary', 'IBAN', 'Valor', 'Descrição'],
        extensao: 'xlsx'
      },
      'BIC': {
        nomeBanco: 'Banco BIC',
        codigoBanco: 'BIC',
        colunas: [
          { nome: 'Nº', campoOrigem: 'numero', posicao: 1, obrigatorio: true },
          { nome: 'Beneficiário', campoOrigem: 'nome', posicao: 2, obrigatorio: true },
          { nome: 'IBAN', campoOrigem: 'iban', posicao: 3, obrigatorio: true },
          { nome: 'Valor (Kz)', campoOrigem: 'valor', posicao: 4, obrigatorio: true },
          { nome: 'NIF', campoOrigem: 'nif', posicao: 5, obrigatorio: false },
          { nome: 'Referência', campoOrigem: 'referencia', posicao: 6, obrigatorio: false }
        ],
        ordemCampos: ['Nº', 'Beneficiário', 'IBAN', 'Valor (Kz)', 'NIF', 'Referência'],
        extensao: 'xlsx'
      },
      // Adicionar mais bancos conforme necessário
      'KEVE': {
        nomeBanco: 'Banco Keve',
        codigoBanco: 'KEVE',
        colunas: [
          { nome: 'Nº', campoOrigem: 'numero', posicao: 1, obrigatorio: true },
          { nome: 'Beneficiário', campoOrigem: 'nome', posicao: 2, obrigatorio: true },
          { nome: 'IBAN', campoOrigem: 'iban', posicao: 3, obrigatorio: true },
          { nome: 'Montante', campoOrigem: 'montante', posicao: 4, obrigatorio: true },
          { nome: 'Descrição', campoOrigem: 'descricao', posicao: 5, obrigatorio: false }
        ],
        ordemCampos: ['Nº', 'Beneficiário', 'IBAN', 'Montante', 'Descrição'],
        extensao: 'xlsx'
      },
      'SOL': {
        nomeBanco: 'Banco Sol',
        codigoBanco: 'SOL',
        colunas: [
          { nome: 'Número', campoOrigem: 'numero', posicao: 1, obrigatorio: true },
          { nome: 'Beneficiário', campoOrigem: 'nome', posicao: 2, obrigatorio: true },
          { nome: 'Conta', campoOrigem: 'iban', posicao: 3, obrigatorio: true },
          { nome: 'Valor', campoOrigem: 'valor', posicao: 4, obrigatorio: true }
        ],
        ordemCampos: ['Número', 'Beneficiário', 'Conta', 'Valor'],
        extensao: 'xlsx'
      },
      'ECONOMICO': {
        nomeBanco: 'Banco Económico',
        codigoBanco: 'ECONOMICO',
        colunas: [
          { nome: 'Seq', campoOrigem: 'numero', posicao: 1, obrigatorio: true },
          { nome: 'Nome', campoOrigem: 'nome', posicao: 2, obrigatorio: true },
          { nome: 'IBAN', campoOrigem: 'iban', posicao: 3, obrigatorio: true },
          { nome: 'Valor', campoOrigem: 'valor', posicao: 4, obrigatorio: true },
          { nome: 'NIF', campoOrigem: 'nif', posicao: 5, obrigatorio: false }
        ],
        ordemCampos: ['Seq', 'Nome', 'IBAN', 'Valor', 'NIF'],
        extensao: 'xlsx'
      },
      'YETU': {
        nomeBanco: 'Banco Yetu',
        codigoBanco: 'YETU',
        colunas: [
          { nome: '#', campoOrigem: 'numero', posicao: 1, obrigatorio: true },
          { nome: 'Beneficiário', campoOrigem: 'nome', posicao: 2, obrigatorio: true },
          { nome: 'IBAN', campoOrigem: 'iban', posicao: 3, obrigatorio: true },
          { nome: 'Valor', campoOrigem: 'valor', posicao: 4, obrigatorio: true },
          { nome: 'Referência', campoOrigem: 'referencia', posicao: 5, obrigatorio: false }
        ],
        ordemCampos: ['#', 'Beneficiário', 'IBAN', 'Valor', 'Referência'],
        extensao: 'xlsx'
      }
    };
    
    return configuracoes[codigoBanco] || configuracoes['BAI'];
  }
}

module.exports = ExportacaoBancoService;