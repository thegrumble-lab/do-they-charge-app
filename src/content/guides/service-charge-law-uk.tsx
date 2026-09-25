import Link from "next/link";
import type { Guide } from "./types";

export const guide: Guide = {
  slug: "service-charge-law-uk",
  title: "Service charges and UK law: what a restaurant must tell you",
  h1: "What the law says",
  description:
    "There's no law setting service charges — but there are rules about disclosing them. How the DMCC Act's price transparency regime applies, and where it leaves a genuine grey area.",
  updated: "2026-09-25",
  standfirst:
    "No law tells a restaurant whether to add a service charge or how big it can be. What the law does govern is disclosure — whether you were told, clearly and in time. Since April 2025 that sits under the Digital Markets, Competition and Consumers Act.",
  faqs: [
    {
      q: "Is there a law about restaurant service charges in the UK?",
      a: "No law sets whether a service charge may be added or at what rate. Disclosure is regulated: under the Digital Markets, Competition and Consumers Act 2024, in force from 6 April 2025, a trader must give the total price in an invitation to purchase, including fees the consumer will necessarily incur.",
    },
    {
      q: "Does a mandatory service charge have to be in the menu price?",
      a: "The CMA's price transparency guidance gives mandatory cover or service charges at a restaurant as an example of a charge that must be included in the total price shown to the consumer.",
    },
    {
      q: "Does a menu count as an invitation to purchase?",
      a: "Yes. CMA guidance gives a restaurant menu, physical or accessed by QR code, as an example, and says prices need to be displayed before consumers order.",
    },
    {
      q: "What about a charge added by default but removable on request?",
      a: "That case is not squarely resolved. The total-price rule bites on charges the consumer will necessarily incur, and CMA guidance does not expressly address a default-added charge that a restaurant will remove if asked.",
    },
  ],
  body: (
    <>
      <h2 className="h2">There is no service charge law</h2>
      <p>
        Nothing in UK law says a restaurant may or may not add a service
        charge, and nothing caps it. A venue charging 15% and a venue
        charging nothing are both entirely within the rules. What is
        regulated is whether you were told — clearly, and early enough to
        matter.
      </p>

      <h2 className="h2">The current regime: DMCC, from April 2025</h2>
      <p>
        The{" "}
        <a
          href="https://www.legislation.gov.uk/ukpga/2024/13/section/230"
          target="_blank"
          rel="noopener noreferrer"
        >
          Digital Markets, Competition and Consumers Act 2024
        </a>{" "}
        replaced the older unfair trading regulations, applying to practices
        from 6 April 2025. Section 230 requires a trader making an
        &ldquo;invitation to purchase&rdquo; to give the total price — and
        the total price <em>includes any fees, taxes, charges or other
        payments that the consumer will necessarily incur</em>.
      </p>
      <p>
        Two details do a lot of work. First, an omission includes presenting
        information in a way that is unclear or untimely, or so that the
        consumer is unlikely to see it — so burying a charge is treated much
        like not mentioning it. Second, a menu is an invitation to purchase:
        the CMA&apos;s{" "}
        <a
          href="https://www.gov.uk/government/publications/unfair-commercial-practices-cma207/unfair-commercial-practices"
          target="_blank"
          rel="noopener noreferrer"
        >
          guidance on unfair commercial practices
        </a>{" "}
        gives a restaurant menu, physical or scanned from a QR code, as an
        example, and says prices need to be displayed before consumers order.
      </p>

      <h2 className="h2">Mandatory charges belong in the price</h2>
      <p>
        The CMA&apos;s{" "}
        <a
          href="https://www.gov.uk/government/publications/price-transparency-cma209"
          target="_blank"
          rel="noopener noreferrer"
        >
          price transparency guidance
        </a>{" "}
        names the restaurant case directly, listing mandatory cover or
        service charges among fees that cannot be avoided and so must sit in
        the total price. Its test is practical: if the consumer has to pay
        the charge in order to receive the advertised product, it is
        mandatory — and calling it a separate &ldquo;extra service&rdquo;
        does not change that.
      </p>

      <h2 className="h2">The grey area nobody has resolved</h2>
      <p>
        Now the common case: a charge added to every bill by default, which
        the restaurant will take off if you ask. Is that a fee you
        &ldquo;will necessarily incur&rdquo;?
      </p>
      <p>
        On a plain reading, no — you can avoid it by asking, so it is not
        part of the total price and need not appear in the headline menu
        price. But the CMA&apos;s guidance does not address this case
        expressly, and the argument on the other side is that a charge
        virtually every customer pays, because virtually nobody knows they
        can decline, is avoidable only in theory. We are not aware of
        guidance or a decision settling it.
      </p>
      <p>
        What is not in doubt is the disclosure half. A default charge still
        has to be communicated clearly and in time, because unclear or late
        presentation is itself an omission.
      </p>

      <h2 className="h2">A longstanding display rule as well</h2>
      <p>
        Separately from all that, longstanding price-marking rules for food
        and drink services require eating places to indicate{" "}
        <a
          href="https://www.legislation.gov.uk/uksi/2003/2253/made"
          target="_blank"
          rel="noopener noreferrer"
        >
          any charge payable in addition to the price of the food
        </a>
        , expressed as an amount or a percentage, at least as prominently as
        the price it relates to. Where there is an eating area, the
        indication has to be displayed at or near the entrance, so an
        intending customer can see it before going in. Great Britain is
        covered by the Price Marking (Food and Drink Services) Order 2003;
        Northern Ireland by{" "}
        <a
          href="https://www.legislation.gov.uk/nisr/2004/369/contents/made"
          target="_blank"
          rel="noopener noreferrer"
        >
          the equivalent 2004 order
        </a>
        . Read alongside the DMCC regime, the direction of travel is the
        same: the charge should be visible before you commit, not after.
      </p>

      <h2 className="h2">What this means at the table</h2>
      <p>
        The law is mostly about what happens before you sit down. It gives
        you a strong position if a charge appeared from nowhere on the bill,
        and much less to argue with if it was on the menu all along. The
        separate question of whether you have to pay a discretionary charge
        is answered by{" "}
        <Link href="/guides/do-you-have-to-pay-a-service-charge">
          contract law rather than any of this
        </Link>
        .
      </p>
      <p className="small-print">
        General information about how these rules work, not legal advice. The
        tipping and transparency rules are also still moving — check the
        current position before relying on it.
      </p>
    </>
  ),
};
