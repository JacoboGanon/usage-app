import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.usage-app.desktop',
  productName: 'Usage Console',
  directories: {
    buildResources: 'resources',
    output: 'dist'
  },
  files: [
    'out/**/*',
    '!out/**/*.map'
  ],
  mac: {
    category: 'public.app-category.developer-tools',
    icon: 'resources/icon.icns',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ],
    entitlements: 'resources/entitlements.mac.plist',
    entitlementsInherit: 'resources/entitlements.mac.plist',
    hardenedRuntime: true,
    gatekeeperAssess: false
  },
  dmg: {
    contents: [
      {
        x: 130,
        y: 220
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications'
      }
    ]
  },
  win: {
    icon: 'resources/icon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      },
      {
        target: 'portable',
        arch: ['x64']
      }
    ]
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },
  linux: {
    icon: 'resources/icon.png',
    category: 'Development',
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      },
      {
        target: 'rpm',
        arch: ['x64']
      }
    ]
  },
  publish: {
    provider: 'github',
    releaseType: 'release'
  }
}

export default config
