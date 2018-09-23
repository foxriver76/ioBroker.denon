![Logo](media/denon.png)

# DENON/Marantz AV-Receiver Adapter

Der DENON Adapter ermöglicht die Einbindung eines AV-Receivers des Herstellers DENON oder Marantz in das ioBroker System.

## Überblick

### DENON AV-Receiver
Bei DENON und Marantz AV-Receivern handelt es sich um AV-Receiver der Mittel bis Oberklasse. Unterstützt wird regulär mindestens
5.1 Surround Sound. So ist es möglich Boxen und Subwoofer unterschiedlicher Hersteller in das Multimediasystem einzubinden. 
<br/>
Ebenfalls sind die meisten neueren Geräte netzwerkfähig, wodurch sie neben den klassischen Eingangssignalen auch Internetradio, 
Serverdateien und via Bluetooth oder Netzwerk gestreamte Dateien wiedergeben können.

### DENON Adapter
Der DENON Adapter findet automatisch kompatible DENON und Marantz AV-Receiver, die sich im gleichen Netzwerksubnetz wie
der ioBroker befinden.
<br/>
Der Adapter legt automatisch alle für das jeweilige Modell verüfgbaren Befehle und Stati in Form von Objekten an. 
Ein Großteil der Stati kann ebenfalls ausgelesen werden, wie z. B. die aktuelle Laustärke, der Eingangskanal und viele mehr.
Durch geziehltes Beschreiben oder Lesen der angelegten Objekten kann deren Status geändert und 
damit Aktionen ausgelöst oder auch abgefragt werden. 

## Voraussetzungen vor der Installation
Bevor der Adapter mit Ihrem AV-Receiver kommunizieren kann, sollte sichergestellt werden, dass der AV-Receiver korrekt
konfiguriert ist. Ebenfalls muss der AV-Receiver über eine aktive Netzwerkverindung verfügen.

1. Drücken Sie die SETUP Taste auf Ihrer Fernbedienung. Das Menü öffnet sich auf dem Onscreen-Display (OSD) sowie auf dem
angeschlossenen Videoausgangs-Gerät.
2. Wählen Sie den Menüpunkt Netzwerk und anschließend den Punkt Einstellungen.
3. Konfigurieren Sie nun die folgenden Parameter

   *DHCP: EIN (Nutzen Sie diese Einstellung wenn es einen DHCP Server (z. B. FRITZ!Box) im lokalen Netzwerk gibt)*
  
   *IP-Adresse: Wenn DHCP ausgeschaltet ist, muss eine IP-Adresse konfiguriert werden.*
  
   *Subnetz Maske: Subnetzmaske muss nur konfiguriert werden wenn DHCP ausgeschaltet wurde.*
  
   *Standardgateway: Konfigurieren Sie die Adresse des Gateways, falls DHCP ausgeschaltet wurde.*
  
   *Prim. DNS-Server: Nicht konfigurieren.*
  
   *Second DNS: Nicht konfigurieren.*
  
   *Proxy: AUS*
  
4. Speichern Sie die Einstellungen 
5. Drücken Sie erneut den SETUP Knopf
6. Navigieren Sie in das Menü Netzwerk und anschließend nach Netzwerk-Strg."
7. Setzen Sie den Parameter auf "Immer ein"

## Installation
Eine Instanz des Adapters wird über die ioBroker Admin-Oberfläche installiert. 
Die ausführliche Anleitung für die dazu notwendigen Installatonschritte finden sie hier.
<br/><br/>
Nach Abschluß der Installation einer Adapterinstanz öffnet sich automatisch ein Konfigurationsfenster.

## Konfiguration

### Fenster "Haupteinstellungen"
![Adapter Configuration](media/fillInIp.png "Haupteinstellungen")<span style="color:grey">*Admin Oberfläche*</span>

| Feld         | Beschreibung |                                                                       
|:-------------|:-------------|
|IP Adresse    |Hier soll die IP-Adresse des gewünschten AV-Receivers eingegeben werden. Alternativ können Geräte im Netzwerk durch Klick auf die Lupe gesucht und anschließend im Dropdown Menü selektiert werden.|

