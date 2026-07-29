import { redirect } from "next/navigation";

import { getBelegbotUser } from "@/lib/auth-utils";
import AppShell from "@/components/AppShell";

export default async function Home() {
  const me = await getBelegbotUser();
  if (!me) redirect("/login");
  return <AppShell currentUser={me.user} isAdmin={me.isAdmin} />;
}
