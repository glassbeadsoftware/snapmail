@echo off
echo.
echo * Setup dev environment
call npm install


echo.
echo * Create 'build' folder
rmdir /S /Q build
mkdir build
cd build


echo.
echo * Download latest DNA source code
git clone https://github.com/glassbeadsoftware/snapmail-rsm


echo.
echo * Download and set up latest UI source code
git clone https://github.com/glassbeadsoftware/snapmail-ui
cd snapmail-ui
call npm install
cd ..


echo.
echo * Done
echo.
cd ..

