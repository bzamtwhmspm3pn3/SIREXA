import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { TEMAS, TAMANHOS_FONTE } from '../styles/themes';

const ThemeContext = createContext();

function getStorageKey(email) {
  return email ? `sirexa_theme_${email}` : 'sirexa_theme';
}

function loadPrefs(email) {
  try {
    const key = getStorageKey(email);
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { tema: 'normal', contraste: 'normal', tamanhoFonte: 'normal' };
}

export function ThemeProvider({ children }) {
  const { user, updateUserPrefs } = useAuth();
  const email = user?.email;
  const [prefs, setPrefs] = useState(() => loadPrefs(email));

  // Quando o user muda (login/logout), carregar prefs dele
  useEffect(() => {
    const userSpecific = loadPrefs(email);
    setPrefs(userSpecific);
  }, [email]);

  useEffect(() => {
    localStorage.setItem(getStorageKey(email), JSON.stringify(prefs));
    const root = document.documentElement;
    root.setAttribute('data-tema', prefs.tema);
    root.setAttribute('data-contraste', prefs.contraste);
    root.setAttribute('data-fonte', prefs.tamanhoFonte);
    const escala = (TAMANHOS_FONTE[prefs.tamanhoFonte] || TAMANHOS_FONTE.normal).scale;
    root.style.fontSize = `${16 * escala}px`;
  }, [prefs, email]);

  useEffect(() => {
    if (!localStorage.getItem(getStorageKey(email))) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const tema = mq.matches ? 'escuro' : 'claro';
      setPrefs((p) => ({ ...p, tema }));
    }
  }, [email]);

  const setTema = (id) => {
    setPrefs((p) => ({ ...p, tema: id }));
    updateUserPrefs({ tema: id });
  };

  const setTamanhoFonte = (valor) => {
    setPrefs((p) => ({ ...p, tamanhoFonte: valor }));
    updateUserPrefs({ tamanhoFonte: valor });
  };

  const toggleContraste = () => {
    setPrefs((p) => ({ ...p, contraste: p.contraste === 'alto' ? 'normal' : 'alto' }));
    updateUserPrefs({ contraste: prefs.contraste === 'alto' ? 'normal' : 'alto' });
  };

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
