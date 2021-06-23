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
npm run prod
cp -r dist/* ../../ui
cd ..

# Align Version numbers
NEW_VER=`awk -F ":" '/"version"/ {print $2}' snapmail-ui/package.json | sed 's/"//g' | sed 's/,//g' | sed 's/ //g'`

OLD_VER=`awk -F ":" '/"version"/ {print $2}' ../package.json | sed 's/"//g' | sed 's/,//g' | sed 's/ //g'`

echo "OLD REV = '$OLD_VER'"
echo "NEW REV = '$NEW_VER'"

sed -i "s/$OLD_VER/$NEW_VER/" ../package.json

## Done
cd ..
