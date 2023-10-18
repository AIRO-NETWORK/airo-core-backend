import { Mutex } from 'async-mutex';
import models from '../../models';
import { ADMIN_ROLES, requireAdminAuth } from '../../middlewares/adminAuth';
import { requireClientAuth } from '../../middlewares/clientAuth';
import { handler } from '../../middlewares/handler';
import { validateMinerCreation } from './validation';
import { DEVICES_STATE_CACHE } from '../../services/mqtt-cache';
import {
  getAccount,
  getBalance,
  getTransaction,
  multiversxSend,
} from '../../services/multiversx';
import { fixed } from '../../utils';
import { getHealth } from '../../helpers/health';
import env from '../../config/env';

const TOKEN_ID = env.MULTIVERSX_TOKEN_ID_HEX || null; // Main EGLD by default

/**
 * Populates a miner object with additional health information and an id field.
 * @param {Object} miner - The miner object.
 * @returns {Object} - The populated miner object.
 */
const populateMiner = (miner) => ({
  ...miner,
  health: getHealth(miner.totalRewards, miner.currentAIRO),
  id: miner?._id,
});

const mutexTopUp = new Mutex();
const mutexWithdraw = new Mutex();

/**
 * Populates a miner object with the latest metrics data and additional fields.
 * @param {Object} miner - The miner object.
 * @returns {Object} - The populated miner object.
 */
const populateMinerWithMetrics = async (miner) => {
  const currentMetrics = DEVICES_STATE_CACHE[miner.serialId]
    || (await models.metricsDb.findOne({ minerId: miner._id }).sort({ timestampCreated: -1 }))
    || { state: 'Not exist in connections' };
  const {
    temperature,
    pressure,
    humidity,
    co,
    co2,
    dust1,
    dust25,
    dust10,
    quality,
    aqi,
    latitude,
    longitude,
    accuracy,
    state,
    timestampCreated: metricCreated,
    timestampUpdated: metricUpdated,
  } = currentMetrics;
  const info = {
    aqi,
    temperature,
    pressure,
    humidity,
    co,
    co2,
    dust1,
    dust25,
    dust10,
    quality,
    state,
    metricCreated,
    metricUpdated,
  };
  const {
    timestampUpdated,
    timestampCreated,
    name: minerName,
    currentAIRO,
    ageRate,
    totalRewards,
    wallet,
  } = miner;
  const minerHealth = getHealth(miner.totalRewards, miner.currentAIRO);
  const connected = info?.state === 'ready';
  return {
    info,
    minerHealth,
    lat: latitude,
    lng: longitude,
    accuracy,
    totalRewards,
    minerName,
    ageRate,
    currentAIRO,
    timestampUpdated,
    timestampCreated,
    id: miner._id,
    connected,
    wallet,
  };
};

/**
 * Populates a miner object with the balance of their wallet.
 * @param {Object} miner - The miner object.
 * @returns {Promise<Object>} - A promise that resolves to the populated miner object with the wallet balance.
 */
const populateMinerWithWalletBalance = async (miner) => {
  const {
    wallet,
  } = miner;
  if (!wallet) {
    return miner;
  }
  const walletBalance = await getBalance(wallet);

  return {
    ...miner,
    walletBalance,
  };
};

