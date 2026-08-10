export function Topbar({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between bg-gradient-to-b from-surface/30 via-surface/10 to-transparent px-4 pb-4 pt-7 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight md:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}
