import net from 'node:net';
import {createHash} from 'node:crypto';
import {realpath, rm} from 'node:fs/promises';




export async function acquireProfileSaveLock(root) {
  const real = await realpath(root);
  const identity = process.platform === 'win32' ? real.toLowerCase() : real;
  const key = createHash('sha256').update(identity).digest('hex').slice(0, 32);
  if (!['win32', 'linux', 'darwin'].includes(process.platform)) throw new Error("Yasar's Reel Studio supports macOS and Windows 64-bit.");
  // Windows: a named pipe. Linux: an abstract socket. macOS has neither, so a short socket file in /tmp (104-byte path limit).
  const address = process.platform === 'win32' ? '\\\\.\\pipe\\reel-studio-profile-' + key
    : process.platform === 'darwin' ? `/tmp/yrs-profile-${key}.sock` : '\0reel-studio-profile-' + key;
  const server = net.createServer(socket => socket.destroy());
  const listen = () => new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(address, () => {server.removeListener('error', reject); resolve();});
  });
  try {
    try { await listen(); }
    catch (error) {
      // A socket file left by a crashed save on macOS: nobody answers it, so remove it and listen again.
      if (process.platform !== 'darwin' || error.code !== 'EADDRINUSE' || await socketAnswers(address)) throw error;
      await rm(address, {force: true});
      await listen();
    }
  } catch (error) {
    if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
      const busy = new Error('شاشة ثانية عم تحفظ إعداداتك. جرّب كمان لحظة.'); busy.status = 409; throw busy;
    }
    throw error;
  }
  return () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

const socketAnswers = address => new Promise(resolve => {
  const probe = net.connect(address);
  probe.once('connect', () => { probe.destroy(); resolve(true); });
  probe.once('error', () => resolve(false));
});
