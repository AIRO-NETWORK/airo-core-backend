/**
 * A higher-order function that wraps an asynchronous function to handle errors.
 *
 * @param {Function} asyncFn - An asynchronous function to be wrapped.
 * @returns {Function} An Express middleware function.
 */
export const handler = (asyncFn) => async (req, res, next) => {
  try {
    // Execute the provided asynchronous function with the request and response objects.
    await asyncFn(req, res);
  } catch (e) {
    // If an error occurs during execution, pass it to the next middleware.
    next(e);
  }
};
