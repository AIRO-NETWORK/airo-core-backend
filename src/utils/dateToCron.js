import moment from 'moment';

/**
 * Convert a Moment.js date to a cron schedule string.
 *
 * @param {Moment} momentDate - A Moment.js date object to be converted to a cron schedule.
 * @returns {string} A cron schedule string representing the provided date.
 */
export function dateToCron(momentDate) {
  // Multiply the Unix timestamp by 1000 to convert it to milliseconds and format it as a cron schedule.
  return moment(momentDate * 1000).format('ss mm HH DD MM dddd');
}
