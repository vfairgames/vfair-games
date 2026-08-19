import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  outDir: '../../dist/apps/partner-docs',
  server: {
    port: 4600,
    host: 'localhost',
  },
  preview: {
    port: 4600,
    host: 'localhost',
  },
  integrations: [
    starlight({
      title: 'VFair Docs',
      description: 'Integrate VFair games into your platform',
      favicon: '/img/favicon.png',
      logo: {
        src: './src/assets/logo.png',
        alt: 'VFair',
        replacesTitle: true,
      },
      customCss: ['./src/styles/custom.css'],
      pagination: true,
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 3,
      },
      expressiveCode: {
        themes: ['github-light', 'github-dark'],
        useStarlightDarkModeSwitch: true,
        useStarlightUiThemeColors: true,
        emitExternalStylesheet: false,
        styleOverrides: {
          borderRadius: '0.5rem',
        },
      },
      sidebar: [
        { label: 'Overview', slug: 'index' },
        { label: 'Authorization', slug: 'authorization' },
        { label: 'Launch game', slug: 'launch-url' },
        { label: 'Wallet API', slug: 'wallet-api' },
        { label: 'API reference', slug: 'api-reference' },
      ],
    }),
  ],
});
