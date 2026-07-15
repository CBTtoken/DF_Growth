// Copy drawn from Dewald's own framework document
// (03_Standing365_Framework_v2-1.docx, "The Heartbeat" and "What This Book
// Is" sections) — his own authored words for his own book, adapted for a
// landing page rather than invented. Confirm with Dewald before this ships
// if any tightening changed the meaning.
export function About() {
  return (
    <section id="about" className="bg-[#FBF8F3] px-6 py-24">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-[#B8832A]">About this book</p>

        <div className="flex flex-col gap-5 font-[family-name:var(--font-s365-serif)] text-lg leading-relaxed text-[#2E2A22]">
          <p>
            This is not a book for people who have it all together. It&rsquo;s for people in the middle of the mess
            &mdash; the financial pressure, the broken relationships, the unanswered prayers, the 3am darkness
            nobody else sees.
          </p>
          <p>
            It&rsquo;s for the person who was taught not to cry, and has been silently drowning ever since. It&rsquo;s
            for the one who holds everything together for everyone else while quietly falling apart inside. It&rsquo;s
            for the person who isn&rsquo;t sure God is even real &mdash; and is honest enough to admit it.
          </p>
          <p>
            The answer, every single day for 365 days, is that you are not alone. And there is always a next step.
          </p>
        </div>

        <blockquote className="mx-auto max-w-xl border-l-2 border-[#B8832A] py-1 pl-6 font-[family-name:var(--font-s365-serif)] text-xl italic leading-relaxed text-[#16213E]">
          &ldquo;Stumbling and falling in life is a given. Staying down is a choice.&rdquo;
          <footer className="mt-2 text-sm not-italic font-sans font-semibold uppercase tracking-wide text-[#B8832A]">
            Dewald Rosema
          </footer>
        </blockquote>

        <div className="mx-auto mt-4 flex max-w-xl flex-col items-center gap-2 rounded-2xl border border-[#B8832A]/25 bg-white px-8 py-8 text-center">
          <p className="font-[family-name:var(--font-s365-serif)] text-lg italic leading-relaxed text-[#2E2A22]">
            &ldquo;Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not
            give up.&rdquo;
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B8832A]">Galatians 6:9</p>
        </div>
      </div>
    </section>
  );
}
