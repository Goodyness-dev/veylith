import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const agentDirectory = identity => path.join(
  process.env.VEYLITH_AGENT_STATE ?? fileURLToPath(new URL('../.local/agents/', import.meta.url)),
  identity,
);
