import type { Guide } from "./types";
import { guide as whatIsAServiceCharge } from "./what-is-a-service-charge";
import { guide as doYouHaveToPay } from "./do-you-have-to-pay-a-service-charge";
import { guide as optionalDiscretionaryOrMandatory } from "./optional-discretionary-or-mandatory";
import { guide as whereDoesItGo } from "./where-does-the-service-charge-go";
import { guide as serviceChargeLaw } from "./service-charge-law-uk";
import { guide as howMuch } from "./how-much-is-a-service-charge";
import { guide as vat } from "./vat-on-service-charge";

/**
 * Order here is the order on /guides, and it is editorial rather than
 * alphabetical: what a service charge is, then the question most people
 * arrive with, then the detail. Adding a guide means adding its file and
 * an entry here — nothing else.
 */
export const GUIDES: Guide[] = [
  whatIsAServiceCharge,
  doYouHaveToPay,
  optionalDiscretionaryOrMandatory,
  whereDoesItGo,
  serviceChargeLaw,
  howMuch,
  vat,
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export type { Guide };
