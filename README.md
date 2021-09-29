# snapmail-release
SnapMail is an open-source P2P email app based on [Holochain](https://holochain.org/).  
It is the latest iteration of [Snapmail](http://www.glassbead.com/snapmail/index.shtml) from [Glass Bead Software](http://www.glassbead.com/).


![sshot](https://github.com/ddd-mtl/snapmail-release/blob/master/assets/snapmail-ui.png)

This is the repository for the native application (Electron).  
See [snapmail-rsm](https://github.com/ddd-mtl/snapmail-rsm) for holochain backend or [snapmail-ui](https://github.com/ddd-mtl/snapmail-ui) for web frontend source code.

(CI and NIX configs are not set up for the moment.)

## Installation

### Prerequisite 
 - Windows: holochain requires WSL2 to be installed. Follow [this tutorial](https://pureinfotech.com/install-windows-subsystem-linux-2-windows-10/) on instructions to do that. Only Windows 10 version 2004 and up is supported.
 - Linux: `libssl1.0.0` package must be installed on your system (and possibly `libssl-dev`)

### Steps
1. Go to the [release page](https://github.com/glassbeadsoftware/snapmail-release/releases)
1. Download the latest release file for your platform
1. Unzip the file somewhere on your disk
1. Launch the `Snapmail` executable.  
1. You will be prompted to select a bootstrap server url. This is required for discovering other peers on the network.
Use your own or the public one provided by Holo `bootstrap.holo.net`
1. Set your username in the top input box.
1. Other users on the same bootstrap server will appear in the bottom right list box after hitting the refresh button.

### Troubleshoot

##### Linux
- Make sure the following executables have execution rights: `Snapmail`, `lair-keystore`, `holochain`.


## Releasing

#### Steps for updating holochain version:
1. `./scripts/setup.sh`
2. `cd build/snapmail-rsm`
3. `./scripts/set-holochain-rev.sh <rev>`
4. `./scripts/save-dna-hash.sh`
5. `./scripts/pack-happ.sh`
6. `git commit`

#### Steps required for updating version number:
1. `./scripts/update-version-number.sh <semver>`

#### Steps for preparing a new release on Windows:
1. `./scripts/release.bat`

#### Steps for preparing a new release on Mac / Linux / Android:
1. `./scripts/release.sh`

#### Steps for publishing the new release on Windows:
1. `npm run deploy-win`

#### Steps for publishing the new release on Mac:
1. `npm run deploy-mac`
