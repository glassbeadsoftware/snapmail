#!/bin/sh
echo
echo \* Create new Snapmail happ Release
echo !!! Make sure DNA has been updated to latest first !!!
echo

# Check pre-conditions
if [ $# != 1 ]; then
  echo 1>&2 "$0: Aborting. Missing argument: target platform"
  exit 2
fi

start=`date +%s`

# Starting Release process
./scripts/setup.sh
./scripts/download-hc.sh
./scripts/build-hc.sh
./scripts/build.sh prod
npm run dist-$1

echo
echo \* Release done.

# Print duration
end=`date +%s`
runtime=$(((end-start)/60))
echo Duration: $runtime min