### Fenster "Erweiterte Einstellungen"
![Advanced Settings](media/advancedSettings.png "Erweiterte Einstellungen")<span style="color:grey">*Admin Oberfläche*</span>

| Feld         | Beschreibung |                                                                       
|:-------------|:-------------|
|Abrufintervall|Hiermit kann festgelegt werden, wie oft der Adapter manche Objekte aktualisiert. Die meisten Objekte werden bei einer Änderung automatisch aktualisiert. Der voreingestellte Wert hat sich als geeignet erwiesen.|
|Intervall zwischen Befehlen|Hier kann festgelegt werden, wie lange der Adapter zwischen Befehlen wartet. Sollten Sie einen alten AV-Receiver haben und Probleme mit dem adapter haben, kann es sinnvoll sein, diesen Wert zu erhöhen (z. B. auf 200 ms).|
|Lautstärke in dB|Die AV-Receiver bieten zwei Möglichkeiten die Lautstärke darzustellen: dB und Volume. Sollten Sie es gewohnt sein, Ihren AV-Receiver in dB zu regeln, können Sie diese Checkbox aktivieren. Es werden automatisch zusätzliche Objekte erzeugt um die Lautstärke in dB zu verwalten.|

Nach Abschluß der Konfiguration wird der Konfigurationsdialog mit `SPEICHERN UND SCHLIEßEN` verlassen. 
Dadurch efolgt im Anschluß ein Neustart des Adapters.

## Instanzen
Die Installation des Adapters hat im Bereich `Objekte` eine aktive Instanz des DENON Adapters angelegt.
<br/><br/>
![Instanz](media/instance.png "Instanz")<span style="color:grey">  
*Erste Instanz*</span>

Auf einem ioBroker Server können mehrere DENON Adapter Instanzen angelegt werden. Jedoch kann ein AV-Receiver nur mit 
einem ioBroker Server gleichzeitig verbunden sein. Sollten Sie mehrere Geräte von einem ioBroker Server steuern, sollten 
Sie je AV-Receiver eine Instanz anlegen.
<br/><br/>
Ob der Adapter aktiviert oder mit dem Logitech Harmony Hub verbunden ist, wird mit der Farbe des Status-Feldes der 
Instanz verdeutlicht. Zeigt der Mauszeiger auf das Symbol, werden weitere Detailinformationen dargestellt. 

## Objekte des Adapters
Im Bereich `Objekte` werden in einer Baumstruktur alle vom Adapter im Hub 
erkannten Geräte und Aktivitäten aufgelistet. Zusätzlich wird auch noch 
darüber informiert, ob die Kommunikation mit dem Hub reibungslos erfolgt.

![Objekte](media/objects.png "DENON Objekte")<span style="color:grey">  
*Objekte des DENON Adapters*</span>

### Buttons
The adapter creates the following buttons:

#### Channel: zoneMain / zone2 / zone3

* zoneMain.playPause

   *Play and pause music from Bluetooth, Online, USB/iPod sources.*
   
* zoneMain.play

   *Play music from Bluetooth, Online, USB/iPod sources.*
   
* zoneMain.pause

   *Pause music from Bluetooth, Online, USB/iPod sources.*

* zoneMain.skipMinus

   *Skip to previous title.*

* zoneMain.skipPlus

   *Skip to next title.*

* zoneMain.volumeDown / zone2.volumeDown / zone3.volumeDown

   *Decrease volume of Main Zone / Zone2 / Zone3.*
   
* zoneMain.volumeUp / zone2.volumeUp / zone3.volumeUp

   *Increase volume of Main Zone / Zone2 / Zone3.*
   
* zoneMain.quickSelectX / zone2.quickSelectX / zone3.quickSelectX
   
   *Emulates the quick select buttons of your remote, with numbers from 1 to 5 for Main Zone / Zone2 / Zone3.*
   
* zoneMain.equalizerBassUp / zone2.equalizerBassUp / zone3.equalizerBassUp

   *Button which increases bass level of the Zone.*
   
   *Bass and treble settings can be adjusted when Dyn EQ is set to OFF and Tone Control is on*
   
