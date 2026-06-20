import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TEMAS, TAMANHOS_FONTE } from '../styles/themes';

const ThemeContext = createContext();

function loadPrefs() {
  try {
    const saved = localStorage.getItem('sirexa_theme');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { tema: 'normal', contraste: 'normal', tamanhoFonte: 'normal' };
}

export function ThemeProvider({ children }) {
  const [prefs, setPrefs] = useState(loadPrefs);

  useEffect(() => {
    localStorage.setItem('sirexa_theme', JSON.stringify(prefs));
    const root = document.documentElement;
    root.setAttribute('data-tema', prefs.tema);
    root.setAttribute('data-contraste', prefs.contraste);
    root.setAttribute('data-fonte', prefs.tamanhoFonte);
    const escala = (TAMANHOS_FONTE[prefs.tamanhoFonte] || TAMANHOS_FONTE.normal).scale;
    root.style.fontSize = `${16 * escala}px`;
  }, [prefs]);

  useEffect(() => {
    if (!localStorage.getItem('sirexa_theme')) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const tema = mq.matches ? 'escuro' : 'claro';
      setPrefs((p) => ({ ...p, tema }));
    }
  }, []);

  const setTema = (id) => setPrefs((p) => ({ ...p, tema: id }));
  const setTamanhoFonte = (valor) => setPrefs((p) => ({ ...p, tamanhoFonte: valor }));
  const toggleContraste = () => setPrefs((p) => ({ ...p, contraste: p.contraste === 'alto' ? 'normal' : 'alto' }));

  const temasDisponiveis = Object.entries(TEMAS).map(([id, t]) => ({ id, ...t }));

  return (
    <ThemeContext.Provider value={{
      prefs, tema: TEMAS[prefs.tema], temasDisponiveis,
      setTema, setTamanhoFonte, toggleContraste,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return ctx;
}
