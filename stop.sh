#!/bin/sh

# https://stackoverflow.com/questions/13939038/how-do-you-run-a-command-for-each-line-of-a-file
source ./.pid
kill -9 -`ps p $NODE_PID -o pgid | grep "[0-9]\+" | tr -d " "`
