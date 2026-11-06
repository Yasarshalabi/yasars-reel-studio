# Setup, updates and checks

The studio folder is also the user's workspace. All downloads, dependencies and scratch stay here. Run commands yourself and relay the result line in the creator's language; act on the JSON result. A completed download or saved profile is not a passed doctor check.

Yasar's Reel Studio runs on **macOS with Apple Silicon (M1 or newer)** and on **Windows 64-bit**. Run `uname -sm` (macOS/Linux shells) or check `process.platform` to know which host you are on, then follow that host's lines below. Intel Macs and Windows on ARM are not supported; say so plainly if you find one.

## Which Node

Run `node --version`. v22.20.0 or newer: use `node`. Missing or older:

- **macOS:** run `bash scripts/install-node.sh`. It installs the official Node.js for Apple Silicon into `Tools/node/` (checked against the SHA-256 list nodejs.org publishes, no admin, no Homebrew) and prints `{"ok":true,"node":"<path>"}`.
- **Windows:** run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-node.ps1`. It installs the pinned portable Node into `Tools\node\` (hash-checked, no admin) and prints `{"ok":true,"node":"<path>"}`.

Use the printed path in place of `node` in every command in this folder for the rest of the session.

## Every session

1. Run `node scripts/studio.mjs check` once. If it says a new version exists, tell the user that one line and carry on. Never update unasked.
2. If `node scripts/studio.mjs status` does not report `done`, finish **First run** before editing.
3. «حدّث الاستوديو» / "update the studio" → `node scripts/studio.mjs update`, relay its line, then run the command in its `next` field if there is one. Updates install the newest official release (a `vX.Y.Z` tag) from this repository, never unreleased work. When the update starts setup in the background, poll `node scripts/studio.mjs status` every minute or two until it says `done`, then run `node scripts/studio.mjs doctor --quick`. Only then ask the user to open a new session so the new instructions load.
   - The studio ships `.claude/settings.json`, so its everyday commands run without a permission prompt. Those commands write only inside this folder and never into `Raw/`; an exported subtitle file is replaced only with `--force`. Deleting files, installing, updating and every other command still ask; that is expected. These rules are a convenience that spares prompts for the studio's own commands, not a sandbox or a security boundary.
4. «افحص النظام» / "check the system" → `node scripts/studio.mjs doctor` (allow 10 minutes). Relay its line and the video path.
5. «افتح إعداداتي» / "open my settings", style, language, fonts, default on-screen caption or post-description preferences → `node scripts/studio.mjs settings` as a long-running command. Open the printed local `url` in the user's browser/panel. Keep that process running while the screen is open. The user saves on the screen; verify with `node scripts/profile.mjs check`. Do not open settings for a one-video override; when a style request could mean either, ask once whether it is for this video only or for every video.

## First run (install)

The user pasted something like: «نزّل Yasar's Reel Studio في هالفولدر من https://github.com/Yasarshalabi/yasars-reel-studio واتبع AGENTS.md اللي فيه عشان تجهّزه».

1. **Build tools (macOS only).** Run `xcode-select -p`. If it fails, run `xcode-select --install`, tell the user a macOS window will ask them to install Apple's Command Line Tools (free, about 5–10 minutes), and wait until `xcode-select -p` succeeds. They provide `git`, `python3` and the compiler that builds the transcription tool with Apple's GPU (Metal).
2. **Git.** Run `git --version`.
   - macOS: it comes with the Command Line Tools from step 1.
   - Windows: if it fails, install portable Git inside this folder (PowerShell, no admin; run it as a PowerShell script, not through bash):
     ```powershell
     [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
     New-Item -ItemType Directory -Force -Path Tools | Out-Null
     $ProgressPreference = 'SilentlyContinue'
     Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/git-for-windows/git/releases/download/v2.55.0.windows.5/MinGit-2.55.0.5-64-bit.zip' -OutFile Tools\MinGit.zip.partial
     if ((Get-FileHash Tools\MinGit.zip.partial -Algorithm SHA256).Hash.ToLower() -ne '56d7b226b7693196cfc71fef26568f536c4a021ab6c37ff2db4287bed908e96e') { Remove-Item Tools\MinGit.zip.partial; throw 'MinGit hash mismatch' }
     Move-Item Tools\MinGit.zip.partial Tools\MinGit.zip
     Expand-Archive Tools\MinGit.zip -DestinationPath Tools\git
     Remove-Item Tools\MinGit.zip
     ```
     Then use `.\Tools\git\cmd\git.exe` wherever a step says `git`.
3. **Code.** If this folder is not a clone yet, get the code without touching anything already here:
   ```
   git init -b main
   git remote add origin https://github.com/Yasarshalabi/yasars-reel-studio.git
   git fetch origin main
   git checkout -B main --track origin/main
   ```
4. **Node.** See **Which Node**.
5. **Tools.** Run `node scripts/studio.mjs setup`. It returns at once; a background worker downloads the engine packages, the render browser, FFmpeg, the fonts, the face and person cut-out models and the transcription tool with its medium model (about 1.5 GB) into this folder (15–30 minutes the first time). On macOS the transcription tool (whisper.cpp) is compiled on the Mac from its pinned commit with Metal, which adds a few minutes. Tell the user in one line.
6. **Interactive profile, while setup runs.** If `PROFILE.json` is missing, run `node scripts/studio.mjs settings` as a long-running command and open its printed `url` in the user's browser/panel (Codex: use the available browser-opening tool). The screen starts with the creator's language (Jordanian, Palestinian, Syrian/Lebanese, Egyptian, Gulf, Maghrebi, White Arabic or English) and switches its own text to Arabic or English to match, then handles identity, independent fixed/automatic style, captions, fonts, publishing descriptions, colours and endings; the final save validates, saves and starts/resumes setup. It works before engine packages are installed. Existing profiles: validate, summarize in one line and preserve them; open settings only if requested. Schema 2 is read without rewriting; a screen save migrates to schema 3 and creates a local backup. If the host cannot open a browser, follow `instructions/SETTINGS.md` fallback questions and write a validated schema 3 profile yourself. Meanwhile check setup with `node scripts/studio.mjs status` every minute or two and relay its line only when it changes. If status says the worker stalled, run `node scripts/studio.mjs setup` again (it resumes). If it stalls a second time your host is stopping background processes: run `node scripts/studio.mjs setup --foreground` as a long-running (background) command instead. If a step failed, relay its line as it is (for example: the studio must move to a folder with no `package.json` above it).
7. **Test reel.** When status says `done`, run `node scripts/studio.mjs doctor` (allow 10 minutes). It renders `Projects/_doctor/doctor.mp4` with the user's name, colours and ending through the full delivery checks. Give the user the path.
8. End with the ready line, in the creator's language, for example: «هيك الاستوديو جاهز. افتح جلسة جديدة وقول «افحص النظام» عشان نتأكد إنه كل إشي شغّال.»

## Verification on each host

| Download | Windows | macOS |
| --- | --- | --- |
| Node.js (only if missing) | Pinned SHA-256 | nodejs.org's published SHA-256 list |
| FFmpeg | gyan.dev full build, pinned SHA-256 | Static Apple Silicon FFmpeg 6.1 from the ffmpeg-static project on GitHub, pinned SHA-256 (download and binary); if GitHub is unreachable, Martin Riedl's static release checked against its published SHA-256 |
| Render browser | Remotion's tested build, pinned SHA-256 | Remotion's tested build; its SHA-256 is recorded in `Tools/browser-install.json` on first install and checked after |
| Transcription runtime | Official whisper.cpp release zip, pinned SHA-256 | Built from the pinned whisper.cpp git commit with Metal; if this Mac's SDK cannot build Metal, a CPU build (Apple Accelerate) is made instead |
| Models and fonts | Pinned SHA-256 | Pinned SHA-256 (the same files) |

## Troubleshooting

Keep the setup server/worker alive and report changed stages rather than repeatedly narrating unchanged polls. Resume a stalled step once; if the host stops its background worker again, use the documented foreground fallback. A failed tool/model/browser stage needs its actual error resolved before calling the studio ready. Use `node scripts/studio.mjs doctor --quick` for non-rendering checks; `doctor` checks a real test export.

- **macOS, transcription step says Command Line Tools are missing:** run `xcode-select --install`, let the user finish Apple's window, then `node scripts/studio.mjs setup` again.
- **macOS, a downloaded tool "cannot be opened because the developer cannot be verified":** files downloaded by the studio itself are not quarantined; this appears only when the user copied a tool in by hand. Delete that copy and let `setup` download it again.
- **Windows, the transcription step reports the missing Microsoft Visual C++ Redistributable:** ask the user to install Microsoft's official x64 package from https://aka.ms/vs/17/release/vc_redist.x64.exe themselves (it is a system install that needs their approval), then run `node scripts/studio.mjs setup` again.

During normal editing keep tracked studio files intact so updates remain safe. Requested studio maintenance is a separate authorized task. Never run global installers or delete state while a setup worker is running. Do not replace dependencies ad hoc with `npm install`; use the pinned setup/update workflow.
