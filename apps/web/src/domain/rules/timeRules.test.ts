import { describe, expect, it } from 'vitest';
import type { Appointment } from '../appointment';
import type { MessageLog } from '../communication';
import { addMonthsAt } from './dates';
import {
  cutoffAt,
  isNoShowSuggested,
  isOnCallList,
  isReminderDue,
  shouldMoveToNeedsCall,
  statusAfterReply,
} from './reminders';
import { isSlotTaken } from './slots';

const appt = (over: Partial<Appointment> = {}) =>
  ({
    id: 'a1',
    doctorId: 'd1',
    status: 'scheduled',
    date: '2026-10-25',
    time: '11:00',
    ...over,
  }) as Appointment;

const reminder = (over: Partial<MessageLog> = {}): MessageLog => ({
  id: 'm1',
  clinicId: 'c1',
  type: 'reminder',
  channel: 'whatsapp',
  appointmentId: 'a1',
  prescriptionId: null,
  status: 'queued',
  providerMessageId: null,
  scheduledFor: '2026-10-24T11:00',
  sentAt: null,
  deliveredAt: null,
  replies: [],
  ...over,
});
const sent = (over: Partial<MessageLog> = {}) =>
  reminder({ status: 'delivered', sentAt: '2026-10-24T11:00', ...over });

describe('reminder timing', () => {
  it('is due once its send time comes, and only while queued', () => {
    expect(isReminderDue(reminder(), '2026-10-24T10:59')).toBe(false);
    expect(isReminderDue(reminder(), '2026-10-24T11:00')).toBe(true);
    expect(isReminderDue(sent(), '2026-10-24T12:00')).toBe(false);
  });

  it('computes the cut-off from the slot start', () => {
    expect(cutoffAt(appt(), 3)).toBe('2026-10-25T08:00');
    expect(cutoffAt(appt({ time: null }), 3)).toBeNull();
  });
});

describe('no-reply cut-off', () => {
  it('moves a Scheduled appointment with an unanswered reminder once the cut-off passes', () => {
    expect(shouldMoveToNeedsCall(appt(), sent(), '2026-10-25T07:59', 3)).toBe(false);
    expect(shouldMoveToNeedsCall(appt(), sent(), '2026-10-25T08:00', 3)).toBe(true);
  });
  it('leaves it alone when the patient replied, no reminder went out, or it is not Scheduled', () => {
    const now = '2026-10-25T09:00';
    expect(
      shouldMoveToNeedsCall(
        appt(),
        sent({ replies: [{ reply: 'confirm', at: '2026-10-24T12:00' }] }),
        now,
        3,
      ),
    ).toBe(false);
    expect(shouldMoveToNeedsCall(appt(), reminder(), now, 3)).toBe(false);
    expect(shouldMoveToNeedsCall(appt(), undefined, now, 3)).toBe(false);
    expect(shouldMoveToNeedsCall(appt({ status: 'confirmed' }), sent(), now, 3)).toBe(false);
  });
});

describe('patient replies', () => {
  it('maps Confirm and Cancel to statuses', () => {
    expect(statusAfterReply('confirm')).toBe('confirmed');
    expect(statusAfterReply('cancel')).toBe('cancelled');
  });
});

describe('call list window', () => {
  it('holds Needs call appointments starting in the next 24 hours, nothing else', () => {
    const now = '2026-10-24T11:00';
    expect(isOnCallList(appt({ status: 'needs_call' }), now)).toBe(true);
    expect(isOnCallList(appt({ status: 'needs_call', date: '2026-10-26' }), now)).toBe(false);
    expect(
      isOnCallList(appt({ status: 'needs_call', date: '2026-10-24', time: '10:30' }), now),
    ).toBe(false);
    expect(isOnCallList(appt({ status: 'scheduled' }), now)).toBe(false);
  });
});

describe('no-show grace period', () => {
  it('suggests No show only after the grace period, and only before arrival', () => {
    expect(isNoShowSuggested(appt(), '2026-10-25T11:14', 15)).toBe(false);
    expect(isNoShowSuggested(appt(), '2026-10-25T11:15', 15)).toBe(true);
    expect(isNoShowSuggested(appt({ status: 'arrived' }), '2026-10-25T12:00', 15)).toBe(false);
    expect(isNoShowSuggested(appt({ time: null }), '2026-10-25T12:00', 15)).toBe(false);
  });
});

describe('double booking', () => {
  it('a non-cancelled appointment holds the slot', () => {
    expect(isSlotTaken([appt()], 'd1', '2026-10-25', '11:00')).toBe(true);
    expect(isSlotTaken([appt({ status: 'cancelled' })], 'd1', '2026-10-25', '11:00')).toBe(false);
    expect(isSlotTaken([appt()], 'd2', '2026-10-25', '11:00')).toBe(false);
  });
});

describe('dates', () => {
  it('adds months keeping the time of day', () => {
    expect(addMonthsAt('2026-10-25T11:00', 3)).toBe('2027-01-25T11:00');
  });
});
