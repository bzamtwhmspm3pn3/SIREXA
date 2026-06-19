import RHListPage from "./RHListPage";

const columns = [
  { key: "funcionarioNome", label: "Funcionário" },
  { key: "cargoAnterior", label: "Cargo Anterior" },
  { key: "cargoNovo", label: "Cargo Novo" },
  { key: "dataPromocao", label: "Data", render: (item) => item.dataPromocao ? new Date(item.dataPromocao).toLocaleDateString() : "—" },
  { key: "tipo", label: "Tipo", render: (item) => {
    const labels = { Promocao: "Promoção", Transferencia: "Transferência", Reajuste: "Reajuste", Reenquadramento: "Reenquadramento" };
    return labels[item.tipo] || item.tipo;
  }},
  { key: "status", label: "Status", align: "center", render: (item) => {
    const cores = { Proposta: "text-yellow-400", Aprovada: "text-green-400", Efetivada: "text-blue-400", Rejeitada: "text-red-400" };
    return <span className={`px-2 py-1 rounded-full text-xs ${cores[item.status] || ""}`}>{item.status}</span>;
  }},
];

const formFields = [
  { key: "funcionarioId", label: "Funcionário" },
  { key: "funcionarioNome", label: "Nome do Funcionário" },
  { key: "cargoAnterior", label: "Cargo Anterior" },
  { key: "cargoNovo", label: "Cargo Novo" },
  { key: "salarioAnterior", label: "Salário Anterior", type: "number" },
  { key: "salarioNovo", label: "Salário Novo", type: "number" },
  { key: "tipo", label: "Tipo", type: "select", options: [
    { value: "Promocao", label: "Promoção" }, { value: "Transferencia", label: "Transferência" },
    { value: "Reajuste", label: "Reajuste" }, { value: "Reenquadramento", label: "Reenquadramento" }
  ]},
  { key: "motivo", label: "Motivo", type: "textarea" },
  { key: "dataPromocao", label: "Data" },
];

const Promocoes = () => (
  <RHListPage title="Carreira e Promoções" endpoint="promocoes" columns={columns} formFields={formFields} emptyMessage="Nenhuma promoção registada" />
);
export default Promocoes;
