import path from 'node:path';
import { openDatabase } from './db.mjs';
import { importContent, readSeeds } from './import.mjs';

const [command, ...flags] = process.argv.slice(2);
const allowed = {
  migrate: [], seed: ['--source='],
  import: ['--source=', '--photos', '--overwrite-editorial'], backup: ['--output='],
};
if (!Object.hasOwn(allowed, command) || flags.some((flag) => !allowed[command].some((option) => option.endsWith('=') ? flag.startsWith(option) : flag === option))) {
  throw new Error('Usage: cli.mjs migrate | seed [--source=DIR] | import [--source=DIR] [--photos] [--overwrite-editorial] | backup --output=FILE');
}
const value = (name) => flags.find((flag) => flag.startsWith(`--${name}=`))?.slice(name.length + 3);
if (command === 'backup' && !value('output')) throw new Error('backup requires --output=FILE (a new file)');
const database = openDatabase();
try {
  if (command === 'seed' || command === 'import') {
    importContent(database, readSeeds(value('source'), flags.includes('--photos')), {
      initial: command === 'seed', overwriteEditorial: flags.includes('--overwrite-editorial'),
    });
  }
  if (command === 'backup') database.prepare('VACUUM INTO ?').run(path.resolve(value('output')));
  console.log(`${command} complete`);
} finally {
  database.close();
}
