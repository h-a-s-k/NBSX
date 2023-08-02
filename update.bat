@echo off
pushd %~dp0

echo This will reset your NBSX settings
pause

where /q git.exe
if %ERRORLEVEL% EQU 0 (
  GOTO:pull
) else (
  GOTO:nogit
)

:pull
call git pull --rebase --autostash
if %ERRORLEVEL% neq 0 (
  echo Error updating
)
else (
  echo Updated
)
GOTO:end

:nogit
echo Install git to update


:end
pause
popd
exit /B