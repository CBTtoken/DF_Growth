// Every word a guest reads, in one file.
//
// Handoff: "Stop and ask Dewald: ... all guest-facing copy." It is written
// here so the whole of it can be quoted in the report and changed in one
// place afterwards, rather than being scattered through a dozen components
// where approving it would mean reading the components.
//
// House style: no em dashes, South African English, Rand, plain words a
// guest would use. Never "reservation", never "inventory", never "unit".

export const STAY_COPY = {
  sectionTitle: "Stay with us",
  sectionLead: "Choose your dates and we will show you what is free.",

  checkIn: "Check in",
  checkOut: "Check out",
  adults: "Adults",
  children: "Children",
  search: "See what is available",

  resultsTitle: "What is available",
  resultsLead: (nights: number, from: string, to: string) =>
    `${nights} ${nights === 1 ? "night" : "nights"}, ${from} to ${to}.`,

  nothingAvailable: "Nothing is free for those dates",
  nothingAvailableBody:
    "We have no rooms open for the dates and party size you chose. Try different dates, or send us a message and we will tell you what else we can do.",

  perNight: "per night",
  totalForStay: "Total for your stay",
  depositNow: "Pay now to secure it",
  balanceLater: (days: number) =>
    `The rest is due ${days === 0 ? "on arrival" : `${days} ${days === 1 ? "day" : "days"} before you arrive`}.`,
  roomsLeft: (n: number) => (n === 1 ? "Only one left" : `${n} left`),

  bookThis: "Book this room",
  yourDetails: "Your details",
  name: "Your name",
  email: "Email address",
  phone: "Phone number",
  payDeposit: "Pay the deposit",
  requestBooking: "Request this room",

  holdNotice: "We hold this room for five minutes while you pay.",
  termsHeading: "Cancellation",

  // The confirmation
  confirmedTitle: "You are booked",
  requestedTitle: "We have your booking",
  confirmedBody: (business: string) =>
    `Thank you. ${business} has your deposit and your dates are held in your name.`,
  requestedBody: (business: string, phone: string | null) =>
    `Thank you. ${business} has your booking and will contact you${phone ? ` on ${phone}` : ""} to arrange payment.`,
  cancelledTitle: "This booking was cancelled",
  cancelledBody: (business: string) =>
    `${business} cancelled this booking. If that is not what you expected, please contact them.`,

  chatHeading: "Message the owner",
  chatLead: "Anything you need before you arrive, ask here. They get an email and reply in the same place.",
  chatPlaceholder: "Ask about arrival times, directions, breakfast, anything",
  chatSend: "Send",
  chatSent: "Sent. They will get an email and reply here.",
} as const;

export const TOUR_COPY = {
  sectionTitle: "Explore with us",
  sectionLead: "Trips we run ourselves.",
  seeTour: "See this trip",

  seatsLeft: (n: number) => (n === 1 ? "One seat left" : `${n} seats left`),
  fullyBooked: "Fully booked",
  fullyBookedBody:
    "This trip is full. Leave your name and we will let you know as soon as we set the next date.",
  waitlistButton: "Tell me about the next one",
  waitlistSent: "Thank you. We will be in touch when the next date is set.",

  people: "How many people",
  seats: "How many seats",
  bookSeats: "Book your seats",
  perPerson: "per person",
  departs: "Departs",
  meetAt: "Meeting point",
  howLong: "How long",
  whatWeDo: "What we do",
  itinerary: "The plan for the day",
} as const;

export const SHARED_COPY = {
  botCheckFailed: "We could not confirm you are a person. Please reload the page and try again.",
  tooManyTries: "Too many attempts, please wait a few minutes and try again.",
  justTaken: "Somebody just took that. Please choose something else.",
  somethingWentWrong: "Something went wrong. Please try again.",
  noLongerAvailable: "That is no longer available.",
} as const;
