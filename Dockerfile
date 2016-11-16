FROM mhart/alpine-node:6.3.0

MAINTAINER ContainerShip Developers <developers@containership.io>

ENV PROMETHEUS_HOME=/opt/prometheus
ENV PROMETHEUS_VERSION=1.3.1
ENV PROMETHEUS_FILE=prometheus-$PROMETHEUS_VERSION.linux-amd64

ENV PROMETHEUS_CONFIG_REFRESH_INTERVAL=30000
ENV PROMETHEUS_GLOBAL_SCRAPE_INTERVAL=60s
ENV PROMETHEUS_GLOBAL_EVALUATION_INTERVAL=60s

WORKDIR $PROMETHEUS_HOME
COPY . .

RUN npm install

RUN apk add --update --no-cache curl

RUN curl -L https://github.com/prometheus/prometheus/releases/download/v$PROMETHEUS_VERSION/$PROMETHEUS_FILE.tar.gz | tar -xvz
RUN ls $PROMETHEUS_FILE

CMD node app.js
