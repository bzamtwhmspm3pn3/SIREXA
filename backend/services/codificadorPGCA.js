// services/codificadorPGCA.js - CORRIGIDO CONFORME DOCUMENTO OFICIAL
const mongoose = require('mongoose');

class CodificadorPGCA {
  
  constructor() {
    // Controle de sequências por prefixo
    this.sequencias = new Map();
  }
  
  // Mapeamento completo baseado no documento PGCA oficial
  getCodigoBase(categoria, tipoAtivo) {
    const mapa = {
      // ==========================================
      // CLASSE 1 - MEIOS FIXOS E INVESTIMENTOS
      // ==========================================
      
      // 11.1 Terrenos e recursos naturais
      'Terrenos em bruto': { classe: '1', prefixo: '11.1.1', descricao: 'Terrenos em bruto' },
      'Terrenos com arranjos': { classe: '1', prefixo: '11.1.2', descricao: 'Terrenos com arranjos' },
      'Subsolos': { classe: '1', prefixo: '11.1.3', descricao: 'Subsolos' },
      'Terrenos com edifícios industriais': { classe: '1', prefixo: '11.1.4.1', descricao: 'Terrenos com edifícios industriais' },
      'Terrenos com edifícios administrativos': { classe: '1', prefixo: '11.1.4.2', descricao: 'Terrenos com edifícios administrativos' },
      'Terrenos': { classe: '1', prefixo: '11.1.1', descricao: 'Terrenos' },
      
      // 11.2 Edifícios e outras construções
      'Edifícios industriais': { classe: '1', prefixo: '11.2.1.1', descricao: 'Edifícios integrados em conjuntos industriais' },
      'Edifícios administrativos': { classe: '1', prefixo: '11.2.1.2', descricao: 'Edifícios integrados em conjuntos administrativos' },
      'Edifícios comerciais': { classe: '1', prefixo: '11.2.1.3', descricao: 'Outros conjuntos industriais' },
      'Edifícios em propriedade alheia': { classe: '1', prefixo: '11.2.1.4', descricao: 'Implantados em propriedade alheia' },
      'Outras construções': { classe: '1', prefixo: '11.2.2', descricao: 'Outras construções' },
      'Instalações': { classe: '1', prefixo: '11.2.3', descricao: 'Instalações' },
      'Edifícios': { classe: '1', prefixo: '11.2.1.1', descricao: 'Edifícios' },
      'Imóveis': { classe: '1', prefixo: '11.2.1.1', descricao: 'Imóveis' },
      
      // 11.3 Equipamento básico
      'Material industrial': { classe: '1', prefixo: '11.3.1', descricao: 'Material industrial' },
      'Ferramentas industriais': { classe: '1', prefixo: '11.3.2', descricao: 'Ferramentas industriais' },
      'Melhoramentos em equipamentos': { classe: '1', prefixo: '11.3.3', descricao: 'Melhoramentos em equipamentos básicos' },
      'Equipamento industrial': { classe: '1', prefixo: '11.3.1', descricao: 'Equipamento industrial' },
      'Equipamento básico': { classe: '1', prefixo: '11.3.1', descricao: 'Equipamento básico' },
      
      // 11.4 Equipamento de carga e transporte
      'Viaturas ligeiras': { classe: '1', prefixo: '11.4.1', descricao: 'Viaturas ligeiras' },
      'Viaturas pesadas': { classe: '1', prefixo: '11.4.2', descricao: 'Viaturas pesadas' },
      'Viaturas de serviço': { classe: '1', prefixo: '11.4.3', descricao: 'Viaturas de serviço' },
      'Viaturas': { classe: '1', prefixo: '11.4.1', descricao: 'Viaturas' },
      'Equipamento de carga': { classe: '1', prefixo: '11.4.1', descricao: 'Equipamento de carga' },
      'Equipamento de transporte': { classe: '1', prefixo: '11.4.1', descricao: 'Equipamento de transporte' },
      
      // 11.5 Equipamento administrativo
      'Equipamento administrativo': { classe: '1', prefixo: '11.5.1', descricao: 'Equipamento administrativo' },
      'Mobiliário': { classe: '1', prefixo: '11.5.2', descricao: 'Mobiliário' },
      'Equipamento informático': { classe: '1', prefixo: '11.5.1', descricao: 'Equipamento informático' },
      'Equipamento de escritório': { classe: '1', prefixo: '11.5.1', descricao: 'Equipamento de escritório' },
      
      // 11.6 Taras e vasilhame
      'Taras': { classe: '1', prefixo: '11.6.1', descricao: 'Taras' },
      'Vasilhame': { classe: '1', prefixo: '11.6.2', descricao: 'Vasilhame' },
      
      // 11.7 Outras imobilizações corpóreas
      'Outras imobilizações corpóreas': { classe: '1', prefixo: '11.7.1', descricao: 'Outras imobilizações corpóreas' },
      
      // 11.9 Outras imobilizações
      'Outros imobilizados': { classe: '1', prefixo: '11.9.1', descricao: 'Outras imobilizações' },
      
      // 12. Imobilizações incorpóreas
      'Trespasses': { classe: '1', prefixo: '12.1.1', descricao: 'Trespasses' },
      'Despesas de investigação': { classe: '1', prefixo: '12.2.1', descricao: 'Despesas de investigação e desenvolvimento' },
      'Propriedade industrial': { classe: '1', prefixo: '12.3.1', descricao: 'Propriedade industrial' },
      'Patentes': { classe: '1', prefixo: '12.3.1', descricao: 'Patentes' },
      'Marcas': { classe: '1', prefixo: '12.3.1', descricao: 'Marcas' },
      'Licenças': { classe: '1', prefixo: '12.3.1', descricao: 'Licenças' },
      'Software': { classe: '1', prefixo: '12.3.1', descricao: 'Software' },
      'Despesas de constituição': { classe: '1', prefixo: '12.4.1', descricao: 'Despesas de constituição' },
      'Outras imobilizações incorpóreas': { classe: '1', prefixo: '12.9.1', descricao: 'Outras imobilizações incorpóreas' },
      
      // 13. Investimentos financeiros
      'Investimentos financeiros': { classe: '1', prefixo: '13.9.1', descricao: 'Outros investimentos financeiros' },
      'Diamantes': { classe: '1', prefixo: '13.9.1', descricao: 'Diamantes' },
      'Ouro': { classe: '1', prefixo: '13.9.2', descricao: 'Ouro' },
      'Depósitos bancários': { classe: '1', prefixo: '13.9.3', descricao: 'Depósitos bancários' },
      
      // ==========================================
      // CLASSE 2 - EXISTÊNCIAS
      // ==========================================
      
      // 21. Compras
      'Compras matérias-primas': { classe: '2', prefixo: '21.1.1', descricao: 'Matérias-primas' },
      'Compras mercadorias': { classe: '2', prefixo: '21.2.1', descricao: 'Mercadorias' },
      
      // 22. Matérias-primas
      'Matérias-primas': { classe: '2', prefixo: '22.1.1', descricao: 'Matérias-primas' },
      'Matérias subsidiárias': { classe: '2', prefixo: '22.2.1', descricao: 'Matérias subsidiárias' },
      'Materiais diversos': { classe: '2', prefixo: '22.3.1', descricao: 'Materiais diversos' },
      'Embalagens de consumo': { classe: '2', prefixo: '22.4.1', descricao: 'Embalagens de consumo' },
      
      // 23. Produtos e trabalhos em curso
      'Produtos em curso': { classe: '2', prefixo: '23.1.1', descricao: 'Produtos e trabalhos em curso' },
      
      // 24. Produtos acabados
      'Produtos acabados': { classe: '2', prefixo: '24.1.1', descricao: 'Produtos acabados' },
      'Produtos intermediários': { classe: '2', prefixo: '24.2.1', descricao: 'Produtos intermediários' },
      
      // 25. Sub-produtos
      'Sub-produtos': { classe: '2', prefixo: '25.1.1', descricao: 'Sub-produtos' },
      'Desperdícios': { classe: '2', prefixo: '25.1.2', descricao: 'Desperdícios' },
      'Resíduos': { classe: '2', prefixo: '25.1.3', descricao: 'Resíduos' },
      
      // 26. Mercadorias
      'Mercadorias': { classe: '2', prefixo: '26.1.1', descricao: 'Mercadorias' },
      'Produtos Alimentares': { classe: '2', prefixo: '26.1.1', descricao: 'Mercadorias alimentares' },
      'Produtos Não Alimentares': { classe: '2', prefixo: '26.1.2', descricao: 'Mercadorias não alimentares' },
      
      // ==========================================
      // CLASSE 3 - TERCEIROS
      // ==========================================
      
      'Clientes': { classe: '3', prefixo: '31.1.2.1', descricao: 'Clientes nacionais' },
      'Fornecedores': { classe: '3', prefixo: '32.1.2.1', descricao: 'Fornecedores nacionais' },
      'Empréstimos bancários': { classe: '3', prefixo: '33.1.1.1', descricao: 'Empréstimos bancários - MN' },
      'IVA suportado': { classe: '3', prefixo: '34.5.1.1', descricao: 'IVA suportado - Existências' },
      'IVA liquidado': { classe: '3', prefixo: '34.5.3.1', descricao: 'IVA liquidado - Operações gerais' },
      'Pessoal - remunerações': { classe: '3', prefixo: '36.1.2.1', descricao: 'Pessoal - Empregados' },
      
      // ==========================================
      // CLASSE 4 - MEIOS MONETÁRIOS
      // ==========================================
      
      'Caixa': { classe: '4', prefixo: '45.1.1', descricao: 'Caixa' },
      'Fundo fixo': { classe: '4', prefixo: '45.1.1', descricao: 'Fundo fixo de caixa' },
      'Banco': { classe: '4', prefixo: '43.1.1', descricao: 'Depósitos à ordem' },
      'Depósitos a prazo': { classe: '4', prefixo: '42.1.1', descricao: 'Depósitos a prazo' },
      'Títulos negociáveis': { classe: '4', prefixo: '41.1.1', descricao: 'Acções' },
      
      // ==========================================
      // CLASSE 5 - CAPITAL E RESERVAS
      // ==========================================
      
      'Capital social': { classe: '5', prefixo: '51.1.1', descricao: 'Capital social' },
      'Reservas legais': { classe: '5', prefixo: '53.1.1', descricao: 'Reservas legais' },
      'Reservas livres': { classe: '5', prefixo: '57.1.1', descricao: 'Reservas livres' },
      'Resultados transitados': { classe: '5', prefixo: '54.1.1', descricao: 'Resultados transitados' },
      'Resultado líquido': { classe: '5', prefixo: '55.1.1', descricao: 'Resultado líquido do exercício' },
      
      // ==========================================
      // CLASSE 6 - PROVEITOS
      // ==========================================
      
      'Vendas': { classe: '6', prefixo: '61.1.1', descricao: 'Vendas - Mercado nacional' },
      'Prestação de serviços': { classe: '6', prefixo: '62.1.1', descricao: 'Prestações de serviços' },
      'Juros': { classe: '6', prefixo: '66.1.1', descricao: 'Juros de investimentos financeiros' },
      'Ganhos cambiais': { classe: '6', prefixo: '66.2.1', descricao: 'Diferenças de câmbio favoráveis' },
      
      // ==========================================
      // CLASSE 7 - CUSTOS
      // ==========================================
      
      'CMVMC': { classe: '7', prefixo: '71.1.1', descricao: 'Custo das mercadorias vendidas' },
      'Salários': { classe: '7', prefixo: '72.1.1', descricao: 'Remunerações - Órgãos sociais' },
      'Depreciações': { classe: '7', prefixo: '73.1.1', descricao: 'Amortizações do exercício' },
      'Electricidade': { classe: '7', prefixo: '75.2.12', descricao: 'Electricidade' },
      'Água': { classe: '7', prefixo: '75.2.11', descricao: 'Água' },
      'Combustíveis': { classe: '7', prefixo: '75.2.13', descricao: 'Combustíveis e outros fluidos' },
      'Seguros': { classe: '7', prefixo: '75.2.22', descricao: 'Seguros' },
      'Rendas': { classe: '7', prefixo: '75.2.21', descricao: 'Rendas e alugueres' },
      'Juros suportados': { classe: '7', prefixo: '76.1.2', descricao: 'Juros suportados' },
      'Perdas cambiais': { classe: '7', prefixo: '76.2.1', descricao: 'Diferenças de câmbio desfavoráveis' },
      'Impostos': { classe: '7', prefixo: '77.1.1', descricao: 'Impostos' },
      
      // ==========================================
      // FALLBACKS
      // ==========================================
      'Outros': { classe: '9', prefixo: '99.9.9', descricao: 'Outros' }
    };
    
    // Se não encontrar a categoria, usar padrão baseado no tipoAtivo
    if (!mapa[categoria]) {
      if (tipoAtivo === 'Imobilizado') {
        return { classe: '1', prefixo: '11.9.1', descricao: 'Outras imobilizações' };
      }
      if (tipoAtivo === 'Mercadoria') {
        return { classe: '2', prefixo: '26.9.1', descricao: 'Outras mercadorias' };
      }
      if (tipoAtivo === 'Intangivel') {
        return { classe: '1', prefixo: '12.9.1', descricao: 'Outras imobilizações incorpóreas' };
      }
      if (tipoAtivo === 'Financeiro') {
        return { classe: '1', prefixo: '13.9.1', descricao: 'Outros investimentos financeiros' };
      }
      return { classe: '9', prefixo: '99.9.9', descricao: 'Outros' };
    }
    
    return mapa[categoria];
  }
  
