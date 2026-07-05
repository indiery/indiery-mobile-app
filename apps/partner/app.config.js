const appJson = require('./app.json');

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  appJson.expo.extra?.googleMapsApiKey ||
  '';

module.exports = () => ({
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    config: {
      ...(appJson.expo.android?.config || {}),
      ...(googleMapsApiKey ? { googleMaps: { apiKey: googleMapsApiKey } } : {})
    }
  },
  ios: {
    ...appJson.expo.ios,
    config: {
      ...(appJson.expo.ios?.config || {}),
      ...(googleMapsApiKey ? { googleMapsApiKey } : {})
    }
  },
  extra: {
    ...appJson.expo.extra,
    googleMapsApiKey
  }
});
