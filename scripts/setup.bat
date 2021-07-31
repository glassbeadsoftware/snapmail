REM Script for setting up dev environment

call npm install
@echo on

REM Create build Directory
rmdir /S /Q build
mkdir build
cd build

REM Generate Web UI
git clone https://github.com/glassbeadsoftware/snapmail-ui
cd snapmail-ui
call npm install
@echo on
cd ..

REM Done
cd ..

