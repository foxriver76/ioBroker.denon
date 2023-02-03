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
export declare function httpGet(link: string, timeout: number, callback: (err: any, result: string | null, link?: string) => void): void;
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
export declare function ssdpScan(text: string, readXml: boolean, timeout: number, callback: (err: Error | null, res: SSDPResultEntry[]) => void): void;
export {};
