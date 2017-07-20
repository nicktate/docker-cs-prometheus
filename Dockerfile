FROM mhart/alpine-node:6.11.1

MAINTAINER ContainerShip Developers <developers@containership.io>

ENV PROMETHEUS_HOME=/opt/prometheus
ENV PROMETHEUS_VERSION=1.7.1
ENV PROMETHEUS_FILE=prometheus-$PROMETHEUS_VERSION.linux-amd64

ENV PROMETHEUS_CONFIG_REFRESH_INTERVAL=30000
ENV PROMETHEUS_GLOBAL_SCRAPE_INTERVAL=60s
ENV PROMETHEUS_GLOBAL_EVALUATION_INTERVAL=60s

RUN apk add --update --no-cache curl git

WORKDIR $PROMETHEUS_HOME
COPY . .

RUN npm install

RUN curl -L https://github.com/prometheus/prometheus/releases/download/v$PROMETHEUS_VERSION/$PROMETHEUS_FILE.tar.gz | tar -xvz
RUN ls $PROMETHEUS_FILE

CMD node app.js
