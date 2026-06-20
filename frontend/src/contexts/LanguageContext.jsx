import { createContext, useContext, useCallback } from 'react';
import pt from '../locales/pt.json';

const LanguageContext = createContext();
const PT = pt;

export function LanguageProvider({ children }) {
  const t = useCallback((chave, params = {}) => {
    let valor = PT[chave];
    if (valor === undefined) {
      return chave.split('.').pop();
    }
    if (params && Object.keys(params).length > 0) {
      Object.entries(params).forEach(([key, val]) => {
        valor = valor.replace(`{${key}}`, val);
      });
    }
    return valor;
  }, []);

  return (
    <LanguageContext.Provider value={{ idioma: 'pt', setIdioma: () => {}, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage deve ser usado dentro de LanguageProvider');
  return ctx;
}
