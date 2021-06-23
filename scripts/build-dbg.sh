#!/bin/sh

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
npm run dev
cp -r dist/* ../../ui_dbg
