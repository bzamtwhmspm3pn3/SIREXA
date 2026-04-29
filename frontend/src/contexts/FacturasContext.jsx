import { createContext, useContext, useState } from 'react';

const FacturasContext = createContext();

export const useFacturas = () => useContext(FacturasContext);

export default function FacturasProvider({ children }) {
  const [facturas, setFacturas] = useState([]);

  const adicionarFactura = (factura) => {
    setFacturas((prev) => [...prev, factura]);
  };

  return (
    <FacturasContext.Provider value={{ facturas, adicionarFactura }}>
      {children}
    </FacturasContext.Provider>
  );
}

