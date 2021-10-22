#!/bin/sh
echo
echo \* Download the Holochain and Lair version that is stored in holochain_rev.txt

if ! test -d "./build"; then
    echo "$0: Aborting. Missing './build' folder."
    exit 1
fi

cd build

### snapmail-rsm
if ! test -d "./snapmail-rsm"; then
  echo \* Download DNA source code
  git clone https://github.com/glassbeadsoftware/snapmail-rsm
fi


### Holochain
echo
echo \* Extract REV from holochain_rev.txt in snapmail-rsm
HC_REV=`cat snapmail-rsm/holochain_rev.txt`
echo HC_REV = $HC_REV

echo
echo \* Download and checkout Holochain REV
git clone https://github.com/holochain/holochain.git -n
cd holochain
git checkout $HC_REV
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
echo \* Done
cd ..
