#!/usr/bin/env sh

# exit 130 SIGINT
{ sudo docker compose exec -it cron /bin/sh -c "npx aomex cron:stats" || :; }
