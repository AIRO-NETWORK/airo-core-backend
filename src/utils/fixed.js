/**
 * Round a numeric value to a fixed number of decimal places.
 *
 * @param {number} value - The numeric value to be rounded.
 * @param {number} precision - The number of decimal places to round to (default is 2).
 * @returns {number} The rounded value with the specified precision.
 */
// eslint-disable-next-line arrow-body-style
export const fixed = (value, precision = 2) => {
  // Use the `toFixed` method to round the value to the specified precision.
  return +value.toFixed(precision);
};
