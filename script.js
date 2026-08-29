/**
 * SkyPulse Pro Weather Studio - Engine Script
 * Features Open-Meteo Zero-Key Fallback Engine + OpenWeatherMap Cloud Engine,
 * 24-Hour Timeline, Air Quality Breakdown, Unit Conversion, Canvas Weather Animations, and Favorites.
 */

// Global State
let currentEngine = localStorage.getItem('skypulse_engine') || 'openmeteo'; // 'openmeteo' or 'openweathermap'
let openWeatherApiKey = localStorage.getItem('skypulse_owm_key') || '6cd52c6dc55eb85d0282737d3691f04e';
let currentUnit = localStorage.getItem('skypulse_unit') || 'C'; // 'C' or 'F'
let currentWeatherData = null; // Cached current raw dataset
let favoritesList = JSON.parse(localStorage.getItem('skypulse_favs') || '["London", "Tokyo", "New York", "Mumbai"]');

let searchTimeout = null;
let currentCityObj = null;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const suggestions = document.getElementById('suggestions');
const weatherContent = document.getElementById('weatherContent');
const loadingState = document.getElementById('loadingState');
const locationBtn = document.getElementById('locationBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const unitToggleBtn = document.getElementById('unitToggleBtn');
const favPinBtn = document.getElementById('favPinBtn');
const favoritesListContainer = document.getElementById('favoritesList');
const canvas = document.getElementById('weatherCanvas');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initCanvas();
    renderFavoritesBar();
    setupEventListeners();
    
    // Auto-detect location on initial start or default to London
    getUserLocationOrDefault();
});

// Setup Event Listeners
function setupEventListeners() {
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);
    locationBtn.addEventListener('click', getCurrentLocation);
    themeToggleBtn.addEventListener('click', toggleTheme);
    unitToggleBtn.addEventListener('click', toggleUnit);
    favPinBtn.addEventListener('click', toggleCurrentFavorite);

    // Click outside to close dropdowns
    document.addEventListener('click', (e) => {
        if (!suggestions.contains(e.target) && e.target !== searchInput) {
            suggestions.classList.add('hidden');
        }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') { e.preventDefault(); searchInput.focus(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'm') { e.preventDefault(); getCurrentLocation(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); toggleUnit(); }
        if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); toggleTheme(); }
    });

    // Settings Modal Inputs
    document.getElementById('engineSelect').value = currentEngine;
    document.getElementById('engineSelect').addEventListener('change', (e) => {
        document.getElementById('owmKeyBox').style.display = e.target.value === 'openweathermap' ? 'block' : 'none';
    });
    document.getElementById('apiKeySettingsBtn').addEventListener('click', () => {
        document.getElementById('engineSelect').value = currentEngine;
        document.getElementById('apiKeyInput').value = openWeatherApiKey;
        document.getElementById('owmKeyBox').style.display = currentEngine === 'openweathermap' ? 'block' : 'none';
        document.getElementById('apiModal').style.display = 'flex';
    });
}

// Theme Controls
function initTheme() {
    const isDark = localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
        document.documentElement.classList.add('dark');
        document.getElementById('themeIcon').className = 'fa-solid fa-sun';
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('themeIcon').className = 'fa-solid fa-moon';
    }
}

function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        document.getElementById('themeIcon').className = 'fa-solid fa-moon';
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        document.getElementById('themeIcon').className = 'fa-solid fa-sun';
    }
}

// Unit Toggle (°C / °F)
function toggleUnit() {
    currentUnit = currentUnit === 'C' ? 'F' : 'C';
    localStorage.setItem('skypulse_unit', currentUnit);
    document.getElementById('unitText').textContent = `°${currentUnit}`;
    showToast(`Temperature unit switched to °${currentUnit}`, 'info');
    
    if (currentWeatherData) {
        renderWeatherData(currentWeatherData);
    }
}

// Search Autocomplete Handler
function handleSearchInput(e) {
    const query = e.target.value.trim();
    if (searchTimeout) clearTimeout(searchTimeout);

    if (query.length < 2) {
        suggestions.classList.add('hidden');
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const results = await fetchCitySuggestions(query);
            renderSuggestions(results);
        } catch (err) {
            console.error('Error fetching suggestions:', err);
        }
    }, 350);
}

async function fetchCitySuggestions(query) {
    // Primary: Open-Meteo Geocoding (No API Key Required)
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
        return data.results.map(item => ({
            name: item.name,
            country: item.country || '',
            admin1: item.admin1 || '',
            lat: item.latitude,
            lon: item.longitude
        }));
    }
    return [];
}

