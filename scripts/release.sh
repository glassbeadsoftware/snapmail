#!/bin/bash
echo
echo \* Create new Snapmail happ Release
echo !!! Make sure DNA has been updated to latest first !!!
echo

start=`date +%s`

# Check pre-conditions
#if [ $# != 1 ]; then
#  echo 1>&2 "$0: Aborting. Missing argument: target platform"
#  exit 2
#fi

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
./scripts/update-dna.sh
./scripts/build-ui.sh prod
npm run dist-$platform

echo
echo \* Release done.

# Print duration
end=`date +%s`
runtime=$(((end-start)/60))
echo Duration: $runtime min
