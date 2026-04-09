#!/usr/bin/env bash
#
# check-routes.sh — Checks HTTP status and response time for a list of URLs.
# Usage: ./check-routes.sh <url1> <url2> ...
# Exits 0 if all routes return HTTP 2xx, exits 1 if any fail.

pass=0
fail=0

for url in "$@"; do
  read -r status time <<< "$(curl -o /dev/null -s -L -w "%{http_code} %{time_total}" "$url")"

  if [[ "$status" =~ ^2 ]]; then
    echo "PASS [$status] ${time}s — $url"
    ((pass++))
  else
    echo "FAIL [$status] ${time}s — $url"
    ((fail++))
  fi
done

total=$((pass + fail))
echo ""
echo "${pass}/${total} routes healthy"

[[ $fail -eq 0 ]]