* zoneMain.equalizerBassDown / zone2.equalizerBassDown / zone3.equalizerBassDown

   *Button which decreases bass level of the Zone.*
   
   *Bass and treble settings can be adjusted when Dyn EQ is set to OFF and Tone Control is on*
   
* zoneMain.equalizerTrebleUp / zone2.equalizerTrebleUp / zone3.equalizerTrebleUp

   *Button which increases treble level of the Zone.*
   
   *Bass and treble settings can be adjusted when Dyn EQ is set to OFF and Tone Control is on*
   
* zoneMain.equalizerTrebleDown / zone2.equalizerTrebleDown / zone3.equalizerTrebleDown

   *Button which decreases treble level of the Zone.*
   
   *Bass and treble settings can be adjusted when Dyn EQ is set to OFF and Tone Control is on*
   
#### Channel: settings
   
* settings.subwooferLevelDown / settings.subwooferTwoLevelDown

   *Reduce subwoofer level by pressing the button.*
   
* settings.subwooferLevelUp / settings.subwooferTwoLevelUp

   *Increase subwoofer level by pressing the button.*
   
* settings.containmentAmountDown

   *Decrease Audyssey LFC amount. The button will only be created, if it is supported by your AVR.*

* settings.containmentAmountUp

   *Increase Audyssey LFC amount. The button will only be created, if it is supported by your AVR.*
   
* settings.cursorUp / settings.cursorDown / settings.cursorLeft / settings.cursorRight

   *Simulates the cursor buttons of your remote control*
   
* settings.enter

   *Simulates the enter button of your remote control*
	
* settings.return

   *Simulates the return/back button of your remote control*
   
* settings.option

   *Simulates the option button of your remote control*
   
* settings.info

   *Simulates the info button of your remote control*

### States
Following states will be created by the adapter:

#### Channel: info

* info.connection

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |boolean|R|

   *Read-only boolean indicator. If your broker is connected to your DENON AVR, the state is true otherwise false.*
   
* info.friendlyName

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |string|R|

   *Read only string. Contains the friendly name of the connected AVR.*
   
#### Channel: zoneMain / zone2 / zone3
   
* zoneMain.volume / zone2.volume / zone3.volume

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |number|R/W|

   *Number value which represents the current Main Zone / Zone2 / Zone 3 volume of your AVR. You can also set the volume here. When Volume in dB is set to true, the state is represented in dB too in separate states, e. g. mainVolumeDB*
   
   *Range is from 0 to 98 (maybe lower due to maximumVolume), where 80 = 0 dB*
   
   *Example:*
   
    ```javascript
    setState('denon.0.zoneMain.volume', 45.5); // Sets volume of Main Zone to 45.5
    ```
   
* zoneMain.maximumVolume

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |number|R|

   *Read-only number which represents the maximum possible volume, where 80 = 0 dB. When Volume in dB is set to true, the state is represented in dB in the maximumVolumeDB state too.*
   
* zoneMain.muteIndicator / zone2.muteIndicator / zone3.muteIndicator

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |boolean|R/W|

   *Boolean value, which is true if the Main Zone / Zone2 / Zone3 is muted, otherwise false. You can mute your AVR with this state.*
   
   *Example:*
   
    ```javascript
    setState('denon.0.zoneMain.muteIndicator', true); // Mutes the Main Zone of your AVR
    ```
   
* zoneMain.powerZone / zone2.powerZone / zone3.powerZone

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |boolean|R/W|

   *Boolean value, which is true if the Zone is turned on, otherwise false. You can turn your AVR / Zone on and off with this state.*
   
