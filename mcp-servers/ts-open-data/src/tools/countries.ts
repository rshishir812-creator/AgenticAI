/**
 * Country info tool — mledoze/countries static dataset, no API key required.
 *
 * REST Countries (the original free source for this tool) moved its whole
 * service behind a paid auth key in 2025 — restcountries.com/v3.1 now
 * 301-redirects to a deprecation notice, and api.restcountries.com requires
 * an "Authorization key" for every request. Since this repo's design
 * principle is zero API keys, we switched to the dataset REST Countries was
 * itself originally built from: mledoze/countries, served as a static JSON
 * file via jsdelivr's GitHub CDN. Same shape for most fields; this dataset
 * has no `population` or `timezones` fields, so those are omitted rather
 * than faked.
 *
 * Docs: https://github.com/mledoze/countries
 */

import { z } from "zod";

export const countryInputSchema = z.object({
  query: z.string().describe("Country name, ISO 3166-1 alpha-2/3 code, or capital city"),
  fields: z.array(z.string()).optional()
    .describe("Specific fields to return — omit for full info"),
});

type CountryInput = z.infer<typeof countryInputSchema>;

interface CountryRecord {
  name: { common: string; official: string };
  capital?: string[];
  region: string;
  subregion?: string;
  area?: number;
  currencies?: Record<string, { name: string; symbol?: string }>;
  languages?: Record<string, string>;
  idd?: { root?: string; suffixes?: string[] };
  flag?: string;
  cca2: string;
  cca3: string;
}

const DATASET_URL = "https://cdn.jsdelivr.net/gh/mledoze/countries@master/dist/countries.json";

let _cache: CountryRecord[] | null = null;

async function loadCountries(): Promise<CountryRecord[]> {
  if (_cache) return _cache;
  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`Failed to load country dataset: ${res.status}`);
  _cache = await res.json() as CountryRecord[];
  return _cache;
}

function findCountry(countries: CountryRecord[], query: string): CountryRecord | undefined {
  const q = query.trim().toLowerCase();

  if (/^[a-z]{2,3}$/i.test(query.trim())) {
    return countries.find((c) => c.cca2.toLowerCase() === q || c.cca3.toLowerCase() === q);
  }

  return (
    countries.find((c) => c.name.common.toLowerCase() === q) ??
    countries.find((c) => c.name.official.toLowerCase() === q) ??
    countries.find((c) => c.capital?.some((cap) => cap.toLowerCase() === q)) ??
    countries.find((c) => c.name.common.toLowerCase().includes(q))
  );
}

export async function getCountryInfo(input: CountryInput): Promise<string> {
  const countries = await loadCountries();
  const country = findCountry(countries, input.query);
  if (!country) throw new Error(`Country not found: ${input.query}`);

  const summary = {
    name: country.name.common,
    officialName: country.name.official,
    capital: country.capital?.[0],
    region: country.region,
    subregion: country.subregion,
    area_km2: country.area,
    currencies: country.currencies
      ? Object.entries(country.currencies).map(([code, c]) => `${c.name} (${c.symbol ?? code})`)
      : [],
    languages: country.languages ? Object.values(country.languages) : [],
    callingCodes: country.idd?.root ? [`${country.idd.root}${(country.idd.suffixes ?? [])[0] ?? ""}`] : [],
    flag: country.flag,
    iso2: country.cca2,
    iso3: country.cca3,
    note: "population and timezones are not available in this data source",
  };

  return JSON.stringify(summary, null, 2);
}
