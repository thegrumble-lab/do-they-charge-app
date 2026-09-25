import Link from "next/link";
import type { Guide } from "./types";

export const guide: Guide = {
  slug: "where-does-the-service-charge-go",
  title: "Where does the service charge actually go?",
  h1: "Where does the money go?",
  description:
    "Since October 2024, UK employers must pass on 100% of tips and service charges to staff. What that law requires, what it doesn't, and what's changing.",
  updated: "2026-09-25",
  standfirst:
    "Since 1 October 2024 the answer is: to the staff. The Employment (Allocation of Tips) Act 2023 requires employers to pass on tips and service charges in full, with no deductions beyond things like income tax. Before that date, it genuinely varied.",
  faqs: [
    {
      q: "Do staff get the service charge in the UK?",
      a: "Since 1 October 2024, yes. The Employment (Allocation of Tips) Act 2023 requires employers to pass on all qualifying tips and service charges to workers without deductions, other than limited cases such as income tax.",
    },
    {
      q: "Does the law cover card payments as well as cash?",
      a: "Yes. The payment method does not determine whether a tip qualifies, and the statutory Code notes employers are likely to receive tips paid by card.",
    },
    {
      q: "When must tips be paid out?",
      a: "By the end of the month following the month in which the customer paid them.",
    },
    {
      q: "Can staff see how tips were shared out?",
      a: "Yes. A worker can make a written request, limited to one per three months, to view their employer's tipping record going back up to three years.",
    },
  ],
  body: (
    <>
      <h2 className="h2">What changed in October 2024</h2>
      <p>
        The{" "}
        <a
          href="https://www.legislation.gov.uk/ukpga/2023/13"
          target="_blank"
          rel="noopener noreferrer"
        >
          Employment (Allocation of Tips) Act 2023
        </a>{" "}
        came into force on 1 October 2024, along with a statutory{" "}
        <a
          href="https://www.gov.uk/government/publications/distributing-tips-fairly-statutory-code-of-practice/code-of-practice-on-fair-and-transparent-distribution-of-tips-html-version"
          target="_blank"
          rel="noopener noreferrer"
        >
          Code of Practice
        </a>
        . Together they require employers to:
      </p>
      <ul>
        <li>
          pass on all qualifying tips and service charges to workers, with no
          deductions beyond limited cases such as income tax;
        </li>
        <li>allocate them fairly, and have a written tipping policy;</li>
        <li>
          keep a record of tips received and how they were distributed,
          retained for three years;
        </li>
        <li>
          pay them out by the end of the month following the month the
          customer paid;
        </li>
        <li>
          apply all of this to <em>all</em> workers, with the Act expressly
          extending it to eligible agency workers.
        </li>
      </ul>
      <p>
        The government estimated the change would{" "}
        <a
          href="https://www.gov.uk/government/news/millions-to-take-home-more-cash-as-new-guidance-on-tipping-is-published"
          target="_blank"
          rel="noopener noreferrer"
        >
          protect the tips of more than two million workers
        </a>
        , and its own factsheet puts the sum at{" "}
        <a
          href="https://assets.publishing.service.gov.uk/media/695fc5c444a6f04b0a5a5adc/tips-and-gratuities-factsheet.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          around £200 million of tips a year
        </a>{" "}
        that employers had previously retained.
      </p>

      <h2 className="h2">Card payments count</h2>
      <p>
        This is the question people ask most, because the old suspicion was
        that card tips vanished into the business while cash reached the
        table. The Code is explicit that the payment method does not
        determine whether a tip qualifies, and that employers are likely to
        receive tips paid by card. Service charges are squarely covered: the
        Code defines one as an amount added to the customer&apos;s bill
        before the bill is presented.
      </p>

      <h2 className="h2">What the law does not do</h2>
      <p>
        It does not stop a restaurant adding a service charge, and it does
        not set the rate. It does not require the charge to be split evenly,
        only fairly — a distinction that leaves room for kitchen and
        front-of-house shares, hours worked, and role. And it does not
        require anyone to tell <em>you</em>, the diner, how the money is
        divided. Fair allocation is owed to the staff, not to the customer.
      </p>

      <h2 className="h2">What&apos;s changing next</h2>
      <p>
        Section 14 of the Employment Rights Act 2025 adds a consultation
        duty: employers will have to consult staff before setting or revising
        a tipping policy, review it at least every three years, and give
        workers a written anonymised summary of the views expressed.
      </p>
      <p>
        As of late September 2026 this is not yet in force. The government
        is consulting on a revised Code — the consultation opened on 19
        August 2026 and closes on 29 September 2026, after an earlier draft
        was withdrawn in July 2026 following union objections. Its own
        documents give slightly different target dates —{" "}
        <a
          href="https://www.gov.uk/government/publications/implementing-the-plan-to-make-work-pay-and-employment-rights-act/plan-to-make-work-pay-and-employment-rights-act-timeline-update"
          target="_blank"
          rel="noopener noreferrer"
        >
          the implementation timeline
        </a>{" "}
        says by the end of 2026, while the consultation says late 2026,
        subject to Parliament approving the revised Code. Take the date as
        approximate until commencement regulations actually appear.
      </p>

      <h2 className="h2">So should you still tip on top?</h2>
      <p>
        Entirely your call, and the law is neutral on it. What has changed is
        that the old argument for tipping in cash — that it was the only way
        to be sure the money reached the person who served you — carries much
        less weight than it did before October 2024.
      </p>
      <p>
        What the law still doesn&apos;t give you is advance notice that a
        charge is coming at all. That part is{" "}
        <Link href="/">what this directory is for</Link>.
      </p>
      <p className="small-print">
        General information, not legal advice — and note that the tipping
        rules are addressed to employers, so anyone dealing with their own
        workplace situation should take proper advice.
      </p>
    </>
  ),
};
