import Link from "next/link";
import type { Guide } from "./types";

export const guide: Guide = {
  slug: "vat-on-service-charge",
  title: "VAT on restaurant service charges",
  h1: "VAT on service charges",
  description:
    "A compulsory service charge follows the VAT liability of the meal — standard-rated in a restaurant. A genuinely discretionary one is outside the scope of VAT entirely.",
  updated: "2026-09-25",
  standfirst:
    "A compulsory service charge is part of what the meal costs, so it carries VAT at the same rate as the meal. A genuinely optional one isn't consideration for anything, so it falls outside VAT altogether. The dividing line is whether the customer had a real choice.",
  faqs: [
    {
      q: "Is VAT charged on a restaurant service charge?",
      a: "It depends on whether the charge is compulsory. HMRC's guidance is that compulsory service charges additional to the standard price are part of the consideration for the meal and follow the same VAT liability as the meal. Optional service charges are not consideration where customers have a genuine option whether to pay, and so fall outside the scope of VAT.",
    },
    {
      q: "Does VAT still apply if the service charge goes entirely to staff?",
      a: "For a compulsory charge, yes. HMRC's manual states the treatment holds even where the charge is passed entirely to staff.",
    },
    {
      q: "Is VAT due on a tip?",
      a: "No. A freely given tip is outside the scope of VAT, because it is not part of the consideration for the supply.",
    },
  ],
  body: (
    <>
      <h2 className="h2">The rule</h2>
      <p>
        HMRC&apos;s{" "}
        <a
          href="https://www.gov.uk/hmrc-internal-manuals/vat-supply-and-consideration/vatsc06130"
          target="_blank"
          rel="noopener noreferrer"
        >
          VAT Supply and Consideration manual
        </a>{" "}
        sets out both halves:
      </p>
      <ul>
        <li>
          <strong>Compulsory service charges</strong> that are additional to
          the standard price are part of the consideration for the supply,
          and so follow the same VAT liability as the supply itself. For a
          restaurant meal that means standard-rated; where the underlying
          supply isn&apos;t standard-rated, the charge follows that instead.
        </li>
        <li>
          <strong>Optional service charges</strong> are not consideration
          where customers have a genuine option as to whether to make the
          additional payment, and so fall outside the scope of VAT.
        </li>
        <li>
          <strong>Freely given tips</strong> are outside the scope of VAT for
          the same reason.
        </li>
      </ul>
      <p>
        The logic is straightforward once you see it. VAT attaches to
        consideration — money paid <em>for</em> something. A compulsory
        charge is part of the price of the meal, so it is consideration. A
        payment you were free to withhold is not payment for anything.
      </p>

      <h2 className="h2">Passing it to staff doesn&apos;t change it</h2>
      <p>
        A common assumption is that a charge handed over to the staff must
        fall outside VAT, since the restaurant never keeps it. HMRC is
        explicit that this makes no difference to a compulsory charge: the
        treatment holds even where the charge is passed entirely to
        employees. Where the money goes afterwards is a separate question
        from what the customer was paying for.
      </p>
      <p>
        National Insurance works differently again — on a mandatory charge,{" "}
        <a
          href="https://www.gov.uk/hmrc-internal-manuals/national-insurance-manual/nim02915"
          target="_blank"
          rel="noopener noreferrer"
        >
          NICs are always due
        </a>{" "}
        regardless of how the money is shared out.
      </p>

      <h2 className="h2">A drafting quirk to know about</h2>
      <p>
        If you go looking, VAT Notice 709/1 on catering says at paragraph 2.3
        simply that{" "}
        <a
          href="https://www.gov.uk/guidance/catering-takeaway-food-and-vat-notice-7091"
          target="_blank"
          rel="noopener noreferrer"
        >
          if you make a service charge, it&apos;s standard-rated
        </a>
        , with the carve-out mentioned only for freely given tips. Read
        alone, that sounds like every service charge carries VAT.
      </p>
      <p>
        It doesn&apos;t match HMRC&apos;s fuller guidance, which draws the
        optional/compulsory distinction clearly in the manual above and in{" "}
        <a
          href="https://www.gov.uk/government/publications/e24-tips-gratuities-service-charges-and-troncs/guidance-on-tips-gratuities-service-charges-and-troncs"
          target="_blank"
          rel="noopener noreferrer"
        >
          notice E24
        </a>
        . Anyone relying on this for a business should read the manual and
        E24 alongside 709/1, not 709/1 on its own — and take their
        accountant&apos;s view over ours.
      </p>

      <h2 className="h2">Why a diner might care</h2>
      <p>
        In practice, barely at all: the figure on your bill is 12.5% either
        way, and prices shown to consumers already include any tax. What
        changes is on the restaurant&apos;s side — whether it has to account
        for VAT on what it collects. It matters to a diner mainly because it
        shows how much rides on whether a charge is{" "}
        <Link href="/guides/optional-discretionary-or-mandatory">
          genuinely optional
        </Link>{" "}
        — the tax treatment turns on the same question your bill does.
      </p>
      <p className="small-print">
        General information rather than tax advice. If you run a hospitality
        business, take this to your accountant.
      </p>
    </>
  ),
};
