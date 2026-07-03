import type { ReactNode } from "react";
import { PageHeader } from "../PageHeader";

export function PageLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader title={title} description={description} />
      {children}
    </div>
  );
}
