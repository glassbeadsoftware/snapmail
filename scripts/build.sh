#!/bin/sh

# Script for building Snapmail DNA and UI

cd build

# Generate DNA
cd snapmail-rsm
sh scripts/pack-happ.sh
cp snapmail.dna ../../dna
cp snapmail.happ ../../dna
cp dna_hash.txt ../../dna
cd ..

# Generate Web UI
cd snapmail-ui
npm run prod
cp -r dist/* ../../ui
cd ..

## Done
cd ..
