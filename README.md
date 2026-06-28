# GitSwitch

<img src="https://i.imgur.com/7fIm5eT.png"/>

GitSwitch is a fast, lightweight desktop application built with Tauri and React that allows developers to seamlessly manage and switch between multiple Git profiles and SSH keys.

## Features
- Seamless switching between multiple GitHub profiles — one click sets the active identity.
- Automatic updates to global Git configuration (`user.name`, `user.email`).
- SSH key generation (or point GitSwitch at an existing key) with automatic, conflict-safe `~/.ssh/config` injection.
- Keys are staged and only written to `~/.ssh` when you save a profile.
- Reconciliation that detects and repairs drift between the active profile and your live Git/SSH config.
- Per-profile health checks so you can see at a glance whether a profile is correctly wired up.
- Real-time GitHub statistics overview (repositories, followers, commits) with manual refresh.
- System tray integration for background execution and quick access.
- Native auto-updater for over-the-air updates.
- Cross-platform: macOS, Windows, and Linux.

## How to Use

1. **Add a profile.** Open *Add Profile*, enter a GitHub username and commit email. Either paste the path to an existing private key, or click **Generate** to create a fresh SSH key.
2. **Register the key on GitHub.** When a key is generated, copy the public half and click the link to add it at *GitHub → Settings → SSH keys*. Add it **twice** — once as an *Authentication Key* (for push/pull) and once as a *Signing Key* (the same `.pub`) — so your signed commits show up as **Verified**.
3. **Save.** GitSwitch moves the staged key into `~/.ssh`, writes a managed block to `~/.ssh/config`, and pulls your name, avatar, and stats from GitHub.
4. **Switch.** Pick a profile and hit **Activate** — this updates your global `user.name` / `user.email`, the active SSH identity, and turns on SSH commit signing (`gpg.format=ssh`, `user.signingkey`, `commit.gpgsign=true`) so every commit is signed with that profile's key. The active profile is shown on the dashboard.
5. **Stay healthy.** Health checks flag misconfigured profiles; **Reconcile** repairs drift between the active profile and your live config. Use **Refresh** to re-pull GitHub stats.
6. **Run in background.** Closing the window keeps GitSwitch in the system tray for quick switching.

## Development
This project requires Node.js and Rust.

1. Install dependencies: `pnpm install`
2. Start the development server: `pnpm tauri dev`
3. Build for production: `pnpm tauri build`

## Todo List
- [x] SSH commit signing — sets `gpg.format=ssh`, `user.signingkey`, and `commit.gpgsign` on profile switch.
- [ ] Add support for more Git providers (GitLab, Bitbucket, etc.)
- [ ] Implement OAuth/Login flow as an alternative to SSH keys

## Contributing
Contributions are highly welcome. If you have an idea, find a bug, or want to add a feature from the Todo list, feel free to open an issue or submit a pull request. Make sure your code is well-formatted and tested before submitting.
