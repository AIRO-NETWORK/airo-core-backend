import ping from './ping';
import keys from './keys';
import miners from './miners';
import metrics from './metrics';
import rewards from './rewards';
import transactions from './transactions';
import settings from './settings';

/**
 * Registers and configures various routes for the provided Express application.
 *
 * @param {object} app - The Express application instance to which routes will be registered.
 */
export default (app) => {
  // Register the 'ping' routes and configure them.
  ping(app);

  // Register the 'keys' routes and configure them.
  keys(app);

  // Register the 'miners' routes and configure them.
  miners(app);

  // Register the 'metrics' routes and configure them.
  metrics(app);

  // Register the 'rewards' routes and configure them.
  rewards(app);

  // Register the 'transactions' routes and configure them.
  transactions(app);

  // Register the 'settings' routes and configure them.
  settings(app);
};
