const xlsx = require('xlsx');
const Funcionario = require('../models/Funcionario');
const Empresa = require('../models/Empresa');

class ImportService {
  
  // Mapeamento de cabeçalhos esperados (ATUALIZADO)
  static HEADER_MAPPING = {
    'Nome': 'nome',
    'Nome Completo': 'nome',
    'NIF': 'nif',
    'Número de Identificação Fiscal': 'nif',
    'Email': 'email',
    'E-mail': 'email',
    'Telefone': 'telefone',
    'Contacto': 'telefone',
    'Função': 'funcao',
    'Cargo': 'funcao',
    'Funcao': 'funcao',
    'Departamento': 'departamento',
    'Salário Base': 'salarioBase',
    'Salário': 'salarioBase',
    'Salario Base': 'salarioBase',
    'Data de Admissão': 'dataAdmissao',
    'Admissão': 'dataAdmissao',
    'Tipo Contrato': 'tipoContrato',
    'Banco': 'banco',
    'Nº Conta': 'numeroConta',
    'Número da Conta': 'numeroConta',
    'IBAN': 'iban',
    'Titular da Conta': 'titularConta',
    'Grupo IRT': 'grupoIRT',
    'Dependentes': 'dependentes',
    'Horas Semanais': 'horasSemanais',
    'Horas Diárias': 'horasDiarias',
    'Contribui INSS': 'contribuiINSS',
    'Contribui para Segurança Social': 'contribuiINSS',
    'Empresa': 'empresaNome',
    'Empresa ID': 'empresaId'
  };

  // Validar e converter dados
  static validateAndConvert(row, empresaMap) {
    const funcionario = {};
    const errors = [];

    for (const [excelHeader, dbField] of Object.entries(this.HEADER_MAPPING)) {
      let value = row[excelHeader];
      
      if (value !== undefined && value !== null && value !== '') {
        switch (dbField) {
          case 'nome':
            if (!value) errors.push('Nome é obrigatório');
            funcionario.nome = String(value).trim();
            break;
            
          case 'nif':
            if (!value) errors.push('NIF é obrigatório');
            const nifStr = String(value).replace(/[^0-9]/g, '');
            if (nifStr.length < 10 || nifStr.length > 14) {
              errors.push(`NIF inválido: ${value}`);
            }
            funcionario.nif = nifStr;
            break;
            
          case 'salarioBase':
            const salario = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
            if (isNaN(salario) || salario <= 0) {
              errors.push(`Salário inválido: ${value}`);
            }
            funcionario.salarioBase = salario;
            break;
            
          case 'dataAdmissao':
            if (value) {
              const data = new Date(value);
              if (isNaN(data.getTime())) {
                errors.push(`Data de admissão inválida: ${value}`);
              } else {
                funcionario.dataAdmissao = data;
              }
            }
            break;
            
          case 'tipoContrato':
            const tipoValido = ['Efetivo', 'Estágio', 'Temporário'];
            if (tipoValido.includes(String(value))) {
              funcionario.tipoContrato = String(value);
            } else {
              funcionario.tipoContrato = 'Efetivo';
            }
            break;
            
          case 'grupoIRT':
            funcionario.grupoIRT = String(value).toUpperCase() === 'B' ? 'B' : 'A';
            break;
            
          case 'dependentes':
            funcionario.dependentes = parseInt(value) || 0;
            break;
            
          case 'horasSemanais':
            funcionario.horasSemanais = parseFloat(value) || 40;
            break;
            
          case 'horasDiarias':
            funcionario.horasDiarias = parseFloat(value) || 8;
            break;
            
          case 'contribuiINSS':
            const contribui = String(value).toLowerCase();
            funcionario.contribuiINSS = contribui === 'sim' || contribui === 'true' || contribui === '1' || contribui === 'yes';
            break;
            
          case 'empresaNome':
            if (value) {
              const empresa = empresaMap.get(String(value).trim());
              if (empresa) {
                funcionario.empresaId = empresa._id;
                funcionario.empresaNome = empresa.nome;
              } else {
                errors.push(`Empresa não encontrada: ${value}`);
              }
            } else {
              errors.push('Empresa é obrigatória');
            }
            break;
            
          default:
            funcionario[dbField] = value;
        }
      }
    }

    // Garantir que campos obrigatórios existam
    if (!funcionario.contribuiINSS && funcionario.contribuiINSS !== false) {
      funcionario.contribuiINSS = true; // Padrão: contribui
    }
    
    if (!funcionario.horasSemanais) funcionario.horasSemanais = 40;
    if (!funcionario.horasDiarias) funcionario.horasDiarias = 8;
    if (!funcionario.grupoIRT) funcionario.grupoIRT = 'A';
    if (!funcionario.dependentes) funcionario.dependentes = 0;
    if (!funcionario.tipoContrato) funcionario.tipoContrato = 'Efetivo';
    if (!funcionario.status) funcionario.status = 'Ativo';

    return { funcionario, errors };
  }

