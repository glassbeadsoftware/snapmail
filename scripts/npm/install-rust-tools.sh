#!/bin/bash

rustc --version

### install wasm32 compilation target

#rustup install 1.65.0
#rustup override set 1.65.0

rustup target install wasm32-unknown-unknown


### ts-bindings
# KEEP THIS IN SYNC
#cargo install zits --version 1.6.0


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

tarfile=zits-x86_64-$platform.tar.gz

if test -f "artifacts/$tarfile"; then
  echo zits file found
  exit 0
fi

value=`curl -s https://api.github.com/repos/ddd-mtl/zits/releases/tags/v1.6.1 | grep "/$tarfile" | cut -d '"' -f 4`
echo Donwloading \'$value\'
wget --directory-prefix=artifacts $value

tar -xvzf artifacts/$tarfile -C ./artifacts
echo
echo ls ./artifacts
ls artifacts

