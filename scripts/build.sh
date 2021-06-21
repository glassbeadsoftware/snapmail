#!/bin/sh

cd build

# Generate DNA
cd snapmail-rsm
sh scripts/pack-happ.sh
cp snapmail.dna ../../dna
cp snapmail.happ ../../dna
cd ..

# Generate Web UI
cd snapmail-ui
npm run prod
cp -r dist/* ../../ui
