import { SITE_URL } from "@/lib/site";
import type { Campaign } from "./store";
import { TRACKED_CHAINS } from "@/content/chain-tracker";

/** Days after the first email that the single follow-up is sent, per campaign. */
export const FOLLOW_UP_DAYS: Record<Campaign, number> = { restaurant: 7, press: 5 };
export const SEQUENCE_LENGTH = 2;

export const SIGNOFF = "Matt from Discretionary";

/** A prospect as listed in src/data/outreach.json. */
export type Seed = {
  campaign: Campaign;
  email: string;
  name: string;
  /** Press only: first name, or "" to open with "Hi there". */
  first: string;
  /** Restaurants only: the listing URL on discretionary.uk. */
  page: string;
  /** Restaurants only: "own" (their menu or website) or "diner" (a diner report). */
  basis: string;
  outlet: string;
  /** Press only: their relevant coverage, used in the opening line. */
  angle: string;
  /**
   * Press only: "creator" for food bloggers, newsletters and social creators,
   * who get a content idea built around the chain tracker instead of the
   * journalist data pitch. Same campaign, sequence and reply handling.
   */
  variant?: "creator";
};

/**
 * Figures quoted to journalists. A snapshot of the database on the date
 * below; refresh both together. "Publishes a policy" means the restaurant's
 * own website or menu states one, as cited on each listing.
 */
export const FIGURES = {
  asOf: "25 October 2026",
  withPolicy: "1,653",
  addCharge: "1,624",
  everyBill: "897",
  groupsOnly: "727",
  noCharge: "29",
};

export function badgeSnippet(page: string): string {
  const path = page.replace(SITE_URL, "").replace(/^https?:\/\/[^/]+/, "");
  return `<a href="${SITE_URL}${path}"><img src="${SITE_URL}/badge${path}" alt="No service charge: listed on Discretionary" width="200" height="56"></a>`;
}

function footer(unsubUrl: string, campaign: Campaign): string {
  return [
    "--",
    campaign === "restaurant"
      ? "We found this address on your website and are contacting you about your restaurant's listing on discretionary.uk."
      : "We found this address on your publication's website and are contacting you in your professional role.",
    `If you'd rather we didn't email again, reply "unsubscribe" or use this link: ${unsubUrl}`,
  ].join("\n");
}

const sig = `Thanks very much,
${SIGNOFF}
hello@discretionary.uk`;

/** step is 0-based: 0 = first email, 1 = follow-up. */
export function renderStep(step: number, s: Seed, unsubUrl: string): { subject: string; text: string } {
  if (s.campaign === "restaurant") {
    const subject = `${s.name} on Discretionary: no service charge`;
    if (step === 0) {
      const basis = s.basis === "diner" ? "a diner's report" : "your own menu and website";
      return {
        subject,
        text: `Hello,

I run Discretionary (discretionary.uk), a free UK guide that lets diners check whether a restaurant adds a service charge before they book.

${s.name} is listed as leaving tips to the diner, with no service charge added, based on ${basis}:
${s.page}

Could you confirm that's right? A one-word "correct" is perfect. Once you confirm, the page will note that the information comes from you, and we'll send you a small "No service charge" badge you're welcome to add to your website, linking to your listing.

${sig}

${footer(unsubUrl, "restaurant")}`,
      };
    }
    return {
      subject: `Re: ${subject}`,
      text: `Hello again,

Just bringing my note about the ${s.name} listing back to the top of your inbox. A one-word "correct" is all we need, or let me know if anything has changed:
${s.page}

${sig}

${footer(unsubUrl, "restaurant")}`,
    };
  }

  if (s.variant === "creator") return renderCreatorStep(step, s, unsubUrl);

  const subject = `Data: ${FIGURES.addCharge} of ${FIGURES.withPolicy} UK restaurants publishing a policy add a service charge`;
  const hi = s.first ? `Hi ${s.first},` : "Hi there,";
  if (step === 0) {
    const opener = s.angle ? `I saw ${s.angle}, so thought this might be useful.\n\n` : "";
    return {
      subject,
      text: `${hi}

${opener}I run Discretionary (discretionary.uk), a free UK directory that shows diners whether a restaurant adds a service charge before they book. Every listing cites the restaurant's own menu, website or booking terms, alongside diner reports.

Some figures from the data so far (as of ${FIGURES.asOf}):
- Of ${FIGURES.withPolicy} restaurants whose own website or menu states a policy, ${FIGURES.addCharge} add a service charge in some form.
- ${FIGURES.everyBill} add it to every bill, and ${FIGURES.groupsOnly} add it for larger groups only.
- 10% is the most common rate, followed by 12.5%, and a handful now charge 15%.
- ${FIGURES.noCharge} state that tips are left entirely to the diner.

There's also a chain-by-chain tracker covering Pizza Express, Zizzi, Dishoom, Wagamama and others, each cited from the chain's own site, with a CSV download:
${SITE_URL}/chains

I'm happy to share the underlying list with sources, break it down by city, or answer any questions.

${sig}

${footer(unsubUrl, "press")}`,
    };
  }
  return {
    subject: `Re: ${subject}`,
    text: `${hi}

Bringing this back to the top of your inbox in case the figures are useful for anything you're working on. The chain-by-chain tracker is here, with sources and a CSV download: ${SITE_URL}/chains\n\nHappy to send the full list with sources, or a breakdown by city.

${sig}

${footer(unsubUrl, "press")}`,
  };
}