  // Obter próximo número sequencial para um prefixo
  async getProximoSequencial(prefixo, model, empresaId) {
    try {
      if (!model || !empresaId) {
        const count = this.sequencias.get(prefixo) || 0;
        const novoCount = count + 1;
        this.sequencias.set(prefixo, novoCount);
        return novoCount;
      }
      
      const regex = new RegExp(`^${prefixo}\\.(\\d+)$`);
      
      const ultimoItem = await model.findOne({
        empresaId: new mongoose.Types.ObjectId(empresaId),
        codigo: { $regex: regex }
      }).sort({ codigo: -1 });
      
      let ultimoNumero = 0;
      if (ultimoItem && ultimoItem.codigo) {
        const match = ultimoItem.codigo.match(regex);
        if (match && match[1]) {
          ultimoNumero = parseInt(match[1]);
        }
      }
      
      return ultimoNumero + 1;
    } catch (error) {
      console.error('Erro ao obter sequencial:', error);
      const count = this.sequencias.get(prefixo) || 0;
      const novoCount = count + 1;
      this.sequencias.set(prefixo, novoCount);
      return novoCount;
    }
  }
  
  // Gerar código PGCA completo
  async gerarCodigo(categoria, tipoAtivo, nome, model = null, empresaId = null) {
    try {
      const baseInfo = this.getCodigoBase(categoria, tipoAtivo);
      const prefixo = baseInfo.prefixo;
      const classe = baseInfo.classe;
      
      let codigo = '';
      let sequencial = 1;
      
      if (model && empresaId) {
        sequencial = await this.getProximoSequencial(prefixo, model, empresaId);
        codigo = `${prefixo}.${sequencial.toString().padStart(3, '0')}`;
      } else {
        const timestamp = Date.now().toString().slice(-6);
        codigo = `${prefixo}.${timestamp}`;
      }
      
      const codigoCompleto = `${codigo} - ${nome}`;
      
      console.log(`📝 Código PGCA gerado: ${codigo} - ${nome} (Classe ${classe})`);
      
      return {
        codigo: codigo,
        codigoCompleto: codigoCompleto,
        classe: classe,
        prefixo: prefixo,
        sequencial: sequencial,
        descricao: baseInfo.descricao
      };
      
    } catch (error) {
      console.error('Erro ao gerar código PGCA:', error);
      const fallback = Date.now().toString().slice(-8);
      return {
        codigo: `99.99.99.${fallback}`,
        codigoCompleto: `99.99.99.${fallback} - ${nome}`,
        classe: '9',
        prefixo: '99.99.99',
        sequencial: 0,
        descricao: 'Código temporário'
      };
    }
  }
  
  // Obter descrição da classe
  getClasseDescricao(classe) {
    const classes = {
      '1': 'Meios Fixos e Investimentos',
      '2': 'Existências',
      '3': 'Terceiros',
      '4': 'Meios Monetários',
      '5': 'Capital e Reservas',
      '6': 'Proveitos e Ganhos',
      '7': 'Custos e Perdas',
      '8': 'Resultados Analíticos',
      '9': 'Contas de Ordem'
    };
    return classes[classe] || 'Outros';
  }
  
  // Validar código PGCA
  validarCodigo(codigo) {
    const regex = /^(\d{2}\.){3}\d{3}$/;
    return regex.test(codigo);
  }
  
  // Extrair informações do código
  extrairInfoCodigo(codigo) {
    const partes = codigo.split('.');
    if (partes.length >= 4) {
      return {
        classe: partes[0],
        grupo: partes[1],
        subgrupo: partes[2],
        item: partes[3],
        classeDescricao: this.getClasseDescricao(partes[0])
      };
    }
    return null;
  }
}

module.exports = new CodificadorPGCA();