#!/bin/bash
# Yasar's Reel Studio — portable Node.js for macOS (Apple Silicon), installed into Tools/node (no admin, no Homebrew).
# The archive is checked against the SHA256SUMS file nodejs.org publishes for the release before it is unpacked.
# Prints {"ok":true,"node":"<path>"} on success.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
LOCK="$ROOT/versions.lock.json"

if [ "$(uname -s)" != "Darwin" ]; then echo '{"ok":false,"error":"install-node.sh is for macOS. On Windows use scripts/install-node.ps1."}'; exit 1; fi
if [ "$(uname -m)" != "arm64" ]; then echo '{"ok":false,"error":"This edition targets Apple Silicon (arm64) Macs."}'; exit 1; fi

# Read the pin without needing Node: plain text matching on the macos.node block.
read_pin() { /usr/bin/python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['macos']['node'][sys.argv[2]])" "$LOCK" "$1" 2>/dev/null || true; }
VERSION="$(read_pin version)"; FILE="$(read_pin file)"; URL="$(read_pin url)"; SUMS="$(read_pin checksums)"
if [ -z "$VERSION" ] || [ -z "$URL" ]; then
  # python3 may still be waiting for Command Line Tools; fall back to the pinned defaults of this release.
  VERSION="22.20.0"; FILE="node-v22.20.0-darwin-arm64.tar.gz"
  URL="https://nodejs.org/dist/v22.20.0/$FILE"; SUMS="https://nodejs.org/dist/v22.20.0/SHASUMS256.txt"
fi

DEST="$ROOT/Tools/node"
if [ -x "$DEST/bin/node" ] && [ "$("$DEST/bin/node" --version)" = "v$VERSION" ]; then
  printf '{"ok":true,"node":"%s","cached":true}\n' "$DEST/bin/node"; exit 0
fi

CACHE="$ROOT/state/cache/downloads"; mkdir -p "$CACHE" "$ROOT/Tools"
ARCHIVE="$CACHE/$FILE"
EXPECTED="$(/usr/bin/curl -fsSL "$SUMS" | /usr/bin/awk -v f="$FILE" '$2==f {print $1}')"
if ! [[ "$EXPECTED" =~ ^[a-f0-9]{64}$ ]]; then echo '{"ok":false,"error":"Could not read the published Node.js checksum."}'; exit 1; fi

/usr/bin/curl -fL --retry 3 -o "$ARCHIVE.partial" "$URL"
ACTUAL="$(/usr/bin/shasum -a 256 "$ARCHIVE.partial" | /usr/bin/awk '{print $1}')"
if [ "$ACTUAL" != "$EXPECTED" ]; then
  rm -f "$ARCHIVE.partial"
  printf '{"ok":false,"error":"Node.js archive SHA-256 mismatch (expected %s, got %s)."}\n' "$EXPECTED" "$ACTUAL"; exit 1
fi
mv "$ARCHIVE.partial" "$ARCHIVE"

STAGING="$ROOT/Tools/node.install"
rm -rf "$STAGING"; mkdir -p "$STAGING"
/usr/bin/tar -xzf "$ARCHIVE" -C "$STAGING" --strip-components 1
rm -rf "$DEST"; mv "$STAGING" "$DEST"; rm -f "$ARCHIVE"
"$DEST/bin/node" --version >/dev/null
printf '{"ok":true,"node":"%s"}\n' "$DEST/bin/node"
