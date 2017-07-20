'use strict';

const Api = require('@containership/containership.api-factory');

const _ = require('lodash');
const async = require('async');

module.exports.generateConfig = function(generateConfigCallback) {
    async.parallel({
        server: getPrometheusServerTargets,
        agent: getPrometheusAgentTargets
    }, (error, results) => {
        if (error) {
            console.error(JSON.stringify(error));
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


        console.log("Final config: " + JSON.stringify(config));

        return generateConfigCallback(null, config);
    });
}

function getPrometheusServerTargets(callback) {

    const api = new Api.Constructor(process.env.CS_API_IP || "localhost", Api.DEFAULT_PORT);

    return api.getApplications((apps) => {
        const containers = _.flow(
            _.partial(_.get, _, ['containership-prometheus', 'containers']),
            _.partial(_.filter, _, (c) => c.status === 'loaded')
        )(apps);

        const addresses = _.map(containers, (container) => {
            const addressSplit = (container.env_vars.PROMETHEUS_WEB_LISTEN_ADDRESS || '0.0.0.0:9090').split(':');
            const container_ip = container.internal_container_ip || addressSplit[0];
            const container_port = container.container_port || container.host_port || (addressSplit.length === 2 ? addressSplit[1] : '80');

            return `'${container_ip}:${container_port}'`;
        });

        return callback(null, {addresses});
    });
}

function getPrometheusAgentTargets(callback) {

    const api = new Api.Constructor("localhost", Api.DEFAULT_PORT);

    api.getHosts((hosts) => {
        api.getApplications((apps) => {

            const containers = _.flow(
                _.partial(_.get, _, ['containership-prometheus-agents', 'containers']),
                _.partial(_.filter, _, (c) => c.status === 'loaded' && c.host_port)
            )(apps);

            const containerToHostPath = (container) => {
                const container_ip = container.internal_container_ip || _.get(hosts, [container.host, 'address', 'private']);
                const container_port = container.container_port || container.host_port;

                return `'${container_ip}:${container_port}'`;
            };

            const cAdvisorContainers = _.filter(containers, (c) => c.env_vars.PROMETHEUS_AGENT_CADVISOR === 'true');
            const cAdvisorPath = _.get(cAdvisorContainers, [0, 'env_vars', 'PROMETHEUS_AGENT_CADVISOR_METRICS_PATH'], '/cadvisor/metrics');
            const cAdvisorHosts = _.map(cAdvisorContainers, containerToHostPath);

            const nodeContainers = _.filter(containers, (c) => c.env_vars.PROMETHEUS_AGENT_NODE_EXPORTER === 'true');
            const nodePath = _.get(nodeContainers, [0, 'env_vars', 'PROMETHEUS_AGENT_NODE_EXPORTER_METRICS_PATH'], '/node/metrics');
            const nodeHosts = _.map(nodeContainers, containerToHostPath);

            return callback(null, {
                cadvisor: {
                    path: cAdvisorPath,
                    hosts: cAdvisorHosts
                },
                node: {
                    path: nodePath,
                    hosts: nodeHosts
                }
            });

        });
    });
}
