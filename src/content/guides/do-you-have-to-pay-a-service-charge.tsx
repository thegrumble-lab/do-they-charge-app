import Link from "next/link";
import type { Guide } from "./types";

export const guide: Guide = {
  slug: "do-you-have-to-pay-a-service-charge",
  title: "Do you have to pay a discretionary service charge?",
  h1: "Do you have to pay it?",
  description:
    "If a service charge is genuinely discretionary, you can ask for it to be removed. Where that comes from, when it doesn't apply, and how to actually say it.",
  updated: "2026-09-25",
  standfirst:
    "If the charge is genuinely discretionary, no — you can ask for it to be taken off, and the restaurant should take it off. If it was presented as mandatory and disclosed before you ordered, it's part of the price and you owe it. Almost every awkward moment comes from not knowing which of those two you're dealing with.",
  faqs: [
    {
      q: "Can I refuse to pay a discretionary service charge in the UK?",
      a: "Yes. Where a charge is presented as discretionary or optional, there is no obligation to pay it. The government's own response to its tipping consultation states that the consumer is free to make the payment or not. Ask politely for it to be removed and the restaurant should remove it.",
    },
    {
      q: "Is it illegal to refuse a service charge?",
      a: "No. Declining a genuinely discretionary charge is not an offence and is not a failure to pay your bill. You still owe the cost of the food and drink you ordered.",
    },
    {
      q: "What if the service charge is described as mandatory?",
      a: "A compulsory service charge that was disclosed before you ordered forms part of the price you agreed, as a matter of contract. HMRC's National Insurance guidance proceeds on the same basis, stating that where a service charge is compulsory the customer is obliged to pay. If it was never disclosed until the bill arrived, that is a different argument — raise it there and then.",
    },
    {
      q: "How do I ask for the service charge to be removed?",
      a: "Ask before you pay, not after. 'Could you take the service charge off, please?' is enough — no reason is required, and you do not have to justify it.",
    },
  ],
  body: (
    <>
      <h2 className="h2">Where the answer comes from</h2>
      <p>
        There is no statute that says &ldquo;a customer may refuse a service
        charge&rdquo;. The answer sits in ordinary contract law, and{" "}
        <a
          href="https://www.gov.uk/hmrc-internal-manuals/vat-supply-and-consideration/vatsc06130"
          target="_blank"
          rel="noopener noreferrer"
        >
          HMRC&apos;s VAT manual
        </a>{" "}
        sets the reasoning out, citing the tribunal decision in{" "}
        <em>James Dominic Joyce</em>: the contract between the restaurant and
        the customer was created by the terms of the menu, and since the bill
        comes later — after the contract has been made and the supply
        completed — it cannot change the terms already agreed. HMRC draws
        that conclusion for VAT purposes, in the case where the menu says
        service is optional, but the contract logic is the same one that
        answers the question at the table.
      </p>
      <p>
        In other words: what you agreed to pay was settled when you ordered.
        A charge the restaurant adds afterwards, and describes as
        discretionary, is an invitation rather than an obligation. The
        government put it in one sentence in its{" "}
        <a
          href="https://assets.publishing.service.gov.uk/media/614c744dd3bf7f718c7580d6/tipping-consultation-government-response.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          response to the tipping consultation
        </a>
        : the consumer is free to make the payment or not — adding, in the
        same breath, that consumers are largely unaware of this and feel
        obliged to pay.
      </p>

      <h2 className="h2">When you do owe it</h2>
      <p>
        Whether you owe a compulsory charge is ordinary contract law: if it
        was stated on the menu before you ordered, it was part of the deal.
        HMRC proceeds on the same footing —{" "}
        <a
          href="https://www.gov.uk/hmrc-internal-manuals/national-insurance-manual/nim02915"
          target="_blank"
          rel="noopener noreferrer"
        >
          its National Insurance manual
        </a>{" "}
        states that where a service charge is compulsory, the customer is
        obliged to pay — though that guidance is about tax treatment rather
        than your contract with the restaurant, and it says nothing about
        when the charge has to be disclosed. Large-group policies are the
        usual case — a venue
        that says &ldquo;parties of eight or more, 12.5% service is
        added&rdquo; on the menu has made that a term of the deal.
      </p>
      <p>
        The label is not the last word, though. HMRC looks at how the charge
        is presented: a payment counts as voluntary only if it is{" "}
        <em>clearly presented to the customer as an entirely optional
        payment</em>, with the menu and what staff say pointing the same way.
        Note the converse, which HMRC states expressly — the fact that
        customers rarely refuse a charge{" "}
        <em>does not affect the true nature of the payment</em>. A charge can
        be genuinely voluntary even where almost everyone pays it.
      </p>

      <h2 className="h2">How to actually ask</h2>
      <p>
        The practical problem is rarely legal. It is that asking feels rude,
        in front of the person who has just served you. Some things that
        make it easier:
      </p>
      <ul>
        <li>
          <strong>Ask before you pay.</strong> Once the card has gone
          through, you are asking for a refund rather than a correction, and
          that is a longer conversation.
        </li>
        <li>
          <strong>Keep it short.</strong> &ldquo;Could you take the service
          charge off, please?&rdquo; You do not owe an explanation, and
          offering one invites a negotiation you did not want.
        </li>
        <li>
          <strong>Separate it from the service.</strong> If you thought the
          service was good and would rather the money reached the staff, a
          cash tip does that directly. Declining a charge is not a verdict on
          anyone&apos;s work.
        </li>
        <li>
          <strong>Check the machine.</strong> Card terminals often present a
          tip prompt on top of a service charge already on the bill. Paying
          both is easy to do by accident.
        </li>
      </ul>

      <h2 className="h2">If they refuse</h2>
      <p>
        A restaurant that insists on a charge it described as discretionary
        is contradicting its own menu. Ask to speak to the manager, keep the
        bill, and pay the balance you do owe — the food and drink. The charge
        being unenforceable does not make the rest of the bill unenforceable,
        and walking out without paying for what you ordered turns a small
        disagreement into something else entirely.
      </p>

      <h2 className="h2">Better: know before you go</h2>
      <p>
        Every part of this is easier before you book.{" "}
        <Link href="/">Search the directory</Link> for the restaurant, or{" "}
        <Link href="/browse">browse by area</Link> to see what places near you
        do. If you&apos;ve been somewhere recently, adding what happened on
        your bill takes a few seconds and is the only reason any of this data
        exists.
      </p>
      <p className="small-print">
        This is general information about how service charges work, not legal
        advice. If a specific bill has gone badly wrong, take proper advice on
        it.
      </p>
    </>
  ),
};
