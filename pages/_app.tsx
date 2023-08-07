import { useState } from 'react';
import NextApp, { AppProps, AppContext } from 'next/app';
import { getCookie, setCookie } from 'cookies-next';
import Head from 'next/head';
import { Group, Stack, Anchor, MantineProvider, ColorScheme, ColorSchemeProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

export default function App(props: AppProps & { colorScheme: ColorScheme }) {
  const { Component, pageProps } = props;
  const [colorScheme, setColorScheme] = useState<ColorScheme>(props.colorScheme);

  const toggleColorScheme = (value?: ColorScheme) => {
    const nextColorScheme = value || (colorScheme === 'dark' ? 'light' : 'dark');
    setColorScheme(nextColorScheme);
    setCookie('mantine-color-scheme', nextColorScheme, { maxAge: 60 * 60 * 24 * 30 });
  };

  return (
    <>
      <Head>
        <title>Kaspa Breakeven Calculator</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
        <link rel="shortcut icon" href="/favicon.svg" />
      </Head>

      <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
        <MantineProvider theme={{ colorScheme }} withGlobalStyles withNormalizeCSS>
          <Component {...pageProps} />
          <Notifications />
        </MantineProvider>

        <Group position='center'>
          <Stack align='center'>
            <Anchor href="https://github.com/coderofstuff/kas-breakeven-calc" target="_blank" size={'xs'}>
              kas-breakeven-calc by coderofstuff
            </Anchor>
            <Anchor href="https://explorer.kaspa.org/addresses/kaspa:qpfp8gzttv5c356p8cdj0kv56py4n29w97prxrav65m0zpn58yuaz3awck5vl?page=1" target="_blank" size={'xs'}>
              Found this useful? Donate here
            </Anchor>
          </Stack>
        </Group>
      </ColorSchemeProvider>
    </>
  );
}

App.getInitialProps = async (appContext: AppContext) => {
  const appProps = await NextApp.getInitialProps(appContext);
  return {
    ...appProps,
    colorScheme: getCookie('mantine-color-scheme', appContext.ctx) || 'dark',
  };
};
