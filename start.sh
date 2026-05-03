#!/bin/sh

nodemon -w js/server.js &
echo $! > .pid
php -S localhost:8000 &
