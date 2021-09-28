#! /bin/bash

# NOTE: run this script using `source` to make it set environment in calling shell, e.g.:
# source setenv.sh

while IFS= read -r line
do
  export $line
done <<< $(cat .env.yaml | tr ":" "=" | tr -d " ")
