![Logo](media/denon.png)

# DENON/Marantz AV-Receiver Adapter

Der DENON Adapter ermöglicht die Einbindung eines AV-Receivers des Herstellers DENON oder Marantz in das ioBroker System.

## Überblick

### DENON AV-Receiver
Bei DENON und Marantz AV-Receivern handelt es sich um AV-Receiver der Mittel bis Oberklasse. Unterstützt wird regulär mindestens
5.1 Surround Sound. So ist es möglich Boxen und Subwoofer unterschiedlicher Hersteller in das Multimediasystem einzubinden. 
<br/>
Ebenfalls sind die meisten neueren Geräte netzwerkfähig, wodurch diese neben den klassischen Eingangssignalen auch Internetradio, 
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
Bevor der Adapter mit einem AV-Receiver kommunizieren kann, sollte sichergestellt werden, dass der AV-Receiver korrekt
konfiguriert ist. Ebenfalls muss der AV-Receiver über eine aktive Netzwerkverindung verfügen.

1. Durch das Drücken der "SETUP" Taste auf der Fernbedienung, öffnet sich das Menü auf dem Onscreen-Display (OSD) sowie auf dem
angeschlossenen Videoausgangs-Gerät.
2. Anschließend muss der Menüpunkt "Netzwerk" und anschließend der Punkt "Einstellungen" gewählt werden.
3. Die Parameter sollten wie folgt konfiguriert werden:

   *DHCP: EIN (Diese Einstellung sollte genutzt werden, wenn es einen DHCP Server (z. B. FRITZ!Box) im lokalen Netzwerk gibt)*
  
   *IP-Adresse: Wenn DHCP ausgeschaltet ist, muss eine IP-Adresse konfiguriert werden.*
  
   *Subnetz Maske: Subnetzmaske muss nur konfiguriert werden wenn DHCP ausgeschaltet wurde.*
  
   *Standardgateway: Die Adresse des Gateways sollte konfiguirert werden, falls DHCP ausgeschaltet wurde.*
  
   *Prim. DNS-Server: Nicht konfigurieren.*
  
   *Second DNS: Nicht konfigurieren.*
  
   *Proxy: AUS*
  
4. Durch Drücken des Punktes "Speichern" werden die Einstellungen übernommen
5. Der "SETUP" Knopf auf der Fernbedienung muss erneut gedrückt werden
6. Nun sollte in das Menü "Netzwerk" navigiert werden und anschließend "Netzwerk-Strg" geäwhlt werden.
7. Der konfigurierebare Parameter sollte auf "Immer ein" gestellt werden.

## Installation
Eine Instanz des Adapters wird über die ioBroker Admin-Oberfläche installiert. 
Die ausführliche Anleitung für die dazu notwendigen Installatonschritte kann hier (TODO:LINK) nachgelesen werden.
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
|Intervall zwischen Befehlen|Hier kann festgelegt werden, wie lange der Adapter zwischen Befehlen wartet. Sollte ein älterer AV-Receiver genutzt werden und Probleme mit dem Adapter auftreten, kann es sinnvoll sein, diesen Wert zu erhöhen (z. B. auf 200 ms).|
|Lautstärke in dB|Die AV-Receiver bieten zwei Möglichkeiten die Lautstärke darzustellen: dB und Volume. Sollte es gewünscht sein, den AV-Receiver in dB zu regeln, sollte diese Checkbox aktiviert werden. Es werden automatisch zusätzliche Objekte erzeugt um die Lautstärke in dB zu verwalten.|

Nach Abschluß der Konfiguration wird der Konfigurationsdialog mit `SPEICHERN UND SCHLIEßEN` verlassen. 
Dadurch efolgt im Anschluß ein Neustart des Adapters.

## Instanzen
Die Installation des Adapters hat im Bereich `Objekte` eine aktive Instanz des DENON Adapters angelegt.
<br/><br/>
![Instanz](media/instance.png "Instanz")<span style="color:grey">  
*Erste Instanz*</span>

