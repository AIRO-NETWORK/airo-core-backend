/**
 * Asynchronous function that waits for a specified delay.
 *
 * @param {number} delay - The delay in milliseconds to wait.
 * @returns {Promise<void>} - A promise that resolves after the specified delay.
 */
export const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

/**
 * Calculates the time elapsed since the provided previous time.
 *
 * @param {number[]} prevTime - The previous time represented as an array of seconds and nanoseconds,
 * typically obtained from `process.hrtime()`.
 * @returns {number} - The time elapsed in milliseconds.
 */
export const timeSince = (prevTime = null) => {
  if (!prevTime) {
    // If no previous time is provided, return the current time as measured by `process.hrtime()`.
    return process.hrtime();
  }
  // Calculate the time elapsed by subtracting the previous time from the current time.
  const timeElapsed = process.hrtime(prevTime);
  // Convert the time elapsed to milliseconds and return the result.
  return timeElapsed[0] * 1e3 + timeElapsed[1] / 1e6;
};
