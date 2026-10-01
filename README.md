# GitSwitch

<img src="https://i.imgur.com/7fIm5eT.png"/>

GitSwitch lets you use several Git accounts on one machine (work, personal,
client) and switch between them in one click. Each account gets its own SSH
key, and switching updates your global Git identity, your SSH config, and
commit signing together, so every push and commit goes out as the right person.

Works with GitHub, GitLab, Bitbucket, and self-hosted GitLab-style servers.
Runs on Linux, macOS, and Windows.

## Install

Download the latest build from the
[Releases page](https://github.com/iput-object/GitSwitch/releases/latest):

| Platform | File |
| --- | --- |
| Windows | `.msi` or `-setup.exe` |
| macOS (Apple Silicon) | `aarch64.dmg` |
| macOS (Intel) | `x64.dmg` |
| Linux | `.AppImage`, `.deb`, or `.rpm` |

You'll need `git` and OpenSSH (`ssh`, `ssh-keygen`) on your `PATH`. They're
already there on macOS and most Linux distros, and come with Git for Windows.

GitSwitch updates itself: when a new version is out, the bell icon and the
bottom of the sidebar offer to install it.

> **macOS:** builds aren't notarized yet. If macOS says the app is damaged or
> can't be opened, run `xattr -dr com.apple.quarantine /Applications/gitswitch.app`
> once, then open it again.

## Add your first account

1. **Pick a provider.** GitHub, GitLab, Bitbucket, or **Custom** for a
   self-hosted server.
2. **Give it a key.** Either:
   - click **Create key** to generate a fresh one, or
   - paste a path to an existing private key (e.g. `~/.ssh/id_ed25519`), paste
     the key itself, or drop the key file onto the field.
3. **Add the public key to your provider** (only for a new key). GitSwitch
   shows the public key with a copy button and a link to your provider's SSH
   settings. On GitHub, add it **twice**: once as an *Authentication key* (to
   push and pull) and once as a *Signing key* (so commits show as Verified).
4. **Sync.** GitSwitch connects over SSH with that key, and the provider tells
   it which account the key belongs to. You never type a username. Name,
   avatar, and a suggested commit email come from the provider's public profile.
5. **Confirm and save.** Adjust the display name or commit email if you like.

Your first saved account becomes the active one.

## Switching

On the **Profiles** screen, click **Switch** on any saved account. That one
becomes the **active profile**: your commits, pushes, and signatures all use it.

The **⋮** menu on each account also has:

- **Switch SSH only:** use this account's key for one provider without
  changing who your commits are from. Handy when, say, your GitHub work account
  is active but you need to push to a personal GitLab repo. It shows an
  **SSH active** badge.
- **Edit Profile**, **Refresh** (re-pull name, avatar, stats), and **Delete**.

You can also switch from the **tray icon** without opening the window. Closing
the window keeps GitSwitch in the tray; use **Quit** from the tray to exit.

## What GitSwitch changes on your machine

Switching only touches these, and only globally (repo-level `.git/config`
overrides still win):

| Where | What |
| --- | --- |
| `~/.gitconfig` | `user.name`, `user.email`, `user.signingkey`, `gpg.format = ssh`, `commit.gpgsign = true` |
| `~/.ssh/config` | One block per provider host, between `# >>> GitSwitch managed block` markers. Any existing hand-written `Host github.com` (etc.) block is commented out, not deleted, so it can't override GitSwitch. Everything else in the file is left as is. |
| `~/.ssh/gitswitch/` | Keys you created or pasted in GitSwitch. Keys you pointed at by path stay where they are. |

The list of accounts lives in a small local database in the app's data folder.
Nothing is sent anywhere except the SSH check and public-profile lookups to
your providers.

**To undo it:** delete the managed blocks from `~/.ssh/config` (and uncomment
your old ones if you had any), and remove the five keys above from
`~/.gitconfig` with `git config --global --unset <key>`.

## Notifications

The bell in the top bar has a red dot when something needs you:

- a new version is ready to install, or needs a restart to finish;
- a switch didn't fully apply;
- your Git email was changed outside GitSwitch (e.g. by `git config` in a
  terminal), with a button to re-apply the active profile;
- an account's SSH key file has gone missing;
- a key in your SSH config belongs to an account you haven't added yet (found
  when you press refresh or **Ctrl/Cmd + R**).

## Command line

The app doubles as a CLI. Run it with a command instead of opening the window:

```sh
gitswitch list                                     # all accounts, * marks the active one
gitswitch current                                  # the active account
gitswitch use octocat                              # switch by login
gitswitch add --provider github --key ~/.ssh/id_ed25519
gitswitch open                                     # open the window
gitswitch --hidden                                 # start in the tray only
```

`--provider` takes a built-in id (`github`, `gitlab`, `bitbucket`) or a custom
provider's name. On Linux the `.deb` and `.rpm` put `gitswitch` on your `PATH`.
On macOS it lives at `/Applications/gitswitch.app/Contents/MacOS/gitswitch`, so
add an alias if you want it everywhere.

## Troubleshooting

**"did not recognize this key yet" when syncing.** The public key isn't on
your provider account yet, or was added to a different account. Add it under
SSH keys, then sync again.

**Commits show as "Unverified".** The key is added for authentication but not
for signing. Add the same public key again as a *Signing key*. Older commits
flip to Verified once it's added.

**A profile shows "won't work".** Its key file was moved or deleted. Delete
the profile and add the account again with the key's new location (or a new
key).

**Pushes still use the wrong account.** Check the repo's remote URL with
`git remote -v`. A custom host alias like `git@github-work:…` bypasses the
`github.com` block GitSwitch manages. Use the plain `git@github.com:…` form.

## Development

You'll need Node.js 24, pnpm, and Rust (stable). On Linux, also the Tauri
system packages: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`.

```sh
pnpm install
pnpm tauri dev      # run with hot reload
pnpm tauri build    # production build and installers
```

The frontend is React + Tailwind in `src/`, the backend is Rust in
`src-tauri/src/`. Releases are built by GitHub Actions when a `v*` tag is
pushed.

## Roadmap

- [x] SSH commit signing
- [x] GitLab, Bitbucket, and self-hosted providers
- [x] CLI
- [ ] Sign in with OAuth as an alternative to SSH keys
- [ ] GPG key support

## Development approach

Due to time constraints in my schedule, the majority of the code in this
repository was written by AI. My role is focused on high-level architecture,
detailed planning, providing proper guidance to the AI, and making minor manual
tweaks to ensure everything works flawlessly.

## Contributing

Contributions are welcome. If you have an idea, find a bug, or want to pick up
something from the roadmap, open an issue or a pull request.
