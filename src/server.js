import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import bodyparser from 'body-parser';
import routes from './routes';
import { UNAUTHORIZED } from './consts/auth';
import './services/mqtt-connect';
import './services/rewards';

// Create a directory if it doesn't exist
const dir = './data';

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

// Define the port on which the server will run
const PORT = 3001;

// Create an instance of the Express application
const app = express();

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Parse JSON requests with a maximum limit of 100MB
app.use(bodyparser.json({ limit: 100 * 1024 * 1024 }));

// Parse URL-encoded requests with extended support
app.use(bodyparser.urlencoded({ extended: true }));

// Set up routes for the application
routes(app);

// Error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.message === UNAUTHORIZED) {
    // Handle UNAUTHORIZED error by sending a 401 status and a corresponding message
    res.status(401).json({ message: UNAUTHORIZED });
    return;
  }
  // Handle other errors by sending a 500 status and an error message
  res.status(500).json({ message: err.message || 'Server error' });
});

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log('Server is running on port', PORT);
});
