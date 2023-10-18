import yup from 'yup';

/**
 * Schema for validating key creation.
 * @type {Object}
 */
const createSchema = yup.object({
  keyPassword: yup.string().typeError('Expected string for key password')
    .min(8, 'Password must be at least 8 characters long')
    .max(16, 'Password must be maximum 16 characters long')
    .matches(/[a-z]/, 'Password must contain at least one lowercase character')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase character')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/\W/, 'Password must contain at least one special character')
    .required(),
  keyName: yup.string().typeError('Expected string for Key name').required(),
  keyBody: yup.object().typeError('Expected JSON object for Key body').required(),
});

/**
 * Validates key creation.
 * @param {Object} params - The parameters for key creation.
 * @param {string} params.keyName - The name of the key.
 * @param {string} params.keyPassword - The password for the key.
 * @param {string} params.type - The type of the key.
 * @param {Object} params.keyBody - The body of the key.
 * @returns {Promise<Array<string>>} - An array of validation errors or an empty array if validation passes.
 */
export const validateKeyCreation = async ({
  keyName, keyPassword, type, keyBody,
}) => {
  try {
    await createSchema.validate(
      {
        keyName, keyPassword, type, keyBody,
      },
      { abortEarly: false },
    );
    return [];
  } catch (e) {
    return e.errors;
  }
};
