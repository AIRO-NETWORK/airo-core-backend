/**
 * Returns the last element of an array.
 *
 * @param {Array} arr - The input array.
 * @returns {*} - The last element of the array, or undefined if the array is empty.
 */
export const last = (arr) => {
  // Check if the array is defined and not empty
  if (arr && arr.length > 0) {
    // Return the last element of the array
    return arr[arr.length - 1];
  }
  // Return undefined if the array is either undefined or empty
  return undefined;
};
