#!/bin/bash

rustc --version

### ts-bindings
# KEEP THIS IN SYNC
cargo install zits --version 1.6.0


### install wasm32 compilation target

#rustup install 1.65.0
#rustup override set 1.65.0

rustup target install wasm32-unknown-unknown


### Install prebuilt "hc" tool

platform="windows"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        platform="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
        platform="mac"
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

tarfile=hc_$platform.tar.gz

if test -f "$tarfile"; then
  echo hc file found
  exit 0
fi

value=`curl -s https://api.github.com/repos/ddd-mtl/hc-prebuilt/releases/tags/v0.1.0 | grep "/$tarfile" | cut -d '"' -f 4`
echo Donwloading \'$value\'
wget $value

tar -xvzf $tarfile
mv holochain/target/release/* ./
rm -rf holochain
echo
echo ls ./
ls