/** Food bloggers, newsletters and social creators: a content idea, not a data pitch. */
function renderCreatorStep(step: number, s: Seed, unsubUrl: string): { subject: string; text: string } {
  const subject = "Which UK chains add a service charge? A list your followers might like";
  const hi = s.first ? `Hi ${s.first},` : "Hi there,";
  const chains = TRACKED_CHAINS.length;
  if (step === 0) {
    const opener = s.angle ? `I saw ${s.angle}, so thought this might be up your street.\n\n` : "";
    return {
      subject,
      text: `${hi}

${opener}I run Discretionary (discretionary.uk), a free UK guide that shows whether a restaurant adds a service charge before you book.

We've just published a tracker of ${chains} UK restaurant and pub chains, from Pizza Express and Zizzi to Dishoom and Flat Iron: which add a charge to every bill, which only for bigger groups, and which don't say either way. Every entry links to the chain's own menu or terms, so it's all checkable:
${SITE_URL}/chains

It could make a handy post or video for your followers, along the lines of "which chains quietly add 12.5% to your bill". You're welcome to use anything on the page, and a link back is always appreciated.

Happy to pull together the chains near you, or anything else that would help.

${sig}

${footer(unsubUrl, "press")}`,
    };
  }
  return {
    subject: `Re: ${subject}`,
    text: `${hi}

Just bringing this back to the top of your inbox in case the chain list is handy for a post:
${SITE_URL}/chains

${sig}

${footer(unsubUrl, "press")}`,
  };
}

/** The fixed thank-you sent when a restaurant confirms. Not AI-written, so the badge code is always exact. */
export function confirmationReply(s: Seed, firstName: string | null): string {
  return `${firstName ? `Hi ${firstName},` : "Hi,"}

Thanks so much for confirming. We'll update the listing to note that the information comes from you within the next few working days:
${s.page}

Here's the badge, if you'd like to add it to your website. Paste this code into any page, and it links straight to your listing:

${badgeSnippet(s.page)}

Thanks again,
${SIGNOFF}`;
}

/** Facts the AI may use when replying to restaurants. Nothing outside this list. */
export const AI_FACTS = `
ABOUT DISCRETIONARY (the only facts you may state):
- Discretionary (discretionary.uk) is a free, independent UK website that shows diners whether a restaurant, cafe or pub adds a service charge, so they can check before booking.
- The list of restaurants comes from the Food Standards Agency's public food hygiene register. Service charge information comes from each restaurant's own menu, website or booking terms (with a link to the source) and from diner reports.
- It is free for diners and free for restaurants. Restaurants are never charged and there is nothing to sign up for or buy. There is no advertising or paid placement.
- When a restaurant confirms its listing, we update the page to note that the information comes from the restaurant, usually within a few working days. Restaurants that confirm they add no service charge can add a free badge to their own website linking to their listing.
- Restaurants can email hello@discretionary.uk at any time with changes, for example if they start or stop adding a service charge, or change the rate.
- Discretionary is run by a small independent team and is not connected to any booking platform or restaurant group.
`;
