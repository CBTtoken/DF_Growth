// Shared by the answers screen (server component) and its client forms —
// a plain value cannot cross a "use client" boundary, so it lives here.
export const GROUP_OPTIONS = [
  { id: "member", label: "Member support (offered behind door 2)" },
  { id: "join", label: "Joining (door 3 follow-ups)" },
  { id: "job", label: "Job requests" },
  { id: "general", label: "General (only you see these)" },
];
