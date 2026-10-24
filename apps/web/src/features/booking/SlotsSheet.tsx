import { useUi } from '../../app/uiState';
import { useSlotPicker } from './useSlots';

/** Phone-size slot picker for the booking flow. */
export function SlotsSheet() {
  const { ui, set } = useUi();
  const { days, slots } = useSlotPicker(ui.bk.doctorId);
  return (
    <>
      <div className="tabs">
        {days.map((d) => (
          <button key={d.label} className={d.cls} onClick={d.pick}>
            {d.label}
          </button>
        ))}
      </div>
      <div className="slots">
        {slots.map((s) => (
          <button
            key={s.time}
            className={s.cls}
            disabled={s.off}
            onClick={() => set((st) => ({ bk: { ...st.bk, slot: s.time, step: 3 }, sheet: '' }))}
          >
            {s.time}
          </button>
        ))}
      </div>
    </>
  );
}
