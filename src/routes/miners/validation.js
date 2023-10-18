import yup from 'yup';

/**
 * Defines a schema for validating miner creation data using the Yup library.
 */
const schema = yup.object({
  name: yup.string()
    .typeError('Expected string for miner name')
    .required()
    .max(16, 'Miner name must be at most 16 characters long'),
  model: yup.string()
    .typeError('Expected string for miner model')
    .required('Miner model is required'),
  serialId: yup.string()
    .typeError('Expected string for miner serial id')
    .required('Miner serial id is required'),
  userId: yup.string()
    .typeError('Expected string for miner user id'),
  currentAIRO: yup.number()
    .typeError('Expected number for miner AIRO')
    .min(0, 'Miner currentAIRO must be greater than or equal to 0'),
  ageRate: yup.number()
    .typeError('Expected number for miner AIRO')
    .min(0, 'Miner ageRate must be greater than or equal to 0')
    .max(100, 'Miner ageRate must be less than or equal to 100'),
  totalRewards: yup.number()
    .typeError('Expected number for miner AIRO')
    .min(0, 'Miner totalRewards must be greater than or equal to 0'),
  connectDate: yup.date()
    .typeError('Expected date for miner connect date'),
});

/**
 * Validate miner creation data against the defined schema.
 *
 * @param {object} data - The data to be validated.
 * @returns {Array} An array of validation errors, if any. Empty array if data is valid.
 */
export const validateMinerCreation = async (data) => {
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
