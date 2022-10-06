#!/bin/sh

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

value=`curl -s https://api.github.com/repos/ddd-mtl/hash_zome/releases/latest | grep "/hash_zome-x86_64-$platform.tar.gz" | cut -d '"' -f 4`
echo Donwloading \'$value\'
wget --directory-prefix=submodules $value

tar -xvzf submodules/hash_zome-x86_64-$platform.tar.gz -C ./submodules
echo
echo ls ./submodules:
ls submodules
