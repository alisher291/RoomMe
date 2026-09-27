import { notFound } from "next/navigation";
import { candidateById, candidates } from "@/lib/candidates";
import { ChatWindow } from "@/components/ChatWindow";
export default async function Chat({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  if (!candidateById(candidateId)) notFound();
  return <ChatWindow key={candidateId} id={candidateId} />;
}

export const dynamicParams = false;
export function generateStaticParams() {
  return candidates.map((c) => ({ candidateId: c.id }));
}
