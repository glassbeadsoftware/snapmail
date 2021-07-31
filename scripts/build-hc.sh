#!/bin/sh
# Script for building holochain and lair for linux / MacOs
# Holochain must have been downloaded first

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
