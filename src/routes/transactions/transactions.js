import { handler } from '../../middlewares/handler';
import { ADMIN_ROLES, requireAdminAuth } from '../../middlewares/adminAuth';
import { CLIENT_ROLES, requireClientAuth } from '../../middlewares/clientAuth';
import models from '../../models';

/**
 * Validate the request data.
 *
 * @returns {Array} An array of validation errors.
 */
const validate = () => [];

/**
 * Populate additional information for a transaction record.
 *
 * @param {object} key - The transaction record.
 * @returns {Promise<object>} The transaction record with additional information.
 */
const populateKey = async (key) => {
  const miner = await models.minersDb.findOne({ _id: key?.minerId });
  return {
    ...key,
    minersName: miner?.name,
    id: key?._id,
  };
};

/**
 * Create a new transaction record.
 *
 * @param {object} req - The HTTP request object.
 * @param {object} res - The HTTP response object.
 */
const createNewTransactionRecord = async (req, res) => {
  const {
    value, type, minerId, userId,
  } = req.body;
  const errors = await validate();
  if (errors.length) {
    res.status(400).json({ message: errors.join(', ') });
    return;
  }
  const transactionRecord = await models.createTransaction({
    value, type, minerId, userId,
  });
  res.status(200).json(transactionRecord);
};

/**
 * Get the transaction history.
 *
 * @param {object} req - The HTTP request object.
 * @param {object} res - The HTTP response object.
 */
const getTransactionHistory = async (req, res) => {
  // Extract user ID and role from the request object.
  const { id: userId, role } = req.user;

  // Extract query parameters including sorting, filtering, and pagination.
  const {
    _sort,
    _order,
    _start,
    _end,
    ...filter
  } = req.query;

  // Extract specific filter fields and IDs from the query parameters.
  const {
    id,
    _filter,
    ...filterRest
  } = filter;
  const ids = id && (Array.isArray(id) ? id : [id]);

  // Define the sorting criteria based on query parameters.
  const sortField = _sort;
  const sortOrder = _order === 'ASC' ? 1 : -1;

  // Calculate pagination parameters.
  const skip = +_start;
  const limit = +_end - skip;

  // Build a filter object based on the query parameters and user role.
  const builtFilter = {
    $and: [
      { _id: { $ne: null } },
      ids && { _id: { $in: ids } },
      filterRest,
      role !== 'admin' && { userId },
      role !== 'admin' && _filter !== '' && { minerId: _filter },
    ].filter((item) => !!item && !!Object.keys(item).length),
  };

  // Retrieve the total count of transaction records based on the filter.
  const total = await models.transactionHistoryDb.count(builtFilter);

  // Retrieve the transaction history records based on the filter and pagination.
  const transactionHistory = await models.transactionHistoryDb.find(builtFilter)
    .sort({ [sortField]: sortOrder }).skip(skip).limit(limit);

  // Populate additional information for each transaction record.
  const populatedItems = await Promise.all(transactionHistory.map(populateKey));

  // Set response headers for pagination and send the populated records as JSON.
  res
    .setHeader('Access-Control-Expose-Headers', 'X-Total-Count')
    .setHeader('X-Total-Count', total)
    .status(200)
    .json(populatedItems);

  return null;
};

/**
 * Get a specific transaction record.
 *
 * @param {object} req - The HTTP request object.
 * @param {object} res - The HTTP response object.
 */
const getTransactionRecord = async (req, res) => {
  // Extract the transaction record ID from the URL parameters.
  const { id } = req.params;

  // Find the transaction record by its ID.
  const item = await models.transactionHistoryDb.findOne({ _id: id });

  // If the record doesn't exist, return a 404 error.
  if (!item) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  // Populate additional information for the transaction record and send it as JSON.
  const populatedItem = await populateKey(item);
  res.status(200).json(populatedItem);
};

/**
 * Update a transaction record.
 *
 * @param {object} req - The HTTP request object.
 * @param {object} res - The HTTP response object.
 */
const updateTransactionRecord = async (req, res) => {
  // Extract the transaction record ID from the URL parameters.
  const { id } = req.params;

  // Extract the update data from the request body.
  const updateRequest = req.body;

  // Validate the update data and check for errors.
  const errors = await validate(updateRequest);

  // If there are validation errors, return a 400 error with the error details.
  if (errors.length) {
    res.status(400).json({ errors });
    return;
  }

  // Update the transaction record in the database.
  const updated = await models.updateTransaction(id, { ...updateRequest });

  // If the update was unsuccessful, return a 404 error.
  if (!updated) {
    res.status(404).json({ error: 'Update failed' });
    return;
  }

  // Find the updated transaction record and send it as JSON with additional information.
  const item = await models.transactionHistoryDb.findOne({ _id: id });
  const populatedItem = await populateKey(item);
  res.status(200).json(populatedItem);
};

/**
 * Delete a transaction record.
 *
 * @param {object} req - The HTTP request object.
 * @param {object} res - The HTTP response object.
 */
const deleteTransactionRecord = async (req, res) => {
  // Extract the transaction record ID from the URL parameters.
  const { id } = req.params;

  // Remove the transaction record from the database.
  const removed = await models.transactionHistoryDb.remove({ _id: id }, { multi: false });

  // If the removal was unsuccessful, return a 404 error.
  if (!removed) {
    res.status(404).json({ error: 'Remove failed' });
    return;
  }

  // Return a 200 status with a success message.
  res.status(200).json({ message: 'OK' });
};

/**
 * Define the routes and apply middleware to enforce authentication and authorization.
 *
 * @param {object} app - The Express application instance.
 */
export default (app) => {
  // Get transaction history route with admin authentication
  app.get('/transactions', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]),
    handler(getTransactionHistory));

  // Get transaction record route with admin authentication
  app.get('/transactions/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]),
    handler(getTransactionRecord));

  // Update transaction record route with admin authentication
  app.put('/transactions/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]),
    handler(updateTransactionRecord));

  // Delete transaction record route with admin authentication
  app.delete('/transactions/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]),
    handler(deleteTransactionRecord));

  // Create new transaction record route with admin authentication
  app.post('/transactions', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]),
    handler(createNewTransactionRecord));

  // Get transaction history route with client authentication
  app.get('/client-api/transactions', requireClientAuth([CLIENT_ROLES.ADMIN, CLIENT_ROLES.USER]),
    handler(getTransactionHistory));
};
