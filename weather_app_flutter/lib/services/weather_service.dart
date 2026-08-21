import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/weather_model.dart';

class WeatherService {
  static const String _apiKey =
      'b89e3f983512749ed96604095096c09e'; // OpenWeatherMap API key
  static const String _baseUrl = 'https://api.openweathermap.org/data/2.5';

  Future<WeatherData> getCurrentWeather(String city) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/weather?q=$city&units=metric&appid=$_apiKey'),
    );

    if (response.statusCode == 200) {
      return WeatherData.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to load weather data');
    }
  }

  Future<WeatherData> getWeatherByLocation(double lat, double lon) async {
    final response = await http.get(
      Uri.parse(
          '$_baseUrl/weather?lat=$lat&lon=$lon&units=metric&appid=$_apiKey'),
    );

    if (response.statusCode == 200) {
      return WeatherData.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to load weather data');
    }
  }

  Future<List<ForecastData>> getForecast(String city) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/forecast?q=$city&units=metric&appid=$_apiKey'),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      final List<dynamic> list = data['list'];

      // Group forecasts by day and get one forecast per day
      Map<String, ForecastData> dailyForecasts = {};

      for (var item in list) {
        DateTime date = DateTime.fromMillisecondsSinceEpoch(item['dt'] * 1000);
        String dayKey = '${date.year}-${date.month}-${date.day}';

        // Only store the first forecast of each day
        if (!dailyForecasts.containsKey(dayKey)) {
          dailyForecasts[dayKey] = ForecastData.fromJson(item);
        }
      }

      // Get the next 5 days of forecasts
      return dailyForecasts.values.take(5).toList();
    } else {
      throw Exception('Failed to load forecast data');
    }
  }
}
