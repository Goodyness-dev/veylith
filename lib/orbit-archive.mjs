import { fromBufferPromise } from 'yauzl';

export const archiveFormat = 'veylith-orbit-zip-v1';
export const archiveLimit = 256 * 1024;
const expandedLimit = 1024 * 1024;
const safeName = /^[a-z0-9][a-z0-9._-]{0,63}\.(?:html|css|js|json)$/;
const reservedName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])\./;

export async function readOrbitArchive(bytes, manifest) {
  if (bytes.length > archiveLimit) throw new Error('Orbit archive exceeds 256 KiB');
  const zip = await fromBufferPromise(bytes, { strictFileNames: true, lazyEntries: true });
  const files = new Map();
  let expanded = 0;
  try {
    if (zip.entryCount > 24) throw new Error('Too many Orbit archive entries');
    for await (const entry of zip.eachEntry()) {
      const name = entry.fileName;
      const type = (entry.externalFileAttributes >>> 16) & 0xf000;
      if (!safeName.test(name) || reservedName.test(name) || files.has(name) || (type && type !== 0x8000)) {
        throw new Error('Invalid Orbit archive entry');
      }
      expanded += entry.uncompressedSize;
      if (expanded > expandedLimit) throw new Error('Expanded Orbit archive exceeds 1 MiB');
      const chunks = [];
      for await (const chunk of await zip.openReadStreamPromise(entry)) chunks.push(chunk);
      files.set(name, Buffer.concat(chunks));
    }
  } finally {
    zip.close();
  }
  if (!files.get('index.html')?.length || !files.has('build.json')) throw new Error('Orbit entrypoint or build data missing');
  const build = JSON.parse(files.get('build.json').toString('utf8'));
  if (!/^[a-f0-9]{40}$/.test(manifest.commit) || build.commit !== manifest.commit ||
      !/^[1-9]\d{0,19}$/.test(manifest.runId) || build.runId !== manifest.runId ||
      build.version !== manifest.version || build.version !== manifest.commit.slice(0, 12)) {
    throw new Error('Orbit build metadata differs from the manifest');
  }
  return { files, build };
}
