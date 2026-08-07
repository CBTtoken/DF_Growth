import type { ApplicationMessage } from "@/lib/jobs/messages";

// One conversation, used identically by the employer's applicant screen and
// the seeker's application screen. Same component both ways so the two
// sides cannot drift apart, the same reasoning as VacancyAdvert being
// shared by the public advert and the employer's preview.
//
// Server-rendered with a plain form: no client JS, which matters on the
// phones these people are actually using.
export function MessageThread({
  messages,
  myRole,
  otherName,
  action,
  applicationId,
  maxLength,
  emptyText,
  placeholder,
}: {
  messages: ApplicationMessage[];
  myRole: "employer" | "candidate";
  /** Who is on the other end, named, so nobody wonders who they are talking to. */
  otherName: string;
  action: (formData: FormData) => Promise<void>;
  applicationId: string;
  maxLength: number;
  emptyText: string;
  placeholder: string;
}) {
  return (
    <div>
      {messages.length === 0 ? (
        <p className="mt-1 text-sm text-neutral-600">{emptyText}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {messages.map((m) => {
            const mine = m.senderRole === myRole;
            return (
              <li key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    mine ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-900"
                  }`}
                >
                  <p className={`text-xs font-semibold ${mine ? "text-white/60" : "text-neutral-500"}`}>
                    {mine ? "You" : otherName}
                    {" · "}
                    {new Date(m.createdAt).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm">{m.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form action={action} className="mt-4 flex flex-col gap-2">
        <input type="hidden" name="applicationId" value={applicationId} />
        <textarea
          name="body"
          rows={3}
          required
          maxLength={maxLength}
          placeholder={placeholder}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base text-neutral-900 outline-none focus:border-neutral-900"
        />
        <button
          type="submit"
          className="self-start rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Send message
        </button>
      </form>
    </div>
  );
}
