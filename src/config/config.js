/**
 * This module imports the 'env' module from the './env' file.
 * @module env
 */

import env from './env';

/**
 * The period reward value.
 * @constant {number} PERIOD_REWARD
 * @default 600
 */
export const PERIOD_REWARD = parseInt(env.REWARD_PERIOD, 10) || 600;

/**
 * The count period metrics value.
 * @constant {number} COUNT_PERIOD_METRICS
 * @default 120
 */
export const COUNT_PERIOD_METRICS = parseInt(env.COUNT_PERIOD_METRICS, 10) || 120;

/**
 * The cron period value.
 * @constant {string} CRON_PERIOD
 * @default '* / 2 * * * *'
 */
export const CRON_PERIOD = env.METRICS_CRON || '*/2 * * * *';

/**
 * The count period reward value.
 * @constant {number} COUNT_PERIOD_REWARD
 * @default 5
 */
export const COUNT_PERIOD_REWARD = parseInt(env.REWARD_PERIOD_COUNT, 10) || 5;

/**
 * The MultiversX denomination value.
 * @constant {number} MULTIVERSX_DENOMINATION
 * @default 1e18
 */
export const MULTIVERSX_DENOMINATION = parseFloat(env.MULTIVERSX_DENOMINATION) || 1e18;