* zoneMain.selectInput / zone2.selectInput / zone3.selectInput

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |string|R/W|

   *The string value contains the current input source. You can also set the input source with the following encoding:*
   
   *0: 	PHONO*
   
   *1: 	CD*
   
   *2: 	TUNER*
   
   *3: 	DVD*
   
   *4: 	BD*
   
   *5: 	TV*
   
   *6: 	SAT/CBL*
   
   *7: 	MPLAY*
   
   *8: 	GAME*
   
   *9: 	NET*
   
   *10:	SPOTIFY*
   
   *11:	LASTFM*
   
   *12:	IRADIO*
   
   *13:	SERVER*
   
   *14:	FAVORITES*
   
   *15:	AUX1*
   
   *16:	AUX2*
   
   *17:	AUX3*
   
   *18:	AUX4*
   
   *19:	AUX5*
   
   *20:	AUX6*
   
   *21:	AUX7*
   
   *Please note, that not every input source is available on every AVR model.*
   
   *Example:*
   
   ```javascript
    setState('denon.0.zoneMain.selectInput', '5'); // Selects TV as input for Main Zone
   ```
   
* zoneMain.sleepTimer / zone2.sleepTimer / zone3.sleepTimer

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |number|R/W|

   *Number-value to read and set the sleep timer for the selected zone. The value will be updated in less than 10 seconds.*
   
* zoneMain.iconURL

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |string|R|

   *Contains a link where you can find the cover of the channel/song which is currently played.*
   
   *NOT SUPPORTED FOR HEOS AVR'S*
   
* zoneMain.equalizerBass / zone2.equalizerBass / zone3.equalizerBass
    
    |Data type|Permission|                                                                       
    |:---:|:---:|
    |number|R/W|

   *Number value which represents the bass level of the Zone. Value range is from -6 to +6 dB.*
   
   *Bass and treble settings can be adjusted when Dyn EQ is set to OFF and Tone Control is on*
   
* zoneMain.equalizerTreble / zone2.equalizerTreble / zone3.equalizerTreble

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |number|R/W|

   *Number value which represents the treble level of the Zone. Value range is from -6 to +6 dB.*
   
   *Bass and treble settings can be adjusted when Dyn EQ is set to OFF and Tone Control is on*
   
#### Channel: display

* display.displayContent

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |string|R|
   
   *Read-only string which contains the content of your AVR display. It has nine states 0 - 9.*
   
   *DISPLAY CONTENT IS NOT SUPPORTED FOR HEOS AVR'S*
   
* display.brightness

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |string|R/W|

   *String value which represents the display brightness. The value can also set the display brightness by the following encoding:*
   
   *0: Off --> turns display off*
   
   *1: Dark --> turns display dark*
   
   *2: Dimmed --> turns display dimmed*
   
   *3: Bright --> turns display bright*
   
   *Example:*
   
   ```javascript
   setState('denon.0.display.brightness', '3'); // Sets display brightness to "Bright"
   ```
#### Channel: settings

* settings.powerSystem

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |boolean|R/W|
   
   *Boolean value which is true, if the AVR is turned on, otherwise false. You can also turn your AVR on and off with this state.*
   
* settings.surroundMode

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |string|R/W|

   *The string value contains the current Surround mode. You can also change the source with the following encoding:*
   
   *0:	STEREO*
   
   *1:	VIRTUAL*
   
   *2:	VIDEO GAME*
   
   *3:	MCH STEREO*
   
   *4:	DTS SURROUND*
   
   *5:	DOLBY DIGITAL*
   
   *6:	MOVIE*
   
   *7:	MUSIC*
   
   *8:	DIRECT*
   
   *9:	PURE DIRECT*
   
   *10:	AUTO*
   
   *11:	GAME*
   
   *12:	AURO3D*
   
   *13:	AURO2DSURR*
   
   *14:	WIDE SCREEN*
   
   *15:	SUPER STADIUM*
   
   *16:	ROCK ARENA*
   
   *17:	JAZZ CLUB*
   
   *18:	CLASSIC CONCERT*
   
   *19:	MONO MOVIE*
   
   *20:	MATRIX*
   
   *Please note, that not every Surround mode is available on every AVR model.*
   
   *Example:*
   
   ```javascript
   setState('denon.0.settings.surroundMode', '3'); // Sets Multi Channel Stereo as surround mode
   ```
   
* settings.expertCommand

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |string|R/W|

   *You can send your own custom commands with this state. You can find an overview about the existing commands in the [AVR-Control-Protocol.pdf](docs/AVR-Control-Protocol.pdf)*
   
   *Example:*
   
    ```javascript
    setState('denon.0.settings.expertCommand', 'ECOON'); // Turns Main Zone ECO mode on
    ```

