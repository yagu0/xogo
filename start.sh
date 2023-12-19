#!/bin/sh

nodemon -w server.js &
echo $! > .pid
php -S localhost:8000 &