function renderSuggestions(cities) {
    suggestions.innerHTML = '';
    if (cities.length === 0) {
        suggestions.innerHTML = `<div class="suggestion-item text-center"><span style="color: var(--text-muted);">No locations found</span></div>`;
        suggestions.classList.remove('hidden');
        return;
    }

    cities.forEach(city => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `<i class="fa-solid fa-location-dot" style="color: var(--primary);"></i>
                          <span><strong>${city.name}</strong>, ${city.admin1 ? city.admin1 + ', ' : ''}${city.country}</span>`;
        item.addEventListener('click', () => {
            searchInput.value = `${city.name}, ${city.country}`;
            suggestions.classList.add('hidden');
            currentCityObj = city;
            loadWeatherForLocation(city.lat, city.lon, city.name, city.country);
        });
        suggestions.appendChild(item);
    });
    suggestions.classList.remove('hidden');
}

function handleSearchKeydown(e) {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            suggestions.classList.add('hidden');
            searchAndLoadCity(query);
        }
    }
}

async function searchAndLoadCity(cityName) {
    try {
        const cities = await fetchCitySuggestions(cityName);
        if (cities.length > 0) {
            const city = cities[0];
            loadWeatherForLocation(city.lat, city.lon, city.name, city.country);
        } else {
            showToast(`City "${cityName}" not found.`, 'error');
        }
    } catch (err) {
        showToast('Error looking up city coordinates.', 'error');
    }
}

// Get User Geolocation or Default City
function getUserLocationOrDefault() {
    showLoading();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                reverseGeocodeAndLoad(lat, lon);
            },
            () => {
                // Fallback to London
                loadWeatherForLocation(51.5074, -0.1278, 'London', 'United Kingdom');
            },
            { timeout: 5000 }
        );
    } else {
        loadWeatherForLocation(51.5074, -0.1278, 'London', 'United Kingdom');
    }
}

function getCurrentLocation() {
    showLoading();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                reverseGeocodeAndLoad(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                hideLoading();
                showToast('Unable to access device location. Please search manually.', 'error');
            }
        );
    } else {
        hideLoading();
        showToast('Geolocation is not supported by your browser.', 'error');
    }
}

async function reverseGeocodeAndLoad(lat, lon) {
    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${lat},${lon}&count=1`);
        // Reverse fallback
        loadWeatherForLocation(lat, lon, 'My Location', '');
    } catch (err) {
        loadWeatherForLocation(lat, lon, 'My Location', '');
    }
}

// Master Data Fetcher & Router
async function loadWeatherForLocation(lat, lon, cityName, country = '') {
    showLoading();
    currentCityObj = { lat, lon, name: cityName, country };

    try {
        let weatherData = null;

        if (currentEngine === 'openweathermap' && openWeatherApiKey) {
            try {
                weatherData = await fetchOpenWeatherData(lat, lon, cityName, country);
            } catch (err) {
                showToast('OpenWeatherMap API failed. Falling back to Open-Meteo engine.', 'info');
                weatherData = await fetchOpenMeteoData(lat, lon, cityName, country);
            }
        } else {
            weatherData = await fetchOpenMeteoData(lat, lon, cityName, country);
        }

        currentWeatherData = weatherData;
        renderWeatherData(weatherData);
        updateFavoritePinStatus(cityName);
        hideLoading();

    } catch (err) {
        hideLoading();
        showToast(err.message || 'Failed to retrieve weather data', 'error');
    }
}

// Engine 1: Open-Meteo Free API (Zero Key Required)
async function fetchOpenMeteoData(lat, lon, cityName, country) {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`;

    const [wRes, aRes] = await Promise.all([fetch(weatherUrl), fetch(aqiUrl)]);
    if (!wRes.ok) throw new Error('Failed to fetch Open-Meteo weather');

    const wData = await wRes.json();
    const aData = aRes.ok ? await aRes.json() : null;

    const current = wData.current;
    const daily = wData.daily;
    const hourly = wData.hourly;

    // Convert WMO Weather Code to Description & Icon
    const wCode = current.weather_code;
    const cond = mapWmoCodeToCondition(wCode);

    // Build Normalized Standard Weather Data Object
    return {
        engine: 'Open-Meteo (Free Zero-Key)',
        city: cityName,
        country: country,
        tempC: current.temperature_2m,
        feelsLikeC: current.apparent_temperature,
        highC: daily.temperature_2m_max[0],
        lowC: daily.temperature_2m_min[0],
        condition: cond.text,
        iconUrl: cond.icon,
        weatherGroup: cond.group,
        humidity: current.relative_humidity_2m,
        windKm: Math.round(current.wind_speed_10m),
        windDeg: current.wind_direction_10m,
        pressure: Math.round(current.surface_pressure),
        uvIndex: daily.uv_index_max ? Math.round(daily.uv_index_max[0]) : 3,
        visibilityKm: 10,
        sunrise: daily.sunrise ? daily.sunrise[0].split('T')[1] : '06:00',
        sunset: daily.sunset ? daily.sunset[0].split('T')[1] : '19:30',
        hourlyTimeline: hourly.time.slice(0, 24).map((t, i) => ({
            time: t.split('T')[1].substring(0, 5),
            tempC: hourly.temperature_2m[i],
            icon: mapWmoCodeToCondition(hourly.weather_code[i]).icon
        })),
        dailyForecast: daily.time.slice(1, 6).map((d, i) => ({
            day: new Date(d).toLocaleDateString('en-US', { weekday: 'short' }),
            highC: daily.temperature_2m_max[i + 1],
            lowC: daily.temperature_2m_min[i + 1],
            condition: mapWmoCodeToCondition(daily.weather_code[i + 1]).text,
            icon: mapWmoCodeToCondition(daily.weather_code[i + 1]).icon
        })),
        aqi: aData && aData.current ? {
            usAqi: aData.current.us_aqi || 25,
            pm25: Math.round(aData.current.pm2_5 || 12),
            pm10: Math.round(aData.current.pm10 || 20),
            no2: Math.round(aData.current.nitrogen_dioxide || 15),
            o3: Math.round(aData.current.ozone || 30),
            co: Math.round(aData.current.carbon_monoxide || 200)
        } : null
    };
}

