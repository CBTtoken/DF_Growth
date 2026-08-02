"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

// Free text that saves itself.
//
// Everything on the Think board, in the go-away document and in an item's
// notes was originally saved on blur alone. That works on a desktop and is a
// quiet way to lose a paragraph on a phone: switching apps, locking the
// screen or closing a tab does not reliably blur the field first, and what
// was typed is simply gone.
//
// So there are three chances to save: shortly after typing stops, on blur,
// and when the page is hidden. The last one is the important one on a phone,
// because pagehide and visibilitychange are the events an operating system
// actually delivers when someone swipes the app away.
//
// Every ref here is read and written inside an effect or an event handler,
// never while rendering, which is both this project's lint rule and the
// reason the saved marker cannot drift out of step with what is on screen.
export function useAutosave(initial: string, save: (value: string) => Promise<void>, delay = 900) {
  const [value, setValue] = useState(initial);
  const [, start] = useTransition();

  const savedRef = useRef(initial);
  const valueRef = useRef(initial);
  const saveRef = useRef(save);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = useCallback(() => {
    const current = valueRef.current;
    if (current === savedRef.current) return;
    savedRef.current = current;
    start(() => saveRef.current(current));
  }, []);

  // Shortly after typing stops.
  useEffect(() => {
    if (value === savedRef.current) return;
    const timer = setTimeout(flush, delay);
    return () => clearTimeout(timer);
  }, [value, delay, flush]);

  // And whenever the screen goes away, including for good.
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      flush();
    };
  }, [flush]);

  return { value, setValue, flush };
}