/**
 * Creates a new miner based on the request body.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const createNewMiner = async (req, res) => {
  const {
    name = 'Untitled Miner',
    model = null,
    serialId = null,
    userId = null,
    currentAIRO = 0,
    ageRate = 100,
    totalRewards = 0,
    connectDate = null,
    wallet = null,
  } = req.body;

  const newMiner = {
    name,
    model,
    serialId,
    userId,
    currentAIRO,
    ageRate,
    totalRewards,
    connectDate,
    wallet,
  };

  const errors = await validateMinerCreation(newMiner);

  if (errors.length) {
    res.status(400).json({ message: errors.join(', ') });
    return;
  }

  const miner = await models.createMiner(newMiner);
  res.status(200).json(miner);
};

/**
 * Retrieves a list of miners based on the user's role and query parameters.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const getMiners = async (req, res) => {
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

  const builtFilter = {
    $and: [
      { _id: { $ne: null } },
      ids && { _id: { $in: ids } },
      filterRest,
      role !== 'admin' && { userId },
    ].filter((item) => !!item && !!Object.keys(item).length),
  };

  const total = await models.minersDb.count(builtFilter);
  const miners = await models.minersDb.find(builtFilter)
    .sort({ [sortField]: sortOrder }).skip(skip).limit(limit);

  const populatedItems = role !== 'admin'
    ? await Promise.all(miners.map(populateMinerWithMetrics))
    : await Promise.all(miners.map(populateMiner));

  res
    .setHeader('Access-Control-Expose-Headers', 'X-Total-Count')
    .setHeader('X-Total-Count', total)
    .status(200)
    .json(populatedItems);
};

/**
 * Retrieves the balances of the miners' wallets.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const getBalances = async (req, res) => {
  const { id: userId } = req.user;

  const builtFilter = {
    userId,
  };

  const miners = await models.minersDb.find(builtFilter);
  const populatedItems = await Promise.all(miners.map(populateMinerWithWalletBalance));

  res
    .setHeader('Access-Control-Expose-Headers', 'X-Total-Count')
    .setHeader('X-Total-Count', miners.length)
    .status(200)
    .json(populatedItems);
};

/**
 * Retrieves a specific miner based on the user's role and the miner ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const getMiner = async (req, res) => {
  const { id: userId, role } = req.user;
  const { id } = req.params;

  const builtFilter = {
    $and: [
      { _id: { $ne: null } },
      { _id: id },
      role !== 'admin' && { userId },
    ].filter((item) => !!item && !!Object.keys(item).length),
  };

  const item = await models.minersDb.findOne(builtFilter);

  if (!item) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const populatedItem = role !== 'admin'
    ? await populateMinerWithMetrics(item)
    : await populateMiner(item);

  res.status(200).json(populatedItem);
};
/**
 * Retrieves the wallet details of a specific miner.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const getMinerWallet = async (req, res) => {
  const { id: userId, role } = req.user;
  const { id } = req.params;

  // Build the filter to find the specific miner
  const builtFilter = {
    $and: [
      { _id: { $ne: null } },
      { _id: id },
      role !== 'admin' && { userId },
    ].filter((item) => !!item && !!Object.keys(item).length),
  };

  // Find the miner based on the filter
  const item = await models.minersDb.findOne(builtFilter);

  // Handle case when miner is not found
  if (!item) {
    res.status(404).json({ error: 'Miner Not found' });
    return;
  }

  // Handle case when miner doesn't have a wallet
  if (!item.wallet) {
    res.status(404).json({ error: 'Wallet Not Bound' });
    return;
  }

  // Retrieve wallet information using external API calls
  const walletResponse = await getAccount(item.wallet);
  const walletBalance = await getBalance(item.wallet);
  const { data: walletData } = walletResponse || {};

  // Handle case when wallet data is not found
  if (!walletData) {
    res.status(404).json({ error: 'Wallet Not Found' });
    return;
  }

  // Construct the wallet DTO to be returned in the response
  const walletDto = {
    address: walletData.address,
    balance: walletBalance,
    nonce: walletData.nonce,
  };

  res.status(200).json(walletDto);
};

/**
 * Updates a specific miner based on the provided ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const updateMinerRoute = async (req, res) => {
  const { id } = req.params;
  const updateRequest = req.body;
  const errors = [];

  // Check for any errors in the update request
  if (errors.length) {
    res.status(400).json({ errors });
    return;
  }

  // Update the miner based on the provided ID and update request
  const updated = await models.updateMiner(id, { ...updateRequest });

  // Handle case when the update fails
  if (!updated) {
    res.status(404).json({ error: 'Update failed' });
    return;
  }

  // Retrieve the updated miner and return it in the response
  const item = await models.minersDb.findOne({ _id: id });
  const populatedItem = await populateMiner(item);
  res.status(200).json(populatedItem);
};

/**
 * Deletes a specific miner based on the provided ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const deleteMiner = async (req, res) => {
  const { id } = req.params;

  // Remove the miner based on the provided ID
  const removed = await models.minersDb.remove({ _id: id }, { multi: false });

  // Handle case when the removal fails
  if (!removed) {
    res.status(404).json({ error: 'Remove failed' });
    return;
  }

  // Return a success message in the response
  res.status(200).json({ message: 'OK' });
};

/**
 * Updates the user with a specific miner.
 * @param {Object req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const updateMinerUser = async (req, res) => {
  const { id: userId } = req.user;
  const { serialId, name } = req.body;

  // Find the current miner based on the provided serial ID
  const currentMiner = await models.minersDb.findOne({ serialId });

  // Check if the provided name is reserved
  if (name === 'All Miners') {
    res.status(404).json({ message: 'This name is reserved' });
    return;
  }

  // Check if the name length exceeds the limit
  if (name.length > 16) {
    res.status(404).json({ message: 'Name cannot be longer than 16 characters' });
    return;
  }

  // Check if the current miner exists and is not already assigned to a user
  if (!currentMiner || currentMiner.userId) {
    res.status(404).json({ message: 'Miner with this serial id does not exist' });
    return;
  }

  // Check if the current miner is already assigned to a different user
  if (currentMiner.userId) {
    res.status(404).json({ message: 'Miner with this serial id is already in use' });
    return;
  }

  // Check if a miner with the provided name already exists for the current user
  const minerName = await models.minersDb.findOne({ name, userId });
  if (minerName) {
    res.status(404).json({ message: 'Miner with this name already exists' });
    return;
  }

  // Update the current miner with the new user and name values
  const updated = await models.updateMiner(currentMiner._id, { ...currentMiner, userId, name });
  if (!updated) {
    res.status(404).json({ message: 'Update failed' });
    return;
  }

  // Retrieve the updated miner and return it in the response
  const item = await models.minersDb.findOne({ _id: currentMiner._id });
  const populatedItem = await populateMiner(item);
  res.status(200).json(populatedItem);
};

/**
 * Updates the wallet address of a specific miner.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const updateWallet = async (req, res) => {
  const { id: userId } = req.user;
  const { id } = req.params;
  const { wallet } = req.body;

  // Check if a wallet address is provided
  if (!wallet) {
    res.status(400).json({ message: 'Invalid wallet address' });
    return;
  }

  // Find the current miner based on the provided ID and user ID
  const currentMiner = await models.minersDb.findOne({ _id: id, userId });

  // Check if the current miner exists
  if (!currentMiner) {
    res.status(404).json({ message: 'Miner with this user ID does not exist' });
    return;
  }

  // Determine the update to be made based on the provided wallet address
  const filtered = currentMiner.wallet === wallet ? { wallet: null } : { wallet };

  // Check if the provided wallet address is already connected to another miner
  const currentWallet = await models.minersDb.findOne({ wallet });
  if (currentWallet && currentWallet._id !== currentMiner._id) {
    res.status(404).json({ message: 'Wallet is already connected to another miner' });
    return;
  }

  // Update the current miner with the new wallet address
  const updated = await models.setMinerFields(currentMiner._id, filtered);
  if (!updated) {
    res.status(404).json({ message: 'Update failed' });
    return;
  }

  // Retrieve the updated miner and return it in the response
  const item = await models.minersDb.findOne({ _id: currentMiner._id });
  const populatedItem = await populateMiner(item);
  res.status(200).json(populatedItem);
};
/**
 * Withdraws AIRO from a specific miner.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const withdrawAIRO = async (req, res) => {
  const { id: userId, role } = req.user;
  const { id } = req.params;
  const { withdraw } = req.body;

  const builtFilter = {
    $and: [
      { _id: id },
      role !== 'admin' && { userId },
    ],
  };

  const currentMiner = await models.minersDb.findOne(builtFilter);

  if (!currentMiner) {
    res.status(404).json({ message: 'Miner not exist' });
    return;
  }

  if (!currentMiner.wallet) {
    res.status(400).json({ message: 'Wallet not connected to miner' });
    return;
  }
  const withdrawNum = +withdraw;
  const from = await models.keysDb.findOne({ type: 'reward' });
  if (!from) {
    res.status(404).json({ message: 'Our wallet not available now, try later' });
    return;
  }
  await mutexWithdraw.runExclusive(async () => {
    if (!Number.isFinite(withdrawNum) || currentMiner.currentAIRO < withdrawNum || withdrawNum <= 0) {
      res.status(404).json({ message: 'Invalid withdrawal sum' });
      return;
    }
    const send = await multiversxSend(from, currentMiner.wallet, withdrawNum);
    if (!send || send?.error) {
      await models.createTransaction({
        userId,
        value: withdrawNum,
        type: 'WITHDRAW',
        minerId: id,
        from: from?.keyName,
        to: currentMiner?.wallet,
        status: 'error',
        reason: send?.error || 'Multiversx send failed',
      });
      res.status(404).json({ message: send?.error || 'Multiversx send failed' });
      return;
    }
    await models.createTransaction({
      userId,
      value: withdrawNum,
      type: 'WITHDRAW',
      minerId: id,
      from: from?.keyName,
      to: currentMiner?.wallet,
      status: 'success',
    });
    const afterChange = currentMiner.currentAIRO - withdrawNum;
    const updated = await models.setMinerFields(id, { currentAIRO: afterChange });
    if (!updated) {
      res.status(404).json({ message: 'Update failed' });
      return;
    }
    res.status(200).json({ message: 'OK' });
  });
};
/**
 * Tops up the AIRO balance of a specific miner.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
const topUpAIRO = async (req, res) => {
  const { id: userId, role } = req.user;
  const { id } = req.params;
  const { hash } = req.body;

  const builtFilter = {
    $and: [
      { _id: id },
      role !== 'admin' && { userId },
    ],
  };

  const currentMiner = await models.minersDb.findOne(builtFilter);

  // Check if the miner exists
  if (!currentMiner) {
    res.status(404).json({ message: 'Miner does not exist' });
    return;
  }

  // Check if the miner has a connected wallet
  if (!currentMiner.wallet) {
    res.status(400).json({ message: 'Wallet not connected to miner' });
    return;
  }

  const transaction = await getTransaction(hash);

  // Check if the transaction is valid and exists
  if (!transaction) {
    res.status(404).json({ message: 'Transaction not found' });
    return;
  }
  if (transaction.data.status !== 'success') {
    res.status(404).json({ message: 'Transaction status not success' });
    return;
  }
  const reward = await models.keysDb.findOne({ type: 'reward' });

  // Check if the transaction receiver is the main wallet
  if (transaction.data.receiver !== reward.keyName) {
    res.status(400).json({ message: 'Receiver is not the main wallet' });
    return;
  }

  // Check if the transaction sender is the connected miner wallet
  if (transaction.data.sender !== currentMiner.wallet) {
    res.status(400).json({ message: 'Sender is not connected to miner wallet' });
    return;
  }
  const transactionAIRO = transaction?.data?.operations?.[0];
  const airoIdentifier = transactionAIRO?.identifier;
  if (!transactionAIRO || airoIdentifier !== TOKEN_ID) {
    res.status(400).json({ message: 'Only AIRO credits accepted for steam miner' });
    return;
  }
  const denomination = 10 ** transactionAIRO.decimals;
  const airoValue = transactionAIRO.value;
  const afterChange = fixed(currentMiner.currentAIRO + airoValue / denomination, 6);
  await mutexTopUp.runExclusive(async () => {
    const getTopUpHistory = await models.transactionHistoryDb.findOne({
      txHash: transaction.data.txHash, type: 'TOP-UP',
    });
    if (getTopUpHistory) {
      res.status(400).json({ message: 'Hash already used' });
      return;
    }
    if (airoValue / denomination !== 0) {
      await models.createTransaction({
        userId,
        txHash: transaction.data.txHash,
        status: transaction.data.status,
        from: transaction.data.sender,
        to: transaction.data.receiver,
        value: airoValue / denomination,
        type: 'TOP-UP',
        minerId: id,
      });
    }
    const updated = await models.setMinerFields(id, { currentAIRO: afterChange });
    if (!updated) {
      res.status(404).json({ message: 'Update failed' });
      return;
    }
    res.status(200).json({ message: 'OK' });
  });
};

export default (app) => {
  // API routes for managing miners
  app.get('/miners', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(getMiners));
  app.get('/miners/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(getMiner));
  app.put('/miners/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(updateMinerRoute));
  app.delete('/miners/:id', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(deleteMiner));
  app.post('/miners', requireAdminAuth([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.USER]), handler(createNewMiner));

  // API routes for client access to miners
  app.get('/client-api/miners', requireClientAuth(), handler(getMiners));
  app.get('/client-api/miners/:id', requireClientAuth(), handler(getMiner));
  app.post('/client-api/miners', requireClientAuth(), handler(updateMinerUser));
  app.get('/client-api/miners/:id/wallet', requireClientAuth(), handler(getMinerWallet));
  app.post('/client-api/miners/:id/withdraw', requireClientAuth(), handler(withdrawAIRO));
  app.post('/client-api/miners/:id/top-up', requireClientAuth(), handler(topUpAIRO));
  app.post('/client-api/miners/:id/wallet', requireClientAuth(), handler(updateWallet));
  app.get('/client-api/balances', requireClientAuth(), handler(getBalances));
};
