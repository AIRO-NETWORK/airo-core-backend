import yup from 'yup';

/**
 * Defines a schema for validating reward creation data using the Yup library.
 */
const schema = yup.object({
  totalWeeks: yup.number()
    .typeError('Expected a number for totalWeeks')
    .positive('Number of weeks left must be a positive value')
    .min(1, 'Total weeks must be greater than or equal to 1')
    .required('Total weeks is required'),
  total: yup.number()
    .typeError('Expected a number for total')
    .positive('Total sum must be a positive value')
    .min(1, 'Total Airo credits in the current period must be greater than or equal to 1')
    .required('Total is required'),
});

/**
 * Validate reward creation data against the defined schema.
 *
 * @param {object} data - The data to be validated.
 * @returns {Array} An array of validation errors, if any. Empty array if data is valid.
 */
export const validateRewardCreation = async (data) => {
  try {
    // Validate the provided data against the schema, collecting all errors (abortEarly: false).
    await schema.validate({ ...data }, { abortEarly: false });

    // If validation is successful, return an empty array indicating no errors.
    return [];
  } catch (e) {
    // If validation fails, return an array of validation errors.
    return e.errors;
  }
};
