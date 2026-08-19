import * as RadixColors from '@radix-ui/colors';
import Color from 'colorjs.io';
import BezierEasing from 'bezier-easing';

export type GeneratedColors = ReturnType<typeof generateRadixColors>;

type ArrayOf12<T> = [T, T, T, T, T, T, T, T, T, T, T, T];
const arrayOf12 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

const grayScaleNames = [
  'gray',
  'mauve',
  'slate',
  'sage',
  'olive',
  'sand',
] as const;

const scaleNames = [
  ...grayScaleNames,
  'tomato',
  'red',
  'ruby',
  'crimson',
  'pink',
  'plum',
  'purple',
  'violet',
  'iris',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'jade',
  'green',
  'grass',
  'brown',
  'orange',
  'sky',
  'mint',
  'lime',
  'yellow',
  'amber',
] as const;

const lightColors = Object.fromEntries(
  scaleNames.map((scaleName) => [
    scaleName,
    Object.values(RadixColors[`${scaleName}P3`]).map((str) =>
      new Color(str).to('oklch'),
    ),
  ]),
) as Record<(typeof scaleNames)[number], ArrayOf12<Color>>;

const darkColors = Object.fromEntries(
  scaleNames.map((scaleName) => [
    scaleName,
    Object.values(RadixColors[`${scaleName}DarkP3`]).map((str) =>
      new Color(str).to('oklch'),
    ),
  ]),
) as Record<(typeof scaleNames)[number], ArrayOf12<Color>>;

const lightGrayColors = Object.fromEntries(
  grayScaleNames.map((scaleName) => [
    scaleName,
    Object.values(RadixColors[`${scaleName}P3`]).map((str) =>
      new Color(str).to('oklch'),
    ),
  ]),
) as Record<(typeof grayScaleNames)[number], ArrayOf12<Color>>;

const darkGrayColors = Object.fromEntries(
  grayScaleNames.map((scaleName) => [
    scaleName,
    Object.values(RadixColors[`${scaleName}DarkP3`]).map((str) =>
      new Color(str).to('oklch'),
    ),
  ]),
) as Record<(typeof grayScaleNames)[number], ArrayOf12<Color>>;

export const generateRadixColors = ({
  appearance,
  ...args
}: {
  appearance: 'light' | 'dark';
  accent: string;
  gray: string;
  background: string;
}) => {
  const allScales = appearance === 'light' ? lightColors : darkColors;
  const grayScales = appearance === 'light' ? lightGrayColors : darkGrayColors;
  const backgroundColor = new Color(args.background).to('oklch');

  const grayBaseColor = new Color(args.gray).to('oklch');
  const grayScaleColors = getScaleFromColor(
    grayBaseColor,
    grayScales,
    backgroundColor,
  );

  const accentBaseColor = new Color(args.accent).to('oklch');

  let accentScaleColors = getScaleFromColor(
    accentBaseColor,
    allScales,
    backgroundColor,
  );

  const backgroundHex = backgroundColor.to('srgb').toString({ format: 'hex' });

  const accentBaseHex = accentBaseColor.to('srgb').toString({ format: 'hex' });
  if (accentBaseHex === '#000' || accentBaseHex === '#fff') {
    accentScaleColors = grayScaleColors.map((color) =>
      color.clone(),
    ) as ArrayOf12<Color>;
  }

  const [accent9Color, accentContrastColor] = getStep9Colors(
    accentScaleColors,
    accentBaseColor,
  );

  accentScaleColors[8] = accent9Color;
  accentScaleColors[9] = getButtonHoverColor(accent9Color, [accentScaleColors]);

  accentScaleColors[10].coords[1] = Math.min(
    Math.max(accentScaleColors[8].coords[1], accentScaleColors[7].coords[1]),
    accentScaleColors[10].coords[1],
  );
  accentScaleColors[11].coords[1] = Math.min(
    Math.max(accentScaleColors[8].coords[1], accentScaleColors[7].coords[1]),
    accentScaleColors[11].coords[1],
  );

  const accentScaleHex = accentScaleColors.map((color) =>
    color.to('srgb').toString({ format: 'hex' }),
  ) as ArrayOf12<string>;

  const accentScaleWideGamut = accentScaleColors.map(
    toOklchString,
  ) as ArrayOf12<string>;

  const accentScaleAlphaHex = accentScaleHex.map((color) =>
    getAlphaColorSrgb(color, backgroundHex),
  ) as ArrayOf12<string>;

  const accentScaleAlphaWideGamutString = accentScaleHex.map((color) =>
    getAlphaColorP3(color, backgroundHex),
  ) as ArrayOf12<string>;

  const accentContrastColorHex = accentContrastColor
    .to('srgb')
    .toString({ format: 'hex' });

  const grayScaleHex = grayScaleColors.map((color) =>
    color.to('srgb').toString({ format: 'hex' }),
  ) as ArrayOf12<string>;

  const grayScaleWideGamut = grayScaleColors.map(
    toOklchString,
  ) as ArrayOf12<string>;

  const grayScaleAlphaHex = grayScaleHex.map((color) =>
    getAlphaColorSrgb(color, backgroundHex),
  ) as ArrayOf12<string>;

  const grayScaleAlphaWideGamutString = grayScaleHex.map((color) =>
    getAlphaColorP3(color, backgroundHex),
  ) as ArrayOf12<string>;

  const accentSurfaceHex =
    appearance === 'light'
      ? getAlphaColorSrgb(accentScaleHex[1], backgroundHex, 0.8)
      : getAlphaColorSrgb(accentScaleHex[1], backgroundHex, 0.5);

  const accentSurfaceWideGamutString =
    appearance === 'light'
      ? getAlphaColorP3(accentScaleWideGamut[1], backgroundHex, 0.8)
      : getAlphaColorP3(accentScaleWideGamut[1], backgroundHex, 0.5);

  return {
    accentScale: accentScaleHex,
    accentScaleAlpha: accentScaleAlphaHex,
    accentScaleWideGamut: accentScaleWideGamut,
    accentScaleAlphaWideGamut: accentScaleAlphaWideGamutString,
    accentContrast: accentContrastColorHex,

    grayScale: grayScaleHex,
    grayScaleAlpha: grayScaleAlphaHex,
    grayScaleWideGamut: grayScaleWideGamut,
    grayScaleAlphaWideGamut: grayScaleAlphaWideGamutString,

    graySurface: appearance === 'light' ? '#ffffffcc' : 'rgba(0, 0, 0, 0.05)',
    graySurfaceWideGamut:
      appearance === 'light'
        ? 'color(display-p3 1 1 1 / 80%)'
        : 'color(display-p3 0 0 0 / 5%)',

    accentSurface: accentSurfaceHex,
    accentSurfaceWideGamut: accentSurfaceWideGamutString,

    background: backgroundHex,
  };
};

