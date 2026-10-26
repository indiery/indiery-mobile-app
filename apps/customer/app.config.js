const appJson = require('./app.base.json');

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  appJson.expo.extra?.googleMapsApiKey ||
  '';
const publicWebBaseUrl = (
  process.env.EXPO_PUBLIC_WEB_URL ||
  appJson.expo.extra?.publicWebBaseUrl ||
  'https://www.indiery.com'
).replace(/\/$/, '');

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
    googleMapsApiKey,
    publicWebBaseUrl
  }
});
