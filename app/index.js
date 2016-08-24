#!/bin/env node

(function() {
    'use strict';
    const jsonfile = require('jsonfile')
    const bleno = require('bleno');
    const StringDecoder = require('string_decoder').StringDecoder;
    const decoder = new StringDecoder('utf8');
    const ledstrip = require(__dirname + '/lib/ledstrip.js');
    const hw = require(__dirname + '/lib/hw.js');

    ledstrip.init(function init() {
        ledstrip.progress(7, 'default', function progress() {
            console.log('Default light pattern applied');
        });
    });

    bleno.on('stateChange', function(state) {
        console.log('BLE stateChange: ' + state);
        if (state === 'poweredOn') {
            bleno.startAdvertising("blinkt", ['F1D46062-7FD3-4C17-B096-9E8D61E15581']);
        } else {
            console.log('BLE advertising stopped');
            bleno.stopAdvertising();
        }
    });


    bleno.on('advertisingStart', function(error) {
        if (!error) {
            bleno.setServices([
                new bleno.PrimaryService({
                    uuid: 'F1D46062-7FD3-4C17-B096-9E8D61E15581`',
                    characteristics: [
                        // Read device serial number
                        new bleno.Characteristic({
                            uuid: 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFF1',
                            properties: ['read'],
                            descriptors: [
                                new bleno.Descriptor({
                                    uuid: '2901',
                                    value: 'Read device serial number'
                                })
                            ],
                            onReadRequest: function(offset, callback) {
                                hw.serial(function(error, serial) {
                                    if (error) {
                                        let result = bleno.Characteristic.RESULT_UNLIKELY_ERROR;
                                        callback(result);
                                    } else {
                                        let result = bleno.Characteristic.RESULT_SUCCESS;
                                        let data = new Buffer(serial);
                                        callback(result, data);
                                    }
                                });
                            }
                        }),
                        // Update colors
                        new bleno.Characteristic({
                            uuid: 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFF2',
                            properties: ['write'],
                            descriptors: [
                                new bleno.Descriptor({
                                    uuid: '2901',
                                    value: 'Update colors'
                                })
                            ],
                            onWriteRequest: function(data, offset, withoutResponse, callback) {
                                if (offset) {
                                    callback(this.RESULT_ATTR_NOT_LONG);
                                }
                                let colors = JSON.parse(decoder.write(data));
                                if (colors.length != 6) {
                                    let result = bleno.Characteristic.RESULT_UNLIKELY_ERROR;
                                    callback(result);
                                } else {
                                    jsonfile.writeFile('/data/colors.json', colors, function(err) {
                                        if (err) {
                                            let result = bleno.Characteristic.RESULT_UNLIKELY_ERROR;
                                            callback(result);
                                        } else {
                                            ledstrip.colorize(function() {
                                                let result = bleno.Characteristic.RESULT_SUCCESS;
                                                callback(result);
                                            });
                                        }
                                    })

                                }
                            }
                        })
                    ]
                })
            ]);
        } else {
            console.error("BLE Advertising error: ", error);
        }
    });


})();