function getStep9Colors(
  scale: ArrayOf12<Color>,
  accentBaseColor: Color,
): [Color, Color] {
  const referenceBackgroundColor = scale[0];
  const distance = accentBaseColor.deltaEOK(referenceBackgroundColor) * 100;

  if (distance < 25) {
    return [scale[8], getTextColor(scale[8])];
  }

  return [accentBaseColor, getTextColor(accentBaseColor)];
}

function getButtonHoverColor(source: Color, scales: ArrayOf12<Color>[]) {
  const [L, C, H] = source.coords;
  const newL = L > 0.4 ? L - 0.03 / (L + 0.1) : L + 0.03 / (L + 0.1);
  const newC = L > 0.4 && !isNaN(H) ? C * 0.93 + 0 : C;
  const buttonHoverColor = new Color('oklch', [newL, newC, H]);

  let closestColor = buttonHoverColor;
  let minDistance = Infinity;

  scales.forEach((scale) => {
    for (const color of scale) {
      const distance = buttonHoverColor.deltaEOK(color);
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = color;
      }
    }
  });

  buttonHoverColor.coords[1] = closestColor.coords[1];
  buttonHoverColor.coords[2] = closestColor.coords[2];
  return buttonHoverColor;
}

function getScaleFromColor(
  source: Color,
  scales: Record<string, ArrayOf12<Color>>,
  backgroundColor: Color,
) {
  const allColors: { scale: string; color: Color; distance: number }[] = [];

  Object.entries(scales).forEach(([name, scale]) => {
    for (const color of scale) {
      const distance = source.deltaEOK(color);
      allColors.push({ scale: name, distance, color });
    }
  });

  allColors.sort((a, b) => a.distance - b.distance);

  const closestColors = allColors.filter(
    (color, i, arr) =>
      i === arr.findIndex((value) => value.scale === color.scale),
  );

  const grayScaleNamesStr = grayScaleNames as readonly string[];
  const allAreGrays = closestColors.every((color) =>
    grayScaleNamesStr.includes(color.scale),
  );
  if (!allAreGrays && grayScaleNamesStr.includes(closestColors[0].scale)) {
    while (grayScaleNamesStr.includes(closestColors[1].scale)) {
      closestColors.splice(1, 1);
    }
  }

  const colorA = closestColors[0];
  const colorB = closestColors[1];

  const a = colorB.distance;
  const b = colorA.distance;
  const c = colorA.color.deltaEOK(colorB.color);

  const cosA = (b ** 2 + c ** 2 - a ** 2) / (2 * b * c);
  const radA = Math.acos(cosA);
  const sinA = Math.sin(radA);

  const cosB = (a ** 2 + c ** 2 - b ** 2) / (2 * a * c);
  const radB = Math.acos(cosB);
  const sinB = Math.sin(radB);

  const tanC1 = cosA / sinA;

  const tanC2 = cosB / sinB;

  const ratio = Math.max(0, tanC1 / tanC2) * 0.5;

  const scaleA = scales[colorA.scale];
  const scaleB = scales[colorB.scale];
  const scale = arrayOf12.map((i) =>
    new Color(Color.mix(scaleA[i], scaleB[i], ratio)).to('oklch'),
  ) as ArrayOf12<Color>;

  const baseColor = scale
    .slice()
    .sort((a, b) => source.deltaEOK(a) - source.deltaEOK(b))[0];

  const ratioC = source.coords[1] / baseColor.coords[1];

  scale.forEach((color) => {
    color.coords[1] = Math.min(
      source.coords[1] * 1.5,
      color.coords[1] * ratioC,
    );
    color.coords[2] = source.coords[2];
  });

  if (scale[0].coords[0] > 0.5) {
    const lightnessScale = scale.map(({ coords }) => coords[0]);
    const backgroundL = Math.max(0, Math.min(1, backgroundColor.coords[0]));
    const newLightnessScale = transposeProgressionStart(
      backgroundL,
      [1, ...lightnessScale],
      lightModeEasing,
    );

    newLightnessScale.shift();

    newLightnessScale.forEach((lightness, i) => {
      scale[i].coords[0] = lightness;
    });

    return scale;
  }

  const ease: typeof darkModeEasing = [...darkModeEasing];
  const referenceBackgroundColorL = scale[0].coords[0];
  const backgroundColorL = Math.max(0, Math.min(1, backgroundColor.coords[0]));

  const ratioL = backgroundColorL / referenceBackgroundColorL;

  if (ratioL > 1) {
    const maxRatio = 1.5;

    for (let i = 0; i < ease.length; i++) {
      const metaRatio = (ratioL - 1) * (maxRatio / (maxRatio - 1));
      ease[i] = ratioL > maxRatio ? 0 : Math.max(0, ease[i] * (1 - metaRatio));
    }
  }

  const lightnessScale = scale.map(({ coords }) => coords[0]);
  const backgroundL = backgroundColor.coords[0];
  const newLightnessScale = transposeProgressionStart(
    backgroundL,
    lightnessScale,
    ease,
  );

  newLightnessScale.forEach((lightness, i) => {
    scale[i].coords[0] = lightness;
  });

  return scale;
}

