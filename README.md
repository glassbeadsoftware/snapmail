# snapmail
SnapMail is an open-source P2P email app based on [Holochain](https://holochain.org/).  
It is the latest iteration of [Snapmail](http://www.glassbead.com/snapmail/index.shtml) from [Glass Bead Software](http://www.glassbead.com/).


![sshot](https://github.com/glassbeadsoftware/snapmail/blob/master/assets/snapmail-ui.png)

This is the repository for the native application (Electron).  
See [snapmail-rsm](https://github.com/glassbeadsoftware/snapmail-rsm) for holochain backend source code.

## Installation

### Prerequisite 
 - Linux: `libssl` package must be installed on your system (and possibly `libssl-dev`)

### Steps
1. Go to the [release page](https://github.com/glassbeadsoftware/snapmail/releases)
2. Download the latest release file for your platform.
3. Execute the downloaded installer.
4. Launch the `Snapmail` executable.
5. You will be prompted to select a network access key. This is required for discovering other peers on the network. You will only communicate with peers using the same network access key.
6. You will be prompted to Set a username.
7. Other users on the same network will appear in the bottom right list box.

### Troubleshoot

##### Linux
- Make sure the following executables have execution rights: `Snapmail`, `snapmail-lair-keystore`, `snapmail-holochain`.

 
## Releasing

#### Steps required for updating version number:
1. `./scripts/update-version-number.sh <semver>`


#### Steps for preparing a new release for all platforms on github:
1. Tag a new release in the [release page](https://github.com/glassbeadsoftware/snapmail/releases).
2. Wait for CI to complete its [workflow](https://github.com/glassbeadsoftware/snapmail/actions).

#### Steps for publishing the new release on Windows:
1. `npm run deploy-win`

#### Steps for publishing the new release on Mac:
1. `npm run deploy-mac`


## Development

#### Steps for updating holochain version:
1. `npm run setup`
2. Update the holochain dependencies in `snapmail-rsm`:
    1. `cd submodules/snapmail-rsm`
    2. update file `zomes/snapmail/Cargo.toml`
    3. update file `sweettest/Cargo.toml`
    4. `git commit`
3. Update the holochain dependencies in `web-ui`:
    1. `cd web-ui`
    2. update file `package.json`
    3. `npm install`
4. Update file `scripts/workflow/install-hc-tools.sh`
5. Update file `package.json`
6. `git commit`


### Toolchain

webpack
Typescript
electron-holochain
electron-builder

## Project structure

| Directory            | Description                                                                                                                 |
|:---------------------| :-------------------------------------------------------------------------------------------------------------------------- |
| `/assets/`           | Original media files used throughout the code base
| `/bin/`              | All the binaries we are dependent on on must ship with the app
| `/electron/`         | The electron app directory
| &nbsp;&nbsp;&nbsp;&nbsp;`src/`               | The electron app source code
| &nbsp;&nbsp;&nbsp;&nbsp;`web/`               | Final artifacts for the electron app (includes output from `ui`)
| &nbsp;&nbsp;&nbsp;&nbsp;`binaries/`          | All the binaries we are dependent on and must ship with the app
| `/submodules/`       | Temp folder for the code dependencies (snapmail-rsm)
| `/ui/apps/snapmail/` | The "normal" webapp bundled in electron & web-happ 
| `/ui/lib/`           | source code of the web ui components
| `/out-builder/`      | electron-builder output folder
| `/we-applet/`        | The applet for We integration
| `/webhapp.workdir/`  | webhapp work directory