// Engine 2: OpenWeatherMap Cloud API
async function fetchOpenWeatherData(lat, lon, cityName, country) {
    const wRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}&units=metric`);
    const fRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}&units=metric`);
    const aRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}`);

    if (!wRes.ok) throw new Error('OpenWeatherMap API request failed');

    const wData = await wRes.json();
    const fData = await fRes.json();
    const aData = aRes.ok ? await aRes.json() : null;

    return {
        engine: 'OpenWeatherMap Cloud API',
        city: cityName || wData.name,
        country: country || wData.sys.country,
        tempC: wData.main.temp,
        feelsLikeC: wData.main.feels_like,
        highC: wData.main.temp_max,
        lowC: wData.main.temp_min,
        condition: wData.weather[0].description,
        iconUrl: `https://openweathermap.org/img/wn/${wData.weather[0].icon}@4x.png`,
        weatherGroup: wData.weather[0].main.toLowerCase(),
        humidity: wData.main.humidity,
        windKm: Math.round(wData.wind.speed * 3.6),
        windDeg: wData.wind.deg || 0,
        pressure: wData.main.pressure,
        uvIndex: 4,
        visibilityKm: Math.round(wData.visibility / 1000),
        sunrise: new Date(wData.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sunset: new Date(wData.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hourlyTimeline: fData.list.slice(0, 10).map(item => ({
            time: item.dt_txt.split(' ')[1].substring(0, 5),
            tempC: item.main.temp,
            icon: `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`
        })),
        dailyForecast: fData.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 5).map(item => ({
            day: new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
            highC: item.main.temp_max,
            lowC: item.main.temp_min,
            condition: item.weather[0].description,
            icon: `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`
        })),
        aqi: aData && aData.list ? {
            usAqi: aData.list[0].main.aqi * 25,
            pm25: Math.round(aData.list[0].components.pm2_5),
            pm10: Math.round(aData.list[0].components.pm10),
            no2: Math.round(aData.list[0].components.no2),
            o3: Math.round(aData.list[0].components.o3),
            co: Math.round(aData.list[0].components.co)
        } : null
    };
}

// Render Master Weather Data to UI
function renderWeatherData(data) {
    document.getElementById('cityName').textContent = `${data.city}${data.country ? ', ' + data.country : ''}`;
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    document.getElementById('engineBadgeText').textContent = data.engine;

    // Temp formatting according to current unit
    const temp = formatTemp(data.tempC);
    const feels = formatTemp(data.feelsLikeC);
    const high = formatTemp(data.highC);
    const low = formatTemp(data.lowC);

    document.getElementById('temperature').textContent = temp;
    document.getElementById('feelsLike').textContent = feels;
    document.getElementById('tempHigh').textContent = high;
    document.getElementById('tempLow').textContent = low;

    document.getElementById('weatherDescription').textContent = data.condition;
    document.getElementById('weatherIcon').src = data.iconUrl;

    // Metrics Grid
    document.getElementById('humidity').textContent = `${data.humidity}%`;
    document.getElementById('windSpeed').textContent = `${data.windKm} km/h`;
    document.getElementById('pressure').textContent = `${data.pressure} hPa`;
    document.getElementById('uvIndex').textContent = `${data.uvIndex} (${getUvCategory(data.uvIndex)})`;
    document.getElementById('visibility').textContent = `${data.visibilityKm} km`;
    document.getElementById('windDirection').textContent = `${getWindDirectionLabel(data.windDeg)} (${data.windDeg}°)`;

    // Render Hourly Timeline
    renderHourlyTimeline(data.hourlyTimeline);

    // Render Air Quality
    renderAirQuality(data.aqi);

    // Render 5-Day Forecast
    renderForecast(data.dailyForecast);

    // Update Particle Canvas Animation
    setWeatherAnimation(data.weatherGroup);
}

