#!/bin/sh

nodemon -i app.js -i base_rules.js ./server.js &
echo $! > .pid
php -S localhost:8000 &
