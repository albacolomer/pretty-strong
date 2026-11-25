// Makes the keys for the web app's rest alerts (web push), once:
// - a VAPID key pair: the public half goes in the app, so browsers know the
//   pushes come from us; the private half signs them, in Supabase only;
// - a random token the database's cron job shows the send-rest-alerts
//   function, so nobody else can make it run.
// Writes the function's two secrets to supabase/.env.push.local (gitignored;
// delete it once they're set) and prints where everything else goes.
// Usage: node scripts/push-keys.mjs

import { webcrypto } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const { subtle } = webcrypto;
const toBase64Url = (bytes) => Buffer.from(bytes).toString('base64url');

const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
]);
const vapidKeys = {
  publicKey: await subtle.exportKey('jwk', pair.publicKey),
  privateKey: await subtle.exportKey('jwk', pair.privateKey),
};
// The browser's pushManager.subscribe wants the public key as raw bytes.
const publicKey = toBase64Url(new Uint8Array(await subtle.exportKey('raw', pair.publicKey)));
const token = toBase64Url(webcrypto.getRandomValues(new Uint8Array(32)));

// A file rather than arguments: Windows shells mangle the JSON's quotes.
const envFile = 'supabase/.env.push.local';
writeFileSync(envFile, `REST_ALERTS_TOKEN=${token}\nVAPID_KEYS='${JSON.stringify(vapidKeys)}'\n`);

console.log(`
1. In .env, and in Vercel (Settings > Environment Variables), then redeploy:

EXPO_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}

2. The function's secrets, already in ${envFile}:

npx supabase secrets set --env-file ${envFile}

   then delete ${envFile}.

3. Supabase dashboard > SQL Editor (replace <project-ref> with yours):

select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('${token}', 'rest_alerts_token');

Keep the private key and the token out of git; if they leak, run this again
and replace all three.
`);
