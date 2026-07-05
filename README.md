# GitSwitch

<img src="https://i.imgur.com/7fIm5eT.png"/>

GitSwitch is a fast, lightweight desktop application built with Tauri and React that allows developers to seamlessly manage and switch between multiple Git profiles and SSH keys.

## Core Features
- **One-Click Profile Switching:** Instantly swap between identities across GitHub, GitLab, Bitbucket, and custom providers.
- **Automated SSH Setup:** Auto-generates keys and manages your `~/.ssh/config` without conflicts.
- **Automatic Commit Signing:** Flawlessly wires up SSH commit signing so your work is always verified.
- **Config Repair & Health Checks:** Automatically detects and repairs drift in your live Git or SSH configuration.
- **System Tray Integration:** Lives in your background for fast access on macOS, Windows, and Linux.

## Getting Started

**1. Add a Profile**
- Click **Add Profile**.
- Select your Git provider (GitHub, GitLab, Bitbucket, or Custom).
- Enter your username and the email you use for commits.
- Click **Generate** to create a fresh SSH key, or paste the path to an existing private key.

**2. Add the Key to Your Provider**
- After generating a key, copy the public key provided by GitSwitch.
- Click the shortcut link to open your provider's SSH settings.
- *Tip:* Add the key **twice** — once as an **Authentication Key** (for pushing/pulling) and once as a **Signing Key** (so your commits show up as "Verified").

**3. Save & Connect**
- Click **Save**. GitSwitch will securely save your key, perfectly configure your `~/.ssh/config` file, and pull your profile details.

**4. Switch Profiles Seamlessly**
- Select any saved profile from the dashboard and click **Switch**.
- GitSwitch instantly updates your global `user.name`, `user.email`, and automatically enables SSH commit signing. Every commit you make will now be perfectly attributed and signed!

**5. Keep Things Running Smoothly**
- **Background Mode:** Close the window to keep GitSwitch running in the system tray for fast switching.
- **Health Checks:** If your SSH configuration drifts or breaks, GitSwitch will alert you.
- **Reconcile:** Click this button to instantly repair any broken config.

## Development
This project requires Node.js and Rust.

1. Install dependencies: `pnpm install`
2. Start the development server: `pnpm tauri dev`
3. Build for production: `pnpm tauri build`

## Todo List
- [x] SSH commit signing — sets `gpg.format=ssh`, `user.signingkey`, and `commit.gpgsign` on profile switch.
- [x] Add support for more Git providers (GitLab, Bitbucket, etc.)
- [ ] Implement OAuth/Login flow as an alternative to SSH keys

## Development Approach
Due to time constraints in my schedule, the majority of the code in this repository was written by AI. My role is focused on high-level architecture, detailed planning, providing proper guidance to the AI, and making minor manual tweaks to ensure everything works flawlessly.

## Contributing
Contributions are highly welcome. If you have an idea, find a bug, or want to add a feature from the Todo list, feel free to open an issue or submit a pull request. Make sure your code is well-formatted and tested before submitting.
