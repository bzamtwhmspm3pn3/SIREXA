import RHListPage from "./RHListPage";

const columns = [
  { key: "funcionarioNome", label: "Funcionário" },
  { key: "tipo", label: "Tipo", render: (item) => {
    const labels = { Ferias: "Férias", LicencaMedica: "Licença Médica", LicencaMaternidade: "Licença Maternidade",
      LicencaPaternidade: "Licença Paternidade", AusenciaJustificada: "Ausência Justificada", Outro: "Outro" };
    return labels[item.tipo] || item.tipo;
  }},
  { key: "dataInicio", label: "Início", render: (item) => item.dataInicio ? new Date(item.dataInicio).toLocaleDateString() : "—" },
  { key: "dataFim", label: "Fim", render: (item) => item.dataFim ? new Date(item.dataFim).toLocaleDateString() : "—" },
  { key: "diasSolicitados", label: "Dias", align: "center" },
  { key: "status", label: "Status", align: "center", render: (item) => {
    const cores = { Pendente: "text-yellow-400", Aprovado: "text-green-400", Rejeitado: "text-red-400", Cancelado: "text-gray-400", Gozando: "text-blue-400", Concluido: "text-green-400" };
    return <span className={`px-2 py-1 rounded-full text-xs ${cores[item.status] || ""}`}>{item.status}</span>;
  }},
];

const formFields = [
  { key: "funcionarioId", label: "ID do Funcionário" },
  { key: "funcionarioNome", label: "Nome do Funcionário" },
  { key: "tipo", label: "Tipo", type: "select", options: [
    { value: "Ferias", label: "Férias" }, { value: "LicencaMedica", label: "Licença Médica" },
    { value: "LicencaMaternidade", label: "Licença Maternidade" }, { value: "LicencaPaternidade", label: "Licença Paternidade" },
    { value: "AusenciaJustificada", label: "Ausência Justificada" }, { value: "Outro", label: "Outro" }
  ]},
  { key: "dataInicio", label: "Data de Início" },
  { key: "dataFim", label: "Data de Fim" },
  { key: "motivo", label: "Motivo", type: "textarea" },
];

const FeriasLicencas = () => (
  <RHListPage title="Férias e Licenças" endpoint="ferias-licencas" columns={columns} formFields={formFields} emptyMessage="Nenhum pedido encontrado" />
);
export default FeriasLicencas;