  // Importar de arquivo Excel
  static async importFromExcel(buffer, empresaMap) {
    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      const resultados = {
        total: data.length,
        sucessos: [],
        erros: []
      };
      
      for (const row of data) {
        const { funcionario, errors } = await this.validateAndConvert(row, empresaMap);
        
        if (errors.length > 0) {
          resultados.erros.push({
            dados: row,
            erros: errors
          });
          continue;
        }
        
        try {
          // Verificar se já existe funcionário com este NIF na mesma empresa
          const existente = await Funcionario.findOne({ 
            nif: funcionario.nif, 
            empresaId: funcionario.empresaId 
          });
          
          if (existente) {
            resultados.erros.push({
              dados: row,
              erros: [`Funcionário com NIF ${funcionario.nif} já existe nesta empresa`]
            });
            continue;
          }
          
          const novoFuncionario = new Funcionario(funcionario);
          await novoFuncionario.save();
          
          resultados.sucessos.push({
            id: novoFuncionario._id,
            nome: novoFuncionario.nome,
            nif: novoFuncionario.nif
          });
        } catch (error) {
          resultados.erros.push({
            dados: row,
            erros: [error.message]
          });
        }
      }
      
      return resultados;
    } catch (error) {
      console.error('Erro no importFromExcel:', error);
      throw error;
    }
  }

  // Importar de JSON
  static async importFromJSON(data, empresaMap) {
    const resultados = {
      total: data.length,
      sucessos: [],
      erros: []
    };
    
    for (const item of data) {
      // Converter objeto para formato de linha
      const row = {};
      for (const [key, value] of Object.entries(item)) {
        let encontrado = false;
        for (const [excelHeader, dbField] of Object.entries(this.HEADER_MAPPING)) {
          if (key.toLowerCase().includes(excelHeader.toLowerCase()) || 
              dbField === key.toLowerCase() ||
              key === dbField) {
            row[excelHeader] = value;
            encontrado = true;
            break;
          }
        }
        if (!encontrado) {
          row[key] = value;
        }
      }
      
      const { funcionario, errors } = await this.validateAndConvert(row, empresaMap);
      
      if (errors.length > 0) {
        resultados.erros.push({
          dados: item,
          erros: errors
        });
        continue;
      }
      
      try {
        const existente = await Funcionario.findOne({ 
          nif: funcionario.nif, 
          empresaId: funcionario.empresaId 
        });
        
        if (existente) {
          resultados.erros.push({
            dados: item,
            erros: [`Funcionário com NIF ${funcionario.nif} já existe nesta empresa`]
          });
          continue;
        }
        
        const novoFuncionario = new Funcionario(funcionario);
        await novoFuncionario.save();
        
        resultados.sucessos.push({
          id: novoFuncionario._id,
          nome: novoFuncionario.nome,
          nif: novoFuncionario.nif
        });
      } catch (error) {
        resultados.erros.push({
          dados: item,
          erros: [error.message]
        });
      }
    }
    
    return resultados;
  }

  // Importar de CSV
  static async importFromCSV(csvContent, empresaMap) {
    try {
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, idx) => {
          if (values[idx]) {
            row[header] = values[idx];
          }
        });
        data.push(row);
      }
      
      return this.importFromJSON(data, empresaMap);
    } catch (error) {
      console.error('Erro no importFromCSV:', error);
      throw error;
    }
  }

  // Gerar modelo de Excel para download (ATUALIZADO)
  static generateTemplate() {
    try {
      const template = [
        {
          'Nome': 'Venâncio Martins',
          'NIF': '123456789012',
          'Email': 'venanciomartins@empresa.com',
          'Telefone': '923456789',
          'Função': 'Contabilista',
          'Departamento': 'Financeiro',
          'Salário Base': '150000',
          'Data de Admissão': '2024-01-15',
          'Tipo Contrato': 'Efetivo',
          'Banco': 'BAI',
          'Nº Conta': '123456789',
          'IBAN': 'AO06004444444444444444444',
          'Titular da Conta': 'Venâncio Martins',
          'Grupo IRT': 'A',
          'Dependentes': '0',
          'Horas Semanais': '40',
          'Horas Diárias': '8',
          'Contribui INSS': 'Sim',
          'Empresa': 'ANDIO TECH Inovações'
        }
      ];
      
      const ws = xlsx.utils.json_to_sheet(template);
      
      // Ajustar largura das colunas
      const colWidths = [
        { wch: 25 }, // Nome
        { wch: 15 }, // NIF
        { wch: 30 }, // Email
        { wch: 15 }, // Telefone
        { wch: 20 }, // Função
        { wch: 20 }, // Departamento
        { wch: 15 }, // Salário Base
        { wch: 15 }, // Data de Admissão
        { wch: 15 }, // Tipo Contrato
        { wch: 15 }, // Banco
        { wch: 15 }, // Nº Conta
        { wch: 35 }, // IBAN
        { wch: 25 }, // Titular da Conta
        { wch: 12 }, // Grupo IRT
        { wch: 12 }, // Dependentes
        { wch: 15 }, // Horas Semanais
        { wch: 15 }, // Horas Diárias
        { wch: 18 }, // Contribui INSS
        { wch: 50 }  // Empresa
      ];
      ws['!cols'] = colWidths;
      
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Modelo Funcionários');
      
      return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    } catch (error) {
      console.error('Erro ao gerar template:', error);
      throw error;
    }
  }
}

module.exports = ImportService;