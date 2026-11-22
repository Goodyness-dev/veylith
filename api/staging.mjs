import { readFile } from 'node:fs/promises';
import { readPublicAuthorization } from '../lib/public-state.mjs';

const archiveLimit = 256 * 1024;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Read-only evidence endpoint' });
  }
  let proof;
  try {
    proof = JSON.parse(await readFile(new URL('../evidence/orbit-staging-proof.json', import.meta.url), 'utf8'));
  } catch {
    return res.status(503).json({ error: 'Staging evidence unavailable' });
  }
  if (req.query?.file === 'archive') {
    try {
      if (!/^orbit-\d+-\d+$/.test(proof.candidate)) throw new Error('Invalid candidate tag');
      const url = `https://github.com/Goodyness-dev/veylith/releases/download/${proof.candidate}/orbit.zip`;
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error('GitHub archive unavailable');
      const chunks = [];
      let size = 0;
      for await (const bytes of response.body) {
        size += bytes.length;
        if (size > archiveLimit) throw new Error('Archive too large');
        chunks.push(bytes);
      }
      res.setHeader('Content-Type', 'application/zip');
      return res.status(200).send(Buffer.concat(chunks));
    } catch {
      return res.status(502).json({ error: 'GitHub archive unavailable' });
    }
  }
  try {
    return res.status(200).json({ proof, chain: await readPublicAuthorization(proof.approved.controller) });
  } catch {
    return res.status(503).json({ proof, error: 'Diana state unavailable' });
  }
}
