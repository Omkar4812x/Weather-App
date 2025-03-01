// API Configuration
const API_KEY = 'Your_api_kay'; // Replace with your OpenWeatherMap API key
const WEATHER_API_URL = 'Your_Weather_Api_URL';
const GEO_API_URL = 'Your_Geo_API_URL';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const suggestions = document.getElementById('suggestions');
const weatherContent = document.getElementById('weatherContent');
const loadingSkeleton = document.getElementById('loadingSkeleton');
const errorMessage = document.getElementById('errorMessage');
const locationBtn = document.getElementById('locationBtn');
const themeToggle = document.getElementById('themeToggle');

// Initialize theme
if (localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
}

// Event Listeners
searchInput.addEventListener('input', handleSearchInput);
searchInput.addEventListener('keydown', handleSearchKeydown);
locationBtn.addEventListener('click', getCurrentLocation);
themeToggle.addEventListener('click', toggleTheme);

// Global keyboard shortcuts
document.addEventListener('keydown', handleGlobalKeydown);

// Mouse events for suggestions
document.addEventListener('click', handleClickOutside);

let searchTimeout = null;

// Theme Toggle
function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}

// Search Handling
async function handleSearchInput(e) {
    const searchTerm = e.target.value.trim();
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (searchTerm.length < 2) {
        suggestions.classList.add('hidden');
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        try {
            showLoadingState();
            const response = await fetch(
                `${GEO_API_URL}/direct?q=${encodeURIComponent(searchTerm)}&limit=5&appid=${API_KEY}`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch suggestions');
            }
            
            const cities = await response.json();
            
            if (cities.length === 0) {
                suggestions.innerHTML = `
                    <div class="suggestion-item text-center py-4">
                        <p class="text-gray-500">No cities found</p>
                    </div>
                `;
                suggestions.classList.remove('hidden');
                return;
            }
            
            updateSuggestions(cities);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            showError('Failed to fetch city suggestions. Please try again.');
        } finally {
            hideLoadingState();
        }
    }, 500);
}

function updateSuggestions(cities) {
    const suggestions = document.getElementById('suggestions');
    suggestions.innerHTML = '';
    
    if (cities.length > 0) {
        cities.forEach((city, index) => {
            const div = document.createElement('div');
            div.className = 'suggestion-item px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors';
            div.textContent = `${city.name}, ${city.state ? city.state : ''} ${city.country}`;
            
            div.addEventListener('mouseenter', () => {
                // Remove selection from all items
                suggestions.querySelectorAll('.suggestion-item').forEach(item => {
                    item.classList.remove('selected');
                });
                // Add selection to current item
                div.classList.add('selected');
            });
            
            div.addEventListener('click', () => {
                searchInput.value = `${city.name}, ${city.state ? city.state : ''} ${city.country}`;
                getWeatherData(city.lat, city.lon, city.name);
                suggestions.classList.add('hidden');
            });
            
            suggestions.appendChild(div);
        });
        suggestions.classList.remove('hidden');
    } else {
        suggestions.classList.add('hidden');
    }
}

// Weather Data Handling
async function getWeatherData(lat, lon, cityName) {
    showLoadingState();
    try {
        const [weatherResponse, airQualityResponse] = await Promise.all([
            fetch(`${WEATHER_API_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
            fetch(`${WEATHER_API_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
        ]);

        if (!weatherResponse.ok || !airQualityResponse.ok) {
            throw new Error('Failed to fetch weather data');
        }

        const weatherData = await weatherResponse.json();
        const airQualityData = await airQualityResponse.json();

        displayWeatherData(weatherData, cityName);
        displayAirQuality(airQualityData);
        getForecast(lat, lon);
        
        weatherContent.classList.remove('hidden');
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Failed to fetch weather data');
    }
}

function displayWeatherData(data, cityName) {
    document.getElementById('cityName').textContent = cityName;
    document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°C`;
    document.getElementById('weatherDescription').textContent = data.weather[0].description;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${data.wind.speed} m/s`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    document.getElementById('feelsLike').textContent = `${Math.round(data.main.feels_like)}°C`;
    
    const weatherIcon = document.getElementById('weatherIcon');
    weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
    weatherIcon.alt = data.weather[0].description;

    document.getElementById('date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    updateWeatherTheme(data.weather[0].main.toLowerCase());
}

function displayAirQuality(data) {
    const aqi = data.list[0].main.aqi;
    const pollutants = data.list[0].components;
    const aqiDiv = document.getElementById('airQuality');
    
    const aqiClasses = {
        1: 'aqi-good',
        2: 'aqi-moderate',
        3: 'aqi-unhealthy',
        4: 'aqi-very-unhealthy',
        5: 'aqi-very-unhealthy'
    };
    
    const aqiLabels = {
        1: 'Good',
        2: 'Moderate',
        3: 'Unhealthy for Sensitive Groups',
        4: 'Unhealthy',
        5: 'Very Unhealthy'
    };
    
    aqiDiv.innerHTML = `
        <div class="p-4 rounded-lg ${aqiClasses[aqi]}">
            <h4 class="font-semibold mb-2">Air Quality Index</h4>
            <p class="text-2xl font-bold">${aqiLabels[aqi]}</p>
        </div>
    `;
    
    Object.entries(pollutants).forEach(([key, value]) => {
        aqiDiv.innerHTML += `
            <div class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                <h4 class="font-semibold mb-2">${key.toUpperCase()}</h4>
                <p class="text-2xl font-bold">${Math.round(value)} µg/m³</p>
            </div>
        `;
    });
}

async function getForecast(lat, lon) {
    try {
        const response = await fetch(
            `${WEATHER_API_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch forecast data');
        }
        
        const data = await response.json();
        displayForecast(data.list);
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to fetch forecast data');
    }
}

function displayForecast(forecastData) {
    const forecastDiv = document.getElementById('forecast');
    forecastDiv.innerHTML = '';
    
    const dailyData = forecastData.filter(item => item.dt_txt.includes('12:00:00'));
    
    dailyData.slice(0, 5).forEach(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        forecastDiv.innerHTML += `
            <div class="forecast-card text-center">
                <h4 class="font-semibold text-gray-800 dark:text-white">${dayName}</h4>
                <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" 
                     alt="${day.weather[0].description}"
                     class="w-16 h-16 mx-auto">
                <p class="text-2xl font-bold text-gray-800 dark:text-white">${Math.round(day.main.temp)}°C</p>
                <p class="text-sm text-gray-600 dark:text-gray-300 capitalize">${day.weather[0].description}</p>
            </div>
        `;
    });
}

// Geolocation
function getCurrentLocation() {
    if (navigator.geolocation) {
        showLoadingState();
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                getCityNameFromCoords(latitude, longitude);
            },
            error => {
                hideLoadingState();
                showError('Unable to retrieve your location. Please search for a city instead.');
            }
        );
    } else {
        showError('Geolocation is not supported by your browser');
    }
}

async function getCityNameFromCoords(lat, lon) {
    try {
        const response = await fetch(
            `${GEO_API_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch location data');
        }
        
        const data = await response.json();
        if (data.length > 0) {
            getWeatherData(lat, lon, data[0].name);
        } else {
            throw new Error('Location not found');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to get location name');
    }
}

// Initialize weather app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    // Get user's location by default
    getUserLocation();
});

// Initialize app components
function initializeApp() {
    // Initialize theme
    if (localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }

    // Event Listeners
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);
    locationBtn.addEventListener('click', getCurrentLocation);
    themeToggle.addEventListener('click', toggleTheme);
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeydown);
    
    // Mouse events for suggestions
    document.addEventListener('click', handleClickOutside);
}

// Get user's location
function getUserLocation() {
    showLoadingState();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                getWeatherByCoords(latitude, longitude);
            },
            (error) => {
                console.error('Error getting location:', error);
                showError('Could not get your location. Please search for a city manually.');
                hideLoadingState();
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        showError('Geolocation is not supported by your browser. Please search for a city manually.');
        hideLoadingState();
    }
}

