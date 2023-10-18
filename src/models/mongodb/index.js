import mongoose from 'mongoose';

export * from './keys';
export * from './metrics';
export * from './miners';
export * from './rewards';
export * from './settings';
export * from './transaction-history';

export const init = async () => {
  const MONGO_URI = process.env.MONGO_CONNECT_URI;
  if (MONGO_URI) {
    await mongoose.connect(MONGO_URI);
  }
};
