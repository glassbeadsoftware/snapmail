#!/bin/sh
echo
echo \* Build latest Snapmail DNA
if ! test -d "./build"; then
    echo "$0: Aborting. Missing './build' folder."
    exit 1
fi
cd build


if ! test -d "./snapmail-rsm"; then
  echo \* Download DNA source code
  git clone https://github.com/glassbeadsoftware/snapmail-rsm
fi


echo \* Generate DNA
cd snapmail-rsm
git pull
bash ./scripts/write-zome-hash.sh
bash ./scripts/pack-happ.sh
cp snapmail.dna ../../dna
cp zome_hash.txt ../../dna
cd ..


echo
echo \* Copied DNA files to './dna'
echo
echo \* Done
cd ..
