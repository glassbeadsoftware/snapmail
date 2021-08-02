@echo off
echo Generating Snapmail UI

:: Args and folders
if "%~1"=="" goto BLANK

IF NOT exist build ( goto NODIR )
IF NOT exist build\snapmail-ui ( goto NODIR )

:: Start
cd build

:: Generate Web UI
cd snapmail-ui
call npm run %1
cp -r dist/* ../../ui
cd ..

:: Done
cd ..
echo ** UI generated in ./ui
exit /b 0

:BLANK
echo Missing argument ('dev' or 'prod')
exit /b 1

:NODIR
echo Missing snapmail-ui directory. Call 'setup.bat' first.
exit /b 1
