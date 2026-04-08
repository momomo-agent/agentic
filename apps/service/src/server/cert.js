import selfsigned from 'selfsigned';

export function generateCert() {
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = selfsigned.generate(attrs, { days: 365 });
  return { key: pems.private, cert: pems.cert };
}
