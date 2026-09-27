import { notFound } from "next/navigation";
import { candidateById, candidates } from "@/lib/candidates";
import { CandidateDetail } from "@/components/CandidateDetail";
export default async function Profile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!candidateById(id)) notFound();
  return <CandidateDetail id={id} />;
}

export const dynamicParams = false;
export function generateStaticParams() {
  return candidates.map((c) => ({ id: c.id }));
}
