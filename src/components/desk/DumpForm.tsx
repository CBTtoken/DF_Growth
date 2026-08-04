"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, MicOff } from "lucide-react";
import { captureItems } from "@/app/desk/(app)/actions";
import { field, primaryButton } from "@/components/desk/Shell";

// Capture, and nothing else. One box, one button, usable in under five
// seconds with one thumb.
//
// spellcheck is off, autocorrect is off, autocapitalise is off and there is
// no validation beyond "not empty". The operator is dyslexic and types fast:
// a red squiggle in this box would kill the habit the whole tool depends on.
//
// The box only clears once the server has confirmed the save. If it fails the
// words are still there.

// The browser's own speech recognition, typed by hand because TypeScript's
// DOM lib still calls it experimental. No audio leaves through our code and
// nothing new is stored: what he says lands in the box as text, exactly like
// typing, and he still reads it and presses Save.
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Browser support never changes mid-session, so the store never notifies.
// The server snapshot is false, which keeps the server render honest and the
// button appearing only once the browser has said yes.
const neverNotify = () => () => {};
const hasRecognition = () => getRecognitionCtor() !== null;
const noRecognitionOnServer = () => false;

export function DumpForm() {
  const [state, formAction, pending] = useActionState(captureItems, null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const canListen = useSyncExternalStore(neverNotify, hasRecognition, noRecognitionOnServer);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (state?.saved) {
      if (boxRef.current) boxRef.current.value = "";
      boxRef.current?.focus();
    }
  }, [state]);

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  function toggleListening() {
    if (listening) {
      stopListening();
      return;
    }

    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();

    recognition.lang = "en-ZA";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const box = boxRef.current;
      if (!box) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        const spoken = result[0].transcript.trim();
        if (!spoken) continue;
        box.value = box.value ? `${box.value.replace(/\s+$/, "")} ${spoken}` : spoken;
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <textarea
        ref={boxRef}
        name="dump"
        rows={7}
        autoFocus
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        data-gramm="false"
        placeholder="What is in your head"
        className={`${field} resize-y leading-relaxed`}
      />

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={`${primaryButton} flex-1`}>
          {pending ? "..." : "Save"}
        </button>
        {canListen ? (
          <button
            type="button"
            onClick={toggleListening}
            aria-label={listening ? "Stop talking" : "Talk instead of typing"}
            className={`rounded-2xl border px-5 transition-colors ${
              listening
                ? "border-red-300 bg-red-50 text-red-600"
                : "border-neutral-300 bg-white text-neutral-600"
            }`}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        ) : null}
      </div>

      {listening ? (
        <p className="text-sm text-red-600">Listening. Talk normally; your words land in the box.</p>
      ) : null}
      {state?.saved ? (
        <p className="text-sm text-neutral-500">
          {state.saved === 1 ? "Saved." : `Saved ${state.saved} items.`}
        </p>
      ) : null}
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <p className="text-xs leading-relaxed text-neutral-400">
        Write as much as you like. A blank line starts a new item, so a paragraph stays one thought. A
        line that starts with a dash or a number also starts a new one, so a pasted list stays a list.
        {canListen ? " The microphone types for you; it saves nothing by itself." : ""}
      </p>
    </form>
  );
}
