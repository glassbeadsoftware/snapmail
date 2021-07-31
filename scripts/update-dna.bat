@echo off

cd build

REM Generate DNA
git clone https://github.com/glassbeadsoftware/snapmail-rsm

REM Generate DNA
cd snapmail-rsm
call scripts/save_dna_hash
call scripts/pack-happ.bat
cp snapmail.dna ../../dna
cp snapmail.happ ../../dna
cp dna_hash.txt ../../dna
cd ..

REM Done
cd ..
