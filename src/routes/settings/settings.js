import { requireClientAuth } from '../../middlewares/clientAuth';
import { handler } from '../../middlewares/handler';
import models from '../../models';

// Default metrics to be used when metrics are not provided or invalid.
const defaultMetrics = ['aqi', 'co2', 'co'];

/**
 * Update metric settings for a specific miner.
 *
 * @param {object} req - The HTTP request object.
 * @param {object} res - The HTTP response object.
 */
const updateMetricSettings = async (req, res) => {
  // Extract the minerId from the URL parameters.
  const { minerId } = req.params;

  // Extract the provided metrics from the request body, or use default metrics if not provided or invalid.
  let { metrics } = req.body;
  if (!Array.isArray(metrics)) metrics = defaultMetrics;
  if (metrics.length > 3) metrics = metrics.slice(0, 3);

  // Ensure there are always three metrics by adding default metrics if necessary.
  let defaultMetric = 0;
  while (metrics.length < 3) {
    if (!metrics.includes(defaultMetrics[defaultMetric])) {
      metrics.push(defaultMetrics[defaultMetric]);
    }
    defaultMetric++;
  }

  // Find the existing settings for the miner, if any.
  const item = await models.settingsDb.findOne({ minerId });

  // Update or create the miner's settings based on the found item.
  const result = item?._id
    ? await models.updateSettings(item._id, { metrics, minerId })
    : await models.createSettings({ metrics, minerId });

  // If the update or creation fails, return a 400 error.
  if (!result) {
    res.status(400).json({ error: 'Error while updating' });
    return;
  }

  // Return a 200 status with the updated metrics.
  res.status(200).json({ metrics });
};

/**
 * Get the settings for a specific miner.
 *
 * @param {object} req - The HTTP request object.
 * @param {object} res - The HTTP response object.
 */
const getSettings = async (req, res) => {
  // Extract the minerId from the URL parameters.
  const { minerId } = req.params;

  // Find the settings for the miner, if any, or use default metrics if not found.
  const item = await models.settingsDb.findOne({ minerId });

  // Return a 200 status with the miner's settings or default metrics if not found.
  res.status(200).json(item || { metrics: defaultMetrics });
};

/**
 * Define routes for getting and updating miner settings and apply client authentication middleware.
 *
 * @param {object} app - The Express application instance.
 */
export default (app) => {
  // Get miner settings route with client authentication.
  app.get('/client-api/settings/:minerId', requireClientAuth(), handler(getSettings));

  // Update miner settings route with client authentication.
  app.put('/client-api/settings/:minerId', requireClientAuth(), handler(updateMetricSettings));
};
