#!/bin/sh

nodemon -w js/server.js &
echo $! > .pid
if [ $# -ge 2 ] && [ "$1" = "dev" ]; then
  cd dist/
fi
php -S localhost:8000 &