Auf einem ioBroker Server können mehrere DENON Adapter Instanzen angelegt werden. Jedoch kann ein AV-Receiver nur mit 
einem ioBroker Server gleichzeitig verbunden sein. Sollen mehrere Geräte von einem ioBroker Server gesteuert werden, sollte 
je AV-Receiver eine Instanz angelegt werden.
<br/><br/>
Ob der Adapter aktiviert oder mit dem Logitech Harmony Hub verbunden ist, wird mit der Farbe des Status-Feldes der 
Instanz verdeutlicht. Zeigt der Mauszeiger auf das Symbol, werden weitere Detailinformationen dargestellt. 

## Objekte des Adapters
Im Bereich `Objekte` werden in einer Baumstruktur alle vom Adapter im Hub 
erkannten Geräte und Aktivitäten aufgelistet. Zusätzlich wird auch noch 
darüber informiert, ob die Kommunikation mit dem Hub reibungslos erfolgt.

![Objekte](media/objects.png "DENON Objekte")<span style="color:grey">  
*Objekte des DENON Adapters*</span>

Nachfolgend werden die Objekte in States und Buttons unterteilt. 
Jeder Datenpunkt ist mit seinem zugehörigen Datentyp sowie seinen Berechtigungen aufgehführt. 
Berechtigungen können lesend (R) sowie schreibend (W) sein. Jeder Datenpunkt kann mindestens gelesen (R) werden, während
andere ebenfalls beschrieben werden können. Zur Suche nach einem bestimmten Datenpunkt empfiehlt sich die Suche mittels 
der Tastenkombination "STRG + F".

### Buttons
Der Adapter erstellt die folgenden Buttons:

#### Channel: zoneMain / zone2 / zone3

* zoneMain.playPause

   *Wiedergeben und pausieren von Musik von den Quellen: Bluetooth, Online, USB/iPod.*
   
* zoneMain.play

   *Wiedergeben von Musik von den Quellen: Bluetooth, Online, USB/iPod.*
   
* zoneMain.pause

   *Pausieren von Musik von den Quellen: Bluetooth, Online, USB/iPod.*

* zoneMain.skipMinus

   *Springe zum nächsten Titel.*

* zoneMain.skipPlus

   *Springe zum vorherigen Titel.*

* zoneMain.volumeDown / zone2.volumeDown / zone3.volumeDown

   *"Leiser"-Knopf für die Zonen: Main Zone / Zone2 / Zone3.*
   
* zoneMain.volumeUp / zone2.volumeUp / zone3.volumeUp

   *"Lauter"-Knopf für die Zonen: Main Zone / Zone2 / Zone3.*
   
* zoneMain.quickSelectX / zone2.quickSelectX / zone3.quickSelectX
   
   *Emuliert die entsprechenden "Quick Select" Knöpfe der Fernbedienung für die jeweiligen Zonen:
   Main Zone / Zone2 / Zone3.*
   
* zoneMain.equalizerBassUp / zone2.equalizerBassUp / zone3.equalizerBassUp

   *Diser Knopf erhöht das Bass Level der jeweiligen Zone.*
   
   *Bass und Treble Einstellungen können nur vorgenommen werden, wenn "Dyn EQ" ausgeschaltet sowie "Tone Control"
   eingeschaltet ist.*
   
* zoneMain.equalizerBassDown / zone2.equalizerBassDown / zone3.equalizerBassDown

   *Diser Knopf verringert das Bass Level der jeweiligen Zone.*
   
   *Bass und Treble Einstellungen können nur vorgenommen werden, wenn "Dyn EQ" ausgeschaltet sowie "Tone Control"
    eingeschaltet ist.*
   
* zoneMain.equalizerTrebleUp / zone2.equalizerTrebleUp / zone3.equalizerTrebleUp

   *Diser Knopf erhöht das Treble Level der jeweiligen Zone.*
   
   *Bass und Treble Einstellungen können nur vorgenommen werden, wenn "Dyn EQ" ausgeschaltet sowie "Tone Control"
    eingeschaltet ist.*
   
