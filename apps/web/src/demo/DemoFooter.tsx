import { useClock } from '../app/ClockProvider';
import { Icon } from '../components';
import { datePart, timePart } from '../domain';
import { useI18n } from '../i18n';
import { useDemo } from './DemoProvider';
import './demo.css';

/**
 * "Demo" badge, fictional-data notice, the demo clock and the reset button.
 * Demo builds only.
 */
export function DemoFooter({
  fixed = false,
  clockControls = true,
  onReset,
}: {
  fixed?: boolean;
  clockControls?: boolean;
  onReset?: () => void;
}) {
  const { t, fmt } = useI18n();
  const demo = useDemo();
  const now = useClock().now();
  // Recording mode keeps only the badge.
  if (demo.clean) {
    return (
      <footer className="demo-foot">
        <span className="demo-badge">{t('demoBadge')}</span>
      </footer>
    );
  }
  return (
    <footer className={fixed ? 'demo-foot fixed' : 'demo-foot'}>
      <span className="demo-badge">{t('demoBadge')}</span>
      <span>{t('demoFictional')}</span>
      {clockControls && (
        <span className="demo-clock" data-testid="demo-clock-controls">
          <span>
            {t('demoTime')}:{' '}
            <b data-testid="demo-clock">{`${fmt.dayLabel(datePart(now))} ${timePart(now)}`}</b>
          </span>
          <button
            className="btn sm"
            data-testid="demo-plus-hour"
            onClick={() => void demo.advance((c) => c.advanceHours(1))}
          >
            {t('demoPlusHour')}
          </button>
          <button
            className="btn sm"
            data-testid="demo-plus-day"
            onClick={() => void demo.advance((c) => c.advanceHours(24))}
          >
            {t('demoPlusDay')}
          </button>
          <button
            className="btn sm"
            data-testid="demo-plus-month"
            onClick={() => void demo.advance((c) => c.advanceMonths(1))}
          >
            {t('demoPlusMonth')}
          </button>
        </span>
      )}
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
