type ResolveDiaryTimezoneParams = {
  locale: string;
  profileTimezone?: string | null;
  fallbackTimezone?: string;
};

const inferTimezoneFromLocale = (locale: string) => {
  const normalized = locale.toLowerCase();
  if (normalized === 'it' || normalized.startsWith('it-')) {
    return 'Europe/Rome';
  }

  return null;
};

const supportedTimeZones = typeof Intl.supportedValuesOf === 'function'
  ? new Set(Intl.supportedValuesOf('timeZone'))
  : null;

const isValidTimeZone = (timeZone: string) => {
  if (!timeZone) {
    return false;
  }

  if (supportedTimeZones) {
    return supportedTimeZones.has(timeZone);
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
    return true;
  } catch {
    return false;
  }
};

export const resolveDiaryTimezone = ({
  locale,
  profileTimezone,
  fallbackTimezone = 'UTC',
}: ResolveDiaryTimezoneParams) => {
  const candidates = [profileTimezone, inferTimezoneFromLocale(locale), fallbackTimezone];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    if (isValidTimeZone(candidate)) {
      return candidate;
    }
  }

  return 'UTC';
};
