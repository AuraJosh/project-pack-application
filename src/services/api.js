import axios from 'axios';

const USE_EMULATOR = false; // Set to true if you are running 'firebase emulators:start'
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const FUNCTIONS_BASE_URL = (isLocal && USE_EMULATOR)
  ? 'http://127.0.0.1:5001/project-pack-app/us-central1'
  : 'https://us-central1-project-pack-app.cloudfunctions.net';

export const scrapePlanning = async (url) => {
  const response = await axios.post(`${FUNCTIONS_BASE_URL}/scrapePlanningData`, { url });
  return response.data;
};

export const scrapePropertyImage = async (url) => {
  const response = await axios.post(`${FUNCTIONS_BASE_URL}/scrapePropertyImage`, { url });
  return response.data;
};

// Google Maps Static API Helper
export const getAerialMapUrl = (address, apiKey) => {
  const finalKey = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const encodedAddress = encodeURIComponent(address);
  return `https://maps.googleapis.com/maps/api/staticmap?center=${encodedAddress}&zoom=20&size=600x400&maptype=satellite&key=${finalKey}`;
};
