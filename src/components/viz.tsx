import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { C, F } from '@/constants/theme';
import { useEeg } from '@/eeg/EegProvider';
import { Txt } from './ui';

const ARC_START = 135; // degrees, 270° sweep
const SWEEP = 270;

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

/** 270° gauge 0–100 with an optional threshold marker. */
export function Gauge({ value, color, size = 84, marker, label }: { value: number; color: string; size?: number; marker?: number | null; label?: string }) {
  const r = size / 2 - 7;
  const c = size / 2;
  const v = Math.max(0, Math.min(100, value));
  const end = ARC_START + (SWEEP * v) / 100;
  const m = marker != null ? ARC_START + (SWEEP * marker) / 100 : null;
  const m1 = m != null ? polar(c, c, r - 9, m) : null;
  const m2 = m != null ? polar(c, c, r + 6, m) : null;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Path d={arc(c, c, r, ARC_START, ARC_START + SWEEP)} stroke={C.line} strokeWidth={7} fill="none" strokeLinecap="round" />
        {v > 0.5 && <Path d={arc(c, c, r, ARC_START, end)} stroke={color} strokeWidth={7} fill="none" strokeLinecap="round" />}
        {m1 && m2 && <Line x1={m1.x} y1={m1.y} x2={m2.x} y2={m2.y} stroke={C.coral} strokeWidth={4} strokeLinecap="round" />}
        <SvgText x={c} y={c + size * 0.11} fontSize={size * 0.3} fontFamily={F.black} fill={C.text} textAnchor="middle">
          {Math.round(v)}
        </SvgText>
      </Svg>
      {label && <Txt style={{ fontFamily: F.semibold, fontSize: 13, color: C.textDim, marginTop: -6 }}>{label}</Txt>}
    </View>
  );
}

/** Scrolling raw EEG line, redrawn ~15 fps from the provider's ring buffer. */
export function RawWave({ width, height, color = C.calm }: { width: number; height: number; color?: string }) {
  const { raw } = useEeg();
  const [d, setD] = useState('');
  useEffect(() => {
    const id = setInterval(() => {
      const { buf, idx } = raw.current;
      const n = buf.length;
      const step = 4;
      const pts = n / step;
      let max = 1;
      for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(buf[i]));
      max = Math.max(max, 300);
      let path = '';
      for (let k = 0; k < pts; k++) {
        const v = buf[(idx + k * step) % n];
        const x = (k / (pts - 1)) * width;
        const y = height / 2 - (v / max) * (height / 2 - 4);
        path += (k === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      setD(path);
    }, 100);
    return () => clearInterval(id);
  }, [raw, width, height]);
  return (
    <Svg width={width} height={height}>
      <Line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={C.line} strokeWidth={1} />
      <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

/** Eight band-power bars (log-scaled 0..1). */
export function BandBars({ width, height, labels }: { width: number; height: number; labels: string[] }) {
  const { bands } = useEeg();
  const gap = 8;
  const bw = (width - gap * 7) / 8;
  const barH = height - 20;
  const colors = ['#7C83FF', '#8E7CFF', C.calm, '#46B8D8', C.focus, '#FF9F5A', C.coral, '#FF8FB1'];
  return (
    <Svg width={width} height={height}>
      {bands.map((b, i) => {
        const h = Math.max(3, b * barH);
        return (
          <React.Fragment key={i}>
            <Rect x={i * (bw + gap)} y={0} width={bw} height={barH} rx={8} fill={C.card} />
            <Rect x={i * (bw + gap)} y={barH - h} width={bw} height={h} rx={8} fill={colors[i]} />
            <SvgText x={i * (bw + gap) + bw / 2} y={height - 3} fontSize={11} fontFamily={F.medium} fill={C.textMute} textAnchor="middle">
              {labels[i]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export function SignalBars({ level }: { level: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 18 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 5,
            height: 6 + i * 6,
            borderRadius: 2,
            backgroundColor: level === 0 && i === 0 ? C.coral : i < level ? C.good : C.line,
          }}
        />
      ))}
    </View>
  );
}

/** Simple line chart with optional reference line. Values 0..100. */
export function LineChart({
  width,
  height,
  series,
  reference,
  xLabels,
  empty,
  yMax = 100,
  fmtY,
}: {
  width: number;
  height: number;
  series: { values: (number | null)[]; color: string; dots?: boolean }[];
  reference?: { values: number[]; color: string };
  xLabels?: string[];
  empty?: string;
  yMax?: number;
  fmtY?: (v: number) => string;
}) {
  const padL = 34;
  const padB = xLabels ? 26 : 8;
  const w = width - padL - 8;
  const h = height - padB - 8;
  const n = Math.max(2, ...series.map((s) => s.values.length), xLabels?.length ?? 0);
  const X = (i: number) => padL + (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const Y = (v: number) => 8 + h - (Math.max(0, Math.min(yMax, v)) / yMax) * h;
  const hasData = series.some((s) => s.values.some((v) => v != null));
  return (
    <Svg width={width} height={height}>
      {[0, 0.25, 0.5, 0.75, 1].map((q) => q * yMax).map((g) => (
        <React.Fragment key={g}>
          <Line x1={padL} x2={padL + w} y1={Y(g)} y2={Y(g)} stroke={C.line} strokeWidth={1} />
          <SvgText x={padL - 8} y={Y(g) + 4} fontSize={11} fill={C.textMute} fontFamily={F.medium} textAnchor="end">
            {fmtY ? fmtY(g) : Math.round(g)}
          </SvgText>
        </React.Fragment>
      ))}
      {xLabels?.map((l, i) =>
        n <= 31 || i % Math.ceil(n / 20) === 0 ? (
          <SvgText key={i} x={X(i)} y={height - 6} fontSize={11} fill={C.textMute} fontFamily={F.medium} textAnchor="middle">
            {l}
          </SvgText>
        ) : null,
      )}
      {reference && reference.values.length > 1 && (
        <Polyline
          points={reference.values.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}
          stroke={reference.color}
          strokeWidth={2}
          strokeDasharray="6 6"
          fill="none"
        />
      )}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => (v == null ? null : `${X(i)},${Y(v)}`)).filter(Boolean);
        return (
          <React.Fragment key={si}>
            {pts.length > 1 && <Polyline points={pts.join(' ')} stroke={s.color} strokeWidth={3} fill="none" strokeLinejoin="round" />}
            {s.dots &&
              s.values.map((v, i) => (v == null ? null : <Circle key={i} cx={X(i)} cy={Y(v)} r={5} fill={s.color} stroke={C.surface} strokeWidth={2} />))}
          </React.Fragment>
        );
      })}
      {!hasData && empty && (
        <SvgText x={padL + w / 2} y={8 + h / 2} fontSize={16} fill={C.textMute} fontFamily={F.medium} textAnchor="middle">
          {empty}
        </SvgText>
      )}
    </Svg>
  );
}

/** Three stars, filled up to `count`. */
export function Stars({ count, size = 56 }: { count: number; size?: number }) {
  const star = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[0, 1, 2].map((i) => (
        <Svg key={i} width={size} height={size} viewBox="0 0 24 24">
          <Path d={star} fill={i < count ? C.sun : C.card} stroke={i < count ? '#E58600' : C.line} strokeWidth={1} strokeLinejoin="round" />
        </Svg>
      ))}
    </View>
  );
}
