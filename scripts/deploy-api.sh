#!/usr/bin/env sh

set -ex

env="$1"
project_name="tutorials-api"
docker_compose_file="docker-compose-$env.yml"

sudo docker build --tag "$project_name:$env" --file "Dockerfile.$env" .

api_service_name=api

sudo docker compose --file $docker_compose_file stop $api_service_name --timeout=1
sudo docker compose --file $docker_compose_file up $api_service_name -d --timeout=1
