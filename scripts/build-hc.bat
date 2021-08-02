@echo off
echo Building holochain and lair for Windows

IF NOT exist build ( goto NODIR )
IF NOT exist build\holochain ( goto NODIR )
IF NOT exist build\lair ( goto NODIR )

cd build

:: Holochain
cd holochain
cargo build --release -p holochain
cp target/release/holochain ../../bin/holochain-win
cargo install --path crates/hc
cd ..

:: Lair
cd lair
cargo build --release
cp target/release/lair-keystore ../../bin/lair-keystore-win
cd ..

:: Done
cd ..
exit /b 0

:NODIR
echo Missing directories. Call 'wsl -e ./scripts/download-hc.sh' first.
exit /b 1
