"use client";

import { useEffect, useState } from "react";

// The bar across the top of a published edition.
//
// Deliberately thin. A reader came to read, and a magazine that opens with
// a toolbar has already got in its own way. It carries the edition's name,
// how long it is, and a download if the publisher offered one.

export function ReaderControls({
  title,
  publication,
  pages,
  pdfEnabled,
  printHref,
}: {
  title: string;
  publication: string;
  pages: number;
  pdfEnabled: boolean;
  printHref: string;
}) {
  // The page is a fixed physical size, so on a narrow screen it has to be
  // scaled to fit rather than reflowed. Measured rather than guessed from a
  // breakpoint, because a page that is 4mm too wide scrolls sideways and
  // feels broken in a way no reader will report, they will just leave.
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const A4_WIDTH_PX = (210 * 96) / 25.4;
    const fit = () => {
      const available = Math.min(window.innerWidth - 24, 1100);
      setZoom(Math.min(1, available / A4_WIDTH_PX));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--mx-zoom", String(zoom));
  }, [zoom]);

  return (
    <header className="mx-reader__bar">
      <div>
        <span className="mx-reader__pub">{publication}</span>
        <span className="mx-reader__title">{title}</span>
      </div>
      <div className="mx-reader__right">
        <span className="mx-reader__pages">
          {pages} {pages === 1 ? "page" : "pages"}
        </span>
        {pdfEnabled ? (
          <a className="mx-reader__pdf" href={printHref}>
            Download a PDF
          </a>
        ) : null}
      </div>
    </header>
  );
}
