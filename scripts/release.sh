#!/bin/sh
# Script for Releasing Snapmail happ

start=`date +%s`

echo Starting Release process...

./scripts/setup.sh
./scripts/update-dna.sh
./scripts/download-hc.sh
./scripts/build-hc.sh
./scripts/build.sh prod
npm run dist-$1

# Print duration
end=`date +%s`
runtime=$((end-start))
echo $runtime
