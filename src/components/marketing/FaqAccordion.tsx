"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type Faq = { question: string; answer: string };

// Client component only for the open/closed toggle — the FAQ content itself
// is static, page-specific copy, so it's passed in rather than owned here.
export function FaqAccordion({ items }: { items: Faq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-ink">{item.question}</span>
              <ChevronDown
                className={`size-5 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {isOpen && <p className="px-6 pb-5 text-sm leading-relaxed text-gray-600">{item.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}
