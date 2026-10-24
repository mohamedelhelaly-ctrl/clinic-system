import { useClock } from '../../app/ClockProvider';
import { useNow } from '../../app/hooks';
import { useUi } from '../../app/uiState';
import { useClinicData } from '../../data';
import { addDays, findDayException, isSlotUnavailable, slotTimes } from '../../domain';
import { useI18n } from '../../i18n';

export interface SlotView {
  time: string;
  off: boolean;
  cls: string;
}

/** Day chips (today + 2) and slot buttons for the booking step and the reschedule sheet. */
export function useSlotPicker(doctorId: string | null) {
  const { t, fmt } = useI18n();
  const { ui, set } = useUi();
  const data = useClinicData();
  const now = useNow();
  const today = useClock().today();
  const docId = doctorId ?? 'd1';
  const schedule = data.schedules.find((s) => s.doctorId === docId)!;
  const doctor = data.doctors.find((d) => d.id === docId)!;
  const date = addDays(today, ui.bk.day);

  const days = [0, 1, 2].map((i) => ({
    label: (i === 0 ? `${t('today')} · ` : '') + fmt.dayLabel(addDays(today, i)),
    cls: ui.bk.day === i ? 'chip on' : 'chip',
    pick: () => set((s) => ({ bk: { ...s.bk, day: i, slot: null } })),
  }));

  const slots: SlotView[] = slotTimes(schedule, doctor.slotMinutes).map((time) => ({
    time,
    off: isSlotUnavailable(docId, date, time, {
      schedule,
      appointments: data.appointments,
      exceptions: data.scheduleExceptions,
      now,
    }),
    cls: ui.bk.slot === time ? 'slot on' : 'slot',
  }));

  const dayBlocked = doctorId ? !!findDayException(data.scheduleExceptions, doctorId, date) : false;

  return { days, slots, date, dayBlocked };
}
