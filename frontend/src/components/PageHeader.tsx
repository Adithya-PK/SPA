export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-primary">Student Performance Analyzer</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-normal text-foreground md:text-3xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
