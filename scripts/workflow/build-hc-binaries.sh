#!/bin/bash

./scripts/download-hc.sh

platform="win"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        platform="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
        platform="linux"
#elif [[ "$OSTYPE" == "cygwin" ]]; then
#        # POSIX compatibility layer and Linux environment emulation for Windows
#elif [[ "$OSTYPE" == "msys" ]]; then
#        # Lightweight shell and GNU utilities compiled for Windows (part of MinGW)
#elif [[ "$OSTYPE" == "win32" ]]; then
#        # I'm not sure this can happen.
#elif [[ "$OSTYPE" == "freebsd"* ]]; then
#        platform="linux"
#else
        # Unknown.
fi

echo
echo OSTYPE is: $OSTYPE
echo platform : $platform

cd build
cd holochain
cargo build --release -p holochain
cp target/release/holochain ../../bin/holochain-$platform
cd ..


cd lair
cargo build --release
cp target/release/lair-keystore ../../bin/lair-keystore-$platform
cd ..
