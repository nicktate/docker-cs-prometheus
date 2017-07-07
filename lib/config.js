'use strict';

const Api = require('@jeremykross/containership.api-factory');
const _ = require('lodash');
const async = require('async');


module.exports.generateConfig = function(generateConfigCallback) {
    async.parallel({
        server: getPrometheusServerTargets,
        agent: getPrometheusAgentTargets
    }, (error, results) => {

        console.log("Back from generate config: " + JSON.stringify(error) + ": " + JSON.stringify(results));

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


        console.log("Final config: " + JSON.stringify(config));

        return generateConfigCallback(null, config);
    });
}

function getPrometheusServerTargets(callback) {

    const api = new Api.Constructor("localhost", Api.DEFAULT_PORT);

    api.getApplications((apps) => {
        const containers = _.flow(
            _.partial(_.get, _, ['containership-logs', 'containers']),
            _.partial(_.filter, _, (c) => c.status === 'loaded')
        )(apps);

        const hosts = _.map(containers, (container) => {
           // const opts = JSON.parse(container.env_vars.CS_PROC_OPTS);

            const addressSplit = (container.env_vars.PROMETHEUS_WEB_LISTEN_ADDRESS || '0.0.0.0:9090').split(':');
            const host = addressSplit[0];
            const port = addressSplit.length === 2 ? addressSplit[1] : '80';

            return `'${host}:${port}'`;
        });

        callback(null, {hosts});

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

            const containerToHostPath = (c) => { 
                const hostIP = _.get(hosts, [c.host, 'address', 'public']);
                return `'${hostIP}:${c.host_port}'`;
            };

            const cAdvisorContainers = _.filter(containers, (c) => c.env_vars.PROMETHEUS_AGENT_CADVISOR === 'true');

            console.log("Have cadvisor containers: " + JSON.stringify(cAdvisorContainers));

            const cAdvisorPath = _.get(cAdvisorContainers, [0, 'env_vars', 'PROMETHEUS_AGENT_CADVISOR_METRICS_PATH'], '/cadvisor/metrics');
            const cAdvisorHosts = _.map(cAdvisorContainers, containerToHostPath);

            const nodeContainers = _.filter(containers, (c) => c.env_vars.PROMETHEUS_AGENT_NODE_EXPORTER === 'true');
            console.log("Have node containers: " + JSON.stringify(nodeContainers));

            const nodePath = _.get(nodeContainers, [0, 'env_vars', 'PROMETHEUS_AGENT_NODE_EXPORTER_METRICS_PATH'], '/node/metrics');
            const nodeHosts = _.map(nodeContainers, containerToHostPath);

            callback(null, {
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