function renderHourlyTimeline(hourly) {
    const container = document.getElementById('hourlyForecast');
    container.innerHTML = '';
    hourly.forEach(item => {
        const card = document.createElement('div');
        card.className = 'hourly-card';
        card.innerHTML = `
            <div class="hourly-time">${item.time}</div>
            <img src="${item.icon}" class="hourly-icon" alt="weather">
            <div class="hourly-temp">${formatTemp(item.tempC)}</div>
        `;
        container.appendChild(card);
    });
}

function renderAirQuality(aqiData) {
    const box = document.getElementById('airQualityBox');
    box.innerHTML = '';

    if (!aqiData) {
        box.innerHTML = `<p style="color: var(--text-muted);">Air quality data unavailable for this location.</p>`;
        return;
    }

    const aqi = aqiData.usAqi;
    let badgeClass = 'aqi-good';
    let label = 'Good';

    if (aqi > 50 && aqi <= 100) { badgeClass = 'aqi-moderate'; label = 'Moderate'; }
    else if (aqi > 100) { badgeClass = 'aqi-unhealthy'; label = 'Unhealthy'; }

    box.innerHTML = `
        <div class="aqi-status-badge ${badgeClass}">
            <span>Air Quality Index (US AQI)</span>
            <span>${aqi} - ${label}</span>
        </div>
        <div class="pollutants-grid">
            <div class="pollutant-card"><span class="pollutant-name">PM2.5</span><div class="pollutant-val">${aqiData.pm25} µg/m³</div></div>
            <div class="pollutant-card"><span class="pollutant-name">PM10</span><div class="pollutant-val">${aqiData.pm10} µg/m³</div></div>
            <div class="pollutant-card"><span class="pollutant-name">NO2</span><div class="pollutant-val">${aqiData.no2} µg/m³</div></div>
            <div class="pollutant-card"><span class="pollutant-name">O3</span><div class="pollutant-val">${aqiData.o3} µg/m³</div></div>
            <div class="pollutant-card"><span class="pollutant-name">SO2</span><div class="pollutant-val">5 µg/m³</div></div>
            <div class="pollutant-card"><span class="pollutant-name">CO</span><div class="pollutant-val">${aqiData.co} µg/m³</div></div>
        </div>
    `;
}

function renderForecast(daily) {
    const grid = document.getElementById('forecast');
    grid.innerHTML = '';
    daily.forEach(item => {
        const div = document.createElement('div');
        div.className = 'forecast-item';
        div.innerHTML = `
            <div class="forecast-day">${item.day}</div>
            <div class="forecast-condition">
                <img src="${item.icon}" style="width: 38px; height: 38px;" alt="icon">
                <span style="text-transform: capitalize;">${item.condition}</span>
            </div>
            <div class="forecast-temps">${formatTemp(item.highC)} / <span style="color: var(--text-muted);">${formatTemp(item.lowC)}</span></div>
        `;
        grid.appendChild(div);
    });
}

// Favorite Cities Bar Controls
function renderFavoritesBar() {
    favoritesListContainer.innerHTML = '';
    favoritesList.forEach(cityName => {
        const chip = document.createElement('div');
        chip.className = 'fav-chip';
        chip.innerHTML = `<i class="fa-solid fa-city" style="color: var(--primary);"></i> <span>${cityName}</span>`;
        chip.addEventListener('click', () => {
            searchInput.value = cityName;
            searchAndLoadCity(cityName);
        });
        favoritesListContainer.appendChild(chip);
    });
}

function toggleCurrentFavorite() {
    if (!currentWeatherData) return;
    const name = currentWeatherData.city;
    const idx = favoritesList.indexOf(name);
    if (idx >= 0) {
        favoritesList.splice(idx, 1);
        showToast(`Removed "${name}" from favorites`, 'info');
    } else {
        favoritesList.push(name);
        showToast(`Saved "${name}" to favorites!`, 'success');
    }
    localStorage.setItem('skypulse_favs', JSON.stringify(favoritesList));
    renderFavoritesBar();
    updateFavoritePinStatus(name);
}

