import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DepartureBoard } from "@/components/DepartureBoard";
import { Button } from "@/components/ui/button";

type StopPageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function StopPage({ params }: StopPageProps) {
  const { siteId } = await params;

  return (
    <main className="min-h-screen bg-background">
      <section className="container flex max-w-4xl flex-col gap-5 py-6 sm:py-10">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft data-icon="inline-start" />
              Tillbaka
            </Link>
          </Button>
        </div>
        <DepartureBoard siteId={siteId} />
      </section>
    </main>
  );
}
