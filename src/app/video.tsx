import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Body, Button, Card, H1, Kicker, Txt } from '@/components/ui';
import { C, F, Protocol, R } from '@/constants/theme';
import { useT } from '@/i18n';

function Preview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = true;
    p.play();
  });
  return <VideoView player={player} style={{ flex: 1 }} contentFit="cover" nativeControls={false} />;
}

export default function Video() {
  const { t } = useT();
  const { protocol = 'focus' } = useLocalSearchParams<{ protocol: Protocol }>();
  const [file, setFile] = useState<{ uri: string; name: string } | null>(null);

  const browse = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true });
    if (!res.canceled && res.assets?.[0]) setFile({ uri: res.assets[0].uri, name: res.assets[0].name });
  };

  return (
    <Screen back>
      <View style={{ alignItems: 'center' }}>
        <Card style={{ width: 1080, maxWidth: '100%', flexDirection: 'row', gap: 36, flexWrap: 'wrap' }} pad={36}>
          <View style={{ flex: 1.3, minWidth: 380, aspectRatio: 16 / 9, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.bgDeep, alignItems: 'center', justifyContent: 'center' }}>
            {file ? <Preview key={file.uri} uri={file.uri} /> : <Txt style={{ color: C.textMute, fontFamily: F.semibold }}>{t('preview')}</Txt>}
          </View>
          <View style={{ flex: 1, minWidth: 320, gap: 16 }}>
            <Kicker color={C.calm}>{t('modeVideo')}</Kicker>
            <H1>{t('videoTitle')}</H1>
            <Body>{t('videoBody')}</Body>
            {file && <Txt style={{ color: C.textDim, fontFamily: F.semibold }} numberOfLines={1}>{file.name}</Txt>}
            <View style={{ flex: 1 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Button title={t('browse')} kind="ghost" icon="film" onPress={browse} />
              <Button
                title={t('next')}
                icon="arrow"
                disabled={!file}
                onPress={() => file && router.push(`/video-play?protocol=${protocol}&uri=${encodeURIComponent(file.uri)}`)}
              />
            </View>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
