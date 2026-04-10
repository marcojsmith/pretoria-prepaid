export const SECONDS_IN_MINUTE = 60;
export const SECONDS_IN_HOUR = SECONDS_IN_MINUTE * SECONDS_IN_MINUTE;
export const SECONDS_IN_DAY = 24 * SECONDS_IN_HOUR;
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = SECONDS_IN_MINUTE * MS_PER_SECOND;
export const MS_PER_HOUR = SECONDS_IN_HOUR * MS_PER_SECOND;
export const MS_PER_DAY = SECONDS_IN_DAY * MS_PER_SECOND;

export const HOURS_IN_DAY = 24;
export const DAYS_IN_WEEK = 7;
export const DAYS_IN_MONTH = 30;
export const DEFAULT_LOW_BALANCE_THRESHOLD = 10;
export const DEFAULT_PURCHASES_TAKE = 12;
export const DEFAULT_READINGS_TAKE = 100;

export const EXPONENTIAL_DECAY_FACTOR = 0.5;
export const ALERT_COOLDOWN_MS = MS_PER_DAY;

export const MS_PER_DAY_UNIT = 1000 * 60 * 60 * 24;

export const DATE_MONTH_LENGTH = 7;

export const DEFAULT_THRESHOLD = 10;
export const MAX_RECENT_PURCHASES = 50;
export const MAX_INTERVAL_READINGS = 6;
export const DEFAULT_PURCHASES_TO_SHOW = 7;
export const USERS_LIST_PAGE_SIZE = 50;

export const CRON_HOUR_MORNING = 6;
export const CRON_HOUR_EVENING = 16;

export const TIER_1_MIN = 1;
export const TIER_1_MAX = 100;
export const TIER_1_RATE = 3.42585;
export const TIER_2_MIN = 101;
export const TIER_2_MAX = 400;
export const TIER_2_RATE = 4.00936;
export const TIER_3_MIN = 401;
export const TIER_3_MAX = 650;
export const TIER_3_RATE = 4.36816;
export const TIER_4_MIN = 651;
export const TIER_4_RATE = 4.70902;

// eslint-disable-next-line llm-core/no-magic-numbers
export const TIER_NUMBERS = [1, 2, 3, 4] as const;
export const TIER_COUNT = 4;