* zoneMain.equalizerTrebleDown / zone2.equalizerTrebleDown / zone3.equalizerTrebleDown

   *Diser Knopf verringert das Treble Level der jeweiligen Zone.*
   
   *Bass und Treble Einstellungen können nur vorgenommen werden, wenn "Dyn EQ" ausgeschaltet sowie "Tone Control"
    eingeschaltet ist.*
   
#### Channel: settings
   
* settings.subwooferLevelDown / settings.subwooferTwoLevelDown

   *Verringert das Subwoofer Bevel.*
   
* settings.subwooferLevelUp / settings.subwooferTwoLevelUp

   *Erhöht das Subwoofer Bevel.*
   
* settings.containmentAmountDown

   *Verrinert die Menge an Audyssey LFC. Dieser Button wird nur erstellt, wenn er vom AVR unterstützt wird*

* settings.containmentAmountUp

   *Erhöht die Menge an Audyssey LFC. Dieser Button wird nur erstellt, wenn er vom AVR unterstützt wird*
   
* settings.cursorUp / settings.cursorDown / settings.cursorLeft / settings.cursorRight

   *Simuliert die Pfeiltasten der Fernbedienung.*
   
* settings.enter

   *Simuliert den "Enter"-Knopf der Fernbedienung.*
	
* settings.return

   *Simuliert den "RETURN" oder "BACK" Knopf der Fernbedienung.*
   
* settings.option

   *Simuliert den "Option"-Knopf der Fernbedienung.*
   
* settings.info

   *Simuliert den "Info"-Knopf der Fernbedienung.*

### States
Die folgenden States werden vom Adapter angelegt:

#### Channel: info

* info.connection

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |boolean|R|

   *Nur lesbarer Indikator, der true ist, wenn der ioBroker mit dem AVR verbunden ist.*
   
* info.friendlyName

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |string|R|

   *Nur lesbarer String, der den Netzwerknamen des AVR's beinhaltet.*
   
#### Channel: zoneMain / zone2 / zone3
   
* zoneMain.volume / zone2.volume / zone3.volume

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |number|R/W|

   *Number Wert der die derzeitige Lautstärke der jeweiligen Zone (Main Zone / Zone2 / Zone 3 )repsäentiert. 
   Durch beschreiben des Wertes wird der AVR auf die jeweilige Lautstärke gestellt. 
   Wenn "Volume in dB" in den erweiterten Einstellungen angehakt wurde gibt es einen zusätzlichen State pro Zone, 
   z. B. zoneMain.VolumeDB*
   
   *Der Bereich reicht von 0 zu 98 (eventuell niedriger durch die konfigurierte maximumVolume), wobei 80 = 0 dB*
   
   *Beispiel:*
   
    ```javascript
    setState('denon.0.zoneMain.volume', 45.5); // Setzt die Lautstärke der Main Zone auf 45.5
    ```
   
* zoneMain.maximumVolume

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |number|R|

   *Nur lesbarer Wert, der die maximal mögliche Lautstärke repräsentiert, wobei 80 = 0 dB. 
   Wenn Volume in dB in den erweiterten Einstellungen aktiviert wurde, existiert ein zusätlicher State maximumVolumeDB,
   welcher die maximal mögliche Laustärle in dB darstellt.*
   
* zoneMain.muteIndicator / zone2.muteIndicator / zone3.muteIndicator

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |boolean|R/W|

   *Boolscher Wert, welcher true liefert wenn die Main Zone / Zone2 / Zone3 stumm geschaltet ist, sonst false. 
   Durch setzen des States kann die entsprechende Zone stumm geschaltet werden.*
   
   *Beispiel:*
   
    ```javascript
    setState('denon.0.zoneMain.muteIndicator', true); // Schaltet die Main Zone stumm
    ```
   
