import { Queue } from 'bullmq';
import Redis from 'ioredis';

let connection: Redis | null = null;
let relatoriosQueue: Queue | null = null;
let ploomesQueue: Queue | null = null;

export function getRedisConnection(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  if (!connection) {
    try {
      connection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 100, 1000);
        },
      });
    } catch (err) {
      console.warn('[Redis] Erro ao criar conexão Redis:', err);
      return null;
    }
  }

  return connection;
}

export function getRelatoriosQueue(): Queue | null {
  const conn = getRedisConnection();
  if (!conn) return null;
  if (!relatoriosQueue) {
    relatoriosQueue = new Queue('relatorios-fila', { connection: conn });
  }
  return relatoriosQueue;
}

export function getPloomesQueue(): Queue | null {
  const conn = getRedisConnection();
  if (!conn) return null;
  if (!ploomesQueue) {
    ploomesQueue = new Queue('ploomes-fila', { connection: conn });
  }
  return ploomesQueue;
}
