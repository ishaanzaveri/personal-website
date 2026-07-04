// Compatibility wrapper for the old seed command.
// The real photo pipeline now lives in ../scripts/photo-pipeline.mjs so asset
// generation, EXIF parsing, and mock JSON stay in one place.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/photo-pipeline.mjs', import.meta.url));
const result = spawnSync(process.execPath, [script, 'seed'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