* zoneMain.powerZone / zone2.powerZone / zone3.powerZone

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |boolean|R/W|

   *Boolscher Wert, welcher true ist, wenn die jeweilige Zone eingeschalten ist.
   Die jeweilige Zone kann mit diesem State ein- und ausgeschaltet werden*
   
* zoneMain.selectInput / zone2.selectInput / zone3.selectInput

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |string|R/W|

   *Der string Wert beinhaltet die aktuelle Eingangsquelle. Dieser kann hierbei ebenfalls gesetzt werden. Die Key-Value 
   Liste ist wie folgt aufgebaut:*
   
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
   
   *Hinweis: Nicht jede Eingangsquelle ist auf jedem Modell verfügbar.*
   
   *Beispiel:*
   
   ```javascript
    setState('denon.0.zoneMain.selectInput', '5'); // Selects TV as input for Main Zone
   ```
   
* zoneMain.sleepTimer / zone2.sleepTimer / zone3.sleepTimer

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |number|R/W|

   *Number Wert um den Sleep Timer zu setzen und zu lesen. Der Wert wird entsprechend, dem in den 
   erweiterten Einstellungen konfigurierebarem Abfrageintervall aktualisiert.*
   
* zoneMain.iconURL

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |string|R|

   *Beinhaltet einen Link zum Cover des aktuell abgespielten Senders oder Musikstücks.*
   
   *Hinweis: Dieser State ist auf HEOS-fähigen Geräten nicht verfügbar.*
   
* zoneMain.equalizerBass / zone2.equalizerBass / zone3.equalizerBass
    
    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |number|R/W|

   *Number Wert welcher das aktuelle Bass Level der jeweiligen Zone repräsentiert. Der Wertebereich liegt von -6 bis +6 dB.*
   
   *Bass und Treble Einstellungen können nur vorgenommen werden, wenn "Dyn EQ" ausgeschaltet sowie "Tone Control"
    eingeschaltet ist.*
   
* zoneMain.equalizerTreble / zone2.equalizerTreble / zone3.equalizerTreble

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |number|R/W|

   *Number Wert welcher das aktuelle Treble Level der jeweiligen Zone repräsentiert. Der Wertebereich liegt von -6 bis +6 dB.*
   
   *Bass und Treble Einstellungen können nur vorgenommen werden, wenn "Dyn EQ" ausgeschaltet sowie "Tone Control"
    eingeschaltet ist.*
   
#### Channel: display

* display.displayContent

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |string|R|
   
   *Nur lesbarer string, welcher den Inhalt des Onscreen-Displays enthält. Es gibt neun States, nummeriert von 0 - 9.*
   
   *Hinweis: Dieser State ist auf HEOS-fähigen Geräten nicht verfügbar.*
   
* display.brightness

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |string|R/W|

   *String Wert, welcher die Displayheligkeit des Onscreen-Display repräsentiert.
   Mit dem State kann diese ebenfalls gestuert werden. Die Key-Value Liste ist wie folgt aufgebaut:*
   
   *0: Off --> turns display off*
   
   *1: Dark --> turns display dark*
   
   *2: Dimmed --> turns display dimmed*
   
   *3: Bright --> turns display bright*
   
   *Beispiel:*
   
   ```javascript
   setState('denon.0.display.brightness', '3'); // Stellt die Helligkeit des Onscreen-Displays auf das Maximum
   ```
#### Channel: settings

* settings.powerSystem

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |boolean|R/W|
   
   *Boolean value which is true, if the AVR is turned on, otherwise false. You can also turn your AVR on and off with this state.*
   
* settings.surroundMode

    |Datentyp|Berechtigung|                                                                       
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
   
   *Beispiel:*
   
   ```javascript
   setState('denon.0.settings.surroundMode', '3'); // Sets Multi Channel Stereo as surround mode
   ```
   
