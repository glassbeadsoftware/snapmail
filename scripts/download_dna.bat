@echo off

curl -s https://api.github.com/repos/glassbeadsoftware/snapmail-rsm/releases/latest | grep "browser_download_url.*dna" | cut -d '"' -f 4

FOR /F "tokens=* USEBACKQ" %%F IN (`"curl -s https://api.github.com/repos/glassbeadsoftware/snapmail-rsm/releases/latest | grep 'browser_download_url.*dna'"`) DO (
SET version=%%F
)
echo %version%

FOR /F "tokens=* USEBACKQ" %%F IN (`cut %version% -d '"' -f 4`) DO (
SET link=%%F
)
echo %link%

REM FOR /F "tokens=* USEBACKQ" %%F IN (`cat link.txt`) DO (
REM SET link=%%F
REM )
REM echo %link%
