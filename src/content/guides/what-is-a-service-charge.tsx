import Link from "next/link";
import type { Guide } from "./types";

export const guide: Guide = {
  slug: "what-is-a-service-charge",
  title: "What is a service charge in a UK restaurant?",
  h1: "What is a service charge?",
  description:
    "A service charge is an amount a restaurant adds to your bill before handing it to you. What it is, what it isn't, and why it's not the same as a tip.",
  updated: "2026-09-25",
  standfirst:
    "It's an amount the restaurant adds to your bill before the bill reaches you. That one detail — that it's added by the restaurant rather than offered by you — is what separates it from a tip, and it's the reason almost every other question about service charges has the answer it does.",
  faqs: [
    {
      q: "Is a service charge the same as a tip?",
      a: "No. A tip is money you choose to add after the bill arrives. A service charge is added by the restaurant before you see the bill. The statutory Code of Practice on tipping defines a service charge as an amount added to the customer's bill before it is presented to the customer.",
    },
    {
      q: "Is a service charge a tax?",
      a: "No. It is the restaurant's own charge. It is not VAT, and it is not collected on anyone's behalf by government.",
    },
    {
      q: "Does the service charge replace a tip?",
      a: "That is between you and the restaurant. Many people treat a service charge as covering the tip and add nothing further; others tip on top. Neither is required.",
    },
  ],
  body: (
    <>
      <h2 className="h2">The definition that matters</h2>
      <p>
        The statutory{" "}
        <a
          href="https://www.gov.uk/government/publications/distributing-tips-fairly-statutory-code-of-practice/code-of-practice-on-fair-and-transparent-distribution-of-tips-html-version"
          target="_blank"
          rel="noopener noreferrer"
        >
          Code of Practice on the fair and transparent distribution of tips
        </a>{" "}
        puts it plainly: a service charge is an amount added to the
        customer&apos;s bill <em>before it is presented to the customer</em>.
      </p>
      <p>
        That sequencing is the whole thing. A tip is a decision you make
        after you know what you owe. A service charge is a line the
        restaurant has already written. Everything else — whether you have
        to pay it, whether VAT applies, who ends up with the money — follows
        from which side of that line the payment falls on.
      </p>

      <h2 className="h2">What it is not</h2>
      <ul>
        <li>
          <strong>It is not a tax.</strong> It belongs to the restaurant
          until the restaurant passes it on. Government does not set it,
          collect it, or take a cut of it as a charge in its own right.
        </li>
        <li>
          <strong>It is not a legal requirement.</strong> No law tells a
          restaurant to add one, and no law sets the percentage. A venue
          that adds 15% and a venue that adds nothing are both doing exactly
          what the law permits.
        </li>
        <li>
          <strong>It is not automatically a tip for the staff.</strong> Since
          October 2024 it has to reach them — see{" "}
          <Link href="/guides/where-does-the-service-charge-go">
            where the money actually goes
          </Link>{" "}
          — but that is a recent obligation, not something inherent in the
          charge.
        </li>
        <li>
          <strong>It is not a cover charge.</strong> A cover charge is a
          flat amount per head for sitting down. A service charge is
          normally a percentage of what you ordered. Some venues apply both.
        </li>
      </ul>

      <h2 className="h2">Discretionary, optional, mandatory</h2>
      <p>
        You will see all three words. &ldquo;Discretionary&rdquo; and
        &ldquo;optional&rdquo; mean the same thing: the restaurant is
        inviting a payment you can decline. &ldquo;Mandatory&rdquo; or
        &ldquo;compulsory&rdquo; does not — it means the charge forms part
        of the price and you agreed to it when you ordered. HMRC treats the two completely
        differently, and so does your bill.{" "}
        <Link href="/guides/optional-discretionary-or-mandatory">
          How to tell which one you are looking at
        </Link>{" "}
        is a question with a practical answer.
      </p>

      <h2 className="h2">Why any of this is hard to find out in advance</h2>
      <p>
        Because menus do not have to shout about it. A charge is often
        disclosed in small print at the foot of a menu, on a card by the
        till, or on a website page nobody reads before booking. It is
        perfectly lawful to disclose it that way, and the practical result
        is that most people meet the charge for the first time when the bill
        lands.
      </p>
      <p>
        That gap is the reason this site exists. If you know where
        you&apos;re going,{" "}
        <Link href="/">look the place up</Link> before you book rather than
        after you&apos;ve sat down.
      </p>
    </>
  ),
};
