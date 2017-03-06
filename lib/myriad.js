'use strict';

const _ = require('lodash');
const async = require('async');
const MyriadKVClient = require('myriad-kv-client');
const os = require('os');

let myriad_host = '0.0.0.0';
let cs_opts;

try {
    cs_opts = JSON.parse(process.env.CS_PROC_OPTS);
}
catch(err){
    console.error('Failed to parse CS_PROC_OPTS env variable');
    console.error(err);
    cs_opts = {};
}

const scope = cs_opts['legiond-scope'];
const host = cs_opts &&
    cs_opts.legiond &&
    cs_opts.legiond.network &&
    cs_opts.legiond.network.address &&
    cs_opts.legiond.network.address[scope];

if (host) {
    myriad_host = host;
}

const myriad_kv_client = new MyriadKVClient({
    host: myriad_host,
    port: process.env.MYRIAD_PORT || 2666
});

const myriad = {

    get_containers: function(application_name, get_containers_callback) {
        myriad_kv_client.keys(`containership::containers::${application_name}::*`, (err, keys) => {
            if (err) {
                return get_containers_callback(err);
            }

            async.map(keys || [], (key, callback) => {
                myriad_kv_client.get(key, (err, container) => {
                    if (err) {
                        process.stderr.write(`${err.message}\n`);
                        return callback();
                    }

                    try {
                        container = JSON.parse(container);
                        return callback(null, container);
                    } catch(err) {
                        process.stderr.write(`${err.message}\n`);
                        return callback();
                    }
                });
            }, (err, containers) => {
                if (err) {
                    return get_containers_callback(err);
                }

                return get_containers_callback(null, containers);
            });
        });
    },

    get_application: function(application_name, get_application_callback) {
        myriad_kv_client.get(`containership::application::${application_name}`, (err, application) => {
            if (err) {
                process.stderr.write(`${err.message}\n`);
                return get_application_callback();
            }

            try {
                application = JSON.parse(application);

                module.exports.get_containers(application.id, (err, containers) => {
                    if (err) {
                        process.stderr.write(`${err.message}\n`);
                        return get_application_callback();
                    }

                    application.containers = containers;
                    return get_application_callback(null, application);
                });
            } catch(err) {
                process.stderr.write(`${err.message}\n`);
                return get_application_callback();
            }
        });
    }
};

module.exports = myriad;
