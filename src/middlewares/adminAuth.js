import axios from 'axios';
import Cache from 'node-cache';
import { Mutex } from 'async-mutex';
import env from '../config/env';
import { FORBIDDEN, UNAUTHORIZED } from '../consts/auth';

/**
 * A mutex object to ensure async safety.
 * @type {Mutex}
 */
const mutex = new Mutex();

/**
 * A cache object to store tokens with a time-to-live of 60 seconds and a check period of 70 seconds.
 * @type {Cache}
 */
const tokenCache = new Cache({ stdTTL: 60, checkperiod: 70 });

/**
 * The URL for the admin authentication endpoint.
 * @type {string}
 */
const authUrl = env.ADMIN_AUTH_URL;

/**
 * Retrieves the user information for the given token from the admin authentication endpoint.
 * @param {string} token - The token to use for authentication.
 * @returns {Promise} A promise that resolves with the user information.
 */
const getMe = (token) => axios.get(`${authUrl}/api/auth/me`, {
  headers: {
    authorization: `Bearer ${token}`,
    accept: 'application/json',
  },
});

/**
 * Fetches user data associated with a token.
 * @param {string} token - The token to fetch user data for.
 * @returns {Promise<{data: Object}|{error: string}>} - An object containing the user data associated
 * with the token or an error if the token is invalid.
 */
const fetchTokenDetails = async (token) => {
  try {
    // Call getMe function to retrieve user data associated with token
    const data = await getMe(token);
    if (data?.data?.user) {
      // If user data is present, return an object with the data property set to the user property
      return {
        data: data?.data?.user,
      };
    }
    // If user data is not present, return an object with the error property set to UNAUTHORIZED
    return {
      error: UNAUTHORIZED,
    };
  } catch (e) {
    // If an error occurs, return an object with the error property set to UNAUTHORIZED
    return {
      error: UNAUTHORIZED,
    };
  }
};/**
 * Retrieves token details from cache or fetches them from the server and caches them.
 * @param {string} token - The token to retrieve details for.
 * @returns {Promise<Object>} - An object containing the token details.
 * @throws {Error} - If there is a cache error or the token is invalid.
 */
const getTokenDetails = async (token) => {
  let tokenDetails = tokenCache.get(token);
  if (!tokenDetails) {
    // If the token is not in the cache, wait for any other requests
    // to finish before fetching the details from the server.
    if (mutex.isLocked()) {
      await mutex.waitForUnlock();
    }
    // Check the cache again in case another request has already fetched the details.
    tokenDetails = tokenCache.get(token);
    if (!tokenDetails) {
      // If the details are still not in the cache, fetch them from the server and cache them.
      try {
        await mutex.runExclusive(async () => {
          tokenDetails = await fetchTokenDetails(token);
          tokenCache.set(token, tokenDetails);
        });
      } catch (e) {
        throw new Error('Cache error');
      }
    }
  }
  // If there is an error in the token details, throw an error.
  if (tokenDetails?.error) {
    throw new Error(tokenDetails?.error);
  }
  // Return the token data.
  return tokenDetails?.data;
};
/**
 * Extracts token from request headers
 * @param {object} req - Express request object
 * @returns {string} - Token string or undefined
 */
const extractToken = (req) => req?.headers?.authorization?.replace(/^Bearer /, '');

/**
 * Middleware function to require admin authentication
 * @param {string|string[]} roles - Required roles for authentication
 * @returns {function} - Express middleware function
 */
export const requireAdminAuth = (roles) => async (req, res, next) => {
  try {
    // Convert roles to an array and remove falsy values
    const rolesArray = (Array.isArray(roles) ? roles : [roles]).filter((item) => !!item);
    const noRoleNeeded = !rolesArray.length;

    // Extract token from request headers
    const token = extractToken(req);
    if (!token) {
      throw new Error(UNAUTHORIZED);
    }

    // Get user details from token
    const user = await getTokenDetails(token);
    req.user = { id: user.id, role: 'admin' };

    if (noRoleNeeded) {
      // No role is required, so allow access
      next();
      return;
    }

    // Check if user has required role
    const { role } = user || {};
    const authorized = rolesArray.includes(role);
    if (!authorized) {
      throw new Error(FORBIDDEN);
    }

    next();
  } catch (e) {
    next(e);
  }
};

/**
 * Middleware function to require authentication
 * @returns {function} - Express middleware function
 */
export const requireAuth = requireAdminAuth([]);

/**
 * Object containing admin roles
 * @type {object}
 * @property {string} SUPER_ADMIN - Super admin role
 * @property {string} ADMIN - Admin role
 * @property {string} USER - User role
 */
export const ADMIN_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
};
