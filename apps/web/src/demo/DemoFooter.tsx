import { Icon } from '../components';
import { useI18n } from '../i18n';
import { useDemo } from './DemoProvider';
import './demo.css';

/** "Demo" badge, fictional-data notice and the reset button. Demo builds only. */
export function DemoFooter({ fixed = false, onReset }: { fixed?: boolean; onReset?: () => void }) {
  const { t } = useI18n();
  const demo = useDemo();
  return (
    <footer className={fixed ? 'demo-foot fixed' : 'demo-foot'}>
      <span className="demo-badge">{t('demoBadge')}</span>
      <span>{t('demoFictional')}</span>
      <button
        className="btn sm"
        data-testid="demo-reset"
        onClick={() => {
          demo.reset();
          onReset?.();
        }}
      >
        <Icon name="reset" small />
        {t('resetDemo')}
      </button>
    </footer>
  );
}
