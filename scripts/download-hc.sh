#!/bin/sh
echo
echo \* Download the Holochain and Lair version that is used by snapmail-rsm

if ! test -d "./build"; then
    echo "$0: Aborting. Missing './build' folder."
    exit 1
fi

cd build

### Get snapmail-rsm in order to extract the holochain version number
if ! test -d "./snapmail-rsm"; then
  echo \* Download DNA source code
  git clone https://github.com/glassbeadsoftware/snapmail-rsm
fi


### Holochain
echo
echo \* Extract HOLOCHAIN REV from snapmail-rsm Cargo.toml
HC_REV=`awk -F'[ ="]+' '$1 == "holochain" { print $4 }' snapmail-rsm/zomes/snapmail/Cargo.toml | sed 's/"//g'`
echo HC_REV = $HC_REV

echo
echo \* Download and checkout Holochain REV
git clone https://github.com/holochain/holochain.git -n
cd holochain
git checkout holochain-$HC_REV
cd ..


### Lair
# lair_keystore_client_0_0 = { version = "=0.0.8", package = "lair_keystore_client" }
echo
echo \* Extract LAIR REV from crates/holochain_keystore/Cargo.toml
LAIR_REV=`awk -F'[ ="]+' '$1 == "lair_keystore_client_0_0" { print $4 }' holochain/crates/holochain_keystore/Cargo.toml | sed 's/"//g'`
echo LAIR_REV = $LAIR_REV

echo
echo \* Download and checkout Lair TAG
git clone https://github.com/holochain/lair.git -n
cd lair
git checkout tags/v$LAIR_REV
cd ..


# Done
echo
echo \* Done - download-hc.sh
cd ..
