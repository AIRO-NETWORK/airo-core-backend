import { handler } from '../middlewares/handler';

/**
 * Responds with a JSON message 'OK' to indicate that the server is reachable.
 *
 * @param {object} req - The HTTP request object.
 * @param {object} res - The HTTP response object.
 */
const ping = async (req, res) => {
  // Send a 200 OK response with a JSON message.
  res.status(200).json({ message: 'OK' });
};

/**
 * Register the 'ping' route and configure it to handle the 'ping' function.
 *
 * @param {object} app - The Express application instance.
 */
export default (app) => {
  // Register a 'GET' route for '/ping' and configure it to use the 'ping' function.
  app.get('/ping', handler(ping));
};
