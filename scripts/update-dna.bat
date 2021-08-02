@echo off
echo.
echo * Build latest Snapmail DNA
IF NOT exist build ( goto NODIR )
cd build


IF exist snapmail-rsm ( goto GEN )
echo.
echo * Download DNA source code
git clone https://github.com/glassbeadsoftware/snapmail-rsm

:GEN
echo.
echo * Generate DNA
cd snapmail-rsm
git pull
call scripts/save-dna-hash.bat
call scripts/pack-happ.bat
cp snapmail.dna ../../dna
cp snapmail.happ ../../dna
cp dna_hash.txt ../../dna
cd ..


echo.
echo * Copied DNA files to './dna'
echo.
echo * Done
cd ..
exit /b 0


:NODIR
echo. Aborting. Missing 'build' directory. Call 'setup.bat' first.
exit /b 1
