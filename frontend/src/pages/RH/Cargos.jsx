import React from "react";
import RHListPage from "./RHListPage";

const columns = [
  { key: "nome", label: "Cargo" },
  { key: "nivel", label: "Nível", align: "center" },
  { key: "departamento", label: "Departamento" },
  { key: "salarioMin", label: "Salário Mín", render: (item) => item.salarioMin ? `${item.salarioMin.toLocaleString()} Kz` : "—" },
  { key: "salarioMax", label: "Salário Máx", render: (item) => item.salarioMax ? `${item.salarioMax.toLocaleString()} Kz` : "—" },
  { key: "descricao", label: "Descrição", render: (item) => item.descricao ? item.descricao.substring(0, 60) + (item.descricao.length > 60 ? "..." : "") : "—" },
];

const formFields = [
  { key: "nome", label: "Nome do Cargo" },
  { key: "nivel", label: "Nível Hierárquico", type: "number" },
  { key: "departamento", label: "Departamento" },
  { key: "salarioMin", label: "Salário Mínimo (Kz)", type: "number" },
  { key: "salarioMax", label: "Salário Máximo (Kz)", type: "number" },
  { key: "descricao", label: "Descrição", type: "textarea" },
  { key: "requisitos", label: "Requisitos", type: "textarea" },
];

const Cargos = () => (
  <RHListPage title="Cargos e Hierarquias" endpoint="cargos" columns={columns} formFields={formFields} emptyMessage="Nenhum cargo definido" />
);
export default Cargos;
