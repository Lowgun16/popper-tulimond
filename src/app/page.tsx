// src/app/page.tsx
import { fetchAllPageContent } from "@/lib/pageContent";
import { getSession } from "@/lib/adminAuth";
import ClientPage from "./ClientPage";

export default async function Page() {
  const [allContent, session] = await Promise.all([fetchAllPageContent(), getSession()]);
  const isAdmin = !!session;
  return <ClientPage allContent={allContent} productOverrides={allContent.productOverrides} isAdmin={isAdmin} />;
}
