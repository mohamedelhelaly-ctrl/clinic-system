import type { ReactNode } from 'react';
import type { ComponentType } from 'react';
import { Icon } from '../components';
import {
  CancelSheet,
  OverrideSheet,
  PaymentSheet,
  RescheduleSheet,
} from '../features/appointment/AppointmentSheets';
import { SlotsSheet } from '../features/booking/SlotsSheet';
import { EditPatientSheet } from '../features/patients/EditPatientSheet';
import { AdjustPackageSheet, NewPackageSheet } from '../features/payments/PackageSheets';
import { BlockDaySheet } from '../features/settings/BlockDaySheet';
import type { MessageKey } from '../i18n';
import { useI18n } from '../i18n';
import type { SheetName } from './uiState';
import { useUi } from './uiState';

type OpenSheet = Exclude<SheetName, ''>;

const SHEETS: Record<OpenSheet, { title: MessageKey; Content: ComponentType | null }> = {
  pay: { title: 'recordPayment', Content: PaymentSheet },
  cancel: { title: 'cancel', Content: CancelSheet },
  override: { title: 'override', Content: OverrideSheet },
  resched: { title: 'reschedule', Content: RescheduleSheet },
  slots: { title: 'chooseTime', Content: SlotsSheet },
  pkg: { title: 'newPackage', Content: NewPackageSheet },
  adj: { title: 'adjust', Content: AdjustPackageSheet },
  more: { title: 'more', Content: null },
  block: { title: 'blockOff', Content: BlockDaySheet },
  editpt: { title: 'editPatient', Content: EditPatientSheet },
};

/** Bottom sheet on phones, centred dialog on desktop. `more` is rendered by the shell. */
export function SheetHost({ moreContent }: { moreContent: ReactNode }) {
  const { t } = useI18n();
  const { ui, set } = useUi();
  if (!ui.sheet) return null;
  const { title, Content } = SHEETS[ui.sheet];
  const close = () => set({ sheet: '' });
  return (
    <div className="ovl" onClick={close}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="row sb">
          <h2>{t(title)}</h2>
          <button className="btn sm" aria-label={t('close')} onClick={close}>
            <Icon name="x" small />
          </button>
        </div>
        {Content ? <Content /> : moreContent}
      </div>
    </div>
  );
}
