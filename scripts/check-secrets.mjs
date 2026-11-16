// Scan staged content without printing signing material.
import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {deriveUnifiedAccount} from '@qorechain/sdk';
const names=execFileSync('git',['diff','--cached','--name-only','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const secrets=[];try{const identities=JSON.parse(await fs.readFile(new URL('../.local/reviewers.json',import.meta.url),'utf8'));for(const identity of identities){const a=await deriveUnifiedAccount(identity.mnemonic);secrets.push(identity.mnemonic,a.privateKey,a.privateKey.slice(2),Buffer.from(a.pqc.secretKey).toString('base64'),Buffer.from(a.pqc.secretKey).toString('hex'));}}catch(e){if(e.code!=='ENOENT')throw e;}
const failures=[];
for(const name of names){if(/(^|\/)\.local\//.test(name)){failures.push(name);continue;}const content=execFileSync('git',['show',`:${name}`],{encoding:'utf8',maxBuffer:20_000_000});if(secrets.some(secret=>content.includes(secret))||/^-----BEGIN (?:EC |RSA )?PRIVATE KEY-----/m.test(content))failures.push(name);}
if(failures.length){console.error('Signing material detected in staged files: '+failures.join(', '));process.exitCode=1;}else console.log(`Staged-file secret check passed (${names.length} files).`);
