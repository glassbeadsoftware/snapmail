#!/bin/bash

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

