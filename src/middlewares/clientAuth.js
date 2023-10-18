import axios from 'axios';
import Cache from 'node-cache';
import { Mutex } from 'async-mutex';
import env from '../config/env';
import { FORBIDDEN, UNAUTHORIZED } from '../consts/auth';

// Create a mutex for locking operations
const mutex = new Mutex();

// Create a cache to store tokens with a time-to-live of 60 seconds
const tokenCache = new Cache({ stdTTL: 60, checkperiod: 70 });

// Get the authentication URL from the environment configuration
const authUrl = env.CLIENT_AUTH_URL;

/**
 * Fetch user details using the provided token.
 *
 * @param {string} token - The authentication token.
 * @returns {Promise<{data: any} | {error: string}>} The user data or an error object.
 */
const getMe = (token) => axios.get(`${authUrl}/api/v1/users/me`, {
  headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
});

/**
 * Fetch and cache token details.
 *
 * @param {string} token - The authentication token.
 * @returns {Promise<{data: any} | {error: string}>} The user data or an error object.
 */
const fetchTokenDetails = async (token) => {
  try {
    const data = await getMe(token);
    if (data?.data) {
      return {
        data: data?.data,
      };
    }
    return {
      error: UNAUTHORIZED,
    };
  } catch (e) {
    console.error(e);
    return {
      error: UNAUTHORIZED,
    };
  }
};

/**
 * Get user details associated with the provided token, using a cache to improve performance.
 *
 * @param {string} token - The authentication token.
 * @returns {Promise<any>} The user data or an error object.
 * @throws {Error} Throws an error if token details cannot be retrieved.
 */
const getTokenDetails = async (token) => {
  let tokenDetails = tokenCache.get(token);
  if (!tokenDetails) {
    if (mutex.isLocked()) {
      await mutex.waitForUnlock();
      tokenDetails = tokenCache.get(token);
      if (!tokenDetails) {
        throw new Error('Cache error');
      }
    } else {
      await mutex.runExclusive(async () => {
        tokenDetails = await fetchTokenDetails(token);
        tokenCache.set(token, tokenDetails);
      });
    }
  }
  if (tokenDetails?.error) {
    throw new Error(tokenDetails?.error);
  }
  return tokenDetails?.data;
};

/**
 * Extract the authentication token from the request headers.
 *
 * @param {object} req - The HTTP request object.
 * @returns {string} The authentication token.
 */
const extractToken = (req) => req?.headers?.authorization?.replace(/^Bearer /, '');

/**
 * Middleware to require client authentication with specified roles.
 *
 * @param {string|string[]} roles - The required roles for authentication.
 * @returns {Function} Express middleware function.
 */
export const requireClientAuth = (roles) => async (req, res, next) => {
  try {
    const rolesArray = (Array.isArray(roles) ? roles : [roles]).filter((item) => !!item);
    const noRoleNeeded = !rolesArray.length;
    const token = extractToken(req);
    if (!token) {
      throw new Error(UNAUTHORIZED);
    }
    const user = await getTokenDetails(token);
    req.user = { id: user.id, role: 'user' };
    if (noRoleNeeded) {
      next();
      return;
    }
    const { roles: rolesCode } = user;
    const authorized = (rolesCode || []).some(({ code: roleCode }) => (
      rolesArray.includes(roleCode)
    ));
    if (!authorized) {
      throw new Error(FORBIDDEN);
    }
    next();
  } catch (e) {
    next(e);
  }
};

// Create a requireAuth middleware with no required roles
export const requireAuth = requireClientAuth([]);

// Define client roles constants
export const CLIENT_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};
