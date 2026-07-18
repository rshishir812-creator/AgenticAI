/**
 * Open-Meteo weather tool — no API key required.
 * Docs: https://open-meteo.com/en/docs
 */

import { z } from "zod";

export const weatherInputSchema = z.object({
  location: z.string().describe("City name or 'lat,lon' coordinates"),
  days: z.number().int().min(1).max(16).default(3)
    .describe("Forecast days (1-16)"),
  units: z.enum(["metric", "imperial"]).default("metric")
    .describe("Temperature units"),
});

type WeatherInput = z.infer<typeof weatherInputSchema>;

async function geocode(location: string): Promise<{ lat: number; lon: number; name: string }> {
  if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location)) {
    const [lat, lon] = location.split(",").map(Number);
    return { lat, lon, name: location };
  }
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  const data = await res.json() as any;
  if (!data.results?.length) throw new Error(`Location not found: ${location}`);
  const r = data.results[0];
  return { lat: r.latitude, lon: r.longitude, name: `${r.name}, ${r.country}` };
}

export async function getWeather(input: WeatherInput): Promise<string> {
  const { lat, lon, name } = await geocode(input.location);
  const tempUnit = input.units === "metric" ? "celsius" : "fahrenheit";
  const windUnit = input.units === "metric" ? "kmh" : "mph";

  const url = [
    `https://api.open-meteo.com/v1/forecast`,
    `?latitude=${lat}&longitude=${lon}`,
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode`,
    `&current_weather=true`,
    `&temperature_unit=${tempUnit}`,
    `&windspeed_unit=${windUnit}`,
    `&forecast_days=${input.days}`,
    `&timezone=auto`,
  ].join("");

  const res = await fetch(url);
  const data = await res.json() as any;

  const curr = data.current_weather;
  const daily = data.daily;
  const unit = input.units === "metric" ? "°C" : "°F";

  const forecast = daily.time.map((date: string, i: number) => ({
    date,
    max: `${daily.temperature_2m_max[i]}${unit}`,
    min: `${daily.temperature_2m_min[i]}${unit}`,
    precipitation: `${daily.precipitation_sum[i]}mm`,
    wind: `${daily.windspeed_10m_max[i]} ${windUnit}`,
  }));

  return JSON.stringify({
    location: name,
    coordinates: { lat, lon },
    current: {
      temperature: `${curr.temperature}${unit}`,
      windspeed: `${curr.windspeed} ${windUnit}`,
      is_day: curr.is_day === 1,
    },
    forecast,
  }, null, 2);
}
