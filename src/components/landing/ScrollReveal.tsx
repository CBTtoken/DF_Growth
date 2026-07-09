"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// Only used below the hero — CLAUDE.md Section 7 rule 3 is explicit that
// nothing should gate the hero's initial paint behind client-side JS, so the
// hero itself stays a plain server component with no motion-gated
// visibility. This is for everything after it, where a scroll-triggered
// reveal is pure enhancement with nothing to lose if JS is slow to hydrate.
export function ScrollReveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
