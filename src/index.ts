import express from 'express';
import {connect, publish} from './rmq';
import logger from './logger';

const app = express();
const port = process.env.PORT ?? 4000;
const apiKey = process.env.API_KEY ?? '';

// Parse body as raw bytes so it is forwarded to RMQ without modification
app.use(express.raw({type: '*/*', limit: '50mb'}));

app.get('/health', (_req, res) => {
  res.json({status: 'ok'});
});

app.post('/:routingKey', (req, res) => {
  if (!apiKey || req.headers.authorization !== apiKey) {
    logger.warn('Unauthorized request', {routingKey: req.params.routingKey, ip: req.ip});
    res.status(401).json({error: 'Unauthorized'});
    return;
  }

  const {routingKey} = req.params;
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

  logger.info('Publishing message', {routingKey, bytes: body.length});

  try {
    publish(routingKey, body);
    logger.info('Message queued', {routingKey, bytes: body.length});
    res.status(202).json({queued: true, routingKey});
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to publish message', {routingKey, error: message});
    res.status(503).json({error: message});
  }
});

connect()
  .then(() => {
    app.listen(port, () => logger.info('atty-broker started', {port}));
  })
  .catch((err) => {
    logger.error('Failed to connect to RMQ', {error: err.message});
    process.exit(1);
  });
