import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { agentDirectory } from '../lib/agent-state.mjs';
import { configurationOf } from '../lib/core.mjs';

const port = Number(process.env.VEYLITH_ORBIT_PORT ?? 5180);
const appliedPath = join(agentDirectory('north'), 'applied.json');
const collections = {
  essentials: { title: 'Everyday Essentials', products: ['Canvas tote', 'Trail bottle', 'Field notebook'] },
  'night-market': { title: 'Night Market', products: ['Neon travel pouch', 'Moonstone lantern', 'Midnight journal'] },
};

async function activeRelease() {
  let contents;
  try {
    contents = await readFile(appliedPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return { agent: 'north', sequence: '0', version: null, artifactHash: null, catalog: 'essentials' };
    throw error;
  }
  const { config, identity, sequence, artifactHash } = JSON.parse(contents);
  const validated = configurationOf(Buffer.from(JSON.stringify(config)));
  if (identity !== 'north' || !/^[1-9]\d*$/.test(sequence) || !/^0x[\da-f]{64}$/i.test(artifactHash)) throw new Error('Invalid installed state');
  return { agent: identity, sequence, version: validated.release, artifactHash, catalog: validated.catalog ?? 'essentials' };
}

function reply(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

function storefront(response, release) {
  const { title, products } = collections[release.catalog];
  // The title and products come from the local collection table. The release
  // sequence and fingerprint were validated before rendering.
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  response.end(`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Orbit Commerce · ${title}</title><style>
body{font:18px system-ui;margin:0;background:#101519;color:#eff5f2}
main{max-width:860px;margin:auto;padding:clamp(20px,5vw,64px)}
header{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #55635c;padding-bottom:16px}
h1{font-size:clamp(48px,9vw,95px);letter-spacing:-.07em;margin:36px 0 20px}
ul{padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
li{list-style:none;background:${release.catalog === 'night-market' ? '#392a58' : '#243b34'};padding:26px 14px;border-radius:12px}
p,a{color:#aacdbb}code{overflow-wrap:anywhere}
</style><main><header><strong>Orbit Commerce</strong><a href="/release">Installed release ↗</a></header>
<h1>${title}</h1><ul>${products.map(product => `<li>${product}</li>`).join('')}</ul>
<p>North installation · Sequence ${release.sequence}${release.version ? ` · v${release.version}` : ''}</p>
${release.artifactHash ? `<code>${release.artifactHash}</code>` : ''}</main></html>`);
}

createServer(async (request, response) => {
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(request.headers.host)) return reply(response, 403, { error: 'Local host required' });
  if (request.method !== 'GET') return reply(response, 405, { error: 'GET required' });
  const route = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
  if (!['/', '/catalog', '/release'].includes(route)) return reply(response, 404, { error: 'Open /, /catalog or /release' });
  try {
    const release = await activeRelease();
    if (route === '/') return storefront(response, release);
    reply(response, 200, route === '/release' ? release : { store: 'Orbit Commerce', ...release, ...collections[release.catalog] });
  } catch {
    reply(response, 503, { error: 'Installed release state unavailable' });
  }
}).listen(port, '127.0.0.1', () => console.log(`Orbit Commerce: http://127.0.0.1:${port}/catalog`));
