import { handler } from '../../middlewares/handler';
import models from '../../models';

import { ADMIN_ROLES, requireAdminAuth } from '../../middlewares/adminAuth';
import { validateKeyCreation } from './validation';
import { requireClientAuth } from '../../middlewares/clientAuth';

/**
 * Validates the request body for creating a new key.
 * @returns {Array} An array of validation errors.
 */
const validate = () => [];

/**
 * Returns the wallet information for a key.
 * @param {Object} key - The key object.
 * @returns {Object} An object containing the wallet and ID of the key.
 */
const getWallet = (key) => ({
  wallet: key?.keyName,
  id: key?._id,
});

/**
 * Populates additional fields in the key object.
 * @param {Object} key - The key object.
 * @returns {Object} The key object with additional fields.
 */
const populateKey = (key) => ({
  ...key,
  id: key?._id,
});

/**
 * Creates a new key.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const createNewKey = async (req, res) => {
  const {
    keyName, keyPassword, type, keyBody,
  } = req.body;
  const errors = await validateKeyCreation({
    keyName, keyPassword, type, keyBody,
  });
  if (errors.length) {
    res.status(400).json({ message: errors.join(', ') });
    return;
  }
  const key = await models.createKey({
    keyName, keyPassword, type, keyBody,
  });
  res.status(200).json(key);
};

/**
 * Retrieves a list of keys.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const getKeys = async (req, res) => {
  const { role } = req.user;
  const {
    _sort,
    _order,
    _start,
    _end,
    ...filter
  } = req.query;
  const {
    id,
    ...filterRest
  } = filter;
  const ids = id && (Array.isArray(id) ? id : [id]);
  const sortField = _sort;
  const sortOrder = _order === 'ASC' ? 1 : -1;
  const skip = +_start;
  const limit = +_end - skip;
  const builtFilter = {
    $and: [
      { _id: { $ne: null } },
      ids && { _id: { $in: ids } },
      filterRest,
      role !== 'admin' && { type: 'reward' },
    ].filter((item) => !!item && !!Object.keys(item).length),
  };

  const total = await models.keysDb.count(builtFilter);
  const keys = await models.keysDb.find(builtFilter)
    .sort({ [sortField]: sortOrder }).skip(skip).limit(limit);
  const populatedItems = role !== 'admin' ? await Promise.all(keys.map(getWallet))
    : await Promise.all(keys.map(populateKey));
  res
    .setHeader('Access-Control-Expose-Headers', 'X-Total-Count')
    .setHeader('X-Total-Count', total)
    .status(200)
    .json(populatedItems);
};

/**
 * Retrieves a key by ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const getKey = async (req, res) => {
  const { id } = req.params;
  const item = await models.keysDb.findOne({ _id: id });
  if (!item) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const populatedItem = await populateKey(item);
  res.status(200).json(populatedItem);
};

/**
 * Updates a key by ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const updateKeyRoute = async (req, res) => {
  const { id } = req.params;
  const updateRequest = req.body;
  const errors = await validate(updateRequest);
  if (errors.length) {
    res.status(400).json({ errors });
    return;
  }
  const updated = await models.updateKey(id, { ...updateRequest });
  if (!updated) {
    res.status(404).json({ error: 'Update failed' });
    return;
  }
  const item = await models.keysDb.findOne({ _id: id });
  const populatedItem = await populateKey(item);
  res.status(200).json(populatedItem);
};
/**
 * Deletes a key by ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const deleteKey = async (req, res) => {
  const { id } = req.params;
  const removed = await models.keysDb.remove({ _id: id }, { multi: false });
  if (!removed) {
    res.status(404).json({ error: 'Remove failed' });
    return;
  }
  res.status(200).json({ message: 'OK' });
};

export default (app) => {
  /**
   * GET endpoint for retrieving a list of keys.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @returns {Promise<void>}
   */
  app.get('/keys', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(getKeys));

  /**
   * GET endpoint for retrieving a key by ID.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @returns {Promise<void>}
   */
  app.get('/keys/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(getKey));

  /**
   * PUT endpoint for updating a key by ID.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @returns {Promise<void>}
   */
  app.put('/keys/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(updateKeyRoute));

  /**
   * DELETE endpoint for deleting a key by ID.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @returns {Promise<void>}
   */
  app.delete('/keys/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(deleteKey));

  /**
   * POST endpoint for creating a new key.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @returns {Promise<void>}
   */
  app.post('/keys', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(createNewKey));

  /**
   * GET endpoint for retrieving a list of keys for the client API.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @returns {Promise<void>}
   */
  app.get('/client-api/keys', requireClientAuth(), handler(getKeys));
};
