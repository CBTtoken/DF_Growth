"use client";

import { usePathname } from "next/navigation";
import { JOBS_PREFIX } from "@/lib/jobs/host";

/**
 * Client-component counterpart to jobsPath() (which reads headers() and so
 * only works in a Server Component). Infers the same thing a different
 * way: usePathname() reports whatever path this component actually
 * rendered at, which is either the real subdomain's unprefixed path or
 * another hostname's /jobs-prefixed one -- there is no third case, since
 * every Jobs route only ever renders reached one of those two ways.
 */
export function useJobsPath(path: string): string {
  const pathname = usePathname();
  const prefixed = pathname.startsWith(JOBS_PREFIX);
  if (!prefixed) return path;
  return path === "/" ? JOBS_PREFIX : `${JOBS_PREFIX}${path}`;
}