function getTextColor(background: Color) {
  const white = new Color('oklch', [1, 0, 0]);

  if (Math.abs(white.contrastAPCA(background)) < 40) {
    const [, C, H] = background.coords;
    return new Color('oklch', [0.25, Math.max(0.08 * C, 0.04), H]);
  }

  return white;
}

function getAlphaColor(
  targetRgb: number[],
  backgroundRgb: number[],
  rgbPrecision: number,
  alphaPrecision: number,
  targetAlpha?: number,
) {
  const [tr, tg, tb] = targetRgb.map((c) => Math.round(c * rgbPrecision));
  const [br, bg, bb] = backgroundRgb.map((c) => Math.round(c * rgbPrecision));

  if (
    tr === undefined ||
    tg === undefined ||
    tb === undefined ||
    br === undefined ||
    bg === undefined ||
    bb === undefined
  ) {
    throw Error('Color is undefined');
  }

  let desiredRgb = 0;
  if (tr > br) {
    desiredRgb = rgbPrecision;
  } else if (tg > bg) {
    desiredRgb = rgbPrecision;
  } else if (tb > bb) {
    desiredRgb = rgbPrecision;
  }

  const alphaR = (tr - br) / (desiredRgb - br);
  const alphaG = (tg - bg) / (desiredRgb - bg);
  const alphaB = (tb - bb) / (desiredRgb - bb);

  const isPureGray = [alphaR, alphaG, alphaB].every(
    (alpha) => alpha === alphaR,
  );

  if (!targetAlpha && isPureGray) {
    const V = desiredRgb / rgbPrecision;
    return [V, V, V, alphaR] as const;
  }

  const clampRgb = (n: number) =>
    isNaN(n) ? 0 : Math.min(rgbPrecision, Math.max(0, n));
  const clampA = (n: number) =>
    isNaN(n) ? 0 : Math.min(alphaPrecision, Math.max(0, n));
  const maxAlpha = targetAlpha ?? Math.max(alphaR, alphaG, alphaB);

  const A = clampA(Math.ceil(maxAlpha * alphaPrecision)) / alphaPrecision;
  let R = clampRgb(((br * (1 - A) - tr) / A) * -1);
  let G = clampRgb(((bg * (1 - A) - tg) / A) * -1);
  let B = clampRgb(((bb * (1 - A) - tb) / A) * -1);

  R = Math.ceil(R);
  G = Math.ceil(G);
  B = Math.ceil(B);

  const blendedR = blendAlpha(R, A, br);
  const blendedG = blendAlpha(G, A, bg);
  const blendedB = blendAlpha(B, A, bb);

  if (desiredRgb === 0) {
    if (tr <= br && tr !== blendedR) {
      R = tr > blendedR ? R + 1 : R - 1;
    }

    if (tg <= bg && tg !== blendedG) {
      G = tg > blendedG ? G + 1 : G - 1;
    }

    if (tb <= bb && tb !== blendedB) {
      B = tb > blendedB ? B + 1 : B - 1;
    }
  }

  if (desiredRgb === rgbPrecision) {
    if (tr >= br && tr !== blendedR) {
      R = tr > blendedR ? R + 1 : R - 1;
    }

    if (tg >= bg && tg !== blendedG) {
      G = tg > blendedG ? G + 1 : G - 1;
    }

    if (tb >= bb && tb !== blendedB) {
      B = tb > blendedB ? B + 1 : B - 1;
    }
  }

  R = R / rgbPrecision;
  G = G / rgbPrecision;
  B = B / rgbPrecision;

  return [R, G, B, A] as const;
}

