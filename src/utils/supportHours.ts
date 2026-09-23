// Centralized Customer Support Hours & Timezone Configuration (Asia/Kolkata)
export const SUPPORT_CONFIG = {
  TIMEZONE: 'Asia/Kolkata',
  START_HOUR: 10,   // 10:00 AM IST (10:00:00)
  START_MINUTE: 0,
  END_HOUR: 22,     // 10:00 PM IST (22:00:00)
  END_MINUTE: 0,
  START_TIME_LABEL: '10:00 AM',
  END_TIME_LABEL: '10:00 PM',
  HOURS_LABEL: '10:00 AM – 10:00 PM IST',
  TIMEZONE_LABEL: 'IST (Asia/Kolkata, UTC+05:30)',
  OPEN_HOURS_ACK_MESSAGE: `Thank you for contacting eToro Support. Your message has been received. Our support team is currently available and will respond as soon as possible. Please stay in the queue while we assist you. Thank you for your patience.`,
  OUT_OF_HOURS_MESSAGE: `Thank you for contacting eToro Support. Our support team is currently unavailable as our support hours are 10:00 AM to 10:00 PM IST. We have received your message and will assist you when our support team is available. Thank you for your patience.`
} as const;

export type SupportAckType = 'SUPPORT_HOURS_ACK' | 'OUT_OF_HOURS_ACK';

export interface SupportHoursStatus {
  isOpen: boolean;
  timezone: string;
  currentTimeIST: string;
  istDate: string;             // YYYY-MM-DD in Asia/Kolkata
  currentPeriodId: string;     // Unique ID for the current support window (e.g. open_2026-09-19 or ooh_2026-09-19)
  ackKey: string;              // Deterministic key for deduplication
  ackType: SupportAckType;
  hoursLabel: string;
  currentHour: number;
  currentMinute: number;
  currentSecond: number;
}

/**
 * Returns exact IST time components, date in Asia/Kolkata, and open/closed status for customer care.
 * Calculates time strictly in 'Asia/Kolkata' timezone regardless of local server or browser environment.
 * 
 * Strict Boundary rules:
 * - 10:00:00 AM IST through 09:59:59 PM IST (10:00:00 to 21:59:59) -> OPEN
 * - 10:00:00 PM IST through 09:59:59 AM IST (22:00:00 to 09:59:59) -> CLOSED
 */
export function getSupportHoursStatus(dateInput: Date = new Date()): SupportHoursStatus {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SUPPORT_CONFIG.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  const parts = formatter.formatToParts(dateInput);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);

  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  const istDate = `${year}-${formattedMonth}-${formattedDay}`;

  // Total seconds from midnight in IST
  const currentTotalSeconds = hour * 3600 + minute * 60 + second;
  const startTotalSeconds = SUPPORT_CONFIG.START_HOUR * 3600 + SUPPORT_CONFIG.START_MINUTE * 60; // 10:00:00 = 36000s
  const endTotalSeconds = SUPPORT_CONFIG.END_HOUR * 3600 + SUPPORT_CONFIG.END_MINUTE * 60;       // 22:00:00 = 79200s

  // Open if >= 10:00:00 and < 22:00:00
  const isOpen = currentTotalSeconds >= startTotalSeconds && currentTotalSeconds < endTotalSeconds;

  // Compute unique period identifier and ackKey for deduplication
  let currentPeriodId: string;
  let ackType: SupportAckType;
  let ackKey: string;

  if (isOpen) {
    ackType = 'SUPPORT_HOURS_ACK';
    currentPeriodId = `open_${istDate}`;
    ackKey = `ack_open_${istDate}`;
  } else {
    ackType = 'OUT_OF_HOURS_ACK';
    // Out-of-hours window starts at 22:00 on Day D and lasts until 10:00 on Day D+1.
    // If hour >= 22, the window started on Day D.
    // If hour < 10, the window started on Day D - 1.
    let periodKeyYear = year;
    let periodKeyMonth = month;
    let periodKeyDay = day;

    if (hour < SUPPORT_CONFIG.START_HOUR) {
      // Window started the previous day in IST
      const prevDate = new Date(dateInput.getTime() - 24 * 60 * 60 * 1000);
      const prevParts = formatter.formatToParts(prevDate);
      const prevMap: Record<string, string> = {};
      for (const p of prevParts) {
        prevMap[p.type] = p.value;
      }
      periodKeyYear = parseInt(prevMap.year, 10);
      periodKeyMonth = parseInt(prevMap.month, 10);
      periodKeyDay = parseInt(prevMap.day, 10);
    }

    const oohMonth = String(periodKeyMonth).padStart(2, '0');
    const oohDay = String(periodKeyDay).padStart(2, '0');
    currentPeriodId = `ooh_${periodKeyYear}-${oohMonth}-${oohDay}`;
    ackKey = `ack_closed_${currentPeriodId}`;
  }

  const formattedHour12 = ((hour % 12) || 12).toString().padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const currentTimeIST = `${formattedHour12}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')} ${ampm} IST`;

  return {
    isOpen,
    timezone: SUPPORT_CONFIG.TIMEZONE,
    currentTimeIST,
    istDate,
    currentPeriodId,
    ackKey,
    ackType,
    hoursLabel: SUPPORT_CONFIG.HOURS_LABEL,
    currentHour: hour,
    currentMinute: minute,
    currentSecond: second
  };
}

