SportLog Mobile — Expo/React Native App (iPhone)

## Setup

```bash
cd mobile
npm install
npx expo start
```

Scanne den QR-Code (bzw. `exp://<PC-LAN-IP>:8081`) mit der iPhone-Kamera oder in Expo Go über "Scan QR Code". iPhone und PC müssen im selben WLAN sein.

Falls kein QR-Code im Terminal erscheint (z.B. bei Ausgabe in eine Log-Datei statt TTY):

```bash
npx --yes qrcode "exp://<PC-LAN-IP>:8081" -o qr.png
```

## Backend-Adresse konfigurieren

Die App holt alle Daten vom Next.js-Backend (`../` — der Web-App-Ordner, muss parallel mit `npm run dev` laufen, Port 3000). Die IP-Adresse steht in `app.json` → `expo.extra.apiBaseUrl`. Bei Wechsel des Netzwerks oder PCs muss diese Adresse aktualisiert werden (LAN-IP herausfinden: `ipconfig` unter Windows, `Ethernet`/`WLAN`-Adapter suchen).

## Wichtig: Expo SDK Version

Dieses Projekt ist auf **Expo SDK 54** gepinnt, weil das die aktuell im App Store verfügbare Expo-Go-Version unterstützt. Bei einem SDK-Upgrade (`npx expo install expo@latest`) zuerst prüfen, ob die App-Store-Version von Expo Go dieses SDK schon unterstützt — sonst funktioniert das Scannen des QR-Codes nicht ("Project is incompatible with this version of Expo Go").

## Langfristig: eigenständige App ohne Expo Go

Aktuell läuft die App über Expo Go + einen laufenden Dev-Server auf dem PC. Für eine dauerhaft installierte App (eigenes Icon, kein PC nötig) wäre ein EAS Build mit Apple-Entwickler-Account (99$/Jahr) für TestFlight/Sideloading der nächste Schritt — bisher nicht eingerichtet.
