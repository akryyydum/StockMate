export const colors = {
  boneWhite: '#ededef',
  burntYellow: '#dcad0c',
  pumpkinOrange: '#f86f0b',
  dirtyOrange: '#ce7505',
  ink: '#211d1a',
  muted: '#77716b',
  paper: '#fffefa',
  line: '#e5e0d9',
  danger: '#b42318',
};

export type ThemeMode = 'light' | 'dark';

export type ThemeColors = typeof colors & {
  background: string;
  surfaceSubtle: string;
  accentSoft: string;
  yellowSoft: string;
  orangeSoft: string;
  dangerSoft: string;
  statusInBackground: string;
  statusInText: string;
  statusLowBackground: string;
  statusLowText: string;
  statusOutBackground: string;
  statusOutText: string;
  overlay: string;
};

const lightTheme: ThemeColors = {
  ...colors,
  background: colors.boneWhite,
  surfaceSubtle: '#f5f2ee',
  accentSoft: '#fff0e5',
  yellowSoft: '#fbf2cf',
  orangeSoft: '#ffede3',
  dangerSoft: '#fbe8e5',
  statusInBackground: '#fbf2cf',
  statusInText: '#927200',
  statusLowBackground: '#ffede3',
  statusLowText: colors.dirtyOrange,
  statusOutBackground: '#fbe8e5',
  statusOutText: '#af4c40',
  overlay: 'rgba(33, 29, 26, 0.58)',
};

const darkTheme: ThemeColors = {
  ...colors,
  boneWhite: '#302b27',
  ink: '#f5eee7',
  muted: '#b7aaa0',
  paper: '#211d1a',
  line: '#403830',
  danger: '#ff8e82',
  background: '#171412',
  surfaceSubtle: '#302b27',
  accentSoft: '#492913',
  yellowSoft: '#493b13',
  orangeSoft: '#492913',
  dangerSoft: '#482321',
  statusInBackground: '#493b13',
  statusInText: '#f2d46d',
  statusLowBackground: '#492913',
  statusLowText: '#ff9c5e',
  statusOutBackground: '#482321',
  statusOutText: '#ff9d93',
  overlay: 'rgba(0, 0, 0, 0.72)',
};

export function getThemeColors(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? darkTheme : lightTheme;
}

export const fontFamilies = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};