* settings.outputMonitor

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |string|R/W|

   *Select the output monitor of your AVR. This state will only be created if your AVR supports two HDMI outputs. You can switch the state between:*
   
   *0: AUTO --> Auto detection of monitor*
   
   *1: 1 --> Outputs signal to monitor 1*
   
   *2: 2 --> Outputs signal to monitor 2*
   
* settings.videoProcessingMode

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |string|R/W|

   *Select the video processing mode of your AVR. This state will only be created if your AVR supports two HDMI outputs. You can switch the state between:*
   
   *0: AUTO*
   
   *1: GAME*
   
   *2: MOVIE*
   
* settings.centerSpread

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |boolean|R/W|

   *Boolean-value which is true if center spread is truned on, else false. You can also turn on/off center spread with this state.*
   
* settings.dynamicEq

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |boolean|R/W|

   *Boolean value which represents the state of Dynamic EQ. You can also set Dynamic EQ on and off with this state.*

* settings.subwooferLevelState

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |boolean|R/W|

   *Boolean value, if it's true, you are able to make changes on the subwoofer level.*

* settings.subwooferLevel / settings.subwooferTwoLevel

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |number|R/W|

   *Number value which indicates the current subwoofer level. The value has a range from -12 to 12 (-12 dB to +12 dB).
   The SubwooferTwoLevel state will only be created if it is supported by your AVR.*
   
* settings.audysseyLfc

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |boolean|R/W|

   *Boolean value, which contains and is able to control Audyssey Low Frequency Containment status (on/off).
   The state will only be created, if it is supported by your AVR.*
   
* settings.containmentAmount

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |number|R/W|
	
   *Number value to set the Low Frequency Containment Amount. The value can be between 1 and 7. The state will only be
   created, if it is supported by your AVR.*
   
* settings.multEq

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |string|R/W|

   *String value, to set the MultEQ function of your AVR with the following encoding:*
   
   *0: OFF*
              
   *1: AUDYSSEY*
                	
   *2: BYP.LR*
   
   *3: FLAT*
      
   *4: MANUAL*
   
* settings.dynamicVolume

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |string|R/W|

   *String value to select the Dynamic Volume by following encoding:*
   
   *0: OFF --> turns Dynamic Volume off*
   
   *1: LIT --> turns Dynamic Volume to light*
   
   *2: MED --> turns Dynamic Volume to medium*
   
   *3: HEV --> turns Dynamic Volume to heavy*
   
* settings.referenceLevelOffset

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |string|R/W|

   *String value to select the Reference Level Offset by the following encoding:*
   
   *0: 	0 dB*
   
   *5:	5 dB*
   
   *10:	10 dB*
   
   *15: 15 dB*
   
   *Example:*
   
    ```javascript
    setState('denon.0.settings.referenceLevelOffset', '5'); // Sets Reference Level Offset to 5 dB
    ```
    
* settings.pictureMode

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |string|R/W|

   *String value to set the Picture Mode Direct Change. This state will only be created when your AVR supports it*
   
   *You can set the following values as string:
   
   *'Off'* 
   
   *'Standard'*
   
   *'Movie'*
   
   *'Vivid'*
   
   *'Stream'*
    
   *'Custom'*
   
   *'ISF Day'*
   
   *'ISF Night'*
   
   *Example:*
   
   ```javascript
   setState('denon.0.settings.pictureMode', 'Standard'); // Set Picture Mode Direct Change to Standard
   ```
   
* settings.toneControl

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |boolean|R/W|
    
   *Boolean value, which indicates Tone Control status. You can turn it off/on with this state.*
   
   *Tone Control can only be turned on when Dyn EQ is set to OFF and Tone Control is on*
   
* settings.setupMenu

    |Data type|Permission|                                                                       
    |:---:|:---:|
    |boolean|R/W|

   *Boolean indicator, which indicates if setup menu is currently open or closed. You can open and close it with this state.*
      