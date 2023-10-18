import { handler } from '../../middlewares/handler';

import { ADMIN_ROLES, requireAdminAuth } from '../../middlewares/adminAuth';
import { requireClientAuth } from '../../middlewares/clientAuth';
import { validateMetricCreation } from './validation';
import models from '../../models';

/**
 * Validates the metric creation request.
 * @returns {Array} - An array of error messages.
 */
const validate = () => []; // TODO implement full validation

/**
 * Populates the metric object with the ID property.
 * @param {Object} metric - The metric object.
 * @returns {Object} - The metric object with the ID property.
 */
const populateMetric = (metric) => ({
  ...metric,
  id: metric?._id,
});

/**
 * Creates a new metric.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const createNewMetric = async (req, res) => {
  const {
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
  } = req.body;

  // Validate the metric creation request
  const errors = await validateMetricCreation({
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
  });

  // Check if there are errors
  if (errors.length) {
    res.status(400).json({ errors });
    return;
  }

  // Create a new metric
  const metric = await models.createMetric({
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
  });

  // Return the created metric
  res.status(200).json(metric);
};
/**
 * Fetches metrics based on query parameters.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const getMetrics = async (req, res) => {
  const { id: userId, role } = req.user;

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
  let metrics;
  let total;

  if (role !== 'admin') {
    const { name } = filterRest;

    // Find the miner associated with the user and name
    const miner = await models.minersDb.findOne({ userId, name });

    if (!miner) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const { time, metric } = filterRest;

    // Count total metrics based on filters
    total = await models.metricsDb.count({
      minerId: miner._id,
      timestampCreated: { $gte: +time },
      [metric]: { $ne: null },
    });

    // Get metrics based on filters, sort, skip, and limit
    metrics = (await models.metricsDb.find({
      minerId: miner._id,
      timestampCreated: { $gte: +time },
      [metric]: { $ne: null },
    })
      .sort({ [sortField]: sortOrder }).skip(skip).limit(limit)
      .project({ [metric]: 1, timestampCreated: 1 })).reverse();

    const metricsAfter = (await models.metricsDb.findOne({
      minerId: miner._id,
      [metric]: { $ne: null },
      timestampCreated: {
        $lt: +time,
      },
    })
      .sort({ [sortField]: sortOrder })
      .project({ [metric]: 1, timestampCreated: 1 }));

    if (metricsAfter) {
      total += 1;
      metrics = [{ ...metricsAfter, timestampCreated: time }, ...metrics];
    }
  } else {
    const builtFilter = {
      $and: [
        { _id: { $ne: null } },
        ids && { _id: { $in: ids } },
        filterRest,
      ].filter((item) => !!item && !!Object.keys(item).length),
    };

    // Count total metrics based on filters
    total = await models.metricsDb.count(builtFilter);

    // Get metrics based on filters, sort, skip, and limit
    metrics = await models.metricsDb.find(builtFilter)
      .sort({ [sortField]: sortOrder }).skip(skip).limit(limit);
  }

  // Populate metric objects with the ID property
  const populatedItems = await Promise.all(metrics.map(populateMetric));

  // Set response headers and send the populated metric objects
  res
    .setHeader('Access-Control-Expose-Headers', 'X-Total-Count')
    .setHeader('X-Total-Count', total)
    .status(200)
    .json(populatedItems);
};

/**
 * Fetches a single metric by ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const getMetric = async (req, res) => {
  const { id } = req.params;

  // Find a metric with the provided ID
  const item = await models.metricsDb.findOne({ _id: id });

  if (!item) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  // Populate the metric object with the ID property
  const populatedItem = await populateMetric(item);

  // Send the populated metric object
  res.status(200).json(populatedItem);
};

/**
 * Updates a metric by ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const updateMetricRoute = async (req, res) => {
  const { id } = req.params;
  const updateRequest = req.body;

  // Validate the update request
  const errors = await validate(updateRequest);

  if (errors.length) {
    res.status(400).json({ errors });
    return;
  }

  // Update the metric with the provided ID
  const updated = await models.updateMetric(id, { ...updateRequest });
  if (!updated) {
    res.status(404).json({ error: 'Update failed' });
    return;
  }
  const item = await models.metricsDb.findOne({ _id: id });
  const populatedItem = await populateMetric(item);
  res.status(200).json(populatedItem);
};
/**
 * Deletes a metric by ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const deleteMetric = async (req, res) => {
  const { id } = req.params;
  const removed = await models.metricsDb.remove({ _id: id }, { multi: false });
  if (!removed) {
    res.status(404).json({ error: 'Remove failed' });
    return;
  }
  res.status(200).json({ message: 'OK' });
};

/**
 * Sets up metric-related routes.
 * @param {Object} app - The express app.
 */
export default (app) => {
  app.get('/metrics', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(getMetrics));
  app.get('/metrics/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(getMetric));
  app.put('/metrics/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(updateMetricRoute));
  app.delete('/metrics/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(deleteMetric));
  app.post('/metrics', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(createNewMetric));
  app.get('/client-api/metrics', requireClientAuth(), handler(getMetrics));
  app.get('/client-api/metrics/:id', requireClientAuth(), handler(getMetric));
};
