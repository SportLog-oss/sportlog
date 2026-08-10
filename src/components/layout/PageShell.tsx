import { Topbar } from "./Topbar";

export function PageShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_38%_-10%,rgba(37,216,207,0.055),transparent_32rem)]">
      <Topbar title={title} subtitle={subtitle} action={action} />
      <main className="space-y-5 px-4 pb-28 pt-4 sm:space-y-6 sm:px-6 sm:pb-10 sm:pt-5 lg:px-8">{children}</main>
    </div>
  );
}
