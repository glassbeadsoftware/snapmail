#!/bin/bash

echo $OSTYPE

binFolder="electron/bin"
moduleFolder="node_modules/@lightningrodlabs/electron-holochain/binaries"

if [[ $OSTYPE == 'darwin'* ]]; then
  bin = holochain-runner
elif [[ $OSTYPE == 'linux-gnu'* ]]; then
  bin = holochain-runner
elif [[ $OSTYPE == "cygwin" ]]; then
  # POSIX compatibility layer and Linux environment emulation for Windows
  bin = holochain-runner.exe
elif [[ $OSTYPE == "msys" ]]; then
  # Lightweight shell and GNU utilities compiled for Windows (part of MinGW)
  bin = holochain-runner.exe
fi

ls $moduleFolder
cp $moduleFolder/$bin $binFolder/$bin
