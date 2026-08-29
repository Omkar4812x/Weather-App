# 🌤️ SkyPulse Pro - Live Weather Dashboard & Studio

**SkyPulse Pro** is an open-source, real-time weather dashboard built with Vanilla JavaScript and CSS3 glassmorphic design. It features a **Dual Weather Data Engine** combining the free **Open-Meteo API** (zero API key required) alongside the **OpenWeatherMap Cloud API**, 24-hour forecast timelines, air quality index breakdowns, interactive °C/°F unit conversion, and dynamic particle canvas background animations.

---

## ✨ Features

- 🌤️ **Dual Weather Data Engines**:
  - **Open-Meteo Free API (Default)**: Zero API key required! Works 100% free out of the box with zero configuration.
  - **OpenWeatherMap Cloud API**: Optional cloud engine integration with custom API key entry saved to local storage.
- ⏱️ **24-Hour Forecast Timeline**:
  - Interactive horizontal scroll timeline displaying hourly temperatures, weather condition icons, and precipitation.
- 📅 **5-Day Extended Forecast**:
  - Daily temperature ranges (high/low) and weather condition badges.
- 🌡️ **Interactive Temperature Unit Switcher**:
  - Instant 1-click toggling between Celsius (**°C**) and Fahrenheit (**°F**) across all metrics.
- 🫁 **Air Quality & Health Index (AQI)**:
  - Color-coded AQI status badge (*Good*, *Moderate*, *Unhealthy*) with component pollutant breakdown (PM2.5, PM10, NO2, O3, CO).
- ⭐ **Favorite Cities Bar**:
  - Quick-pin your favorite locations for 1-click instant weather loading saved in `localStorage`.
- 🎨 **Dynamic Weather Canvas Animations**:
  - Atmospheric particle background canvas (falling rain drops, floating snow particles, ambient sun rays) matching current live weather conditions.
- 🌓 **Dark / Light Theme**:
  - Built-in theme toggle with local persistence and system preferences auto-detection.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl / Cmd + L` | Focus search bar |
| `Ctrl / Cmd + M` | Fetch current location weather (GPS) |
| `Ctrl / Cmd + U` | Toggle temperature unit (**°C** / **°F**) |
| `Ctrl / Cmd + /` | Toggle Dark / Light theme |
| `Enter` | Perform city search |

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+ async/await), CSS3 (CSS Custom Properties, Glassmorphism).
- **APIs**: Open-Meteo Weather & Geocoding API (Zero-Key), OpenWeatherMap API, HTML5 Geolocation.
- **Canvas Engine**: HTML5 2D Canvas particle animation.
- **Fonts & Icons**: FontAwesome 6, Google Fonts (*Plus Jakarta Sans*, *Inter*).

---

## 🚀 Getting Started

```bash
# Clone repository
git clone https://github.com/Omkar4812x/Weather-App.git

# Navigate into directory
cd Weather-App

# Open index.html directly in your browser
```

---

## 📄 License

Maintained as part of the Web Applications collection under the MIT License. Created by **Omkar Bhandalkar**.
