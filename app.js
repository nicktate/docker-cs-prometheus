'use strict';

const configUtil = require('./lib/config');
const prometheusOptions = require('./lib/options');

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;

const prometheusExecPath = path.resolve(
        __dirname,
        process.env.PROMETHEUS_FILE,
        'prometheus'
);

const prometheusConfigPath = path.resolve(__dirname, 'cs.prometheus.yml');
const baseTemplatePath = path.resolve(__dirname, 'templates', 'base.template');

configUtil.generateConfig((err, config) => {
    if (err) {
        process.stderr.write(`${err.message}\n`);
        process.exit(1);
    }

    fs.writeFileSync(prometheusConfigPath, config);

    const args = [];

    _.forEach(prometheusOptions.options, option => {
        const argValue = prometheusOptions.getOptionValue(
                option.name,
                option.name === 'config.file' ? prometheusConfigPath : null // optional default
        );

        if (argValue !== null) {
            args.push(`--${option.name}`);
            args.push(argValue);
        }
    });

    const prometheus = spawn(prometheusExecPath, args);

    prometheus.stdout.on('data', (data) => {
        process.stdout.write(data);
    });

    prometheus.stderr.on('data', (data) => {
        process.stderr.write(data);
    });

    prometheus.on('close', (code) => process.exit(code));

    setInterval(() => {
        configUtil.generateConfig((err, config) => {
            if (err) {
                process.stderr.write(`${err.message}\n`);
                return;
            }

            fs.writeFileSync(prometheusConfigPath, config);
            prometheus.kill('SIGHUP');
        });
    }, +process.env.PROMETHEUS_CONFIG_REFRESH_INTERVAL || 30000);
});
