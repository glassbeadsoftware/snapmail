#!/bin/sh
echo
echo \* Build Holochain and Lair for Linux or MacOs

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
cp target/release/holochain ../../bin/holochain-linux


echo
echo \* Install HC tool
cargo install --path crates/hc
cd ..


echo
echo \* Build Lair
cd lair
cargo build --release
cp target/release/lair-keystore ../../bin/lair-keystore-linux
cd ..


echo
echo \* Done
cd ..
