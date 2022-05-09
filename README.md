# snapmail
SnapMail is an open-source P2P email app based on [Holochain](https://holochain.org/).  
It is the latest iteration of [Snapmail](http://www.glassbead.com/snapmail/index.shtml) from [Glass Bead Software](http://www.glassbead.com/).


![sshot](https://github.com/ddd-mtl/snapmail-release/blob/master/assets/snapmail-ui.png)

This is the repository for the native application (Electron).  
See [snapmail-rsm](https://github.com/ddd-mtl/snapmail-rsm) for holochain backend or [snapmail-ui](https://github.com/ddd-mtl/snapmail-ui) for web frontend source code.

(CI and NIX configs are not set up for the moment.)

## Installation

### Prerequisite 
 - Linux: `libssl` package must be installed on your system (and possibly `libssl-dev`)

### Steps
1. Go to the [release page](https://github.com/glassbeadsoftware/snapmail-release/releases)
2. Download the latest release file for your platform.
3. Execute the downloaded installer.
4. Launch the `Snapmail` executable.
5. You will be prompted to select a network access key. This is required for discovering other peers on the network. You will only communicate with peers using the same network access key.
6. You will be prompted to Set a username.
7. Other users on the same network will appear in the bottom right list box.

### Troubleshoot

##### Linux
- Make sure the following executables have execution rights: `Snapmail`, `snapmail-lair-keystore`, `snapmail-holochain`.


## Development

#### Steps for updating holochain version:
1. `npm run setup`
2. `cd build/snapmail-rsm`
3. `./scripts/set-holochain-rev.sh <rev>`
4. `./scripts/write-zome-hash.sh`
5. `./scripts/pack-happ.sh`
6. `git commit`

 
## Releasing

#### Steps required for updating version number:
1. `./scripts/update-version-number.sh <semver>`
2. `cd build/snapmail-ui`
3. `git commit`

#### Steps for preparing a new release for all platforms on github:
1. Tag a new release in the [release page](https://github.com/glassbeadsoftware/snapmail-release/releases).
2. Wait for CI to complete its [workflow](https://github.com/glassbeadsoftware/snapmail/actions).

#### Steps for publishing the new release on Windows:
1. `npm run deploy-win`

#### Steps for publishing the new release on Mac:
1. `npm run deploy-mac`
