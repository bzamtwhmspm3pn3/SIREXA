// backend/services/folhaService.js - VERSAO CORRIGIDA (com suporte a contribuiINSS)

// Serviço de Cálculo de Folha Salarial - Conforme Lei Geral do Trabalho de Angola

// Tabela IRT A (tabela progressiva - para funcionários grupo A)
const tabelaIRT_A = [
  { limite: 150000, parcelaFixa: 0, taxa: 0 },
  { limite: 200000, parcelaFixa: 12500, taxa: 0.16 },
  { limite: 300000, parcelaFixa: 31250, taxa: 0.18 },
  { limite: 500000, parcelaFixa: 49250, taxa: 0.19 },
  { limite: 1000000, parcelaFixa: 87250, taxa: 0.20 },
  { limite: 1500000, parcelaFixa: 187250, taxa: 0.21 },
  { limite: 2000000, parcelaFixa: 292250, taxa: 0.22 },
  { limite: 2500000, parcelaFixa: 402250, taxa: 0.23 },
  { limite: 5000000, parcelaFixa: 517250, taxa: 0.24 },
  { limite: 10000000, parcelaFixa: 1117250, taxa: 0.245 },
  { limite: Infinity, parcelaFixa: 2342250, taxa: 0.25 }
];

// IRT B: Taxa fixa de 6.5%
const IRT_B_TAXA = 0.065; // 6.5%

// INSS para empresas NORMAIS (Grupo A)
const INSS_NORMAL_COLABORADOR = 0.03;   // 3%
const INSS_NORMAL_EMPREGADOR = 0.08;    // 8%

// INSS para empresas de BAIXOS RENDIMENTOS (Grupo B Especial)
const INSS_BAIXOS_RENDIMENTOS_COLABORADOR = 0.015; // 1.5%
const INSS_BAIXOS_RENDIMENTOS_EMPREGADOR = 0.04;   // 4%

// Constantes padrão
const HORAS_SEMANAIS_PADRAO = 40;
const HORAS_DIARIAS_PADRAO = 8;

class FolhaService {
  
  static validarNumero(valor, nome, minimo = 0) {
    if (valor === undefined || valor === null) valor = 0;
    if (typeof valor !== 'number' || isNaN(valor)) valor = 0;
    return Math.max(valor, minimo);
  }
  
  /**
   * Verifica se a empresa é de baixos rendimentos
   */
  static isEmpresaBaixosRendimentos(empresa) {
    if (!empresa) return false;
    return empresa.isBaixosRendimentos === true || empresa.regimeINSS === 'baixos_rendimentos';
  }
  
  /**
   * Obtém as taxas INSS da empresa
   */
  static obterTaxasINSS(empresa) {
    if (this.isEmpresaBaixosRendimentos(empresa)) {
      return {
        colaborador: INSS_BAIXOS_RENDIMENTOS_COLABORADOR,
        empregador: INSS_BAIXOS_RENDIMENTOS_EMPREGADOR,
        regime: 'Baixos Rendimentos (1.5% / 4%)'
      };
    }
    return {
      colaborador: INSS_NORMAL_COLABORADOR,
      empregador: INSS_NORMAL_EMPREGADOR,
      regime: 'Normal (3% / 8%)'
    };
  }
  