* settings.expertCommand

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |string|R/W|

   *You can send your own custom commands with this state. You can find an overview about the existing commands in the [AVR-Control-Protocol.pdf](docs/AVR-Control-Protocol.pdf)*
   
   *Beispiel:*
   
    ```javascript
    setState('denon.0.settings.expertCommand', 'ECOON'); // Turns Main Zone ECO mode on
    ```

* settings.outputMonitor

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |string|R/W|

   *Select the output monitor of your AVR. This state will only be created if your AVR supports two HDMI outputs. You can switch the state between:*
   
   *0: AUTO --> Auto detection of monitor*
   
   *1: 1 --> Outputs signal to monitor 1*
   
   *2: 2 --> Outputs signal to monitor 2*
   
* settings.videoProcessingMode

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |string|R/W|

   *Select the video processing mode of your AVR. This state will only be created if your AVR supports two HDMI outputs. You can switch the state between:*
   
   *0: AUTO*
   
   *1: GAME*
   
   *2: MOVIE*
   
* settings.centerSpread

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |boolean|R/W|

   *Boolean-value which is true if center spread is truned on, else false. You can also turn on/off center spread with this state.*
   
* settings.dynamicEq

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |boolean|R/W|

   *Boolean value which represents the state of Dynamic EQ. You can also set Dynamic EQ on and off with this state.*

* settings.subwooferLevelState

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |boolean|R/W|

   *Boolean value, if it's true, you are able to make changes on the subwoofer level.*

* settings.subwooferLevel / settings.subwooferTwoLevel

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |number|R/W|

   *Number value which indicates the current subwoofer level. The value has a range from -12 to 12 (-12 dB to +12 dB).
   The SubwooferTwoLevel state will only be created if it is supported by your AVR.*
   
* settings.audysseyLfc

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |boolean|R/W|

   *Boolean value, which contains and is able to control Audyssey Low Frequency Containment status (on/off).
   The state will only be created, if it is supported by your AVR.*
   
* settings.containmentAmount

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |number|R/W|
	
   *Number value to set the Low Frequency Containment Amount. The value can be between 1 and 7. The state will only be
   created, if it is supported by your AVR.*
   
* settings.multEq

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |string|R/W|

   *String value, to set the MultEQ function of your AVR with the following encoding:*
   
   *0: OFF*
              
   *1: AUDYSSEY*
                	
   *2: BYP.LR*
   
   *3: FLAT*
      
   *4: MANUAL*
   
* settings.dynamicVolume

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |string|R/W|

   *String value to select the Dynamic Volume by following encoding:*
   
   *0: OFF --> turns Dynamic Volume off*
   
   *1: LIT --> turns Dynamic Volume to light*
   
   *2: MED --> turns Dynamic Volume to medium*
   
   *3: HEV --> turns Dynamic Volume to heavy*
   
* settings.referenceLevelOffset

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |string|R/W|

   *String value to select the Reference Level Offset by the following encoding:*
   
   *0: 	0 dB*
   
   *5:	5 dB*
   
   *10:	10 dB*
   
   *15: 15 dB*
   
   *Beispiel:*
   
    ```javascript
    setState('denon.0.settings.referenceLevelOffset', '5'); // Sets Reference Level Offset to 5 dB
    ```
    
* settings.pictureMode

    |Datentyp|Berechtigung|                                                                       
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
   
   *Beispiel:*
   
   ```javascript
   setState('denon.0.settings.pictureMode', 'Standard'); // Set Picture Mode Direct Change to Standard
   ```
   
* settings.toneControl

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |boolean|R/W|
    
   *Boolean value, which indicates Tone Control status. You can turn it off/on with this state.*
   
   *Tone Control can only be turned on when Dyn EQ is set to OFF and Tone Control is on*
   
* settings.setupMenu

    |Datentyp|Berechtigung|                                                                       
    |:---:|:---:|
    |boolean|R/W|

   *Boolean indicator, which indicates if setup menu is currently open or closed. You can open and close it with this state.*
      