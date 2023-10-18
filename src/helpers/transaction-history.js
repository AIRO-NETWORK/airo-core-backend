import models from '../models';

/**
 * Gets the transaction history for a user.
 * @param {string} id - The ID of the user.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of transaction history objects.
 */
export const getTransactionHistory = async (id) => {
  // Find the transaction history for the user with the specified ID.
  const transactionHistory = await models.transactionHistoryDb.find({ userId: id });

  // Return the transaction history.
  return transactionHistory;
};
