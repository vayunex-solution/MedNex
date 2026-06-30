import { createTheme, type ThemeOptions } from '@mui/material/styles';

const palette = {
  primary: {
    main: '#1565C0',
    light: '#1976D2',
    dark: '#0D47A1',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#0288D1',
    light: '#03A9F4',
    dark: '#01579B',
    contrastText: '#ffffff',
  },
  success: { main: '#2E7D32', light: '#43A047', dark: '#1B5E20' },
  warning: { main: '#F57F17', light: '#FB8C00', dark: '#E65100' },
  error: { main: '#C62828', light: '#EF5350', dark: '#B71C1C' },
  info: { main: '#0277BD', light: '#0288D1', dark: '#01579B' },
};

const commonOptions: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, fontSize: '2rem' },
    h2: { fontWeight: 700, fontSize: '1.75rem' },
    h3: { fontWeight: 600, fontSize: '1.5rem' },
    h4: { fontWeight: 600, fontSize: '1.25rem' },
    h5: { fontWeight: 600, fontSize: '1.1rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    subtitle1: { fontWeight: 500 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
        },
        contained: { padding: '8px 20px' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          '&:hover': { boxShadow: '0 4px 24px rgba(0,0,0,0.12)' },
          transition: 'box-shadow 0.3s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 16 },
        elevation1: { boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': { fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
    },
    MuiTab: {
      styleOverrides: { root: { fontWeight: 600, textTransform: 'none' } },
    },
  },
};

export const lightTheme = createTheme({
  ...commonOptions,
  palette: {
    mode: 'light',
    ...palette,
    background: { default: '#F4F6FA', paper: '#FFFFFF' },
    text: { primary: '#1A2332', secondary: '#637381' },
    divider: 'rgba(0,0,0,0.08)',
  },
  components: {
    ...commonOptions.components,
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#1A2332',
          boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(180deg, #0D47A1 0%, #1565C0 40%, #1976D2 100%)',
          color: '#FFFFFF',
          borderRight: 'none',
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  ...commonOptions,
  palette: {
    mode: 'dark',
    ...palette,
    background: { default: '#0F1923', paper: '#1A2637' },
    text: { primary: '#E8EDF5', secondary: '#8FA3B8' },
    divider: 'rgba(255,255,255,0.08)',
  },
  components: {
    ...commonOptions.components,
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1A2637',
          boxShadow: '0 1px 8px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(180deg, #0A1628 0%, #0D2040 100%)',
          color: '#E8EDF5',
          borderRight: 'none',
        },
      },
    },
  },
});
