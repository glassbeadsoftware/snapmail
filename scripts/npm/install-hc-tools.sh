#!/bin/bash

rustc --version

# For ts-bindings
# KEEP THIS IN SYNC
cargo install zits --version 1.6.0


### install wasm32 compilation target
#rustup install 1.61.0
#rustup override set 1.61.0

rustup target install wasm32-unknown-unknown


#install prebuilt "hc" tool

platform="pc-windows-msvc"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        platform="unknown-linux-gnu"
elif [[ "$OSTYPE" == "darwin"* ]]; then
        platform="apple-darwin"
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

value=`curl -s https://api.github.com/repos/ddd-mtl/holochain-prebuilt/releases/tag/holochain-0.1.0 | grep "/hc-x86_64-$platform.tar.gz" | cut -d '"' -f 4`
echo Donwloading \'$value\'
wget $value

tar -xvzf submodules/hc-x86_64-$platform.tar.gz
echo
echo ls ./
ls