import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

type Mode = 'home' | 'red' | 'blink';

const RED = '#FF0000';
const YELLOW = '#FFC800';
const BLINK_MS = 500;

/* ---------- 3D műanyag gomb ---------- */

type Palette = {
  side: [string, string]; // a gomb "oldala" (vastagsága)
  face: [string, string, string]; // a gomb teteje (fent világos -> lent sötét)
  rim: string; // finom, világos perem
  glow: string; // a gomb alatti színes derengés
};

const RED_PLASTIC: Palette = {
  side: ['#7a0010', '#3d0008'],
  face: ['#ff6b6b', '#e0152b', '#a30018'],
  rim: 'rgba(255,200,200,0.55)',
  glow: '#ff1f3d',
};

const AMBER_PLASTIC: Palette = {
  side: ['#9a6400', '#4d3100'],
  face: ['#ffe27a', '#ffb800', '#d98200'],
  rim: 'rgba(255,245,200,0.7)',
  glow: '#ffb000',
};

function PlasticButton({
  size,
  palette,
  label,
  icon,
  onPress,
  accessibilityLabel,
}: {
  size: number;
  palette: Palette;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const depth = Math.round(size * 0.075); // a gomb vastagsága
  const bezel = Math.round(size * 0.05);
  const outer = size + bezel * 2;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{ alignItems: 'center' }}
    >
      {({ pressed }) => (
        <View
          style={{
            width: outer,
            height: outer + depth,
            alignItems: 'center',
          }}
        >
          {/* színes derengés a gomb alatt */}
          <View
            style={{
              position: 'absolute',
              top: outer * 0.12,
              width: outer * 0.92,
              height: outer * 0.92,
              borderRadius: outer,
              backgroundColor: palette.glow,
              opacity: pressed ? 0.1 : 0.22,
              elevation: 0,
            }}
          />
          {/* sötét keret (süllyesztett foglalat) */}
          <LinearGradient
            colors={['#050506', '#2a2b31']}
            style={{
              position: 'absolute',
              top: 0,
              width: outer,
              height: outer,
              borderRadius: outer,
              elevation: 12,
            }}
          />
          {/* gomb oldala (vastagság) */}
          <LinearGradient
            colors={palette.side}
            style={{
              position: 'absolute',
              top: bezel + depth,
              width: size,
              height: size,
              borderRadius: size,
            }}
          />
          {/* gomb teteje: lenyomáskor lejjebb megy */}
          <View
            style={{
              position: 'absolute',
              top: bezel + (pressed ? depth * 0.85 : 0),
              width: size,
              height: size,
              borderRadius: size,
              shadowColor: '#000',
              shadowOpacity: 0.5,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
            }}
          >
            <LinearGradient
              colors={palette.face}
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.7, y: 1 }}
              style={{
                width: size,
                height: size,
                borderRadius: size,
                borderWidth: Math.max(2, size * 0.012),
                borderColor: palette.rim,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {/* fényes "műanyag" csillanás felül */}
              <LinearGradient
                colors={['rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']}
                style={{
                  position: 'absolute',
                  top: size * 0.04,
                  width: size * 0.78,
                  height: size * 0.42,
                  borderTopLeftRadius: size,
                  borderTopRightRadius: size,
                  borderBottomLeftRadius: size * 0.5,
                  borderBottomRightRadius: size * 0.5,
                }}
              />
              {/* belső árnyék alul */}
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.28)']}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  width: size,
                  height: size * 0.4,
                }}
              />
              <View style={{ marginTop: size * 0.06, alignItems: 'center' }}>
                {icon}
                <Text
                  style={{
                    marginTop: size * 0.04,
                    fontSize: size * 0.11,
                    fontWeight: '900',
                    letterSpacing: 3,
                    color: 'rgba(255,255,255,0.95)',
                    textShadowColor: 'rgba(0,0,0,0.45)',
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 3,
                  }}
                >
                  {label}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function PowerIcon({ s }: { s: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M12 3 V12"
        stroke="white"
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M7.2 6.6 A8 8 0 1 0 16.8 6.6"
        stroke="white"
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

function IndexIcon({ s }: { s: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Polygon points="1,12 8,5 8,10 16,10 16,5 23,12 16,19 16,14 8,14 8,19" fill="white" />
    </Svg>
  );
}

/* ---------- Alkalmazás ---------- */

export default function App() {
  const { width, height } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>('home');
  const [phaseOn, setPhaseOn] = useState(true); // villogás: true = sárga
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(true);

  const torchOn =
    mode === 'red' || (mode === 'blink' && phaseOn);

  const start = useCallback(
    async (next: Mode) => {
      if (!permission?.granted) {
        await requestPermission();
      }
      setPhaseOn(true);
      setMode(next);
    },
    [permission, requestPermission],
  );

  // Index villogás: 0,5 mp sárga / 0,5 mp fekete
  useEffect(() => {
    if (mode !== 'blink') return;
    const id = setInterval(() => setPhaseOn((p) => !p), BLINK_MS);
    return () => clearInterval(id);
  }, [mode]);

  // Max fényerő + ébren tartás, amíg a színes kijelző megy
  useEffect(() => {
    if (mode === 'home') {
      deactivateKeepAwake();
      Brightness.restoreSystemBrightnessAsync().catch(() => {});
    } else {
      activateKeepAwakeAsync();
      Brightness.setBrightnessAsync(1).catch(() => {});
    }
  }, [mode]);

  // Háttérbe kerüléskor: vissza a kezdőképernyőre, vaku ki, kamera elengedve
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const isActive = state === 'active';
      setActive(isActive);
      if (!isActive) setMode('home');
    });
    return () => sub.remove();
  }, []);

  const buttonSize = Math.min(width * 0.72, (height - 140) / 2.25, 340);
  const iconSize = buttonSize * 0.34;

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      {/* A vaku csak futó kamera mellett kapcsolható: láthatatlan 1x1 előnézet */}
      {permission?.granted && active && (
        <CameraView
          style={styles.hiddenCamera}
          facing="back"
          enableTorch={torchOn}
          mute
        />
      )}

      {mode === 'home' ? (
        <View style={styles.home}>
          <Text style={styles.title}>BIKEFLASH</Text>
          <PlasticButton
            size={buttonSize}
            palette={RED_PLASTIC}
            label="BE"
            icon={<PowerIcon s={iconSize} />}
            accessibilityLabel="Piros fény és vaku bekapcsolása"
            onPress={() => start('red')}
          />
          <PlasticButton
            size={buttonSize}
            palette={AMBER_PLASTIC}
            label="INDEX"
            icon={<IndexIcon s={iconSize} />}
            accessibilityLabel="Villogó sárga irányjelző"
            onPress={() => start('blink')}
          />
          {permission && !permission.granted && (
            <Text style={styles.hint}>
              A vakuhoz kamera-engedély kell (csak a vaku miatt).
            </Text>
          )}
        </View>
      ) : (
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                mode === 'red' ? RED : phaseOn ? YELLOW : '#000000',
            },
          ]}
          onPress={() => setMode('home')}
          accessibilityRole="button"
          accessibilityLabel="Érintsd meg a visszalépéshez"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0b0d' },
  home: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 24,
  },
  title: {
    color: '#8a8b93',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 8,
  },
  hint: {
    color: '#8a8b93',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  hiddenCamera: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
    top: 0,
    left: 0,
  },
});
