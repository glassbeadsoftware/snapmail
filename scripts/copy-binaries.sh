#!/bin/bash

echo $OSTYPE

binFolder="bin"


if [[ $OSTYPE == 'darwin'* ]]; then
  cp node_modules/electron-holochain/binaries/lair-keystore $binFolder/lair-keystore
  cp node_modules/electron-holochain/binaries/holochain-runner $binFolder/holochain-runner
elif [[ $OSTYPE == 'linux-gnu'* ]]; then
  cp node_modules/electron-holochain/binaries/lair-keystore $binFolder/lair-keystore
  cp node_modules/electron-holochain/binaries/holochain-runner $binFolder/holochain-runner
elif [[ $OSTYPE == "cygwin" ]]; then
  # POSIX compatibility layer and Linux environment emulation for Windows
  cp node_modules/electron-holochain/binaries/lair-keystore.exe bin/lair-keystore.exe
  cp node_modules/electron-holochain/binaries/holochain-runner.exe $binFolder/holochain-runner.exe
elif [[ $OSTYPE == "msys" ]]; then
  # Lightweight shell and GNU utilities compiled for Windows (part of MinGW)
  cp node_modules/electron-holochain/binaries/lair-keystore.exe $binFolder/lair-keystore.exe
  cp node_modules/electron-holochain/binaries/holochain-runner.exe $binFolder/holochain-runner.exe
fi
