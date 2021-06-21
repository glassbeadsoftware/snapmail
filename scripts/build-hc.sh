#!/bin/sh

cd build

## Holochain
cd holochain/crates/holochain
cargo build --release
cd ../../..
cp holochain/target/release/holochain ../bin/holochain-linux

## Lair
cd lair
cargo build --release
cp target/release/lair-keystore ../../bin/lair-keystore-linux
cd ..

## Done
cd ..
