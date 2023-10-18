import { UserSigner } from '@multiversx/sdk-wallet';
import { Transaction } from '@multiversx/sdk-core';
import axios from 'axios';
import Cache from 'node-cache';
import models from '../models';
import env from '../config/env';
import { MULTIVERSX_DENOMINATION } from '../config/config';

const TOKEN_ID = env.MULTIVERSX_TOKEN_ID_HEX || null; // Main EGLD by default
const CHAIN_ID = env.MULTIVERSX_CHAIN_ID || 'T'; // testnet
const GAS_PRICE = parseInt(env.MULTIVERSX_GAS_PRICE, 10) || 1000000000;
const GAS_LIMIT = parseInt(env.MULTIVERSX_GAS_LIMIT, 10) || 500000;

const signatureCache = new Cache({ stdTTL: 60, checkperiod: 70 });

/**
 * Creates the data string for ESDT transfer.
 * @param {string} tokenId - The token ID for the ESDT.
 * @param {number} amount - The amount to transfer.
 * @returns {string} The encoded data string for the transfer.
 */
const getData = (tokenId, amount) => {
  const tokenIdHex = Buffer.from(tokenId).toString('hex').toUpperCase();
  let amountHex = BigInt(MULTIVERSX_DENOMINATION * amount).toString(16).toLowerCase();
  if (amountHex.length % 2 === 1) {
    amountHex = `0${amountHex}`;
  }
  return Buffer.from(`ESDTTransfer@${tokenIdHex}@${amountHex}`).toString('base64');
};

/**
 * Sends a transaction.
 * @param {Object} body - The request body.
 * @returns {Promise} A promise that resolves to the response of the POST request.
 */
const sendTransaction = async (body) => axios.post(`${env.MULTIVERSX_API_URL}/transactions`,
  body, { headers: { 'content-type': 'application/json' } }).catch((err) => console.log(err));

/**
 * Retrieves a transaction by its hash.
 * @param {string} hash - The transaction hash.
 * @returns {Promise} A promise that resolves to the response of the GET request.
 */
export const getTransaction = async (hash) => axios.get(`${env.MULTIVERSX_API_URL}/transactions/${hash}`,
  { headers: { 'content-type': 'application/json' } }).catch((err) => console.log(err));

/**
 * Retrieves an account by its address.
 * @param {string} account - The account address.
 * @returns {Promise} A promise that resolves to the response of the GET request.
 */
export const getAccount = async (account) => axios.get(`${env.MULTIVERSX_API_URL}/accounts/${account}`)
  .catch((err) => console.log(err));

/**
 * Retrieves the tokens of an account.
 * @param {string} account - The account address.
 * @returns {Promise} A promise that resolves to the response of the GET request.
 */
export const getTokens = async (account) => (
  axios.get(`${env.MULTIVERSX_API_URL}/accounts/${account}/tokens/${TOKEN_ID}`)
    .catch((err) => console.log(err))
);

/**
 * Retrieves the balance of an account.
 * @param {string} account - The account address.
 * @returns {Promise} A promise that resolves to the balance of the account.
 */
export const getBalance = async (account) => {
  let balance = null;
  let denomination = MULTIVERSX_DENOMINATION;

  // Check if TOKEN_ID is present
  if (!TOKEN_ID) {
    // Get the account data for the wallet
    const walletResponse = await getAccount(account);
    const { data: walletData } = walletResponse || {};

    // Check if wallet data is available
    if (!walletData) {
      return null;
    }

    // Set the balance from wallet data
    balance = walletData.balance;
  } else {
    // Get the token data for the account
    const tokensResponse = await getTokens(account);
    const { data: tokensData } = tokensResponse || {};

    // Check if token data is available
    if (!tokensData) {
      return null;
    }

    // Set the balance and denomination from token data
    balance = tokensData.balance;
    denomination = tokensData.decimals;
  }
  return Number(BigInt(balance)) / (10 ** denomination);
};

/**
 * Gets the nonce of an account.
 * @param {string} account - The account address.
 * @returns {Promise} A promise that resolves to the nonce of the account.
 */
export const getNonce = (account) => getAccount(account).then((res) => res?.data?.nonce);

/**
 * Initializes the UserSigner.
 * @returns {Promise} A promise that resolves to the UserSigner instance.
 */
const initSigner = async () => {
  const { keyBody, keyPassword } = await models.keysDb.findOne({ type: 'reward' });
  const key = JSON.parse(keyBody);
  const userSigner = UserSigner.fromWallet(key, keyPassword);
  return userSigner;
};

/**
 * Sends a transfer transaction.
 * @param {UserSigner} signer - The UserSigner instance.
 * @param {number} nonce - The nonce of the account.
 * @returns {Promise} A promise that resolves to the result of the transaction.
 */
const sendTransfer = (signer, nonce) => async (from, to, amount) => {
  const tokenIdPresent = !!TOKEN_ID;
  const transactionData = tokenIdPresent ? getData(TOKEN_ID, amount) : '';

  // eslint-disable-next-line new-cap
  const transaction = Transaction.fromPlainObject({
    nonce: +nonce,
    sender: from, // sender
    receiver: to, // receiver,
    value: tokenIdPresent ? 0 : BigInt(MULTIVERSX_DENOMINATION * amount).toString(),
    gasPrice: GAS_PRICE,
    gasLimit: GAS_LIMIT,
    data: transactionData,
    chainID: CHAIN_ID,
    version: 1,
  });

  const serializedTransaction = transaction.serializeForSigning();
  const signature = await signer.sign(serializedTransaction);
  transaction.applySignature(signature);
  const sendable = transaction.toSendable();
  if (signatureCache.has(sendable?.signature)) {
    return false;
  }
  signatureCache.set(sendable?.signature, true);
  const signedTransactionJson = JSON.stringify(sendable, null, 4);
  await sendTransaction(signedTransactionJson);
  return true;
};

/**
 * Sends a transaction using the MultiversX API.
 * @param {string} from - The sender wallet account.
 * @param {string} to - The receiver wallet account.
 * @param {number} amount - The amount to transfer.
 * @returns {Promise} A promise that resolves to the result of the transaction.
 */
export const multiversxSend = async (from, to, amount) => {
  try {
    // Get the wallet data for the sender from multiversx
    const walletResponse = await getAccount(from?.keyName);
    const { data: walletData } = walletResponse || {};

    // Check if the wallet data is available
    if (!walletData) {
      return { error: 'Sender wallet account in multiversx not found' };
    }

    // Get the balance of the sender's wallet
    const balance = await getBalance(from?.keyName);

    // Check if the sender has sufficient balance
    if (balance < amount) {
      return { error: 'Insufficient balance in sender wallet' };
    }

    // Get the nonce of the sender's wallet
    const nonce = await getNonce(from?.keyName);

    // Initialize the signer for the transaction
    const signer = await initSigner();

    // Create a sender function using the signer and nonce
    const sender = await sendTransfer(signer, nonce);
    const result = await sender(from.keyName, to, parseFloat(amount));
    return result ? ({ message: 'Ok' })
      : { error: 'Too many withdraws requests in short period of time for one miner' };
  } catch (e) {
    // Log and return error message if any error occurs
    console.error(e);
    return { error: 'Error while doing multiversx transaction' };
  }
};
