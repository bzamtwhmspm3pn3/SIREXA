import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import pt from '../locales/pt.json';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

const LanguageContext = createContext();

const TRADUCOES = { pt, en, fr };

function loadIdioma() {
  try {
    return localStorage.getItem('sirexa_idioma') || 'pt';
  } catch {
    return 'pt';
  }
}

export function LanguageProvider({ children }) {
  const [idioma, setIdioma] = useState(loadIdioma);

  useEffect(() => {
    localStorage.setItem('sirexa_idioma', idioma);
    document.documentElement.setAttribute('lang', idioma === 'pt' ? 'pt' : idioma);
  }, [idioma]);

  const t = useCallback((chave, params = {}) => {
    const keys = chave.split('.');
    let valor = TRADUCOES[idioma];
    for (const k of keys) {
      valor = valor?.[k];
      if (valor === undefined) break;
    }
    if (valor === undefined) {
      let fallback = TRADUCOES.pt;
      for (const k of keys) {
        fallback = fallback?.[k];
        if (fallback === undefined) break;
      }
      valor = fallback ?? chave;
    }
    if (params && Object.keys(params).length > 0) {
      Object.entries(params).forEach(([key, val]) => {
        valor = valor.replace(`{${key}}`, val);
      });
    }
    return valor;
  }, [idioma]);

  return (
    <LanguageContext.Provider value={{ idioma, setIdioma, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage deve ser usado dentro de LanguageProvider');
  return ctx;
}
