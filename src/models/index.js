import env from '../config/env';

export default await (async () => {
  const MONGO_URI = env.MONGO_CONNECT_URI;
  const models = MONGO_URI ? (await import('./mongodb')) : (await import('./nedb'));
  await models.init();
  console.log('Database initialized');
  return models;
})();
