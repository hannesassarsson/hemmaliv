// Ystad, Sverige
export const HOME_LOCATION = { name: "Ystad", lat: 55.4295, lon: 13.8225 };

export type WeatherNow = {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  windSpeed: number;
  precipitation: number;
  isDay: boolean;
};

export type WeatherDay = {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
};

export type WeatherHour = {
  time: string;
  temperature: number;
  weatherCode: number;
  precipitationProbability: number;
};

export type Weather = {
  now: WeatherNow;
  hours: WeatherHour[];
  days: WeatherDay[];
};

const WEATHER_CODE_TEXT: Record<number, string> = {
  0: "Klart",
  1: "Mest klart",
  2: "Växlande molnighet",
  3: "Mulet",
  45: "Dimma",
  48: "Rimfrost-dimma",
  51: "Lätt duggregn",
  53: "Duggregn",
  55: "Tätt duggregn",
  56: "Underkylt duggregn",
  57: "Tätt underkylt duggregn",
  61: "Lätt regn",
  63: "Regn",
  65: "Kraftigt regn",
  66: "Underkylt regn",
  67: "Kraftigt underkylt regn",
  71: "Lätt snöfall",
  73: "Snöfall",
  75: "Kraftigt snöfall",
  77: "Snökorn",
  80: "Lätta regnskurar",
  81: "Regnskurar",
  82: "Kraftiga regnskurar",
  85: "Lätta snöbyar",
  86: "Kraftiga snöbyar",
  95: "Åska",
  96: "Åska med hagel",
  99: "Kraftig åska med hagel",
};

export function weatherText(code: number) {
  return WEATHER_CODE_TEXT[code] ?? "Okänt väder";
}

export async function fetchWeather(): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(HOME_LOCATION.lat),
    longitude: String(HOME_LOCATION.lon),
    current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation,is_day",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
    timezone: "Europe/Stockholm",
    forecast_days: "5",
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error("Kunde inte hämta vädret");
  const data = await res.json();

  const nowIso: string = data.current.time;
  const hourIndex: number[] = data.hourly.time
    .map((t: string, i: number) => (t >= nowIso ? i : -1))
    .filter((i: number) => i >= 0);

  const hours: WeatherHour[] = hourIndex.slice(0, 8).map((i: number) => ({
    time: data.hourly.time[i],
    temperature: Math.round(data.hourly.temperature_2m[i]),
    weatherCode: data.hourly.weather_code[i],
    precipitationProbability: data.hourly.precipitation_probability[i],
  }));

  const days: WeatherDay[] = data.daily.time.map((date: string, i: number) => ({
    date,
    weatherCode: data.daily.weather_code[i],
    tempMax: Math.round(data.daily.temperature_2m_max[i]),
    tempMin: Math.round(data.daily.temperature_2m_min[i]),
    precipitationSum: data.daily.precipitation_sum[i],
  }));

  return {
    now: {
      temperature: Math.round(data.current.temperature_2m),
      apparentTemperature: Math.round(data.current.apparent_temperature),
      weatherCode: data.current.weather_code,
      windSpeed: Math.round(data.current.wind_speed_10m),
      precipitation: data.current.precipitation,
      isDay: data.current.is_day === 1,
    },
    hours,
    days,
  };
}
