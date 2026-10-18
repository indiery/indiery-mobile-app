let googleMapsPromise;

export function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps is only available in the browser."));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (googleMapsPromise) return googleMapsPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return Promise.reject(new Error("Google Maps is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY."));

  googleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = `__indieryGoogleMapsReady_${Date.now()}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      delete window[callbackName];
      googleMapsPromise = null;
      reject(new Error("Google Maps did not finish loading. Check the Maps JavaScript API key and enabled APIs."));
    }, 15000);
    window[callbackName] = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      resolve(window.google.maps);
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}&v=weekly`;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      googleMapsPromise = null;
      reject(new Error("Google Maps could not load. Check network access and the browser API key."));
    };
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}
