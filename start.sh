#!/bin/sh

nodemon -i index.js -i base_rules.js ./server.js &
echo "NODE_PID=$!" > .pid

# NOTE: require browser plugin + start it
livereload -e 'html,js,css,png,jpg,jpeg,gif,svg' -w 1000 -d . &

# I use 8080 for socket and 8000 for http server (arbitrary...)
php -S localhost:8000 &