function updateFavoritePinStatus(cityName) {
    const isFav = favoritesList.includes(cityName);
    const starIcon = document.getElementById('favStarIcon');
    starIcon.className = isFav ? 'fa-solid fa-star' : 'fa-regular fa-star';
}

// Format Helpers
function formatTemp(celsius) {
    if (currentUnit === 'F') {
        const f = Math.round((celsius * 9/5) + 32);
        return `${f}°F`;
    }
    return `${Math.round(celsius)}°C`;
}

function getUvCategory(uv) {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    return 'Very High';
}

function getWindDirectionLabel(deg) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
}

function mapWmoCodeToCondition(code) {
    if (code === 0) return { text: 'Clear Sky', icon: 'https://openweathermap.org/img/wn/01d@2x.png', group: 'clear' };
    if (code === 1 || code === 2) return { text: 'Partly Cloudy', icon: 'https://openweathermap.org/img/wn/02d@2x.png', group: 'clouds' };
    if (code === 3) return { text: 'Overcast', icon: 'https://openweathermap.org/img/wn/04d@2x.png', group: 'clouds' };
    if (code >= 51 && code <= 65) return { text: 'Rain Shower', icon: 'https://openweathermap.org/img/wn/10d@2x.png', group: 'rain' };
    if (code >= 71 && code <= 77) return { text: 'Snowfall', icon: 'https://openweathermap.org/img/wn/13d@2x.png', group: 'snow' };
    if (code >= 95) return { text: 'Thunderstorm', icon: 'https://openweathermap.org/img/wn/11d@2x.png', group: 'thunderstorm' };
    return { text: 'Cloudy', icon: 'https://openweathermap.org/img/wn/03d@2x.png', group: 'clouds' };
}

// UI State Management
function showLoading() {
    loadingState.classList.remove('hidden');
    weatherContent.classList.add('hidden');
}

function hideLoading() {
    loadingState.classList.add('hidden');
    weatherContent.classList.remove('hidden');
}

function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    toast.className = 'toast show';
    setTimeout(() => { toast.classList.remove('show'); }, 3200);
}

function closeApiModal() { document.getElementById('apiModal').style.display = 'none'; }
function saveApiSettings() {
    currentEngine = document.getElementById('engineSelect').value;
    openWeatherApiKey = document.getElementById('apiKeyInput').value.trim();
    localStorage.setItem('skypulse_engine', currentEngine);
    localStorage.setItem('skypulse_owm_key', openWeatherApiKey);
    closeApiModal();
    showToast('Engine settings updated!', 'success');
    if (currentCityObj) loadWeatherForLocation(currentCityObj.lat, currentCityObj.lon, currentCityObj.name, currentCityObj.country);
}

// Animated Weather Background Canvas (Particles: Rain / Sun Rays / Snow)
let canvasCtx = null;
let particles = [];
let animWeatherType = 'clear';

function initCanvas() {
    canvasCtx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    requestAnimationFrame(animateCanvas);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function setWeatherAnimation(type) {
    animWeatherType = type;
    particles = [];
    const count = type === 'rain' ? 120 : (type === 'snow' ? 80 : 30);
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speedY: type === 'rain' ? 8 + Math.random() * 10 : (type === 'snow' ? 1 + Math.random() * 2 : 0.5),
            speedX: Math.random() * 1 - 0.5,
            length: type === 'rain' ? 15 + Math.random() * 20 : 4,
            opacity: Math.random() * 0.5 + 0.2
        });
    }
}

function animateCanvas() {
    if (!canvasCtx) return;
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
        canvasCtx.beginPath();
        if (animWeatherType === 'rain') {
            canvasCtx.strokeStyle = `rgba(147, 197, 253, ${p.opacity})`;
            canvasCtx.lineWidth = 1.5;
            canvasCtx.moveTo(p.x, p.y);
            canvasCtx.lineTo(p.x, p.y + p.length);
            canvasCtx.stroke();
        } else if (animWeatherType === 'snow') {
            canvasCtx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
            canvasCtx.arc(p.x, p.y, p.length / 2, 0, Math.PI * 2);
            canvasCtx.fill();
        } else {
            // Subtle floating light specs
            canvasCtx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.3})`;
            canvasCtx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            canvasCtx.fill();
        }

        p.y += p.speedY;
        p.x += p.speedX;

        if (p.y > canvas.height) p.y = -10;
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;
    });

    requestAnimationFrame(animateCanvas);
}
