REM Script for building holochain and lair for windows
REM Holochain must have been downloaded first

cd build

REM Holochain
cd holochain/crates/holochain
cargo build --release
cd ../../..
cp holochain/target/release/holochain ../bin/holochain-win

REM Lair
cd lair
cargo build --release
cp target/release/lair-keystore ../../bin/lair-keystore-win
cd ..

REM Done
cd ..
