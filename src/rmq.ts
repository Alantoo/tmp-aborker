import amqplib, {Channel} from 'amqplib';
import logger from './logger';

type AmqpConnection = Awaited<ReturnType<typeof amqplib.connect>>;

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const RABBITMQ_EXCHANGE = process.env.RABBITMQ_EXCHANGE;

if (!RABBITMQ_URL) {
  throw new Error('Missing required env var: RABBITMQ_URL');
}

if (!RABBITMQ_EXCHANGE) {
  throw new Error('Missing required env var: RABBITMQ_EXCHANGE');
}

const rmqUrl: string = RABBITMQ_URL;
const rmqExchange: string = RABBITMQ_EXCHANGE;

let connection: AmqpConnection | null = null;
let channel: Channel | null = null;

async function connect(): Promise<void> {
  logger.info('RMQ connecting', {url: rmqUrl, exchange: rmqExchange});
  connection = await amqplib.connect(rmqUrl);
  channel = await connection.createChannel();
  await channel.assertExchange(rmqExchange, 'topic', {durable: true});
  logger.info('RMQ exchange asserted', {exchange: rmqExchange});

  connection.on('close', () => {
    logger.warn('RMQ connection closed, reconnecting in 5s');
    connection = null;
    channel = null;
    setTimeout(connect, 5_000);
  });

  connection.on('error', (err) => {
    logger.error('RMQ connection error', {error: err.message});
  });

  logger.info('RMQ connected');
}

function publish(routingKey: string, body: Buffer): boolean {
  if (!channel) throw new Error('RMQ channel not ready');
  return channel.publish(rmqExchange, routingKey, body, {persistent: true});
}

export {connect, publish};
