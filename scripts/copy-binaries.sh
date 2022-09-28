#!/bin/bash

echo $OSTYPE

binFolder="electron/bin"
moduleFolder="node_modules/@lightningrodlabs/electron-holochain/binaries"

if [[ $OSTYPE == 'darwin'* ]]; then
  cp $moduleFolder/lair-keystore $binFolder/lair-keystore
  cp $moduleFolder/holochain-runner $binFolder/holochain-runner
elif [[ $OSTYPE == 'linux-gnu'* ]]; then
  cp $moduleFolder/lair-keystore $binFolder/lair-keystore
  cp $moduleFolder/holochain-runner $binFolder/holochain-runner
elif [[ $OSTYPE == "cygwin" ]]; then
  # POSIX compatibility layer and Linux environment emulation for Windows
  cp $moduleFolder/lair-keystore.exe bin/lair-keystore.exe
  cp $moduleFolder/holochain-runner.exe $binFolder/holochain-runner.exe
elif [[ $OSTYPE == "msys" ]]; then
  # Lightweight shell and GNU utilities compiled for Windows (part of MinGW)
  cp $moduleFolder/lair-keystore.exe $binFolder/lair-keystore.exe
  cp $moduleFolder/holochain-runner.exe $binFolder/holochain-runner.exe
fi
