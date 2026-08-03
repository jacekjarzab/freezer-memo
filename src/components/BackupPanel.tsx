import type { ChangeEvent, RefObject } from 'react';
import type { TFunction } from 'i18next';

interface BackupPanelProps {
  inputRef: RefObject<HTMLInputElement | null>;
  isOpen: boolean;
  notice: string | null;
  noticeTone: 'success' | 'error';
  exportBackup: () => void;
  importButton: () => void;
  importFile: (event: ChangeEvent<HTMLInputElement>) => void;
  setIsOpen: (value: boolean) => void;
  t: TFunction;
}

export function BackupPanel({
  inputRef,
  isOpen,
  notice,
  noticeTone,
  exportBackup,
  importButton,
  importFile,
  setIsOpen,
  t,
}: BackupPanelProps) {
  return (
    <section className="panel backup-panel">
      <div className="panel-heading backup-header">
        <button
          className="backup-toggle"
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>
            <p className="eyebrow">{t('backup.eyebrow')}</p>
            <h3>{t('backup.title')}</h3>
          </span>
          <span className="backup-toggle-icon" aria-hidden="true">
            {isOpen ? '−' : '+'}
          </span>
        </button>
        <p className="panel-copy backup-subtitle">{t('backup.subtitle')}</p>
      </div>
      {isOpen ? (
        <>
          <div className="backup-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={exportBackup}
            >
              {t('backup.exportButton')}
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={importButton}
            >
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
            >
              {notice}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
