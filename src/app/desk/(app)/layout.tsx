import { requireDeskUser } from "@/lib/desk/auth";
import { DeskNav } from "@/components/desk/DeskNav";

// Everything inside this group is behind the session gate. The login screen
// sits outside it, which is why the gate can live in a layout rather than
// being repeated on every page.
export default async function DeskAppLayout({ children }: { children: React.ReactNode }) {
  await requireDeskUser();

  return (
    <>
      {/* Bottom padding clears the nav, plus the iPhone home indicator. */}
      <main className="flex-1 pb-28">{children}</main>
      <DeskNav />
    </>
  );
}
