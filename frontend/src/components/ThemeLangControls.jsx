import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { IDIOMAS, TAMANHOS_FONTE } from '../styles/themes';
import { Sun, Moon, Accessibility, Droplets, Leaf, Palette, Globe, Type, Eye } from 'lucide-react';

const ICONS = {
  Moon: Moon, Sun: Sun, Accessibility: Accessibility,
  Droplets: Droplets, Leaf: Leaf,
};

export default function ThemeLangControls({ vertical = false }) {
  const { tema, prefs, setTema, tamanhoFonte, setTamanhoFonte, toggleContraste, temasDisponiveis } = useTheme();
  const { idioma, setIdioma, t } = useLanguage();
  const [aberto, setAberto] = useState(false);

  const TemaIcon = ICONS[tema.icon] || Palette;

  return (
    <div className={`relative ${vertical ? 'w-full' : ''}`}>
      <button
        onClick={() => setAberto(!aberto)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm
          ${vertical ? 'w-full justify-center border border-white/10 hover:bg-white/10' : 'hover:bg-white/10'}
          ${aberto ? 'bg-white/15 text-white' : 'text-gray-300 hover:text-white'}`}
        aria-label={t('common.tema_acao')}
        title={t('sidebar.acessibilidade')}
      >
        <TemaIcon size={16} />
        <span className="hidden lg:inline">{t(`theme.${tema.id}`)}</span>
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className={`${vertical ? 'static mt-2' : 'absolute right-0 top-full mt-2'} z-50 min-w-[260px] rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl p-4 space-y-4`}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Palette size={14} /> {t('sidebar.tema')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {temasDisponiveis.map((temaOp) => {
                const Icone = ICONS[temaOp.icon] || Palette;
                const ativo = prefs.tema === temaOp.id;
                return (
                  <button
                    key={temaOp.id}
                    onClick={() => setTema(temaOp.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs transition-all duration-200
                      ${ativo
                        ? 'border-blue-500/50 bg-blue-500/15 text-blue-400 shadow-md'
                        : 'border-white/5 hover:border-white/20 text-gray-400 hover:text-white hover:bg-white/5'}`}
                    role="radio"
                    aria-checked={ativo}
                    title={temaOp.desc || temaOp.label}
                  >
                    <Icone size={20} />
                    <span className="text-center leading-tight">
                      {idioma === 'pt' ? temaOp.label : idioma === 'fr' ? temaOp.labelFr : temaOp.labelEn}
                    </span>
                    {ativo && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-0.5"></span>}
                  </button>
                );
              })}
            </div>

            <hr className="border-white/5" />

            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Globe size={14} /> {t('sidebar.idioma')}
              </p>
              <div className="flex gap-2">
                {Object.entries(IDIOMAS).map(([key, lang]) => (
                  <button
                    key={key}
                    onClick={() => setIdioma(key)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
                      ${idioma === key
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'}`}
                    role="radio"
                    aria-checked={idioma === key}
                  >
                    <span className="mr-1">{lang.flag}</span>
                    {lang.labelLocal}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-white/5" />

            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Eye size={14} /> {t('sidebar.acessibilidade')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const ordens = ['normal', 'grande', 'muito-grande'];
                    const idx = (ordens.indexOf(prefs.tamanhoFonte) + 1) % ordens.length;
                    setTamanhoFonte(ordens[idx]);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all duration-200"
                  title={t('common.fonte_acao')}
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
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200
                    ${prefs.contraste === 'alto'
                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border-white/5 hover:border-white/20'}`}
                  title={t('sidebar.contraste')}
                  role="switch"
                  aria-checked={prefs.contraste === 'alto'}
                >
                  <Accessibility size={14} />
                  <span>HC</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
