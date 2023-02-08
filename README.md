# snapmail
SnapMail is an open-source P2P messaging app based on [Holochain](https://holochain.org/).  
It is the latest iteration of [Snapmail](http://www.glassbead.com/snapmail/index.shtml) from [Glass Bead Software](http://www.glassbead.com/).


![sshot](https://github.com/glassbeadsoftware/snapmail/blob/master/assets/snapmail-ui.png)

This is the repository for the different native applications 
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
1. Set version number in top-level `package.json`
2. `npm run update-version`


#### Steps for preparing a new release for all platforms on github:
1. Tag a new release in the [release page](https://github.com/glassbeadsoftware/snapmail/releases).
2. Wait for CI to complete its [workflow](https://github.com/glassbeadsoftware/snapmail/actions).

#### Steps for publishing the new release on Windows:
1. `npm run deploy-win`

#### Steps for publishing the new release on Mac:
1. `npm run deploy-mac`


## Development

#### Steps for updating holochain version:
1. Check `snapmail-rsm` repo has a branch for the new holochain version.
1. Update `hc-version` field in the top-level `package.json`.
3. Update the holochain-related dependencies in child `package.json`:
   4. `webcomponents`:  `lit-happ` & `holochain-client-js`
   5. `webapp`: `lit-happ` & `holochain-client-js`
   6. `we-applet`: `holochain-client-js`
   6. `electron`: `@lightningrodlabs/electron-holochain`
3. Check `npm run install:zits`: Make sure `zits` is compatible for the version of  holochain & `holochain-client-js`.
6. `git commit`


### Toolchain

cargo, npm, rollup, typescript, eslint, electron-builder

## Project structure

| Directory                                  | Description                                                                                                                 |
|:-------------------------------------------| :-------------------------------------------------------------------------------------------------------------------------- |
| `/assets/`                                 | Original media files used throughout the code base
| `/electron/`                               | The electron app directory
| &nbsp;&nbsp;&nbsp;&nbsp;`src/`             | The electron app source code
| &nbsp;&nbsp;&nbsp;&nbsp;`web/`             | Final artifacts for the electron app (includes output from `webapp`)
| &nbsp;&nbsp;&nbsp;&nbsp;`bin/`             | All the binaries we are dependent on and must ship with the app
| `/scripts/`                                | Various shell scripts for building, testing, releasing
| `/submodules/`                             | Temp folder for code dependencies
| `/we-applet/`                              | We-applet source code
| &nbsp;&nbsp;&nbsp;&nbsp;`webhapp.workdir/` | "we-applet" webhapp work directory
| `/webapp/`                                 | Webapp source code. Used by electron app
| &nbsp;&nbsp;&nbsp;&nbsp;`webhapp.workdir/` | "Normal" webhapp work directory
| `/webcomponents/`                          | Source code of the web components to be used by the webapps
