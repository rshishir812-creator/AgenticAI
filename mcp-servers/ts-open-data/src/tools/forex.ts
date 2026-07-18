/**
 * Frankfurter FX rates tool — no API key required.
 * Docs: https://www.frankfurter.app/docs/
 */

import { z } from "zod";

export const forexInputSchema = z.object({
  base: z.string().length(3).toUpperCase()
    .describe("Base currency ISO 4217 code (e.g. USD, EUR, GBP)"),
  targets: z.array(z.string().length(3)).optional()
    .describe("Target currencies — omit for all"),
  amount: z.number().positive().default(1)
    .describe("Amount to convert"),
  date: z.string().optional()
    .describe("Historical date YYYY-MM-DD — omit for latest"),
});

type ForexInput = z.infer<typeof forexInputSchema>;

export async function getExchangeRates(input: ForexInput): Promise<string> {
  const base = input.base.toUpperCase();
  const endpoint = input.date ? input.date : "latest";
  let url = `https://api.frankfurter.app/${endpoint}?from=${base}&amount=${input.amount}`;

  if (input.targets?.length) {
    url += `&to=${input.targets.map((t) => t.toUpperCase()).join(",")}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`FX API error: ${res.statusText}`);
  const data = await res.json() as any;

  return JSON.stringify({
    base: data.base,
    date: data.date,
    amount: data.amount,
    rates: data.rates,
    note: "Source: Frankfurter.app (ECB reference rates, updated daily)",
  }, null, 2);
}
