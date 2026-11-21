import {keccak256,toBytes} from 'viem';
export const PROJECT=keccak256(toBytes('veylith-demo'));
export const ENVIRONMENT=keccak256(toBytes('production'));
export const VERSION='1.1.0';
export const CATALOGS=['essentials','night-market'];
export const configuration={release:VERSION,banner:'The Night Market is open.',accent:'#91d8ba',catalog:'night-market'};
export const bundle=Buffer.from(JSON.stringify(configuration)+'\n');
export function manifestFor(bytes=bundle){return {format:'veylith-release-v1',project:PROJECT,environment:ENVIRONMENT,version:VERSION,artifactHash:keccak256(bytes)};}
export function encodeManifest(manifest){return Buffer.from(JSON.stringify({format:manifest.format,project:manifest.project,environment:manifest.environment,version:manifest.version,artifactHash:manifest.artifactHash}));}
export function configurationOf(bytes){
 if(bytes.length>65536)throw new Error('Bundle exceeds 64 KiB');
 const c=JSON.parse(Buffer.from(bytes).toString('utf8'));
 const fields=c&&Object.keys(c).sort().join(',');
 if(!c||Array.isArray(c)||!['accent,banner,release','accent,banner,catalog,release'].includes(fields)||('catalog' in c&&!CATALOGS.includes(c.catalog))||typeof c.release!=='string'||!/^\d+\.\d+\.\d+$/.test(c.release)||typeof c.banner!=='string'||c.banner.length>120||typeof c.accent!=='string'||!/^#[0-9a-f]{6}$/i.test(c.accent))throw new Error('Invalid configuration schema');
 return c;
}
export const publicJson=value=>JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v);
