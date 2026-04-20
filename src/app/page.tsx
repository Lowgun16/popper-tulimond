// src/app/page.tsx
import { fetchAllPageContent } from "@/lib/pageContent";
import ClientPage from "./ClientPage";

export default async function Page() {
  const allContent = await fetchAllPageContent();
  return <ClientPage allContent={allContent} />;
}
