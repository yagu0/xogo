#!/bin/sh

nodemon ./server.js &
echo $! > .pid
php -S localhost:8000 &
