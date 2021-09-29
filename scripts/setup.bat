@echo off
echo.
echo * Setup dev environment
echo.
call npm install


echo.
echo * Clear and Create 'build' folder
echo.
rmdir /S /Q build
mkdir build
cd build


echo.
echo * Download latest DNA source code
echo.
git clone https://github.com/glassbeadsoftware/snapmail-rsm


echo.
echo * Download and set up latest UI source code
echo.
git clone https://github.com/glassbeadsoftware/snapmail-ui
cd snapmail-ui
call npm install
cd ..


echo.
echo * Done
echo.
cd ..

