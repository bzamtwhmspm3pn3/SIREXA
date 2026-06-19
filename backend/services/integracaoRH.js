const Funcionario = require('../models/Funcionario');
const FeriasLicenca = require('../models/FeriasLicenca');
const { CompetenciaFuncionario } = require('../models/Competencia');
const { Promocao } = require('../models/Carreira');
const { Talento } = require('../models/Recrutamento');
const Empresa = require('../models/Empresa');

const DIAS_FERIAS_PADRAO = 22;

async function contratarCandidato(candidatura, dadosAdicionais = {}) {
  try {
    const empresa = await Empresa.findById(candidatura.empresaId);
    if (!empresa) throw new Error('Empresa não encontrada');

    const salario = dadosAdicionais.salarioBase || candidatura.salarioPretendido || 0;

    const funcionario = new Funcionario({
      nome: candidatura.nome,
      nif: candidatura.nif || `PENDENTE-${Date.now()}`,
      email: candidatura.email || '',
      telefone: candidatura.telefone || '',
      dataNascimento: candidatura.dataNascimento || null,
      genero: candidatura.genero || null,
      funcao: dadosAdicionais.funcao || candidatura.cargoPretendido || 'Colaborador',
      departamento: dadosAdicionais.departamento || '',
      dataAdmissao: dadosAdicionais.dataAdmissao || new Date(),
      status: 'Ativo',
      salarioBase: salario,
      tipoContrato: dadosAdicionais.tipoContrato || 'Efetivo',
      nivelEscolaridade: candidatura.nivelEscolaridade || null,
      areaFormacao: candidatura.areaFormacao || null,
      contribuiINSS: true,
      empresaId: candidatura.empresaId,
      empresaNome: empresa.nome || 'Empresa',
      isTecnico: false
    });

    await funcionario.save();

    const dataAdmissao = dadosAdicionais.dataAdmissao || new Date();
    const dataFimFerias = new Date(dataAdmissao);
    dataFimFerias.setDate(dataFimFerias.getDate() + DIAS_FERIAS_PADRAO);

    const feriasLicenca = new FeriasLicenca({
      funcionarioId: funcionario._id,
      funcionarioNome: funcionario.nome,
      tipo: 'Ferias',
      dataInicio: dataAdmissao,
      dataFim: dataFimFerias,
      diasSolicitados: DIAS_FERIAS_PADRAO,
      status: 'Aprovado',
      descricao: 'Saldo inicial de férias (admissão automática)',
      empresaId: candidatura.empresaId,
      criadoPor: 'Sistema (Integração RH)'
    });
    await feriasLicenca.save();

    const promocao = new Promocao({
      funcionarioId: funcionario._id,
      funcionarioNome: funcionario.nome,
      cargoAnterior: 'Candidato',
      cargoNovo: dadosAdicionais.funcao || candidatura.cargoPretendido || 'Colaborador',
      salarioAnterior: 0,
      salarioNovo: salario,
      tipo: 'Admissao',
      dataPromocao: new Date(),
      status: 'Efetivada',
      descricao: 'Admissão automática via candidatura',
      empresaId: candidatura.empresaId,
      criadoPor: 'Sistema (Integração RH)'
    });
    await promocao.save();

    if (candidatura.nome && candidatura.email) {
      const talento = await Talento.findOne({
        email: candidatura.email,
        empresaId: candidatura.empresaId
      });
      if (talento) {
        talento.status = 'Contratado';
        talento.funcionarioId = funcionario._id;
        await talento.save();
      }
    }

    return funcionario;
  } catch (error) {
    console.error('Erro ao contratar candidato:', error);
    throw error;
  }
}

async function sincronizarFuncionario(funcionario) {
  try {
    const syncResults = {};

    const feriasExistentes = await FeriasLicenca.findOne({
      funcionarioId: funcionario._id,
      tipo: 'Ferias',
      status: { $in: ['Aprovado', 'Gozando', 'Concluido'] }
    });
    syncResults.ferias = feriasExistentes ? 'atualizado' : 'sem_registo';

    const promocoes = await Promocao.find({
      funcionarioId: funcionario._id
    }).sort({ dataPromocao: -1 }).limit(1);

    if (promocoes.length > 0) {
      const ultimaPromocao = promocoes[0];
      if (ultimaPromocao.cargoNovo !== funcionario.funcao ||
          ultimaPromocao.salarioNovo !== funcionario.salarioBase) {
        const novaPromocao = new Promocao({
          funcionarioId: funcionario._id,
          funcionarioNome: funcionario.nome,
          cargoAnterior: ultimaPromocao.cargoNovo,
          cargoNovo: funcionario.funcao,
          salarioAnterior: ultimaPromocao.salarioNovo,
          salarioNovo: funcionario.salarioBase,
          departamentoAnterior: null,
          departamentoNovo: funcionario.departamento,
          tipo: 'Actualizacao',
          dataPromocao: new Date(),
          status: 'Efetivada',
          descricao: 'Actualização automática de dados',
          empresaId: funcionario.empresaId,
          criadoPor: 'Sistema (Integração RH)'
        });
        await novaPromocao.save();
        syncResults.promocao = 'criada';
      } else {
        syncResults.promocao = 'sem_alteracoes';
      }
    }

    return { sucesso: true, dados: syncResults };
  } catch (error) {
    console.error('Erro ao sincronizar funcionário:', error);
    return { sucesso: false, erro: error.message };
  }
}

async function finalizarFuncionario(funcionarioId, dataDemissao, motivo) {
  try {
    const funcionario = await Funcionario.findById(funcionarioId);
    if (!funcionario) throw new Error('Funcionário não encontrado');

    const feriasPendentes = await FeriasLicenca.find({
      funcionarioId,
      status: { $in: ['Pendente', 'Aprovado', 'Gozando'] }
    });

    for (const ferias of feriasPendentes) {
      ferias.status = 'Cancelado';
      ferias.observacao = `Cancelado automaticamente - Funcionário ${funcionario.status === 'Demitido' ? 'demitido' : 'inativado'} em ${new Date().toLocaleDateString()}`;
      await ferias.save();
    }

    const disciplinarPendente = await require('../models/Disciplinar').find({
      funcionarioId,
      status: { $in: ['Pendente', 'EmCurso'] }
    });

    for (const processo of disciplinarPendente) {
      if (funcionario.status === 'Demitido') {
        processo.status = 'Concluido';
        processo.resultado = 'Demissão do colaborador';
        await processo.save();
      }
    }

    const promocao = new Promocao({
      funcionarioId: funcionario._id,
      funcionarioNome: funcionario.nome,
      cargoAnterior: funcionario.funcao,
      cargoNovo: 'Desligado',
      salarioAnterior: funcionario.salarioBase,
      salarioNovo: 0,
      tipo: 'Desligamento',
      dataPromocao: dataDemissao || new Date(),
      status: 'Efetivada',
      descricao: motivo || 'Desligamento automático',
      empresaId: funcionario.empresaId,
      criadoPor: 'Sistema (Integração RH)'
    });
    await promocao.save();

    return { sucesso: true, mensagem: `Funcionário ${funcionario.nome} finalizado` };
  } catch (error) {
    console.error('Erro ao finalizar funcionário:', error);
    return { sucesso: false, erro: error.message };
  }
}

module.exports = {
  contratarCandidato,
  sincronizarFuncionario,
  finalizarFuncionario
};
