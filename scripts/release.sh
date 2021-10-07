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

read -p "Build DNA (Y/N)? " -n 1 -r
echo
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo \* DNA wil be built and packed.
else
  echo \* DNA wil NOT be built and packed.
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
./scripts/download-hc.sh
./scripts/build-hc.sh
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
