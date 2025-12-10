#!/usr/bin/env sh

set -ex

env="$1"
project_name="tutorials-api"
docker_compose_file="docker-compose-$env.yml"

sudo docker build --tag "$project_name:$env" --file "Dockerfile.$env" .

api_service_name=api
cron_service_name=cron

if [ -n "$(sudo docker compose --file $docker_compose_file ps | { grep $cron_service_name || :; })" ]
then
  # exit 137 SIGKILL
  { sudo docker compose --file $docker_compose_file exec -it $cron_service_name /bin/sh -c "npx aomex cron:stop" || :; }
  # against restart=always
  sudo docker compose --file $docker_compose_file stop $cron_service_name --timeout=1
fi

sudo docker compose --file $docker_compose_file stop $api_service_name --timeout=1
sudo docker compose --file $docker_compose_file up -d --timeout=1 --remove-orphans