async function getWeatherByCoords(lat, lon) {
    try {
        const response = await fetch(
            `${GEO_API_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch location data');
        }
        
        const data = await response.json();
        if (data.length > 0) {
            getWeatherData(lat, lon, data[0].name);
        } else {
            throw new Error('Location not found');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to get location name');
    }
}

// UI State Management
function showLoadingState() {
    weatherContent.classList.add('hidden');
}

function hideLoadingState() {
    weatherContent.classList.remove('hidden');
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 3000);
}

function updateWeatherTheme(weatherType) {
    const body = document.body;
    const themeClasses = ['theme-clear', 'theme-clouds', 'theme-rain', 'theme-thunderstorm', 'theme-snow'];
    
    themeClasses.forEach(className => body.classList.remove(className));
    
    switch (weatherType) {
        case 'clear':
            body.classList.add('theme-clear');
            break;
        case 'clouds':
            body.classList.add('theme-clouds');
            break;
        case 'rain':
        case 'drizzle':
            body.classList.add('theme-rain');
            break;
        case 'thunderstorm':
            body.classList.add('theme-thunderstorm');
            break;
        case 'snow':
            body.classList.add('theme-snow');
            break;
    }
}

// Handle keyboard navigation in search suggestions
function handleSearchKeydown(e) {
    const suggestions = document.getElementById('suggestions');
    const items = suggestions.getElementsByClassName('suggestion-item');
    let currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));

    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            if (suggestions.classList.contains('hidden')) {
                handleSearchInput({ target: searchInput });
            } else {
                navigateSuggestions(currentIndex, 1, items);
            }
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            if (!suggestions.classList.contains('hidden')) {
                navigateSuggestions(currentIndex, -1, items);
            }
            break;
            
        case 'Enter':
            e.preventDefault();
            const selectedItem = suggestions.querySelector('.selected');
            if (selectedItem) {
                const cityName = selectedItem.textContent;
                searchInput.value = cityName;
                getWeatherByCity(cityName);
                suggestions.classList.add('hidden');
            } else if (searchInput.value.trim()) {
                getWeatherByCity(searchInput.value.trim());
            }
            break;
            
        case 'Escape':
            suggestions.classList.add('hidden');
            searchInput.blur();
            break;
    }
}

// Navigate through suggestions
function navigateSuggestions(currentIndex, direction, items) {
    if (items.length === 0) return;
    
    // Remove current selection
    if (currentIndex >= 0) {
        items[currentIndex].classList.remove('selected');
    }
    
    // Calculate new index
    let newIndex;
    if (currentIndex === -1) {
        newIndex = direction > 0 ? 0 : items.length - 1;
    } else {
        newIndex = (currentIndex + direction + items.length) % items.length;
    }
    
    // Add selection to new item
    items[newIndex].classList.add('selected');
    items[newIndex].scrollIntoView({ block: 'nearest' });
}

// Handle global keyboard shortcuts
function handleGlobalKeydown(e) {
    // Ctrl/Cmd + / to toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleTheme();
    }
    
    // Ctrl/Cmd + L to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        searchInput.focus();
    }
    
    // Ctrl/Cmd + M to get current location
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        getCurrentLocation();
    }
}

// Handle clicks outside search suggestions
function handleClickOutside(e) {
    const suggestions = document.getElementById('suggestions');
    if (!suggestions.contains(e.target) && e.target !== searchInput) {
        suggestions.classList.add('hidden');
    }
}
