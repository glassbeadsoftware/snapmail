@echo off

REM curl -s https://api.github.com/repos/glassbeadsoftware/snapmail-rsm/releases/latest | grep "browser_download_url.*dna" | cut -d '"' -f 4

FOR /F "tokens=* USEBACKQ" %%F IN (`"curl -s https://api.github.com/repos/glassbeadsoftware/snapmail-rsm/releases/latest | grep 'browser_download_url.*dna'"`) DO (
SET version=%%F
)
REM echo %version%
for /f "tokens=1,2,3 delims= " %%a in ("%version%") do (
  set quoted=%%b
)
REM echo %quoted%
set link=%quoted:~1,-1%
echo %link%

bitsadmin /transfer myDownloadJob /download /priority high %link% %cd%\dna\snapmail.dna
