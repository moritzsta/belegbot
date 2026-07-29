import { redirect } from "next/navigation";

import { getBelegbotUser } from "@/lib/auth-utils";
import { getTelegramConfig } from "@/lib/user-config";
import AdminPanel from "@/components/AdminPanel";

export default async function AdminPage() {
  const me = await getBelegbotUser();
  if (!me) redirect("/login");
  if (!me.isAdmin) redirect("/");

  const config = await getTelegramConfig();
  return <AdminPanel currentUser={me.user} initialConfig={config} />;
}
