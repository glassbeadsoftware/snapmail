REM Script for building Snapmail UI
cd build

REM Generate Web UI
cd snapmail-ui
call npm run %1
@echo on
cp -r dist/* ../../ui
cd ..

REM Done
cd ..
