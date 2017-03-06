'use strict';

const myriad = require('./myriad');

const _ = require('lodash');
const async = require('async');

module.exports.generateConfig = function(generateConfigCallback) {
    async.parallel({
        server: getPrometheusServerTargets,
        agent: getPrometheusAgentTargets
    }, (error, results) => {
        if (error) {
            return generateConfigCallback(error);
        }

        let config =
`
global:
    scrape_interval:     ${process.env.PROMETHEUS_GLOBAL_SCRAPE_INTERVAL || '60s'}
    evaluation_interval: ${process.env.PROMETHEUS_GLOBAL_EVALUATION_INTERVAL || '60s'}

scrape_configs:
  - job_name: 'prometheus'
    scrape_interval: ${process.env.PROMETHEUS_TARGET_PROMETHEUS_SCRAPE_INTERVAL || '60s'}
    metrics_path: /metrics
    static_configs:
    - targets: [ ${results.server.hosts.join(',') } ]
`
        ;

        if (results.agent.node.hosts.length) {
            config +=
`
  - job_name: 'node'
    scrape_interval: ${process.env.PROMETHEUS_TARGET_NODE_EXPORTER_SCRAPE_INTERVAL || '60s'}
    metrics_path: ${results.agent.node.path}
    static_configs:
    - targets: [ ${results.agent.node.hosts.join(',')} ]
`
            ;
        }

        if (results.agent.cadvisor.hosts.length) {
            config +=
`
  - job_name: 'cadvisor'
    scrape_interval: ${process.env.PROMETHEUS_TARGET_CADVISOR_SCRAPE_INTERVAL || '60s'}
    metrics_path: ${results.agent.cadvisor.path}
    static_configs:
    - targets: [ ${results.agent.cadvisor.hosts.join(',')} ]
`
            ;
        }

        return generateConfigCallback(null, config);
    });
}

function getPrometheusServerTargets(callback) {
    const prometheusConfig = {
        hosts: []
    };

    myriad.get_application('containership-prometheus', (err, application) => {
        if (err) {
            process.stderr.write(`${err.message}\n`);
            return callback(null, prometheusConfig);
        }

        if (application && application.containers && application.containers.length) {
            const loadedContainers = _.filter(
                    application.containers,
                    container => 'loaded' === container.status
            );

            prometheusConfig.hosts = _.map(loadedContainers, container => {
                const opts = JSON.parse(container.env_vars.CS_PROC_OPTS);

                const addressSplit = (container.env_vars.PROMETHEUS_WEB_LISTEN_ADDRESS || '0.0.0.0:9090').split(':');
                const host = addressSplit[0];
                const port = addressSplit.length === 2 ? addressSplit[1] : '80';

                return `'${host}:${port}'`;
            });
        }

        return callback(null, prometheusConfig);
    });
}

function getPrometheusAgentTargets(callback) {
    const agentConfig = {
        cadvisor: {
            path: '/cadvisor/metrics',
            hosts: []
        },
        node: {
            path: '/node/metrics',
            hosts: []
        }
    };

    myriad.get_application('containership-prometheus-agents', (err, application) => {
        if (err) {
            process.stderr.write(`${err.message}\n`);
            return callback(null, agentConfig);
        }

        if (application && application.containers && application.containers.length) {
            _.forEach(application.containers, container => {
                if ('loaded' !== container.status) {
                    return;
                }

                const container_host_port = container.host_port;

                if (!container_host_port) {
                    return;
                }

                let opts;

                try {
                    opts = JSON.parse(container.env_vars.CS_PROC_OPTS);
                } catch (err) {
                    return;
                }

                const scope = opts['legiond-scope'];
                const host = opts &&
                    opts.legiond &&
                    opts.legiond.network &&
                    opts.legiond.network.address &&
                    opts.legiond.network.address[scope];

                if (!host) {
                    return;
                }

                // cadvisor exporter agent
                const cAdvisorEnabled = container.env_vars.PROMETHEUS_AGENT_CADVISOR ?
                    'true' === container.env_vars.PROMETHEUS_AGENT_CADVISOR :
                    true;

                const cAdvisorPath = container.env_vars.PROMETHEUS_AGENT_CADVISOR_METRICS_PATH || '/cadvisor/metrics';

                if (cAdvisorEnabled) {
                    agentConfig.cadvisor.hosts.push(`'${host}:${container_host_port}'`);
                    agentConfig.cadvisor.path = cAdvisorPath;
                }

                // node exporter agent
                const nodeEnabled = container.env_vars.PROMETHEUS_AGENT_NODE_EXPORTER ?
                    'true' === container.env_vars.PROMETHEUS_AGENT_NODE_EXPORTER :
                    true;

                const nodePath = container.env_vars.PROMETHEUS_AGENT_NODE_EXPORTER_METRICS_PATH || '/node/metrics';

                if (nodeEnabled) {
                    agentConfig.node.hosts.push(`'${host}:${container_host_port}'`);
                    agentConfig.node.path = nodePath;
                }
            });
        }


        return callback(null, agentConfig);
    });
}
