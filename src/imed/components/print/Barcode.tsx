import React from 'react';

// მარტივი Code 39 ბარკოდის გენერატორი (SVG)
const CODE39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn', '9': 'nnwwnnwnn', 'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw',
  'C': 'wnwnnwnnn', 'D': 'nnnnwwnnw', 'E': 'wnnnwwnnn', 'F': 'nnwnwwnnn',
  'G': 'nnnnnwwnw', 'H': 'wnnnnwwnn', 'I': 'nnwnnwwnn', 'J': 'nnnnwwwnn',
  'K': 'wnnnnnnww', 'L': 'nnwnnnnww', 'M': 'wnwnnnnwn', 'N': 'nnnnwnnww',
  'O': 'wnnnwnnwn', 'P': 'nnwnwnnwn', 'Q': 'nnnnnnwww', 'R': 'wnnnnnwwn',
  'S': 'nnwnnnwwn', 'T': 'nnnnwnwwn', 'U': 'wwnnnnnnw', 'V': 'nwwnnnnnw',
  'W': 'wwwnnnnnn', 'X': 'nwnnwnnnw', 'Y': 'wwnnwnnnn', 'Z': 'nwwnwnnnn',
  '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
};

interface Props {
  value: string;
  height?: number;
  className?: string;
}

export default function Barcode({ value, height = 48, className = '' }: Props) {
  const data = `*${value.toUpperCase()}*`;
  const narrow = 1.6;
  const wide = narrow * 2.6;
  let x = 0;
  const bars: { x: number; w: number; fill: boolean }[] = [];

  for (let i = 0; i < data.length; i++) {
    const pattern = CODE39[data[i]];
    if (!pattern) continue;
    for (let j = 0; j < pattern.length; j++) {
      const w = pattern[j] === 'w' ? wide : narrow;
      const isBar = j % 2 === 0;
      if (isBar) bars.push({ x, w, fill: true });
      x += w;
    }
    x += narrow; // inter-character gap
  }
  const totalWidth = x;

  return (
    <div className={className}>
      <svg width="100%" viewBox={`0 0 ${totalWidth} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 260 }}>
        <rect width={totalWidth} height={height} fill="#fff" />
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#000" />
        ))}
      </svg>
    </div>
  );
}
