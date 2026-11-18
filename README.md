# BikeFlash

Egyszerű Android app biciklis jelzőfényhez, két nagy 3D műanyag hatású gombbal.

- **BE** – a kijelző maximális fényerőn pirosra vált, és bekapcsol a vaku.
- **INDEX** – a kijelző 0,5 mp sárga / 0,5 mp fekete villog maximális fényerőn; sárga fázisban a vaku világít, feketénél kikapcsol.
- A színes kijelző megérintésére az app visszatér a kezdő (gombos) képernyőre, és a vaku kikapcsol.

## Telepítés

Töltsd le a [`BikeFlash.apk`](BikeFlash.apk) fájlt a telefonra, és telepítsd (engedélyezni kell az ismeretlen forrásból való telepítést). Első indításkor kamera-engedélyt kér – ez csak a vaku vezérléséhez kell.

Az APK arm64-v8a (a mai telefonok túlnyomó többsége), a debug kulccsal aláírt release build.

## Fejlesztés

Expo (React Native, TypeScript). A natív `android/` mappát a `prebuild` generálja.

```bash
npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease   # -> app/build/outputs/apk/release/app-release.apk
```
