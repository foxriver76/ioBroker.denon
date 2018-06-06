![Logo](admin/denon.png)

# ioBroker.denon [![Build Status Travis](https://travis-ci.org/foxriver76/ioBroker.denon.svg?branch=master)](https://travis-ci.org/foxriver76/ioBroker.denon)[![Build status AppVeyor](https://ci.appveyor.com/api/projects/status/mwkeddgjpgnpef5n?svg=true)](https://ci.appveyor.com/project/foxriver76/iobroker-denon)
[![NPM version](http://img.shields.io/npm/v/iobroker.denon.svg)](https://www.npmjs.com/package/iobroker.denon)
[![Downloads](https://img.shields.io/npm/dm/iobroker.denon.svg)](https://www.npmjs.com/package/iobroker.denon)

[![NPM](https://nodei.co/npm/iobroker.denon.png?downloads=true)](https://nodei.co/npm/iobroker.denon/)
=================
## Installation
You can either install the adapter via the ioBroker web interface or on your local machine via npm.

### Browser-based
1. Open your ioBroker web interface in a browser (eg: 192.168.30.70:8081)
2. Click on Tab "Adapters" --> Install from Custom URL.
![Custom URL](/documentation/installFromCustomURL.png)
3. Click on "Custom" and paste following URL:
https://github.com/foxriver76/ioBroker.denon
![Paste URL](/documentation/urlInInputField.png)
4. Click on Install

### Local machine
Navigate into your iobroker folder and execute the following command: 
```bash
npm i iobroker.denon
```

## Setup
1. Open your ioBroker interface in a browser (eg: 192.168.1.33:8081)
2. Navigate to Tab "Adapters"
3. Click on the three points and then on the "+" symbol of the DENON AVR adapter
![Add Adapter](/documentation/plusAddAdapter.png)
4. Now you can see the adapter configuration page --> type in the ip-address of your DENON AVR
![Adapter Configuration](/documentation/fillInIp.png)
5. Click on Save & Close

## Usage
Take note, that the AVRs can only manage a single telnet connection. If you are having an active telnet connection e. g. with the javascript adapter, the AVR will refuse the connection of this adapter.
Here you can find a description of the states and how to use them.

### Buttons
The adapter creates the following buttons:

* playPauseButton

   *Play and pause music from Bluetooth, Online, USB/iPod sources.*
   
* skipMinus

   *Skip to previous title.*
   
* skipPlus

   *Skip to next title.*
   
* volumeDown / zone2.volumeDown / zone3.volumeDown
   
   *Decrease volume of Main Zone / Zone2 / Zone3.*
   
* volumeUp / zone2.volumeUp / zone3.volumeUp

   *Increase volume of Main Zone / Zone2 / Zone3.*
   
* quickSelect1 / zone2.quickSelect1 / zone3.quickSelect1
   
   *Emulates the quick select buttons of your remote, with numbers from 1 to 5 for Main Zone / Zone2 / Zone3.*

### States
Following states will be created by the adapter:

* info.connection

   *Read-only boolean indicator. If your broker is connected to your DENON AVR, the state is true otherwise false.*
   
* info.friendlyName

   *Read only string. Contains the friendly name of the connected AVR.*
   
* mainVolume / zone2.volume / zone3.volume

   *Number value which represents the current Main Zone / Zone2 / Zone 3 volume of your AVR. You can also set the volume here.*
   
   *Example:*
    ```javascript
    setState('denon.0.mainVolume', 45.5); // Sets volume of Main Zone to 45.5
    ```
   
* maximumVolume

   *Read-only number which represents the maximum possible volume.*
   
* muteIndicator / zone2.muteIndicator / zone3.muteIndicator

   *Boolean value, which is true if the Main Zone / Zone2 / Zone3 is muted, otherwise false. You can mute your AVR with this state.*
   
   *Example:*
   
    ```javascript
    setState('denon.0.muteIndicator', true); // Mutes the Main Zone of your AVR
    ```
   
* powerSystem
   
   *Boolean value which is true, if the AVR is turned on, otherwise false. You can also turn your AVR on and off with this state.*
   
* powerZone / zone2.powerZone / zone3.powerZone

   *Boolean value, which is true if the Zone is turned on, otherwise false. You can turn your AVR / Zone on and off with this state.*
   
* selectInput / zone2.selectInput / zone3.selectInput

   *The number value contains the current input source. You can also set the input source with the following encoding:*
   
   *0:PHONO*
   
   *1:CD*
   
   *2:TUNER*
   
   *3:DVD*
   
   *4:BD*
   
   *5:TV*
   
   *6:SAT/CBL*
   
   *7:MPLAY*
   
   *8:GAME*
   
   *9:NET*
   
   *10:SPOTIFY*
   
   *11:LASTFM*
   
   *12:IRADIO*
   
   *13:SERVER*
   
   *14:FAVOTITES*
   
   *15:AUX1*
   
   *16:AUX2*
   
   *17:AUX3*
   
   *18:AUX4*
   
   *19:AUX5*
   
   *20:AUX6*
   
   *21:AUX7*
   
   *Please note, that not every input source is available on every AVR model.*
   
   *Example:*
   
   ```javascript
    setState('denon.0.selectInput', 5); // Selects TV as input for Main Zone
    ```
* surroundMode

   *The number value contains the current Surround mode. You can also change the source with the following encoding:*
   
   *0:STEREO*
   
   *1:VIRTUAL*
   
   *2:VIDEO GAME*
   
   *3:MCH STEREO*
   
   *4:DTS SURROUND*
   
   *5:DOLBY DIGITAL*
   
   *6:MOVIE*
   
   *7:MUSIC*
   
   *8:DIRECT*
   
   *9:PURE DIRECT*
   
   *10:AUTO*
   
   *11:GAME*
   
   *12:AURO3D*
   
   *13:AURO2DSURR*
   
   *14:WIDE SCREEN*
   
   *15:SUPER STADIUM*
   
   *16:ROCK ARENA*
   
   *17:JAZZ CLUB*
   
   *18:CLASSIC CONCERT*
   
   *19:MONO MOVIE*
   
   *20:MATRIX*
   
   *Please note, that not every Surround mode is available on every AVR model.*
   
   *Example:*
   
   ```javascript
   setState('denon.0.surroundMode', 3); // Sets Multi Channel Stereo as surround mode
   ```
* display.displayContent
   
   *Read-only string which contains the content of your AVR display. It has nine states 0 - 9.*
   
* display.brightness

   *Number value which represents the display brightness. The value can also set the display brightness by the following encoding:*
   
   *0: Off --> turns display off*
   
   *1: Dark --> turns display dark*
   
   *2: Dimmed --> turns display dimmed*
   
   *3: Bright --> turns display bright*
   
* expertCommand
   *You can send your own custom commands with this state. You can find an overview about the existing commands in the AVR-Control-Protocol.pdf*
   
   *Example:*
   
    ```javascript
    setState('denon.0.expertCommand', 'ECOON'); // Turns Main Zone ECO mode on
    ```
   
## Missing functions & bugs
If you are missing any functions or detected a bug, please open an [issue](https://github.com/foxriver76/ioBroker.denon/issues).

The adapter is tested with an DENON AVR-X1200W and a Marantz SR5009.
   
## Changelog
### 0.1.3
* (foxriver76) bug fixes for Zone3
* (foxriver76) new state for main zone power
* (foxriver76) minor other improvements

### 0.1.2
* (foxriver76) Performance optimization
* (foxriver76) Faster display update
* (foxriver76) More appropriate reconnect intervall

### 0.1.1
* (foxriver76) new readme for npm

### 0.1.0
* (foxriver76) handling up to three zones
* (foxriver76) handling display content
* (foxriver76) setting display brightness

### 0.0.1
* (foxriver76) initial release

## License
The MIT License (MIT)

Copyright (c) 2018 Moritz Heusinger <moritz.heusinger@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
