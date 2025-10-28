// utils.js
export function showSpinner() {
  document.getElementById('loading-spinner').style.display = 'block';
}

export function hideSpinner() {
  document.getElementById('loading-spinner').style.display = 'none';
}

let warningTimeout = null;

export function showWarning(message, persistent = false) {
  const warningPanel = document.getElementById('warning-panel');
  
  // Clear any existing warning timeout
  if (warningTimeout) {
    clearTimeout(warningTimeout);
    warningTimeout = null;
  }
  
  if (persistent) {
    warningPanel.style.display = 'block';
    warningPanel.textContent = message;
  } else {
    warningPanel.style.display = 'block';
    warningPanel.textContent = message;
    
    // Auto-hide after 3 seconds
    warningTimeout = setTimeout(() => {
      hideWarning();
    }, 3000);
  }
}

export function hideWarning() {
  const warningPanel = document.getElementById('warning-panel');
  warningPanel.style.display = 'none';
  warningPanel.textContent = '';
  
  // Clear the timeout if it exists
  if (warningTimeout) {
    clearTimeout(warningTimeout);
    warningTimeout = null;
  }
}

export function clearWarnings() {
  hideWarning();
}

export async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Retrying fetch ${url} (${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

export function getWeatherIcon(condition) {
  if (!condition || condition === 'Unknown') return '🌤️';
  condition = condition.toLowerCase();
  if (condition.includes('rain')) return '🌧️';
  if (condition.includes('snow')) return '❄️';
  if (condition.includes('cloud')) return '☁️';
  if (condition.includes('sun') || condition.includes('clear')) return '☀️';
  if (condition.includes('fog') || condition.includes('mist')) return '🌫️';
  if (condition.includes('storm')) return '⛈️';
  return '🌤️';
}

export function getCountryFlag(country) {
  if (!country) return '🌐';
  const flagMap = {
    'Nepal': '🇳🇵',
    'India': '🇮🇳',
    'China': '🇨🇳',
    'Bangladesh': '🇧🇩',
    'Pakistan': '🇵🇰'
  };
  return flagMap[country] || '📍';
}
export function getPressureTrendClass(change) {
  if (!change) return '';
  return change > 0 ? 'pressure-up' : 'pressure-down';
}

export function getPressureTrendSymbol(change) {
  if (!change) return '';
  return change > 0 ? '↑' : '↓';
}