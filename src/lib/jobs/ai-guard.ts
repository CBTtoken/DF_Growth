// The gate between "our AI does not make things up" and a fabricated
// number on somebody's CV.
//
// Its own module, with no imports, for two reasons. It is the single most
// consequential rule in this product, so it should be readable on its own
// and testable without booting anything. And it is used by both the write
// path and the tailor path, which must apply exactly the same test: a
// rebuild aimed at a job advert is the place where a model is most tempted
// to reach for a number the person never gave it.

/**
 * Every numeral in the output must appear in the input. Returns the ones
 * that do not, so a rejection can be logged usefully rather than as a
 * bare "failed".
 *
 * Handoff Job 1: "No number may ever appear in a bullet that the person
 * did not enter. Extend the existing invented-year rejection check to
 * reject any numeral in the output that does not appear in the input."
 *
 * Deliberately in code rather than in the prompt. A prompt is a request.
 * This is a gate. A fabricated number is the version of this failure a
 * person gets caught out on in an interview, and they would have no way
 * of knowing it was not their own claim.
 *
 * Written-out numbers ("three", "hundreds of") are not covered by a
 * numeric check and are left to the prompt's ban on unstated facts.
 * Digits are what people get burned by, and digits are checkable.
 */
/**
 * Pull the numbers out of a piece of text as comparable values.
 *
 * The first alternative matches a number carrying thousands separators,
 * so "15 000" and "1,250,000" each come back as ONE number. The second
 * matches a plain run of digits. Order matters: the grouped form has to
 * be tried first or "15 000" arrives as 15 and 000.
 *
 * The grouped form deliberately requires the trailing groups to be
 * exactly three digits. That is what keeps two adjacent years apart:
 * "2019 2021" is a four-digit lead, so it can never be read as one number
 * of 20192021, and both years survive as themselves. Getting this wrong
 * silently broke year checking, which is how it was found.
 */
function numbersIn(text: string): Set<string> {
  const matches = text.match(/\d{1,3}(?:[ ,]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) ?? [];
  // "15 000", "15,000" and "15000" are the same fact written three ways.
  // Rejecting on a separator would be a false positive that costs an
  // honest person their rewrite.
  return new Set(matches.map((m) => m.replace(/[\s,]/g, "")));
}

export function inventedNumbers(texts: string[], sourceText: string): string[] {
  const source = numbersIn(sourceText);
  // Exact values, not substrings. A substring test looks safely
  // permissive and is not: with "R15 000" in the source it silently
  // accepted an invented "500", because 500 sits inside 15000. Exact
  // matching also makes the check stricter in the right direction, since
  // a model turning a person's "2020" into "20 years" is a fabrication
  // and should be caught.
  return [...numbersIn(texts.join(" "))].filter((n) => !source.has(n));
}

// ---------------------------------------------------------------
// The tailored rebuild's gate: claims the advert asked for that the
// person's own CV cannot support.
// ---------------------------------------------------------------
//
// Mirroring an advert's words is the highest-return tactic a candidate
// has, and the strongest pull towards fabrication a language model will
// ever feel: the advert says "forklift licence" in bold, the person has
// never driven one, and every instinct in the model is to bridge that
// gap. So the words they cannot support are computed BEFORE the call and
// handed over as an explicit ban, then checked again AFTER it. The prompt
// is the request; this is the guarantee.

// Words too common to carry a claim. An advert and a CV will share these
// whatever either says, so treating them as requirements would reject
// every honest rewrite.
const STOPWORDS = new Set([
  "about", "above", "after", "again", "against", "along", "among", "around", "because",
  "before", "being", "below", "between", "both", "could", "during", "each", "every",
  "have", "having", "here", "into", "itself", "more", "most", "must", "need",
  "other", "over", "same", "should", "since", "some", "such", "than", "that", "their",
  "them", "then", "there", "these", "they", "this", "those", "through", "under", "until",
  "very", "were", "what", "when", "where", "which", "while", "will", "with", "would",
  "your", "you", "our", "ability", "able", "applicant", "applicants", "apply", "candidate",
  "candidates", "company", "duties", "employer", "essential", "experience", "including",
  "job", "join", "looking", "opportunity", "position", "preferred", "provide",
  "required", "requirements", "responsibilities", "role", "salary", "seeking", "skills",
  "successful", "suitable", "team", "vacancy", "work", "working", "years",
]);

/**
 * Reduce a word to something two spellings of it can share, so "customers"
 * on the CV covers "customer" in the advert. Crude on purpose: an
 * over-clever stemmer produces false MATCHES, and a false match here means
 * a claim the person cannot back up gets through the gate.
 */
function stem(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(ing|ers|er|es|s)$/, "");
}

function stemsOf(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z][a-z0-9'-]{3,}/g) ?? [];
  return new Set(words.filter((w) => !STOPWORDS.has(w)).map(stem));
}

/**
 * The advert's words that this person's own CV cannot support: anything
 * in the advert, not a stopword, and absent from everything they wrote.
 *
 * Capped, because a long advert produces a long list and a ban is only
 * useful if the model can hold it. The cap takes the longest words first:
 * "refrigeration" and "forklift" are what get somebody caught out in an
 * interview, not "daily".
 */
export function unsupportedTerms(advertText: string, cvText: string, cap = 40): string[] {
  const owned = stemsOf(cvText);
  const advertWords = advertText.toLowerCase().match(/[a-z][a-z0-9'-]{3,}/g) ?? [];

  const unsupported = new Set<string>();
  for (const word of advertWords) {
    if (STOPWORDS.has(word)) continue;
    if (owned.has(stem(word))) continue;
    unsupported.add(word);
  }

  return [...unsupported].sort((a, b) => b.length - a.length).slice(0, cap);
}

/** Did the rewrite claim something the person cannot support? */
export function claimsUnsupported(texts: string[], unsupported: string[]): string[] {
  const outStems = stemsOf(texts.join(" "));
  return unsupported.filter((term) => outStems.has(stem(term)));
}

/**
 * A tailored rebuild may reorder and re-word what a person has. It may
 * never add a skill they do not have.
 *
 * Handoff Job 5: "It may never add a skill, a duty, a date or a number
 * that is not already on the person's CV. If the advert asks for
 * something they do not have, the rebuild simply does not claim it."
 *
 * So the model's proposed skill order is filtered against what is
 * actually stored, rather than trusted. Anything it invented is dropped;
 * anything it omitted is appended, because a tailored CV that quietly
 * deleted half somebody's skills would be its own kind of damage.
 */
export function reconcileSkillOrder(proposed: string[], owned: string[]): string[] {
  const ownedByLower = new Map(owned.map((s) => [s.trim().toLowerCase(), s]));

  const kept: string[] = [];
  const seen = new Set<string>();
  for (const p of proposed) {
    const key = p.trim().toLowerCase();
    const real = ownedByLower.get(key);
    if (real && !seen.has(key)) {
      kept.push(real);
      seen.add(key);
    }
  }

  const rest = owned.filter((s) => !seen.has(s.trim().toLowerCase()));
  return [...kept, ...rest];
}
