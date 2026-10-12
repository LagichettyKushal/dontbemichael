/** Shared policy for showing an email-access warning beside schedules. */
import type { MailAccessConfig } from './mailboxes';
import type { ConnectorConfig } from './claudeConnectors';
import { isGmailKey, usableConnectors } from './claudeConnectors';
import type { ScheduledMission } from './missions';

export type EmailScheduleConfig = MailAccessConfig & ConnectorConfig;

/** Schedule labels are owner prose, not typed jobs, so this intentionally warns
 * only for wording that clearly names email, an inbox, or a mailbox. */
export function isEmailSchedule(mission: Pick<ScheduledMission, 'label' | 'focus' | 'kind'>): boolean {
  if ((mission.kind ?? 'dispatch') !== 'dispatch') return false;
  return /\b(?:e-?mails?|inbox(?:es)?|mailbox(?:es)?)\b/i.test(`${mission.label}\n${mission.focus ?? ''}`);
}

/** A connected watched mailbox or granted connected Gmail connector can read mail. */
export function canCheckEmail(config: EmailScheduleConfig, agentId: string): boolean {
  const email = config.agentCapabilities?.[agentId]?.email;
  const mailboxId = email?.enabled ? email.mailboxes[0] : undefined;
  if (mailboxId && config.mailboxes?.some((mailbox) => mailbox.id === mailboxId && mailbox.status === 'connected')) return true;
  return usableConnectors(config, agentId, false)
    .some((connector) => isGmailKey(connector.key) && connector.status === 'connected');
}

export function needsEmailAccessWarning(
  mission: Pick<ScheduledMission, 'label' | 'focus' | 'kind'>,
  config: EmailScheduleConfig | null | undefined,
  agentId: string
): boolean {
  return !!config && isEmailSchedule(mission) && !canCheckEmail(config, agentId);
}
