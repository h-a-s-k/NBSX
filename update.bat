@echo off
pushd %~dp0

echo This will only work if you cloned the repo instead of downloading
echo and will reset your NBSX settings
pause

where /q git.exe
if %ERRORLEVEL% EQU 0 (
  GOTO:pull
)
GOTO:nogit


:pull
call git pull --rebase --autostash
if %ERRORLEVEL% neq 0 (
  echo Error updating
)
GOTO:end

:nogit
echo Install git to update


:end
pause
popd
exit /B