function blendAlpha(
  foreground: number,
  alpha: number,
  background: number,
  round = true,
) {
  if (round) {
    return (
      Math.round(background * (1 - alpha)) + Math.round(foreground * alpha)
    );
  }

  return background * (1 - alpha) + foreground * alpha;
}

function getAlphaColorSrgb(
  targetColor: string,
  backgroundColor: string,
  targetAlpha?: number,
) {
  const [r, g, b, a] = getAlphaColor(
    new Color(targetColor).to('srgb').coords,
    new Color(backgroundColor).to('srgb').coords,
    255,
    255,
    targetAlpha,
  );

  return formatHex(new Color('srgb', [r, g, b], a).toString({ format: 'hex' }));
}

function getAlphaColorP3(
  targetColor: string,
  backgroundColor: string,
  targetAlpha?: number,
) {
  const [r, g, b, a] = getAlphaColor(
    new Color(targetColor).to('p3').coords,
    new Color(backgroundColor).to('p3').coords,
    255,
    1000,
    targetAlpha,
  );

  return new Color('p3', [r, g, b], a)
    .toString({ precision: 4 })
    .replace('color(p3 ', 'color(display-p3 ');
}

function formatHex(str: string) {
  if (!str.startsWith('#')) {
    return str;
  }

  if (str.length === 4) {
    const hash = str.charAt(0);
    const r = str.charAt(1);
    const g = str.charAt(2);
    const b = str.charAt(3);
    return hash + r + r + g + g + b + b;
  }

  if (str.length === 5) {
    const hash = str.charAt(0);
    const r = str.charAt(1);
    const g = str.charAt(2);
    const b = str.charAt(3);
    const a = str.charAt(4);
    return hash + r + r + g + g + b + b + a + a;
  }

  return str;
}

const darkModeEasing = [1, 0, 1, 0] as [number, number, number, number];
const lightModeEasing = [0, 2, 0, 2] as [number, number, number, number];

function transposeProgressionStart(
  to: number,
  arr: number[],
  curve: [number, number, number, number],
) {
  return arr.map((n, i, arr) => {
    const lastIndex = arr.length - 1;
    const diff = arr[0] - to;
    const fn = BezierEasing(...curve);
    return n - diff * fn(1 - i / lastIndex);
  });
}

function toOklchString(color: Color) {
  const L = +(color.coords[0] * 100).toFixed(1);
  return color
    .to('oklch')
    .toString({ precision: 4 })
    .replace(/(\S+)(.+)/, `oklch(${L}%$2`);
}
