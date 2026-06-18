import RHListPage from "./RHListPage";

const columns = [
  { key: "funcionarioNome", label: "Funcionário" },
  { key: "tipo", label: "Tipo" },
  { key: "gravidade", label: "Gravidade", align: "center" },
  { key: "dataOcorrencia", label: "Data", render: (item) => item.dataOcorrencia ? new Date(item.dataOcorrencia).toLocaleDateString() : "—" },
  { key: "status", label: "Status", align: "center", render: (item) => {
    const cores = { Registado: "text-yellow-400", EmInvestigacao: "text-orange-400", Concluido: "text-green-400", Arquivado: "text-gray-400", Recurso: "text-red-400" };
    return <span className={`px-2 py-1 rounded-full text-xs ${cores[item.status] || ""}`}>{item.status}</span>;
  }},
];

const formFields = [
  { key: "funcionarioId", label: "ID do Funcionário" },
  { key: "funcionarioNome", label: "Nome do Funcionário" },
  { key: "departamento", label: "Departamento" },
  { key: "tipo", label: "Tipo", type: "select", options: [
    { value: "AdvertenciaVerbal", label: "Advertência Verbal" }, { value: "AdvertenciaEscrita", label: "Advertência Escrita" },
    { value: "Suspensao", label: "Suspensão" }, { value: "Multa", label: "Multa" }, { value: "Outro", label: "Outro" }
  ]},
  { key: "gravidade", label: "Gravidade", type: "select", options: [
    { value: "Leve", label: "Leve" }, { value: "Moderada", label: "Moderada" },
    { value: "Grave", label: "Grave" }, { value: "Gravissima", label: "Gravíssima" }
  ]},
  { key: "dataOcorrencia", label: "Data da Ocorrência" },
  { key: "descricao", label: "Descrição", type: "textarea" },
  { key: "decisoesTomadas", label: "Decisões Tomadas", type: "textarea" },
  { key: "sancao", label: "Sanção Aplicada" },
];

const Disciplinar = () => (
  <RHListPage title="Gestão Disciplinar" endpoint="disciplinar" columns={columns} formFields={formFields} emptyMessage="Nenhum registo disciplinar" />
);
export default Disciplinar;
