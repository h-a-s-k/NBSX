pushd %~dp0
call npm install --no-audit --fund false
node nbsx.js
pause
popd