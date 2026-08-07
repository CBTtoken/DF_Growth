// Client-safe photo constants. Deliberately free of any import: the
// wizard's photo step and the dashboard gallery are both "use client"
// components that need the cap to render their own limits, and the
// server-side processing that uses this number pulls in sharp, a native
// Node module that cannot be bundled for the browser. That is why the
// processing lives in photos-server.ts and only the numbers live here.
//
// Sprint "Onboarding two doors" item 3: raised from 10 to 15, matching what
// the done-for-you builds actually use (Davemarly shipped with 15). It also
// cannot live in dashboard/actions.ts, which is a "use server" module where
// every export has to be an async function.
export const PHOTO_CAP = 15;
