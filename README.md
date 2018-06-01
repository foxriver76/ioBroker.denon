![Logo](admin/denon.png)

# ioBroker.denon [![Build Status](https://travis-ci.org/foxriver76/ioBroker.denon.svg?branch=master)](https://travis-ci.org/foxriver76/ioBroker.denon)
=================
## Installation
You can either install the adapter via the ioBroker web interface or on the machine.

### Browser-based
1. Open your ioBroker web interface in a browser (eg: 192.168.30:8081)
2. Click on Tab "Adapters" --> Install from Custom URL.
![Custom URL](/documentation/installFromCustomURL.png)
3. Click on "Custom" and paste following URL:
https://github.com/foxriver76/ioBroker.denon/tarball/master
![Paste URL](/documentation/urlInInputField.png)
4. Click on Install

### On-machine
1. Navigate in your iobroker execute following command: 
```bash
npm install https://github.com/foxriver76/ioBroker.denon/tarball/master
```
2. afterwards execute:
```bash
iobroker upload denon
```

## Setup
1. Open your ioBroker interface in a browser (eg: 192.168.1:8081)
2. Navigate to Tab "Adapters"
3. Click on the three points and then on the "+" symbol of the DENON AVR adapter
![Add Adapter](/documentation/plusAddAdapter.png)
4. Now you can see the adapter configuration page --> type in the ip-address of your DENON AVR
![Adapter Configuration](/documentation/fillInIp.png)
5. Click on Save & Close

## Usage
Here you can find a description of the states and how to use them.

### Buttons

### States
 
## Changelog

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
