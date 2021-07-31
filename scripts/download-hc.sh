#!/bin/sh
### Script for Retrieving the right holochain and lair version into ./build

cd build

### Holochain
# Extract REV from holochain_rev.txt in snapmail-rsm
HC_REV=`cat snapmail-rsm/holochain_rev.txt`
echo HC_REV = $HC_REV
# Build holochain
git clone https://github.com/holochain/holochain.git -n
cd holochain
git checkout $HC_REV
cd ..

### Lair
# Extract LAIR REV from crates/holochain_keystore/Cargo.toml
#lair_keystore_api = "=0.0.1-alpha.12"
LAIR_REV=`awk -F "=" '/lair_keystore_api/ {print $3}' holochain/crates/holochain_keystore/Cargo.toml | sed 's/"//g'`
echo LAIR_REV = $LAIR_REV
# Build lair
git clone https://github.com/holochain/lair.git -n
cd lair
git checkout tags/v$LAIR_REV
cd ..

# Done
cd ..
