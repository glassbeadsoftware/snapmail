@echo off
@setlocal
echo.
echo * Creating new Snapmail happ Release
echo.

echo Current dependencies in ./bin:
call "bin/snapmail-holochain.exe" --version
call "bin/snapmail-lair-keystore.exe" --version
call hc --version
echo.
SET /P CANBUILDHOLOCHAIN=Regenerate holochain from source (Y/[N])?
if /I "%CANBUILDHOLOCHAIN%"=="Y" (echo * Holochain will be rebuilt from source) else (echo * Holochain will NOT be rebuilt from source)
echo.
SET /P AREYOUSURE=Rebuild Snapmail DNA from source(Y/[N])?
if /I "%AREYOUSURE%"=="Y" (echo * Snapmail DNA will be rebuilt) else (echo * Snapmail DNA will NOT be rebuilt)


set start=%time%

:: Creating SnapMail RELEASE
call .\scripts\setup.bat
IF /I "%CANBUILDHOLOCHAIN%"=="Y" (wsl -e ./scripts/download-hc.sh)
IF /I "%CANBUILDHOLOCHAIN%"=="Y" (call .\scripts\build-hc.bat)
IF /I "%AREYOUSURE%"=="Y" (call .\scripts\update-dna.bat)
call .\scripts\build-ui.bat prod
npm run dist-win
:: RELEASE Done

:: Time measured
set end=%time%
set options="tokens=1-4 delims=:.,"
for /f %options% %%a in ("%start%") do set start_h=%%a&set /a start_m=100%%b %% 100&set /a start_s=100%%c %% 100&set /a start_ms=100%%d %% 100
for /f %options% %%a in ("%end%") do set end_h=%%a&set /a end_m=100%%b %% 100&set /a end_s=100%%c %% 100&set /a end_ms=100%%d %% 100

set /a hours=%end_h%-%start_h%
set /a mins=%end_m%-%start_m%
set /a secs=%end_s%-%start_s%
set /a ms=%end_ms%-%start_ms%
if %ms% lss 0 set /a secs = %secs% - 1 & set /a ms = 100%ms%
if %secs% lss 0 set /a mins = %mins% - 1 & set /a secs = 60%secs%
if %mins% lss 0 set /a hours = %hours% - 1 & set /a mins = 60%mins%
if %hours% lss 0 set /a hours = 24%hours%
if 1%ms% lss 100 set ms=0%ms%

set /a totalsecs = %hours%*3600 + %mins%*60 + %secs%
echo * Command took %hours%:%mins%:%secs%.%ms% (%totalsecs%.%ms%s total)
