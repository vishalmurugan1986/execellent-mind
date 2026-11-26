import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

import type { GameId } from '@/content';
import type { SceneProps } from './common';
import HoopShot from './HoopShot';
import MagicGarden from './MagicGarden';
import RailRush from './RailRush';
import ReefFriends from './ReefFriends';
import RocketClimb from './RocketClimb';
import SkyGlider from './SkyGlider';
import StarBlaster from './StarBlaster';
import TurboKart from './TurboKart';

const SCENES: Record<GameId, (p: SceneProps) => React.ReactElement> = {
  runner: RailRush,
  glider: SkyGlider,
  rocket: RocketClimb,
  kart: TurboKart,
  hoops: HoopShot,
  blaster: StarBlaster,
  reef: ReefFriends,
  garden: MagicGarden,
};

/** Measures its box and renders the game scene to fill it. Memoised: the play screen re-renders every tick. */
export const SceneView = React.memo(function SceneView({ game, level, live = true }: { game: GameId; level: SharedValue<number>; live?: boolean }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const Scene = SCENES[game] ?? RailRush;
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size && <Scene level={level} w={size.w} h={size.h} live={live} />}
    </View>
  );
});

/** Lightweight picture of each game for lists (rendering live scenes there froze the UI thread). */
export const THUMBS: Record<GameId, number> = {
  runner: require('../../../assets/images/games/runner.webp'),
  glider: require('../../../assets/images/games/glider.webp'),
  rocket: require('../../../assets/images/games/rocket.webp'),
  kart: require('../../../assets/images/games/kart.webp'),
  hoops: require('../../../assets/images/games/hoops.webp'),
  blaster: require('../../../assets/images/games/blaster.webp'),
  reef: require('../../../assets/images/games/reef.webp'),
  garden: require('../../../assets/images/games/garden.webp'),
};

export function GameThumb({ game }: { game: GameId }) {
  return <Image source={THUMBS[game]} style={StyleSheet.absoluteFill} resizeMode="cover" />;
}

/** Frozen live render of a game (heavy — only for tools that need a real frame). */
export function ScenePreview({ game, value = 0.75 }: { game: GameId; value?: number }) {
  const level = useSharedValue(value);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const W = 1240;
  const k = box ? box.w / W : 1;
  const H = box ? box.h / k : 670;
  const Scene = SCENES[game] ?? RailRush;
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box && (
        <View style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: [{ translateX: (-W * (1 - k)) / 2 }, { translateY: (-H * (1 - k)) / 2 }, { scale: k }] }}>
          <Scene level={level} w={W} h={H} live={false} />
        </View>
      )}
    </View>
  );
}