  /**
   * Calcula o IRT conforme o grupo do funcionário (grupoIRT do cadastro)
   */
  static calcularIRT(rendimentoTributavel, funcionario) {
    rendimentoTributavel = rendimentoTributavel || 0;
    
    // Verificar o grupo do funcionário no cadastro
    const grupoIRT = funcionario.grupoIRT || 'A';
    
    // GRUPO B: Taxa fixa de 6.5%
    if (grupoIRT === 'B') {
      const irt = rendimentoTributavel * IRT_B_TAXA;
      console.log(`   📊 IRT B (Grupo B - taxa fixa 6.5%): ${irt.toFixed(2)} Kz`);
      return Math.round(irt * 100) / 100;
    }
    
    // GRUPO A: Tabela progressiva
    if (rendimentoTributavel <= 150000) return 0;
    
    for (let i = 1; i < tabelaIRT_A.length; i++) {
      const faixaAtual = tabelaIRT_A[i];
      const faixaAnterior = tabelaIRT_A[i - 1];
      
      if (rendimentoTributavel <= faixaAtual.limite) {
        const excedente = rendimentoTributavel - faixaAnterior.limite;
        const irt = faixaAtual.parcelaFixa + (excedente * faixaAtual.taxa);
        console.log(`   📊 IRT A (Grupo A - Tabela Progressiva): ${irt.toFixed(2)} Kz`);
        return Math.round(irt * 100) / 100;
      }
    }
    
    // Para valores acima da última faixa
    const ultimaFaixa = tabelaIRT_A[tabelaIRT_A.length - 1];
    const penultimaFaixa = tabelaIRT_A[tabelaIRT_A.length - 2];
    const excedente = rendimentoTributavel - penultimaFaixa.limite;
    const irt = ultimaFaixa.parcelaFixa + (excedente * ultimaFaixa.taxa);
    return Math.round(irt * 100) / 100;
  }
  
  /**
   * Calcula o salário-hora conforme Lei Geral do Trabalho
   */
  static calcularSalarioHora(salarioBase, horasSemanais = HORAS_SEMANAIS_PADRAO) {
    try {
      salarioBase = this.validarNumero(salarioBase, 'Salário base', 0);
      horasSemanais = this.validarNumero(horasSemanais, 'Carga horária semanal', 1);
      
      const semanasAno = 52;
      const salarioAno = salarioBase * 12;
      const horasAno = semanasAno * horasSemanais;
      
      if (horasAno === 0) return 0;
      
      return Math.round((salarioAno / horasAno) * 100) / 100;
    } catch (error) {
      console.error('Erro ao calcular salário hora:', error.message);
      return 0;
    }
  }
  
  /**
   * Calcula o valor do desconto por dia de falta
   */
  static calcularValorDiaFalta(salarioBase, horasSemanais = HORAS_SEMANAIS_PADRAO, horasDiarias = HORAS_DIARIAS_PADRAO) {
    const salarioHora = this.calcularSalarioHora(salarioBase, horasSemanais);
    return Math.round(salarioHora * horasDiarias * 100) / 100;
  }
  
  /**
   * Calcula o valor do desconto por horas de atraso
   */
  static calcularValorAtraso(salarioBase, horasAtraso, horasSemanais = HORAS_SEMANAIS_PADRAO) {
    const salarioHora = this.calcularSalarioHora(salarioBase, horasSemanais);
    return Math.round(salarioHora * horasAtraso * 100) / 100;
  }
  
  /**
   * Calcula o valor do abono que é isento (não tributável para IRT)
   */
  static calcularValorIsentoIRT(tipoAbono, valor, salarioBase = 0) {
    const valorNumerico = valor || 0;
    
    switch (tipoAbono) {
      case 'Subsídio de Alimentação':
        return Math.min(valorNumerico, 30000);
        
      case 'Subsídio de Transporte':
        return Math.min(valorNumerico, 30000);
        
      case 'Subsídio de Férias':
        return 0;
        
      case 'Décimo Terceiro':
        return 0;
        
      case 'Bónus':
      case 'Prémio':
        const limiteIsencao = salarioBase * 0.05;
        return Math.min(valorNumerico, limiteIsencao);
        
      default:
        return 0;
    }
  }
  
  /**
   * Verifica se o funcionário contribui para o INSS
   * Por padrão, contribui (true) se o campo não estiver definido
   */
  static contribuiParaINSS(funcionario) {
    // Se o campo contribuiINSS não existir no funcionário, padrão é true
    if (funcionario.contribuiINSS === undefined || funcionario.contribuiINSS === null) {
      console.log(`   ℹ️ Campo contribuiINSS não definido para ${funcionario.nome}, considerando que contribui (padrão)`);
      return true;
    }
    return funcionario.contribuiINSS === true;
  }
  
