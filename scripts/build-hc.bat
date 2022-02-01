@echo off
echo.
echo * Build Holochain and Lair for Windows
echo * WARNING * This will install a new version of hc tools

IF NOT exist build ( goto NODIR )
IF NOT exist build\holochain ( goto NODIR )
IF NOT exist build\lair ( goto NODIR )

cd build


echo.
echo * Build Holochain
cd holochain
cargo build --release -p holochain
copy target\release\holochain.exe ..\..\bin\snapmail-holochain.exe


echo.
echo * Install HC tool
cargo install --path crates/hc
cd ..


echo.
echo * Build Lair
cd lair
cargo build --release
copy target\release\lair-keystore.exe ..\..\bin\snapmail-lair-keystore.exe
cd ..


echo.
echo * Done
echo.
cd ..
exit /b 0


:NODIR
echo * Aborting. Missing directories. Call 'wsl -e ./scripts/download-hc.sh' first.
exit /b 1
