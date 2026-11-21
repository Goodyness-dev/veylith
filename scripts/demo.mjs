import { spawn } from 'node:child_process';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const local = fileURLToPath(new URL('../.local/', import.meta.url));
await mkdir(local, { recursive: true });
const env = {
  ...process.env,
  VEYLITH_AGENT_STATE: await mkdtemp(join(local, 'walkthrough-')),
  VEYLITH_ORBIT_PORT: process.env.VEYLITH_ORBIT_PORT ?? '5180',
};
const children = ['../server.mjs', '../orbit/server.mjs'].map(script => spawn(
  process.execPath, [fileURLToPath(new URL(script, import.meta.url))], { stdio: 'inherit', env },
));

function stop(code) {
  process.exitCode ??= code;
  for (const child of children) if (child.exitCode === null && !child.signalCode) child.kill();
}

for (const child of children) {
  child.on('exit', code => stop(code ?? 1));
  child.on('error', error => {
    console.error(error.message);
    stop(1);
  });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
