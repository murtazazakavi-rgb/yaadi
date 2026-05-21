import { ReminderCandidate } from "../reminders/reminderEngine";

export type NotificationProvider = {
  send(candidate: ReminderCandidate): Promise<void>;
};

export class DeferredNotificationProvider implements NotificationProvider {
  async send(_candidate: ReminderCandidate): Promise<void> {
    // Sending is intentionally separated from reminder calculation. Supabase Edge Functions can swap this
    // provider for Expo push, email, WhatsApp, or SMS implementations without changing recurrence logic.
  }
}
