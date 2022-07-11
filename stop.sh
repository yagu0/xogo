#!/bin/sh

# https://stackoverflow.com/questions/13939038/how-do-you-run-a-command-for-each-line-of-a-file
while read pid; do
  kill -9 -`ps p $pid -o pgid | grep "[0-9]\+" | tr -d " "`
done <.pid
