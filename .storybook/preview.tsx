import { useDarkMode } from 'storybook-dark-mode';
import { MantineProvider, ColorSchemeProvider } from '@mantine/core';
import React from 'react';

export const parameters = { layout: 'fullscreen' };

function ThemeWrapper(props: { children: React.ReactNode }) {
  return (
    <ColorSchemeProvider colorScheme="light" toggleColorScheme={() => {}}>
      <MantineProvider
        theme={{ colorScheme: useDarkMode() ? 'dark' : 'light' }}
        withGlobalStyles
        withNormalizeCSS
      >
        {props.children}
      </MantineProvider>
    </ColorSchemeProvider>
  );
}

export const decorators = [(renderStory: Function) => <ThemeWrapper>{renderStory()}</ThemeWrapper>];
