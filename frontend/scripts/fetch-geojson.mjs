/**
 * Downloads Natural Earth 110m countries GeoJSON into public/
 * so production loads from the same origin (avoids raw.githubusercontent.com blocks).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outFile = join(__dirname, '../public/geojson/ne_110m_admin_0_countries.geojson');
const url =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson';

const res = await fetch(url);
if (!res.ok) {
  throw new Error(`GeoJSON download failed: ${res.status} ${res.statusText}`);
}
const buf = Buffer.from(await res.arrayBuffer());
await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, buf);
console.log(`GeoJSON: wrote ${outFile} (${buf.length} bytes)`);
