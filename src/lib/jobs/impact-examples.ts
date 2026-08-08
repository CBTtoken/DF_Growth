// Example prompts for the numbers step, one small curated set per OFO
// sub-major group. Handoff Job 1.
//
// "Three tappable example chips drawn from the person's OFO sub-major
// group. A plumber sees examples like 'houses finished in a week'; a
// cashier sees 'till points covered' or 'customers served a day'. Curate
// these the same way the 320 branch skills were curated, one small set per
// sub-major group."
//
// THEY ARE EXAMPLES ONLY. Tapping one puts the PHRASE in the box for the
// person to finish with their own number, and never inserts a number into
// the CV. There is no number in this file for that exact reason: a chip
// carrying "served 200 customers a day" would be us writing a fact onto
// somebody's CV that nobody checked, which is the one thing this product
// does not do.
//
// The keys are the same 40 sub-major group codes as lib/jobs/ofo-display.ts.
// Keep the two in step: a group with a friendly name and no examples still
// works (it falls back to the general set below), but a group with neither
// is a group nobody curated.

const GENERAL_EXAMPLES = [
  "How many people you worked with",
  "How much you handled in a day",
  "How long you were there",
];

const IMPACT_EXAMPLES: Record<string, string[]> = {
  "11": ["Size of the team you led", "Budget you were responsible for", "Sites or branches you covered"],
  "12": ["People reporting to you", "Budget you managed", "Reports you produced a month"],
  "13": ["Staff on your shift", "Units produced in a day", "Sites you ran"],
  "14": ["Covers served in a night", "Staff on your shift", "Daily takings you were responsible for"],
  "21": ["Projects you worked on", "Size of the site or plant", "People in your team"],
  "22": ["Patients you saw in a day", "Beds on your ward", "Hours on a shift"],
  "23": ["Learners in your class", "Subjects you taught", "Pass rate you achieved"],
  "24": ["Accounts you looked after", "Value of the books you kept", "Staff you paid each month"],
  "25": ["Users your system served", "Tickets you closed a week", "Systems you looked after"],
  "26": ["Cases or clients you handled", "Pieces you produced a month", "People you advised"],
  "31": ["Machines you maintained", "Jobs completed in a week", "Size of the plant"],
  "32": ["Patients you assisted a day", "Tests you ran a week", "Hours on a shift"],
  "33": ["Invoices you processed a month", "Accounts you reconciled", "Value of the books you kept"],
  "34": ["Clients or cases you handled", "Events you ran", "People you worked with"],
  "35": ["Calls or tickets you closed a day", "Machines you looked after", "Users you supported"],
  "41": ["Files you captured a day", "Records you kept", "People you supported in the office"],
  "42": ["Calls you took a day", "Customers you helped a day", "Hours on the phones"],
  "43": ["Invoices you processed a week", "Stock lines you controlled", "Staff you paid"],
  "44": ["Files you filed a day", "Offices you supported", "Post or deliveries you handled"],
  "51": ["Guests you served a shift", "Rooms you covered", "Covers in a night"],
  "52": ["Customers you served a day", "Till points you covered", "Daily takings you handled"],
  "53": ["Children or people in your care", "Hours on a shift", "Families you worked for"],
  "54": ["Site or building size you covered", "Hours on a shift", "Incidents you handled"],
  "61": ["Hectares you worked", "Animals you looked after", "Harvest you brought in"],
  "62": ["Hectares you covered", "Loads you brought in", "Size of the team"],
  "63": ["Hectares you farmed", "Animals you kept", "Markets you supplied"],
  "64": ["Houses finished in a week", "Square metres you laid", "Size of the team you worked in"],
  "65": ["Jobs finished in a week", "Pieces you made a day", "Machines you ran"],
  "66": ["Pieces you finished a day", "Orders you completed a week", "Machines you ran"],
  "67": ["Houses or units you wired", "Call-outs you did a week", "Boards or panels you built"],
  "68": ["Units you made in a day", "Orders you completed a week", "Customers you supplied"],
  "69": ["Jobs finished in a week", "Machines you ran", "Size of the team"],
  "71": ["Machines you operated", "Output in a shift", "Hours on the machine"],
  "72": ["Units you assembled in a shift", "Lines you worked on", "Targets you hit"],
  "73": ["Kilometres you drove a week", "Loads you delivered a day", "Vehicles you drove"],
  "81": ["Rooms or offices you cleaned a day", "Houses you worked in", "Hours on a shift"],
  "82": ["Hectares you worked", "Animals you handled", "Hours in the season"],
  "83": ["Sites you worked on", "Loads you moved a day", "Size of the team"],
  "84": ["Covers you prepped a night", "Hours on a shift", "Size of the kitchen"],
  "85": ["Customers you served a day", "Stock you sold a week", "Days a week you traded"],
  "86": ["Rounds you covered", "Properties you serviced a week", "Size of the team"],
};

/**
 * The three example prompts for whoever this person said they are.
 *
 * `occupationCode` is a full OFO occupation code; the sub-major group is
 * its first two digits, which is the level the curation sits at. An
 * unrecognised or missing code falls back to the general set rather than
 * showing nothing: the examples are what makes the question answerable
 * for somebody who has never been asked it before, so an empty state here
 * is worse than a generic one.
 */
export function impactExamplesFor(occupationCode: string | null | undefined): string[] {
  if (!occupationCode || occupationCode.length < 2) return GENERAL_EXAMPLES;
  return IMPACT_EXAMPLES[occupationCode.slice(0, 2)] ?? GENERAL_EXAMPLES;
}
