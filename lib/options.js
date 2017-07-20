'use strict';

const _ = require('lodash');

const options = [
    {
        name: 'alertmanager.notification-queue-capacity',
        default: 10000
    },
    {
        name: 'alertmanager.timeout',
        default: '10s'
    },
    {
        name: 'alertmanager.url',
        default: null
    },
    {
        name: 'config.file',
        default: '/opt/prometheus/cs.prometheus.yml'
    },
    {
        name: 'log.format',
        default: 'logger:stderr'
    },
    {
        name: 'log.level',
        default: 'info'
    },
    {
        name: 'query.max-concurrency',
        default: 20
    },
    {
        name: 'query.staleness-delta',
        default: '5m0s'
    },
    {
        name: 'query.timeout',
        default: '2m0s'
    },
    {
        name: 'storage.local.checkpoint-dirty-series-limit',
        default: '5000'
    },
    {
        name: 'storage.local.checkpoint-interval',
        default: '5m0s'
    },
    {
        name: 'storage.local.chunk-encoding-version',
        default: '1'
    },
    {
        name: 'storage.local.dirty',
        default: 'false'
    },
    {
        name: 'storage.local.engine',
        default: 'persisted'
    },
    {
        name: 'storage.local.index-cache-size.fingerprint-to-metric',
        default: '10485760'
    },
    {
        name: 'storage.local.index-cache-size.fingerprint-to-timerange',
        default: '5242880'
    },
    {
        name: 'storage.local.index-cache-size.label-name-to-label-values',
        default: '10485760'
    },
    {
        name: 'storage.local.index-cache-size.label-pair-to-fingerprints',
        default: '20971520'
    },
    {
        name: 'storage.local.target-heap-size',
        default: '250000000'
    },
    {
        name: 'storage.local.num-fingerprint-mutexes',
        default: '4096'
    },
    {
        name: 'storage.local.path',
        default: '/opt/containership/metrics/data'
    },
    {
        name: 'storage.local.pedantic-checks',
        default: 'false'
    },
    {
        name: 'storage.local.retention',
        default: '180h0m0s'
    },
    {
        name: 'storage.local.series-file-shrink-ratio',
        default: '0.1'
    },
    {
        name: 'storage.local.series-sync-strategy',
        default: 'adaptive'
    },
    {
        name: 'storage.remote.graphite-address',
        default: null
    },
    {
        name: 'storage.remote.graphite-prefix',
        default: null
    },
    {
        name: 'storage.remote.graphite-transport',
        default: 'tcp'
    },
    {
        name: 'storage.remote.influxdb-url',
        default: null
    },
    {
        name: 'storage.remote.influxdb.database',
        default: 'prometheus'
    },
    {
        name: 'storage.remote.influxdb.retention-policy',
        default: 'default'
    },
    {
        name: 'storage.remote.influxdb.username',
        default: null
    },
    {
        name: 'storage.remote.opentsdb-url',
        default: null
    },
    {
        name: 'storage.remote.timeout',
        default: '30s'
    },
    {
        name: 'version',
        default: 'false'
    },
    {
        name: 'web.console.libraries',
        default: 'console_libraries'
    },
    {
        name: 'web.console.templates',
        default: 'consoles'
    },
    {
        name: 'web.enable-remote-shutdown',
        default: 'false'
    },
    {
        name: 'web.external-url',
        default: null
    },
    {
        name: 'web.listen-address',
        default: `0.0.0.0:${process.env.PORT || 9090}`
    },
    {
        name: 'web.route-prefix',
        default: '/'
    },
    {
        name: 'web.telemetry-path',
        default: '/metrics'
    },
    {
        name: 'web.user-assets',
        default: null
    },
];
module.exports.options = options;

module.exports.getOptionValue = function(name, providedDefault) {
    const optionInfo = _.find(options, (opt) => opt.name === name);

    if (!optionInfo) {
        return null;
    }

    let value = providedDefault || optionInfo.default;

    let envName = name.replace('.', '_');
    envName = envName.replace('-', '_');
    envName = envName.toUpperCase();
    envName = `PROMETHEUS_${envName}`;

    if (process.env[envName]) {
        value = process.env[envName];
    }

    return value;
}
