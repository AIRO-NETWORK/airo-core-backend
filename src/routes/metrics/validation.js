import yup from 'yup';

/**
 * Schema for validating metric creation.
 * @type {Object}
 */
const createSchema = yup.object({
  minerId: yup.string().typeError('Expected string for minerId').required(),
});

/**
 * Validates metric creation.
 * @param {Object} params - The parameters for metric creation.
 * @param {string} params.minerId - The ID of the miner.
 * @param {number} params.temperature - The temperature value.
 * @param {number} params.pressure - The pressure value.
 * @param {number} params.humidity - The humidity value.
 * @param {number} params.co - The CO value.
 * @param {number} params.co2 - The CO2 value.
 * @param {number} params.dust1 - The dust1 value.
 * @param {number} params.dust25 - The dust25 value.
 * @param {number} params.dust10 - The dust10 value.
 * @param {number} params.quality - The quality value.
 * @returns {Promise<Array<string>>} - An array of validation errors or an empty array if validation passes.
 */
export const validateMetricCreation = async ({
  minerId, temperature, pressure, humidity,
  co, co2, dust1, dust25, dust10, quality,
}) => {
  try {
    await createSchema.validate({
      minerId,
      temperature,
      pressure,
      humidity,
      co,
      co2,
      dust1,
      dust25,
      dust10,
      quality,
    }, { abortEarly: false });
    return [];
  } catch (e) {
    return e.errors;
  }
};
