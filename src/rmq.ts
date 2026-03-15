import amqplib, {Channel} from 'amqplib';
import logger from './logger';

type AmqpConnection = Awaited<ReturnType<typeof amqplib.connect>>;

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://localhost';
const RABBITMQ_EXCHANGE = process.env.RABBITMQ_EXCHANGE ?? '';

let connection: AmqpConnection | null = null;
let channel: Channel | null = null;

async function connect(): Promise<void> {
  logger.info('RMQ connecting', {url: RABBITMQ_URL, exchange: RABBITMQ_EXCHANGE});
  connection = await amqplib.connect(RABBITMQ_URL);
  channel = await connection.createChannel();

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
  return channel.publish(RABBITMQ_EXCHANGE, routingKey, body, {persistent: true});
}

export {connect, publish};
