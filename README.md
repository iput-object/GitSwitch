# GitSwitch

<img src="https://i.imgur.com/7fIm5eT.png"/>

GitSwitch is a fast, lightweight desktop application built with Tauri and React that allows developers to seamlessly manage and switch between multiple Git profiles and SSH keys.

## Features
- Seamless switching between multiple GitHub profiles.
- Automatic updates to global Git configuration (`user.name`, `user.email`).
- SSH key generation, management, and automatic `.ssh/config` injection.
- Real-time GitHub statistics overview (repositories, followers, commits).
- System tray integration for background execution and quick access.
- Native auto-updater for over-the-air updates.

## Development
This project requires Node.js and Rust.

1. Install dependencies: `pnpm install`
2. Start the development server: `pnpm tauri dev`
3. Build for production: `pnpm tauri build`

## Todo List
- Add support for more Git providers (GitLab, Bitbucket, etc.).
- Implement OAuth/Login flow as an alternative to SSH keys.
- Continuous performance improvements and optimizations.

## Contributing
Contributions are highly welcome. If you have an idea, find a bug, or want to add a feature from the Todo list, feel free to open an issue or submit a pull request. Make sure your code is well-formatted and tested before submitting.
