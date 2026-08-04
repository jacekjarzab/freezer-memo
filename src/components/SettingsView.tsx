import type { ChangeEvent, RefObject } from 'react';
import type { TFunction } from 'i18next';

interface SettingsViewProps {
  inputRef: RefObject<HTMLInputElement | null>;
  language: string;
  notice: string | null;
  noticeTone: 'success' | 'error';
  exportBackup: () => void;
  importButton: () => void;
  importFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  updateLanguage: (language: 'en' | 'pl') => void;
  t: TFunction;
}

export function SettingsView({
  inputRef,
  language,
  notice,
  noticeTone,
  exportBackup,
  importButton,
  importFile,
  onBack,
  updateLanguage,
  t,
}: SettingsViewProps) {
  return (
    <section className="settings-view panel" aria-labelledby="settings-title">
      <header className="settings-header">
        <div>
          <p className="eyebrow">{t('settings.eyebrow')}</p>
          <h1 id="settings-title">{t('settings.title')}</h1>
          <p className="panel-copy">{t('settings.subtitle')}</p>
        </div>
        <button className="secondary-button settings-back" type="button" onClick={onBack}>
          {t('actions.back')}
        </button>
      </header>

      <section className="settings-section" aria-labelledby="settings-language-title">
        <div>
          <p className="section-label" id="settings-language-title">
            {t('settings.language')}
          </p>
          <p className="panel-copy">{t('settings.languageDescription')}</p>
        </div>
        <div className="settings-language" role="group" aria-label={t('settings.language')}>
          <button
            className={language === 'en' ? 'language-chip active' : 'language-chip'}
            type="button"
            aria-pressed={language === 'en'}
            onClick={() => updateLanguage('en')}
          >
            EN
          </button>
          <button
            className={language === 'pl' ? 'language-chip active' : 'language-chip'}
            type="button"
            aria-pressed={language === 'pl'}
            onClick={() => updateLanguage('pl')}
          >
            PL
          </button>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="settings-data-title">
        <div>
          <p className="section-label" id="settings-data-title">
            {t('settings.data')}
          </p>
          <p className="panel-copy">{t('backup.subtitle')}</p>
        </div>
        <div className="settings-data-actions">
          <button className="secondary-button" type="button" onClick={exportBackup}>
            {t('backup.exportButton')}
          </button>
          <button className="primary-button" type="button" onClick={importButton}>
            {t('backup.importButton')}
          </button>
          <input
            ref={inputRef}
            accept="application/json"
            className="visually-hidden"
            type="file"
            onChange={importFile}
          />
        </div>
        <article className="backup-card">
          <strong>{t('backup.replaceTitle')}</strong>
          <p>{t('backup.replaceCopy')}</p>
        </article>
        {notice ? (
          <p
            className={
              noticeTone === 'success'
                ? 'backup-notice success'
                : 'backup-notice error'
            }
            role={noticeTone === 'success' ? 'status' : 'alert'}
          >
            {notice}
          </p>
        ) : null}
      </section>
    </section>
  );
}
