# docker-cs-prometheus-server
containership promethius docker image

## Build Status
[![Build Status](https://drone.containership.io/api/badges/containership/docker-cs-prometheus-server/status.svg)](https://drone.containership.io/containership/docker-cs-prometheus-server)

## Installation
```
sudo docker run \
         --net=bridge \
         --detach=true \
         --name=containership-prometheus \
         containership/docker-cs-prometheus:latest
```

## Environment Variables

`PROMETHEUS_VERSION` - version of prometheus to run in the container (default: 1.3.1)

`PROMETHEUS_CONFIG_REFRESH_INTERVAL` - refresh interval for prometheus to reload its configuration (default:30000, unit: ms)

`PROMETHEUS_GLOBAL_SCRAPE_INTERVAL` - global default interval for prometheus to scrape metrics from agents (default:60s)

`PROMETHEUS_GLOBAL_EVALUATION_INTERVAL` - global default interval for prometheus to evaluation rules (default:60s)

## Prometheus Command Line Arguments

See https://github.com/prometheus/prometheus/blob/master/cmd/prometheus/config.go for available command line arguments.

All arguments are overridable via environment variables under the convention of replacing `.` or `-` with `_` and prefixing with `PROMETHEUS_`.

Example:
`web.enable-remote-shutdown` -> `PROMETHEUS_WEB_ENABLE_REMOTE_SHUTDOWN`
`storage.local.path` -> `PROMETHEUS_STORAGE_LOCAL_PATH`

## Roadmap

* Mount a standardized containership data volume into container so prometheus can load previous data on relaunch in same instance
* Gracefully recover and coordinate with other prometheus servers running on a containership cluster
* Add support to dynamically load custom scraper targets
* Add support to point at containership applications and specify as scraper targets
