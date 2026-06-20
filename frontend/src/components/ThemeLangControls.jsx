import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { IDIOMAS, TAMANHOS_FONTE } from '../styles/themes';
import { Monitor, Moon, Sun, Palette, Globe, Type } from 'lucide-react';

const ICONS = { Monitor, Moon, Sun };
const ICON_FALLBACK = Palette;

export default function ThemeLangControls({ vertical = false }) {
  const { prefs, setTema, setTamanhoFonte, toggleContraste, temasDisponiveis } = useTheme();
  const { idioma, setIdioma, t } = useLanguage();
  const [aberto, setAberto] = useState(false);

  const TemaIcon = ICONS[prefs.tema] || ICON_FALLBACK;

  return (
    <div className={`relative ${vertical ? 'w-full' : ''}`}>
      <button
        onClick={() => setAberto(!aberto)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm
          ${vertical ? 'w-full justify-center border border-white/10 hover:bg-white/10' : 'hover:bg-white/10'}
          ${aberto ? 'bg-white/15' : 'text-gray-300 hover:text-white'}`}
        aria-label={t('common.tema_acao')}
      >
        <TemaIcon size={16} />
        {vertical && <span>{t('sidebar.tema')}</span>}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className={`${vertical ? 'static mt-2' : 'absolute right-0 top-full mt-2'} z-50 min-w-[240px] rounded-xl border shadow-2xl p-4 space-y-4`} style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            {/* Temas */}
            <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Palette size={14} /> {t('sidebar.tema')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {temasDisponiveis.map((temaOp) => {
                const Icone = ICONS[temaOp.id] || ICON_FALLBACK;
                const ativo = prefs.tema === temaOp.id;
                return (
                  <button
                    key={temaOp.id}
                    onClick={() => setTema(temaOp.id)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-xs transition-all duration-200
                      ${ativo ? 'ring-2 ring-blue-500/50 bg-blue-500/15' : 'hover:bg-white/5'}`}
                    style={{ color: ativo ? 'var(--accent)' : 'var(--text-secondary)' }}
                    role="radio"
                    aria-checked={ativo}
                  >
                    <Icone size={18} />
                    <span className="text-center leading-tight">
                      {idioma === 'pt' ? temaOp.label : idioma === 'fr' ? temaOp.labelFr : temaOp.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>

            <hr style={{ borderColor: 'var(--border)' }} />

            {/* Idioma */}
            <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Globe size={14} /> {t('sidebar.idioma')}
            </p>
            <div className="flex gap-2">
              {Object.entries(IDIOMAS).map(([key, lang]) => {
                const isActive = idioma === key;
                const isFuture = key !== 'pt';
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isFuture) {
                        alert('🇬🇧 English and 🇫🇷 Français will be available in a future update.\n\n🇬🇧 English e 🇫🇷 Français estarão disponíveis numa futura actualização.');
                        return;
                      }
                      setIdioma(key);
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
                      ${isActive ? 'ring-2 ring-blue-500/50 bg-blue-500/15' : isFuture ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'}`}
                    style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}
                    disabled={isFuture}
                    title={isFuture ? (idioma === 'pt' ? 'Disponível numa futura actualização' : 'Available in a future update') : undefined}
                  >
                    {lang.flag} {lang.labelLocal}
                    {isFuture && <span className="block text-[9px] opacity-60 mt-0.5">em breve</span>}
                  </button>
                );
              })}
            </div>

            <hr style={{ borderColor: 'var(--border)' }} />

            {/* Fonte + Contraste */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const ordens = ['normal', 'grande', 'muito-grande'];
                  const idx = (ordens.indexOf(prefs.tamanhoFonte) + 1) % ordens.length;
                  setTamanhoFonte(ordens[idx]);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-white/5"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Type size={14} />
                <span>{idioma === 'fr'
                  ? TAMANHOS_FONTE[prefs.tamanhoFonte]?.labelFr
                  : idioma === 'en'
                    ? TAMANHOS_FONTE[prefs.tamanhoFonte]?.labelEn
                    : TAMANHOS_FONTE[prefs.tamanhoFonte]?.label}
                </span>
              </button>
              <button
                onClick={toggleContraste}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
                  ${prefs.contraste === 'alto' ? 'ring-2 ring-yellow-500/50 bg-yellow-500/15' : 'hover:bg-white/5'}`}
                style={{ color: prefs.contraste === 'alto' ? '#eab308' : 'var(--text-secondary)' }}
                role="switch"
                aria-checked={prefs.contraste === 'alto'}
              >
                <span style={{ fontWeight: 900, fontSize: 14 }}>Aa</span>
                <span>HC</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
