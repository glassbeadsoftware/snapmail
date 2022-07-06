#!/bin/bash


#cp dna/workdir/dna-ludotheque/where.dna electron/binaries/where.dna
#cp dna/zome_hash.txt electron/binaries

bash scripts/copy-binaries.sh

# ui
npm run build:ui
