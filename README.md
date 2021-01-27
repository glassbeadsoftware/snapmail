# snapmail-release
SnapMail is an open-source P2P email app based on [Holochain](https://holochain.org/).  
It is the latest iteration of [Snapmail](http://www.glassbead.com/snapmail/index.shtml) from [Glass Bead Software](http://www.glassbead.com/).


![sshot](https://github.com/ddd-mtl/snapmail-release/blob/master/snapmail-ui.png)

This is the release repo for the native application (Electron).  
See [snapmail-rsm](https://github.com/ddd-mtl/snapmail-rsm) for holochain backend or [snapmail-ui](https://github.com/ddd-mtl/snapmail-ui) for web frontend source code.

(CI and NIX configs are not set up for the moment.)

## Installation

**Prerequisite**: On windows, holochain requires WSL2 to be installed. Follow [this tutorial](https://pureinfotech.com/install-windows-subsystem-linux-2-windows-10/) on instructions to do that. Only Windows 10 version 2004 and up is supported.

1. Go to the [release page](https://github.com/glassbeadsoftware/snapmail-release/releases)
1. Download the latest release file for your platform
1. Unzip the file somewhere on your disk
1. Launch the `Snapmail` executable.  
1. You will be prompted to select a bootstrap server url. This is required for discovering other peers on the network.
Use your own or the public one provided by Holo `bootstrap.holo.net`
1. Set your username in the top input box.
1. Other users on the same bootstrap server will appear in the bottom right list box after hitting the refresh button.

#### Troubleshoot

##### Linux
- Make sure the following executables have execution rights: `Snapmail`, `lair-keystore`, `holochain`.
- If you get `spawn ENOENT` error message, this means you need to [install nix-shell](https://developer.holochain.org/docs/install/) on your system.

