import RHListPage from "./RHListPage";

const columns = [
  { key: "funcionarioNome", label: "Funcionário" },
  { key: "tipo", label: "Tipo", render: (item) => {
    const labels = { Admissional: "Admissional", Periodico: "Periódico", Demissional: "Demissional", RetornoTrabalho: "Retorno ao Trabalho", MudancaFuncao: "Mudança de Função" };
    return labels[item.tipo] || item.tipo;
  }},
  { key: "dataRealizacao", label: "Data", render: (item) => item.dataRealizacao ? new Date(item.dataRealizacao).toLocaleDateString() : "—" },
  { key: "dataValidade", label: "Validade", render: (item) => item.dataValidade ? new Date(item.dataValidade).toLocaleDateString() : "—" },
  { key: "resultado", label: "Resultado", align: "center", render: (item) => {
    const cores = { Apto: "text-green-400", AptoComRestricoes: "text-yellow-400", Inapto: "text-red-400" };
    return <span className={`px-2 py-1 rounded-full text-xs ${cores[item.resultado] || ""}`}>{item.resultado === "AptoComRestricoes" ? "Apto c/ Restrições" : item.resultado}</span>;
  }},
];

const formFields = [
  { key: "funcionarioId", label: "Funcionário" },
  { key: "funcionarioNome", label: "Nome do Funcionário" },
  { key: "tipo", label: "Tipo", type: "select", options: [
    { value: "Admissional", label: "Admissional" }, { value: "Periodico", label: "Periódico" },
    { value: "Demissional", label: "Demissional" }, { value: "RetornoTrabalho", label: "Retorno ao Trabalho" },
    { value: "MudancaFuncao", label: "Mudança de Função" }
  ]},
  { key: "dataRealizacao", label: "Data de Realização" },
  { key: "dataValidade", label: "Data de Validade" },
  { key: "medico", label: "Médico" },
  { key: "clinica", label: "Clínica" },
  { key: "resultado", label: "Resultado", type: "select", options: [
    { value: "Apto", label: "Apto" }, { value: "AptoComRestricoes", label: "Apto com Restrições" }, { value: "Inapto", label: "Inapto" }
  ]},
  { key: "observacoes", label: "Observações", type: "textarea" },
];

const ExamesMedicos = () => (
  <RHListPage title="Exames Médicos" endpoint="exames-medicos" columns={columns} formFields={formFields} emptyMessage="Nenhum exame registado" />
);
export default ExamesMedicos;
