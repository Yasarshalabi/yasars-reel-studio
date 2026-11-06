import fs from 'node:fs';
import path from 'node:path';

// Windows Node keeps npm next to node.exe; macOS/Linux Node keeps it in lib/node_modules beside bin/.
const nodeDir = path.dirname(process.execPath);
const candidates = [
  path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
];
export const npmCliPath = candidates.find((file) => fs.existsSync(file)) ?? candidates[process.platform === 'win32' ? 0 : 1];

export const resolveNpmCommand=(args=[])=>({
  command:process.execPath,
  args:[npmCliPath,...args],
});
