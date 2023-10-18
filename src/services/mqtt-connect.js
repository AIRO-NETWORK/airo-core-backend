import mqtt from 'mqtt';
import cron from 'node-cron';
import moment from 'moment/moment';
import env from '../config/env';
import { DEVICES_STATE_CACHE } from './mqtt-cache';
import { CRON_PERIOD } from '../config/config';
import models from '../models';

// Mapping of MQTT topics to metric keys.
const METRICS_MAP = {
  'sensors/temperature': 'temperature',
  'sensors/pressure': 'pressure',
  'sensors/humidity': 'humidity',
  'sensors/co': 'co',
  'sensors/co2': 'co2',
  'sensors/dust1': 'dust1',
  'sensors/dust25': 'dust25',
  'sensors/dust10': 'dust10',
  'sensors/aqi': 'aqi',
  'sensors/quality': 'quality',
  'service/latitude': 'latitude',
  'service/longitude': 'longitude',
  'service/accuracy': 'accuracy',
  $state: 'state',
};

// Create an MQTT client and configure it.
const client = mqtt.connect(env.MQTT_URL, {
  username: env.MQTT_USER,
  password: env.MQTT_PASS,
  reconnectPeriod: 1000,
});

const TOPIC = `${env.MQTT_USER}/sweet-home/`;

// Handle MQTT client connection.
client.on('connect', () => {
  console.log('MQTT Connected!');
  client.subscribe(`${TOPIC}#`, (err) => {
    if (err) {
      console.error(err);
    }
  });
});

// Handle incoming MQTT messages and update the device state cache.
client.on('message', (topic, payload) => {
  const [serialId, ...metricPath] = topic.split('/').slice(2);
  const metric = metricPath.join('/');
  const metricKey = METRICS_MAP[metric];
  if (!metricKey) {
    return;
  }
  DEVICES_STATE_CACHE[serialId] = DEVICES_STATE_CACHE[serialId] || {};
  DEVICES_STATE_CACHE[serialId][metricKey] = payload.toString();
  // console.log(topic, '=', payload.toString());
});

// Initial data for new miners.
const initialMinerData = {
  name: 'Untitled Miner',
  model: null,
  userId: null,
  currentAIRO: 0,
  ageRate: 100,
  totalRewards: 0,
  connectDate: moment().unix(),
};

// Schedule a cron job to process device states and update miners and metrics.
cron.schedule(CRON_PERIOD, () => Promise.all(Object.entries(DEVICES_STATE_CACHE).map(
  async ([serialId, deviceState]) => {
    let miner = await models.minersDb.findOne({ serialId });
    if (!miner) {
      miner = await models.createMiner({ serialId, ...initialMinerData });
    } else {
      await models.setMinerFields(miner._id, { connectDate: moment().unix() });
    }
    const hasUser = !!(miner && miner.userId);
    await models.createMetric({
      ...deviceState, serialId, hasUser, minerId: miner?._id,
    });
  },
)));
