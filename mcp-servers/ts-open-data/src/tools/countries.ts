/**
 * REST Countries tool — no API key required.
 * Docs: https://restcountries.com
 */

import { z } from "zod";

export const countryInputSchema = z.object({
  query: z.string().describe("Country name, ISO 3166-1 alpha-2/3 code, or capital city"),
  fields: z.array(z.string()).optional()
    .describe("Specific fields to return — omit for full info"),
});

type CountryInput = z.infer<typeof countryInputSchema>;

export async function getCountryInfo(input: CountryInput): Promise<string> {
  const q = input.query.trim();
  let url: string;

  // Detect ISO codes (2 or 3 letters) vs names
  if (/^[a-z]{2,3}$/i.test(q)) {
    url = `https://restcountries.com/v3.1/alpha/${q}`;
  } else {
    url = `https://restcountries.com/v3.1/name/${encodeURIComponent(q)}?fullText=true`;
  }

  if (input.fields?.length) {
    url += (url.includes("?") ? "&" : "?") + `fields=${input.fields.join(",")}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Country not found: ${input.query}`);
  const data = await res.json() as any[];

  const country = Array.isArray(data) ? data[0] : data;
  const summary = {
    name: country.name?.common,
    officialName: country.name?.official,
    capital: country.capital?.[0],
    region: country.region,
    subregion: country.subregion,
    population: country.population,
    area_km2: country.area,
    currencies: country.currencies
      ? Object.entries(country.currencies).map(([code, c]: any) => `${c.name} (${c.symbol || code})`)
      : [],
    languages: country.languages ? Object.values(country.languages) : [],
    timezones: country.timezones,
    callingCodes: country.idd ? [`${country.idd.root}${(country.idd.suffixes || [])[0] ?? ""}`] : [],
    flag: country.flag,
    iso2: country.cca2,
    iso3: country.cca3,
  };

  return JSON.stringify(summary, null, 2);
}
