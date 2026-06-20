import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TEMAS, TAMANHOS_FONTE } from '../styles/themes';

const ThemeContext = createContext();

function getSystemTheme() {
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'diurno';
  return 'noturno';
}

function getSystemContrast() {
  if (window.matchMedia('(prefers-contrast: more)').matches) return 'alto';
  return 'normal';
}

function loadPrefs() {
  try {
    const saved = localStorage.getItem('sirexa_theme');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    tema: getSystemTheme(),
    contraste: getSystemContrast(),
    tamanhoFonte: 'normal',
  };
}

export function ThemeProvider({ children }) {
  const [prefs, setPrefs] = useState(loadPrefs);

  const tema = TEMAS[prefs.tema] || TEMAS.noturno;
  const tamanhoFonte = TAMANHOS_FONTE[prefs.tamanhoFonte] || TAMANHOS_FONTE.normal;

  const aplicarTema = useCallback(() => {
    const root = document.documentElement;
    const css = { ...tema.css };

    if (prefs.contraste === 'alto') {
      css['--bg-body'] = '#000000';
      css['--text-primary'] = '#ffffff';
      css['--text-secondary'] = '#ffffff';
      css['--text-muted'] = '#cccccc';
      css['--border'] = '#ffffff';
      css['--accent'] = tema.id === 'diurno' ? '#0000ff' : '#ffff00';
    }

    Object.entries(css).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    root.style.fontSize = `${16 * tamanhoFonte.scale}px`;

    root.setAttribute('data-tema', prefs.tema);
    root.setAttribute('data-contraste', prefs.contraste);
    root.setAttribute('data-fonte', prefs.tamanhoFonte);

    if (prefs.tema === 'diurno') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [prefs, tema.css, tamanhoFonte.scale]);

  useEffect(() => {
    aplicarTema();
    localStorage.setItem('sirexa_theme', JSON.stringify(prefs));
  }, [prefs, aplicarTema]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (!localStorage.getItem('sirexa_theme')) {
        setPrefs((p) => ({ ...p, tema: getSystemTheme() }));
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTema = (id) => setPrefs((p) => ({ ...p, tema: id }));
  const setContraste = (valor) => setPrefs((p) => ({ ...p, contraste: valor }));
  const setTamanhoFonte = (valor) => setPrefs((p) => ({ ...p, tamanhoFonte: valor }));
  const toggleContraste = () => setPrefs((p) => ({ ...p, contraste: p.contraste === 'alto' ? 'normal' : 'alto' }));
  const cicloFonte = () => {
    const ordens = ['normal', 'grande', 'muito-grande'];
    setPrefs((p) => {
      const idx = (ordens.indexOf(p.tamanhoFonte) + 1) % ordens.length;
      return { ...p, tamanhoFonte: ordens[idx] };
    });
  };

  const temasDisponiveis = Object.entries(TEMAS).map(([id, t]) => ({ id, ...t }));

  return (
    <ThemeContext.Provider value={{
      prefs, tema, tamanhoFonte, temasDisponiveis,
      setTema, setContraste, setTamanhoFonte, toggleContraste, cicloFonte,
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
