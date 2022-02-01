#!/bin/bash
echo
echo \* Creating new Snapmail happ Release
echo

start=`date +%s`

# Check pre-conditions
#if [ $# != 1 ]; then
#  echo 1>&2 "$0: Aborting. Missing argument: target"
#  exit 2
#fi

echo Current dependecies:
./bin/snapmail-holochain --version
./bin/snapmail-lair-keystore --version
hc --version

read -p "Regenerate holochain from source (Y/N)? " -n 1 -r
echo
echo
HCREPLY=$REPLY
if [[ $HCREPLY =~ ^[Yy]$ ]]; then
  echo \* Holochain will be rebuilt from source.
else
  echo \* Holochain will not be rebuilt from source.
fi


read -p "Rebuild Snapmail DNA from source (Y/N)? " -n 1 -r
echo
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo \* Snapmail DNA wil be rebuilt.
else
  echo \* Snapmail DNA wil NOT be rebuilt.
fi

# Determine platform
arch=`uname -m`
platform="linux"
if [[ "$OSTYPE" == "darwin"* ]]; then
  platform="mac"
elif [[ $arch == "aarch64" ]]; then
  platform="arm64"
fi
echo \* Target platform: $platform


# Starting Release process
./scripts/setup.sh
if [[ $HCREPLY =~ ^[Yy]$ ]]; then
./scripts/download-hc.sh
./scripts/build-hc.sh
fi
if [[ $REPLY =~ ^[Yy]$ ]]; then
  ./scripts/update-dna.sh
fi
./scripts/build-ui.sh prod
npm run dist-$platform

echo
echo \* Release done.

# Print duration
end=`date +%s`
runtime=$(((end-start)/60))
echo Duration: $runtime min
