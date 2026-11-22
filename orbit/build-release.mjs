import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { ZipFile } from 'yazl';
import { keccak256 } from 'viem';
import { PROJECT, ORBIT_STAGING } from '../lib/core.mjs';
import { archiveFormat, readOrbitArchive } from '../lib/orbit-archive.mjs';

const [output, commit, runId, collection = 'night-market'] = process.argv.slice(2);
if (!output || !/^[a-f0-9]{40}$/.test(commit) || !/^[1-9]\d{0,19}$/.test(runId)) {
  throw new Error('Use build-release OUTPUT COMMIT_SHA GITHUB_RUN_ID [essentials|night-market]');
}
const collections = {
  essentials: { title: 'Everyday Essentials', items: ['Canvas tote', 'Trail bottle', 'Field notebook'] },
  'night-market': { title: 'Night Market', items: ['Neon travel pouch', 'Moonstone lantern', 'Midnight journal'] },
};
if (!Object.hasOwn(collections, collection)) throw new Error('Unknown Orbit collection');
const { title, items } = collections[collection];
const version = commit.slice(0, 12);
const build = { version, commit, runId, collection };
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Orbit Commerce · ${title}</title><link rel="stylesheet" href="orbit.css"></head>
<body class="${collection}"><main><header>ORBIT COMMERCE <a href="release.json">Installed release</a></header>
<h1>${title}</h1><ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>
<footer>Build <code>${version}</code> · <a href="build.json">Build metadata</a></footer></main></body></html>`;
const css = `body{margin:0;background:#13232b;color:#f8fff8;font:18px system-ui}.night-market{background:#241637;color:#f5efff}
main{max-width:900px;margin:auto;padding:6vw}header{display:flex;justify-content:space-between;border-bottom:1px solid;padding-bottom:20px}
h1{font-size:clamp(48px,10vw,112px);letter-spacing:-.075em;line-height:1;margin:8vh 0 4vh}
ul{padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px}li{padding:28px 18px;list-style:none;background:#ffffff18;border-radius:12px}
footer{margin-top:36px}a{color:inherit}`;

await fs.mkdir(output,{recursive:true});
const archivePath = path.join(output,'orbit.zip');
const zip = new ZipFile();
for (const [name, contents] of [['index.html',html],['orbit.css',css],['build.json',JSON.stringify(build)]]) {
  zip.addBuffer(Buffer.from(contents), name, { mtime: new Date('2000-01-01T00:00:00Z') });
}
zip.end();
await pipeline(zip.outputStream,createWriteStream(archivePath));
const bytes = await fs.readFile(archivePath);
const manifest = {
  format: archiveFormat, project: PROJECT, environment: ORBIT_STAGING,
  version, commit, runId, artifactHash: keccak256(bytes),
};
await readOrbitArchive(bytes, manifest);
await fs.writeFile(path.join(output,'manifest.json'), JSON.stringify(manifest) + '\n');
console.log(JSON.stringify(manifest));
