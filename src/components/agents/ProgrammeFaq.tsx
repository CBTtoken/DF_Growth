"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AGENT_FAQ } from "@/lib/agents/faq";

// The Bolt design's accordion, fed from AGENT_FAQ rather than from its own
// hardcoded list.
//
// That matters more than it looks. The Bolt file carried its own rewritten
// FAQ answers, several of which state commission rates from the previous
// version of the terms. AGENT_FAQ is Part 2 of agent-terms-and-faq-v2.md,
// it is the same array the main help centre renders, and the terms document
// opens with "They must always say the same thing". Porting the design's
// copy would have put three different sets of rates in front of people.
export function ProgrammeFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-2.5">
      {AGENT_FAQ.map((item, index) => {
        const isOpen = open === index;
        return (
          <div
            key={item.question}
            className={`rounded-xl border transition-all duration-200 ${
              isOpen ? "border-[#1EA7D4]/30 bg-blue-50/30" : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
            >
              <span className="text-[15px] font-semibold text-slate-900 sm:text-base">{item.question}</span>
              <ChevronDown
                size={20}
                aria-hidden
                className={`shrink-0 text-[#1EA7D4] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <p className="px-5 pb-4 text-[15px] leading-relaxed text-slate-600 sm:px-6">{item.answer}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
