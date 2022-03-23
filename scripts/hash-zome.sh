#!/bin/sh

cd build/snapmail-rsm/

./scripts/write-zome-hash.sh
cd ../../
cp build/snapmail-rsm/zome_hash.txt dna/
