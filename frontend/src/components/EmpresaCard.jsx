import React from "react";

const EmpresaCard = ({ empresa }) => {
  if (!empresa) return null;

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 text-white max-w-3xl mx-auto mt-6 border border-amber-600">
      <div className="flex flex-col md:flex-row gap-6 items-center">
        {empresa.logo && (
          <img
            src={empresa.logo}
            alt="Logotipo da Empresa"
            className="w-32 h-32 object-contain bg-white rounded shadow"
          />
        )}

        <div className="flex-1 space-y-1">
          <h2 className="text-2xl font-bold">{empresa.nome}</h2>
          <p><strong>NIF:</strong> {empresa.nif}</p>
          <p><strong>Localização:</strong> {empresa.localizacao}</p>
          <p><strong>Email:</strong> {empresa.email}</p>
          <p><strong>Telefone:</strong> {empresa.telefone}</p>
          <p><strong>Objecto Social:</strong> {empresa.objetoSocial}</p>
        </div>
      </div>
    </div>
  );
};

export default EmpresaCard;
