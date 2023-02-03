import http from 'http';
import dgram from 'dgram';
import { networkInterfaces } from 'os';

interface SSDPResultEntry {
    ip: string;
    data?: any;
    name: string;
    manufacturer?: string;
}

/**
 * Tries to read HTML page.
 *
 * @param link http link, like http://192.168.1.2:80/abc/de.xml
 * @param timeout timeout in ms (default 500)
 * @param callback return result
 */
export function httpGet(
    link: string,
    timeout: number,
    callback: (err: any, result: string | null, link?: string) => void
): void {
    const req = http
        .get(link, res => {
            const statusCode = res.statusCode;

            if (statusCode !== 200) {
                // consume response data to free up memory
                res.resume();
                callback(statusCode, null, link);
            }

            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', chunk => (rawData += chunk));
            res.on('end', () => callback && callback(null, rawData ? rawData.toString() : null));
        })
        .on('error', e => callback && callback(e.message, null));

    req.setTimeout(timeout, () => {
        req.destroy();
        callback && callback('timeout', null);
        // @ts-expect-error change signature or remove it
        callback = null;
    });
}

/**
 * Helper function scan UPnP devices.
 *
 * First of all it sends UDP Multicast to detect devices with defined ST to port 1900.
 *
 * The answer will be parsed in form:
 * <pre><code>
 *    {
 *      "HTTP/1.1 200 OK": "",
 *      "CACHE-CONTROL": "max-age = 1800"
 *      "EXT:
 *      "LOCATION": "http://192.168.1.55:1400/xml/device_description.xml",
 *      "SERVER": "Linux UPnP/1.0 Sonos/34.16-37101 (ZP90)",
 *      "ST": "urn:schemas-upnp-org:device:ZonePlayer:1",
 *      "USN": "uuid:RINCON_000E58A0099A04567::urn:schemas-upnp-org:device:ZonePlayer:1",
 *      "X-RINCON-HOUSEHOLD": "Sonos_vCu667379mc1UczAwr12311234",
 *      "X-RINCON-BOOTSEQ": "82",
 *      "X-RINCON-WIFIMODE": "0",
 *      "X-RINCON-VARIANT": "0"
 *    }
 * </code></pre>
 * If readXml is enabled and result.LOCATION exists, so this location will be read and delivered as xmlData.
 * You can call the function with object too
 * <pre><code>
 *   ssdpScan({ip: '192.168.1.3', st: 'urn:dial-multiscreen-org:service:dial:1', readXml: true}, function (error, result, ip, xmlData) {
 *      if (result) console.log('Found UPnP device');
 *   });
 * </code></pre>
 *
 * @alias ssdpScan
 * @param text filter string like "urn:dial-multiscreen-org:service:dial:1"
 * @param readXml if LOCATION xml should be read
 * @param timeout timeout in ms (default 1000)
 * @param callback return result
 */
export function ssdpScan(
    text: string,
    readXml: boolean,
    timeout: number,
    callback: (err: Error | null, res: SSDPResultEntry[]) => void
): void {
    timeout = timeout || 1_000;

    let timer: NodeJS.Timeout | undefined | null;

    const interfaces = networkInterfaces();
    const sockets: any[] = [];
    const result: any[] = [];
    Object.keys(interfaces).forEach(iName => {
        interfaces[iName]!.forEach(ipInfo => {
            if (!ipInfo.internal && ipInfo.family === 'IPv4') {
                (ip => {
                    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

                    if (socket) {
                        socket.unref();

                        // Send to port 1900 UDP request
                        socket.on('error', err => {
                            if (timer) {
                                clearTimeout(timer);
                                timer = null;
                            }
                            if (callback) {
                                callback(err, result);
                                // @ts-expect-error fix it
                                callback = null;
                            }
                            if (socket) {
                                socket.close();
                            }
                        });

                        socket.on('message', (_msg, rinfo) => {
                            /* expected:
                             HTTP/1.1 200 OK
                             CACHE-CONTROL: max-age = 1800
                             EXT:
                             LOCATION: http://192.168.1.55:1400/xml/device_description.xml
                             SERVER: Linux UPnP/1.0 Sonos/34.16-37101 (ZP90)
                             ST: urn:schemas-upnp-org:device:ZonePlayer:1
                             USN: uuid:RINCON_000E58A0099A04567::urn:schemas-upnp-org:device:ZonePlayer:1
                             X-RINCON-HOUSEHOLD: Sonos_vCu667379mc1UczAwr12311234
                             X-RINCON-BOOTSEQ: 82
                             X-RINCON-WIFIMODE: 0
                             X-RINCON-VARIANT: 0
                             */
                            let msg = _msg ? _msg.toString() : '';

                            msg = msg.replace(/\r\n/g, '\n');
                            const device: Record<string, any> = { ip: rinfo.address };
                            if (!result.find(dev => dev.ip === device.ip)) {
                                const lines = msg.split('\n');
                                const obj: Record<string, any> = {};
                                for (let i = 0; i < lines.length; i++) {
                                    const pos = lines[i].indexOf(':');
                                    if (pos !== -1) {
                                        obj[lines[i].substring(0, pos)] = lines[i].substring(pos + 1).trim();
                                    } else {
                                        obj[lines[i]] = '';
                                    }
                                }
                                device.data = obj;
                                console.log(`Answer from ${device.ip}`);
                                result.push(device);
                                if (readXml && obj.LOCATION) {
                                    httpGet(obj.LOCATION, timeout, (err, data) => {
                                        if (err) {
                                            console.error(`No answer from ${device.ip}: ${JSON.stringify(err)}`);
                                        } else if (data) {
                                            device.xml = data.split('\n');
                                            device.xml.forEach((line: string) => {
                                                let m = line.match('<manufacturer>(.+)</manufacturer>');
                                                if (m) {
                                                    device.manufacturer = m[1];
                                                }
                                                m = line.match('<friendlyName>(.+)</friendlyName>');
                                                if (m) {
                                                    device.name = m[1];
                                                }
                                            });
                                        } else {
                                            console.log(`No answer from ${device.ip}`);
                                        }
                                    });
                                }
                            }
                        });

                        socket.on('listening', () => {
                            socket.addMembership('239.255.255.250', ip);
                            socket.setMulticastTTL(4);
                            let msg;

                            if (parseInt(process.version.substring(1), 10) < 6) {
                                msg = new Buffer(text);
                            } else {
                                msg = Buffer.from(text);
                            }

                            socket.send(msg, 0, msg.length, 1900, '239.255.255.250');
                        });
                        socket.bind(19001, ip);
                    }
                })(ipInfo.address);
            }
        });
    });

    timer = setTimeout(() => {
        timer = null;

        sockets.forEach(socket => socket.close());

        if (callback) {
            callback(null, result);
            // @ts-expect-error fix it
            callback = null;
        }
    }, timeout || 1_000);
}
