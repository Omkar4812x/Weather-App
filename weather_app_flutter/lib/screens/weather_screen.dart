import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:intl/intl.dart';
import '../providers/weather_provider.dart';
import '../models/weather_model.dart';

class WeatherScreen extends StatefulWidget {
  const WeatherScreen({super.key});

  @override
  State<WeatherScreen> createState() => _WeatherScreenState();
}

class _WeatherScreenState extends State<WeatherScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Fetch weather data for current location when the screen loads
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<WeatherProvider>().fetchWeatherByLocation();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Consumer<WeatherProvider>(
        builder: (context, weatherProvider, child) {
          if (weatherProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (weatherProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(weatherProvider.error!),
                  ElevatedButton(
                    onPressed: () => weatherProvider.fetchWeatherByLocation(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          final weather = weatherProvider.currentWeather;
          if (weather == null) {
            return const Center(child: Text('No weather data available'));
          }

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 200,
                floating: false,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  title: Text(
                    weather.cityName,
                    style: GoogleFonts.montserrat(),
                  ),
                  background: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.blue.shade400,
                          Colors.blue.shade900,
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      // Search Bar
                      TextField(
                        controller: _searchController,
                        decoration: InputDecoration(
                          hintText: 'Search city...',
                          suffixIcon: IconButton(
                            icon: const Icon(Icons.search),
                            onPressed: () {
                              if (_searchController.text.isNotEmpty) {
                                weatherProvider.fetchWeatherByCity(
                                    _searchController.text);
                              }
                            },
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(30),
                          ),
                        ),
                        onSubmitted: (value) {
                          if (value.isNotEmpty) {
                            weatherProvider.fetchWeatherByCity(value);
                          }
                        },
                      ),
                      const SizedBox(height: 20),

                      // Current Weather
                      Card(
                        elevation: 4,
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${weather.temperature.round()}°C',
                                        style: GoogleFonts.montserrat(
                                          fontSize: 48,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        weather.description,
                                        style: GoogleFonts.montserrat(
                                          fontSize: 18,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Image.network(
                                    'https://openweathermap.org/img/wn/${weather.icon}@2x.png',
                                    width: 100,
                                    height: 100,
                                  ),
                                ],
                              ),
                              const Divider(),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceAround,
                                children: [
                                  _buildWeatherInfo(
                                    FontAwesomeIcons.thermometer,
                                    'Feels like',
                                    '${weather.feelsLike.round()}°C',
                                  ),
                                  _buildWeatherInfo(
                                    FontAwesomeIcons.droplet,
                                    'Humidity',
                                    '${weather.humidity}%',
                                  ),
                                  _buildWeatherInfo(
                                    FontAwesomeIcons.wind,
                                    'Wind',
                                    '${weather.windSpeed} m/s',
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Forecast
                      if (weatherProvider.forecast.isNotEmpty) ...[                        
                        Text(
                          'Forecast',
                          style: GoogleFonts.montserrat(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 10),
                        SizedBox(
                          height: 150,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            itemCount: weatherProvider.forecast.length,
                            itemBuilder: (context, index) {
                              final forecast = weatherProvider.forecast[index];
                              return Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(8.0),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        DateFormat('E, ha')
                                            .format(forecast.date),
                                        style: GoogleFonts.montserrat(),
                                      ),
                                      Image.network(
                                        'https://openweathermap.org/img/wn/${forecast.icon}.png',
                                        width: 50,
                                        height: 50,
                                      ),
                                      Text(
                                        '${forecast.temperature.round()}°C',
                                        style: GoogleFonts.montserrat(
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        forecast.description,
                                        style: GoogleFonts.montserrat(
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          context.read<WeatherProvider>().fetchWeatherByLocation();
        },
        child: const Icon(Icons.my_location),
      ),
    );
  }

  Widget _buildWeatherInfo(IconData icon, String label, String value) {
    return Column(
      children: [
        FaIcon(icon),
        const SizedBox(height: 8),
        Text(
          label,
          style: GoogleFonts.montserrat(fontSize: 12),
        ),
        Text(
          value,
          style: GoogleFonts.montserrat(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}