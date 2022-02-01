#!/bin/sh
echo
echo \* Build Holochain and Lair for Linux or MacOs
echo \* WARNING \* This will install a new version of hc tools

if ! test -d "./build"; then
    echo "$0: Aborting. Missing './build' folder."
    exit 1
fi
if ! test -d "./build/holochain"; then
    echo "$0: Aborting. Missing './build/holochain' folder."
    exit 1
fi
if ! test -d "./build/lair"; then
    echo "$0: Aborting. Missing './build/lair' folder."
    exit 1
fi

cd build


echo
echo \* Build Holochain
cd holochain
cargo build --release -p holochain
cp target/release/holochain ../../bin/snapmail-holochain


echo
echo \* Install HC tool
cargo install --path crates/hc
cd ..


echo
echo \* Build Lair
cd lair
cargo build --release
cp target/release/lair-keystore ../../bin/snapmail-lair-keystore
cd ..


echo
echo \* Done
cd ..
