import { AlertTriangle, Ban, Clock3 } from "lucide-react";
import { PublicDisplay } from "@/components/PublicDisplay";
import { displayRepository } from "@/server/displayRepository";

type DisplayPageProps = { params: Promise<{ token: string }> };

function DisplayUnavailable({ status }: { status: "invalid" | "revoked" | "expired" }) {
  const content = status === "invalid"
    ? { title: "Ogiltig skärmlänk", detail: "Kontrollera länken eller be administratören skapa en ny token.", Icon: AlertTriangle }
    : status === "expired"
      ? { title: "Skärmlänken har gått ut", detail: "Be administratören förnya skärmens åtkomst.", Icon: Clock3 }
      : { title: "Skärmen är avstängd", detail: "Åtkomsten har återkallats av administratören.", Icon: Ban };
  return <main className="grid min-h-screen place-items-center bg-[#07121f] p-6 text-center text-white"><div><content.Icon className="mx-auto mb-6 size-16 text-amber-300" /><h1 className="text-4xl font-bold">{content.title}</h1><p className="mt-4 max-w-lg text-xl leading-relaxed text-white/65">{content.detail}</p></div></main>;
}

export default async function DisplayPage({ params }: DisplayPageProps) {
  const { token } = await params;
  const result = await displayRepository.resolveToken(token);
  if (result.status !== "valid") return <DisplayUnavailable status={result.status} />;
  return <PublicDisplay display={result.display} />;
}
