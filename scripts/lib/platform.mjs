// Yasar's Reel Studio runs on macOS (Apple Silicon) and Windows 64-bit. Every place that names a
// platform-specific executable or folder asks this module, so the two hosts never drift apart.
import path from 'node:path';

export const IS_MAC = process.platform === 'darwin';
export const IS_WINDOWS = process.platform === 'win32';
export const SUPPORTED_PLATFORMS = Object.freeze(['darwin', 'win32', 'linux']);

// Executable suffix: ffmpeg.exe on Windows, ffmpeg everywhere else.
export const exe = (name, platform = process.platform) => (platform === 'win32' ? `${name}.exe` : name);

// The host as Reel Studio names it in messages, setup records and the doctor report.
export function hostLabel(platform = process.platform, arch = process.arch) {
  if (platform === 'darwin') return arch === 'arm64' ? 'macOS (Apple Silicon)' : 'macOS (Intel)';
  if (platform === 'win32') return 'Windows 64-bit';
  return `${platform}-${arch}`;
}

// Remotion stores its render browser under <home>/chrome-headless-shell/<platform>/chrome-headless-shell-<platform>/<binary>.
export function remotionBrowserPlatform(platform = process.platform, arch = process.arch) {
  if (platform === 'darwin') return arch === 'arm64' ? 'mac-arm64' : 'mac-x64';
  if (platform === 'win32') return 'win64';
  return arch === 'arm64' ? 'linux-arm64' : 'linux64';
}

export function browserExecutableRelative(platform = process.platform, arch = process.arch) {
  const key = remotionBrowserPlatform(platform, arch);
  const binary = key === 'win64' ? 'chrome-headless-shell.exe' : key === 'linux-arm64' ? 'headless_shell' : 'chrome-headless-shell';
  return ['chrome-headless-shell', key, `chrome-headless-shell-${key}`, binary].join('/');
}

// The engine's copy of the render browser, as path segments under the studio root.
export const engineBrowserSegments = (platform = process.platform, arch = process.arch) =>
  ['engine', 'node_modules', '.remotion', ...browserExecutableRelative(platform, arch).split('/')];

export const toolPath = (root, name, platform = process.platform) => path.join(root, 'Tools', 'bin', exe(name, platform));
