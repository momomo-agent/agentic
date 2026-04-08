import https from 'https';
import { generateCert } from './cert.js';

export function createServer(app) {
  const { key, cert } = generateCert();
  return https.createServer({ key, cert }, app);
}
