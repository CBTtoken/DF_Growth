# THE ESTATE

**Which repository holds what, and which one to open.**

Every repository has its own `CLAUDE.md` telling you how to work *inside* it.
Nothing told you which one to be in, and that gap has already cost real time:
a session was opened in a folder called `Claude Projects`, read a build spec
about firearm licence applications, and had to work out that the job in hand
belonged to a different repository entirely.

Read this first. It is the only cross-repository document.

Its companion is `STACK.md`: what everything runs on, what we pay for, and
where the limits are.

Last verified 3 August 2026.

---

## THE MAP

| Folder on disk | Git repository | What is actually in it |
|---|---|---|
| `Personal/Projects/Claude Projects` | `fortislex-mvp` | **FortisLex.** The folder name is misleading, see below. |
| `Personal/Projects/DigitalFlyer Growth` | `DF_Growth` | **Growth, KatisoBiz, Kwaai Press, The Board, The Desk, moxiemag.co.za.** The big one. |
| `Personal/Projects/DigitalFlyer WhatsApp` | `DF-WhatsApp` | WhatsApp, live at `df-whats-app.vercel.app` |
| `Personal/Projects/Vowie` | `Vowie` | Vowie |
| `Helplift/helplift-app` | `helplift` | HelpLift |

### The folder that catches people out

**`Personal/Projects/Claude Projects` is the FortisLex application.** It is not
a parent folder for all Claude work, which is what the name suggests. Its
`CLAUDE.md` is the FortisLex build spec and is correct for FortisLex only.

If you are opened there and the work is not FortisLex, you are in the wrong
repository. Change directory before doing anything else.

**Do not rename this folder, and do not suggest renaming it.** Sessions are
launched from there on purpose. The assistant's memory namespace is derived
from that exact path, so renaming the folder would orphan every memory file
and each session would start knowing nothing. Launching from a project
subfolder instead has the same effect.

An earlier version of this document recommended the rename. It was wrong, and
the reason it was wrong is not visible from the folder itself, which is
exactly why it is written down here.

The name is confusing and stays confusing. `WHERE-AM-I.md` in that folder is
the mitigation: it costs nothing and it survives.

### Folders that look like projects and are not

These contain no git repository. They are notes, assets or abandoned starts,
and none of them is a codebase to build in:

`FortisLex/`, `DigtialFlyer BizUp/`, `DigitalFlyer Rebuild/`,
`DigitalFlyer Page Building/`, `Discovery Engine/`, `Docs/`, `Marketing/`,
`Henry Firearm license/`

Note the trap: `FortisLex/` has no code in it. The FortisLex code is in
`Claude Projects/`.

---

## WHAT IS LIVE, AND WHERE

| System | Lives at | Repository | Supabase project |
|---|---|---|---|
| Growth | `growth.digitalflyersa.co.za` | DF_Growth | `cjqvelgarwfiskgtmrkm` |
| KatisoBiz | `katisobiz.co.za` | DF_Growth | `cjqvelgarwfiskgtmrkm` |
| Kwaai Press / Moxie builder | `katisobiz.co.za/kwaaipress/moxie` | DF_Growth | `cjqvelgarwfiskgtmrkm` |
| Moxie public site | `moxiemag.co.za` | DF_Growth | `cjqvelgarwfiskgtmrkm` |
| The Board | inside Growth | DF_Growth | `cjqvelgarwfiskgtmrkm` |
| The Desk | `/desk`, one user | DF_Growth | `cjqvelgarwfiskgtmrkm` |
| HelpLift | `www.helplift.co.za` | helplift | `ojfigdbjrpojuqcrkagc` |
| FortisLex | `fortislex.co.za` | fortislex-mvp | `nexixfgdpitzvpgtrneb` |

Five products share one Supabase project and one deployment. That is
deliberate, it is why they share a repository, and `CLAUDE.md` section 0.0
says plainly not to "tidy" it by splitting them.

### On Vercel, everything is one team

All four Vercel projects live under the single **`digital-flyer`** team:

| Vercel project | Serves |
|---|---|
| `df-growth` | Growth, KatisoBiz, Kwaai Press, The Board, The Desk, moxiemag |
| `helplift` | HelpLift |
| `fortislex-mvp` | FortisLex |
| `df-whats-app` | WhatsApp |

**One team-scoped API token reaches all four.** There is no per-project token
in Vercel, so a token scoped to `digital-flyer` is the whole estate and three
separate tokens are not needed.

If a token dialog warns about `NON_SAML`, it is safe to ignore. It means the
token cannot reach teams protected by SAML single sign-on, which is an
Enterprise feature not in use here.

---

## WHERE TO WORK, BY TASK

| The job | Open this |
|---|---|
| Anything Growth: pages, shop, members, marketplace, agents | `DigitalFlyer Growth` |
| KatisoBiz invoicing and quoting | `DigitalFlyer Growth` |
| Moxie, the magazine builder or the public site | `DigitalFlyer Growth` |
| The Board, The Desk | `DigitalFlyer Growth` |
| A done-for-you client build | `DigitalFlyer Growth`, and read the Growth Build Kit |
| HelpLift | `Helplift/helplift-app` |
| FortisLex | `Claude Projects` |

If the task spans two repositories, do them as two pieces of work. There is no
shared code between them and nothing that makes a single change span both.

---

## BEFORE YOU START, IN ORDER

1. Confirm which repository the task belongs to, using the table above.
2. `git pull`. Other sessions run against `DF_Growth` at the same time and
   cannot see you.
3. Read that repository's `CLAUDE.md`. In `DF_Growth`, section 0.0 is the
   part that stops sessions colliding, and it is not optional.
4. Read the relevant handoff. `docs/DOCUMENT_INDEX.md` says where each one is
   and which are superseded.

## BEFORE YOU FINISH

1. `npm run check` and `npm run lint` in `DF_Growth`. The house style check
   tests itself first and will refuse to run if it is broken.
2. Commit only the paths you changed. `git add -A` sweeps up other sessions'
   work, which is why section 0.0 forbids it.
3. Main is production the moment it is pushed. There is no staging step.
4. Verify against the live site with a string the page actually renders, not
   a status code and not a build log.

---

## COSTS, SO THEY DO NOT DRIFT

Build CPU is the largest line on the Vercel bill by a wide margin: 59 hours in
the August 2026 cycle, $12.56 of a $15.08 infrastructure total, everything
else in cents.

`vercel.json` runs `scripts/should-build.mjs` as an Ignored Build Step, which
skips the build when a commit changes only documentation. Keep it working. If
builds start running on markdown commits again, that is a quarter of the
biggest line on the bill going to waste.

Batching related work into one push rather than pushing after every change is
the other half of it.
