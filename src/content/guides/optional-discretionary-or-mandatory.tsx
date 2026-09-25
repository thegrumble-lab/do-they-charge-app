import Link from "next/link";
import type { Guide } from "./types";

export const guide: Guide = {
  slug: "optional-discretionary-or-mandatory",
  title: "Optional, discretionary or mandatory service charge?",
  h1: "Optional, discretionary or mandatory?",
  description:
    "The three words restaurants use for a service charge, what each one commits you to, and how to work out which you're looking at before the bill arrives.",
  updated: "2026-09-25",
  standfirst:
    "Two of these words mean the same thing and the third changes what you owe. Restaurants use them loosely, so the label on the menu is a starting point rather than an answer.",
  faqs: [
    {
      q: "What's the difference between a discretionary and a mandatory service charge?",
      a: "A discretionary or optional service charge is one you can decline. A mandatory or compulsory one is part of the price you agreed when you ordered. HMRC's National Insurance guidance proceeds on the basis that where a service charge is compulsory, the customer is obliged to pay.",
    },
    {
      q: "Do optional and discretionary mean the same thing?",
      a: "In practice, yes. Both signal that the payment is a matter for you. Restaurants use them interchangeably.",
    },
    {
      q: "Can a restaurant call a charge discretionary but refuse to remove it?",
      a: "It would be contradicting its own menu. HMRC looks at how a charge is presented rather than the adjective used: a payment is voluntary only if it is clearly presented as entirely optional, with the menu and what staff say pointing the same way.",
    },
  ],
  body: (
    <>
      <h2 className="h2">Two words, one meaning</h2>
      <p>
        <strong>Discretionary</strong> and <strong>optional</strong> are the
        same thing. Both say the restaurant has put a suggested amount on the
        bill and the decision is yours. Discretionary is the more common word
        on UK menus, probably because it sounds more formal, but nothing
        turns on which one a venue picks.
      </p>

      <h2 className="h2">The word that changes things</h2>
      <p>
        <strong>Mandatory</strong> — or compulsory, or simply a charge
        stated as part of the price — is different in kind.{" "}
        <a
          href="https://www.gov.uk/government/publications/e24-tips-gratuities-service-charges-and-troncs/guidance-on-tips-gratuities-service-charges-and-troncs"
          target="_blank"
          rel="noopener noreferrer"
        >
          HMRC&apos;s guidance
        </a>{" "}
        draws the line by obligation: where a charge is not a purely
        discretionary amount and there is an obligation to pay, it is a
        mandatory service charge. It then forms part of what the meal costs,
        which is why{" "}
        <Link href="/guides/vat-on-service-charge">VAT treats it differently</Link>{" "}
        too.
      </p>

      <h2 className="h2">How to tell which you&apos;re looking at</h2>
      <p>
        The menu&apos;s own wording is the first place to look, and usually
        the only place you need to. Beyond that:
      </p>
      <ul>
        <li>
          <strong>Look for a group threshold.</strong> &ldquo;Parties of six
          or more&rdquo; is the most common form of a genuinely mandatory
          charge, and it is normally stated plainly.
        </li>
        <li>
          <strong>Check where it was disclosed.</strong> A charge stated on
          the menu before you ordered can form part of the deal. One that
          appears for the first time on the bill has arrived too late to be a
          term you agreed to.
        </li>
        <li>
          <strong>Watch the bill&apos;s own language.</strong> &ldquo;A
          discretionary service charge of 12.5% has been added&rdquo; is an
          invitation. &ldquo;Service charge 12.5%&rdquo; with no qualifier is
          ambiguous, and worth a question.
        </li>
        <li>
          <strong>Ask.</strong> &ldquo;Is the service charge
          discretionary?&rdquo; is a completely ordinary question and the
          answer is usually immediate.
        </li>
      </ul>

      <h2 className="h2">Labels aren&apos;t binding on their own</h2>
      <p>
        HMRC judges these by how they are actually presented, not by the
        adjective chosen:{" "}
        <a
          href="https://www.gov.uk/hmrc-internal-manuals/national-insurance-manual/nim02915"
          target="_blank"
          rel="noopener noreferrer"
        >
          a payment is a voluntary service charge if it is clearly presented
          to the customer as an entirely optional payment
        </a>
        , and the literature the customer sees should be consistent with what
        staff tell them. A charge described as discretionary on the menu,
        then defended at the table as non-negotiable, fails that consistency
        test.
      </p>
      <p>
        One thing HMRC is careful to say, which cuts the other way: in some
        places it is rare for customers to refuse, and that{" "}
        <em>does not affect the true nature of the payment</em>. A charge
        almost everyone pays is still voluntary if it was presented as
        voluntary.
      </p>
      <p>
        The reverse also matters. A charge can be genuinely mandatory and
        perfectly lawful — that is a pricing decision, not a trick, provided
        it was disclosed in time. What you are entitled to is knowing which
        one it is before you order.
      </p>

      <h2 className="h2">Which is why this site records it</h2>
      <p>
        The directory distinguishes places that add a charge, places that
        don&apos;t, and places that only add one for larger groups, so the
        answer is available before you book rather than at the table.{" "}
        <Link href="/">Look somewhere up</Link>, or{" "}
        <Link href="/browse">browse an area</Link>.
      </p>
    </>
  ),
};