  /**
   * Calcula a folha salarial completa
   */
  static calcularFolhaCompleta(funcionario, empresa = null, dadosAdicionais = {}) {
    try {
      const salarioBase = funcionario.salarioBase || 0;
      const horasSemanais = funcionario.horasSemanais || HORAS_SEMANAIS_PADRAO;
      const horasDiarias = funcionario.horasDiarias || HORAS_DIARIAS_PADRAO;
      
      // Verificar se o funcionário contribui para o INSS
      const contribuiINSS = this.contribuiParaINSS(funcionario);
      
      // Obter taxas INSS da empresa (apenas para referência)
      const taxasINSS = this.obterTaxasINSS(empresa);
      
      console.log(`\n📊 REGIME INSS: ${taxasINSS.regime}`);
      console.log(`📊 GRUPO IRT: ${funcionario.grupoIRT || 'A'} (${funcionario.grupoIRT === 'B' ? 'Taxa fixa 6.5%' : 'Tabela Progressiva'})`);
      console.log(`📊 CONTRIBUI INSS: ${contribuiINSS ? 'SIM' : 'NÃO'} ${!contribuiINSS ? '(Isento de desconto)' : ''}`);
      
      const {
        abonosAlimentacao = [],
        abonosTransporte = [],
        abonosFerias = [],
        abonosDecimoTerceiro = [],
        abonosBonus = [],
        abonosOutros = [],
        faltas = []
      } = dadosAdicionais;
      
      const totalAlimentacao = abonosAlimentacao.reduce((acc, a) => acc + (a.valor || 0), 0);
      const totalTransporte = abonosTransporte.reduce((acc, a) => acc + (a.valor || 0), 0);
      const totalFerias = abonosFerias.reduce((acc, a) => acc + (a.valor || 0), 0);
      const totalDecimoTerceiro = abonosDecimoTerceiro.reduce((acc, a) => acc + (a.valor || 0), 0);
      const totalBonus = abonosBonus.reduce((acc, a) => acc + (a.valor || 0), 0);
      const totalOutros = abonosOutros.reduce((acc, a) => acc + (a.valor || 0), 0);
      
      // ==================== 1. CALCULAR VALOR DAS FALTAS ====================
      let valorFaltas = 0;
      let diasFaltas = 0;
      let horasAtraso = 0;
      
      console.log(`\n📊 Processando faltas para ${funcionario.nome}:`);
      
      for (const falta of faltas) {
        console.log(`   - Tipo: ${falta.tipoFalta}, Justificada: ${falta.justificada}`);
        
        if (falta.justificada) {
          console.log(`     ✅ Falta justificada - SEM DESCONTO`);
          continue;
        }
        
        const tiposSemDesconto = ['Doença', 'Férias', 'Licença', 'Formação', 'Luto', 'Casamento', 'Falta Justificada'];
        
        if (tiposSemDesconto.includes(falta.tipoFalta)) {
          console.log(`     ✅ Tipo "${falta.tipoFalta}" - SEM DESCONTO`);
          continue;
        }
        
        if (falta.tipoFalta === 'Falta Injustificada') {
          let dias = falta.diasFalta || 1;
          diasFaltas += dias;
          const valorPorDia = this.calcularValorDiaFalta(salarioBase, horasSemanais, horasDiarias);
          const desconto = valorPorDia * dias;
          valorFaltas += desconto;
          console.log(`     ⚠️ Falta Injustificada: ${dias} dia(s) = ${desconto.toFixed(2)} Kz`);
        }
        else if (falta.tipoFalta === 'Atraso') {
          let horas = falta.horasFalta || 1;
          horasAtraso += horas;
          const valorAtraso = this.calcularValorAtraso(salarioBase, horas, horasSemanais);
          valorFaltas += valorAtraso;
          console.log(`     ⏰ Atraso: ${horas} hora(s) = ${valorAtraso.toFixed(2)} Kz`);
        }
        else if (falta.descontoSalario && falta.descontoSalario > 0) {
          valorFaltas += falta.descontoSalario;
          console.log(`     💰 Desconto pré-calculado: ${falta.descontoSalario} Kz`);
        }
      }
      
      valorFaltas = Math.round(valorFaltas * 100) / 100;
      console.log(`   📊 TOTAL DE FALTAS: ${valorFaltas.toLocaleString()} Kz`);
      
      // ==================== 2. SALÁRIO APÓS FALTAS ====================
      const salarioAposFaltas = salarioBase - valorFaltas;
      
      // ==================== 3. CALCULAR BASE DO INSS ====================
      const baseINSS = salarioAposFaltas + totalAlimentacao + totalTransporte + totalFerias + totalDecimoTerceiro + totalBonus + totalOutros;
      
      // 🔥 SE O FUNCIONÁRIO NÃO CONTRIBUI PARA O INSS, O DESCONTO É ZERO 🔥
      let inss = 0;
      let inssEmpregador = 0;
      
      if (contribuiINSS) {
        inss = Math.round(baseINSS * taxasINSS.colaborador * 100) / 100;
        inssEmpregador = Math.round(baseINSS * taxasINSS.empregador * 100) / 100;
        console.log(`   📊 INSS: ${inss.toLocaleString()} Kz (${taxasINSS.colaborador * 100}% sobre ${baseINSS.toLocaleString()} Kz)`);
      } else {
        console.log(`   📊 INSS: ISENTO (Funcionário não contribui para Segurança Social)`);
      }
      
      // ==================== 4. CALCULAR RENDIMENTO TRIBUTÁVEL PARA IRT ====================
      const totalAbonos = totalAlimentacao + totalTransporte + totalFerias + totalDecimoTerceiro + totalBonus + totalOutros;
      
      const alimentacaoIsento = this.calcularValorIsentoIRT('Subsídio de Alimentação', totalAlimentacao, salarioBase);
      const transporteIsento = this.calcularValorIsentoIRT('Subsídio de Transporte', totalTransporte, salarioBase);
      const totalIsentos = alimentacaoIsento + transporteIsento;
      
      const rendimentoTributavel = salarioBase + totalAbonos - valorFaltas - inss - totalIsentos;
      
      // Calcular IRT usando o grupo do funcionário
      const irt = this.calcularIRT(rendimentoTributavel, funcionario);
      
      // ==================== 5. CALCULAR SALÁRIO LÍQUIDO ====================
      const salarioLiquido = salarioBase + totalAbonos - valorFaltas - inss - irt;
      
      console.log(`\n📊 Cálculo final para ${funcionario.nome}:`);
      console.log(`   Salário Base: ${salarioBase.toLocaleString()} Kz`);
      console.log(`   Total Abonos: ${totalAbonos.toLocaleString()} Kz`);
      console.log(`   Desconto Faltas: ${valorFaltas.toLocaleString()} Kz`);
      console.log(`   INSS (${contribuiINSS ? taxasINSS.colaborador * 100 + '%' : 'ISENTO'}): ${inss.toLocaleString()} Kz`);
      console.log(`   IRT: ${irt.toLocaleString()} Kz`);
      console.log(`   💰 Salário Líquido: ${salarioLiquido.toLocaleString()} Kz`);
      
      return {
        sucesso: true,
        dados: {
          salarioBase,
          valorFaltas,
          diasFaltas,
          horasAtraso,
          salarioAposFaltas,
          baseINSS,
          inss,
          inssEmpregador,
          irt,
          rendimentoTributavel,
          salarioLiquido,
          grupoIRT: funcionario.grupoIRT || 'A',
          regimeINSS: taxasINSS.regime,
          contribuiINSS: contribuiINSS,
          taxaINSS: contribuiINSS ? taxasINSS.colaborador * 100 : 0,
          taxaINSSEmpregador: contribuiINSS ? taxasINSS.empregador * 100 : 0,
          abonos: {
            alimentacao: { total: totalAlimentacao, isento: alimentacaoIsento, tributavel: totalAlimentacao - alimentacaoIsento },
            transporte: { total: totalTransporte, isento: transporteIsento, tributavel: totalTransporte - transporteIsento },
            ferias: { total: totalFerias, isento: 0, tributavel: totalFerias },
            decimoTerceiro: { total: totalDecimoTerceiro, isento: 0, tributavel: totalDecimoTerceiro },
            bonus: { total: totalBonus, isento: 0, tributavel: totalBonus },
            outros: { total: totalOutros, isento: 0, tributavel: totalOutros }
          }
        }
      };
      
    } catch (error) {
      console.error('Erro ao calcular folha:', error);
      return {
        sucesso: false,
        mensagem: error.message,
        dados: null
      };
    }
  }
}

module.exports = FolhaService;