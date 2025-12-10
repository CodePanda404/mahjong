#!/usr/bin/env sh

set -e

# exit 130 SIGINT
{ sudo docker compose --file docker-compose-production.yml exec -it cron /bin/sh -c "aomex cron:stop" || :; }
sudo docker compose --file docker-compose-production.yml stop cron --timeout=1
