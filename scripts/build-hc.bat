REM Script for building holochain and lair for windows
REM Holochain must have been downloaded first

cd build

REM Holochain
cd holochain
cargo build --release -p holochain
cp target/release/holochain ../../bin/holochain-win
cargo install --path crates/hc
cd ..

REM Lair
cd lair
cargo build --release
cp target/release/lair-keystore ../../bin/lair-keystore-win
cd ..

REM Done
cd ..
