import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../models/weather_model.dart';
import '../services/weather_service.dart';

class WeatherProvider with ChangeNotifier {
  final WeatherService _weatherService = WeatherService();
  WeatherData? _currentWeather;
  List<ForecastData> _forecast = [];
  String? _error;
  bool _isLoading = false;

  WeatherData? get currentWeather => _currentWeather;
  List<ForecastData> get forecast => _forecast;
  String? get error => _error;
  bool get isLoading => _isLoading;

  Future<void> fetchWeatherByCity(String city) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentWeather = await _weatherService.getCurrentWeather(city);
      _forecast = await _weatherService.getForecast(city);
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchWeatherByLocation() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final position = await _getCurrentPosition();
      _currentWeather = await _weatherService.getWeatherByLocation(
        position.latitude,
        position.longitude,
      );
      if (_currentWeather != null) {
        _forecast = await _weatherService.getForecast(_currentWeather!.cityName);
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Position> _getCurrentPosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Location services are disabled');
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Location permissions are denied');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw Exception('Location permissions are permanently denied');
    }

    return await Geolocator.getCurrentPosition();
  }
}