"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { createReceipt as createReceiptAction } from "@/lib/actions/receipts";
import type { User, Area, Receipt } from "@/lib/types";
import Layout from "./Layout";
import Dashboard from "./Dashboard";
import ReceiptList from "./ReceiptList";
import MonthlyOverview from "./MonthlyOverview";
import Statistics from "./Statistics";

type Page = "dashboard" | "list" | "month" | "stats";

export default function AppShell({ currentUser, isAdmin }: { currentUser: User; isAdmin: boolean }) {
  const router = useRouter();
  const [area, setArea] = useState<Area>("private");
  const [page, setPage] = useState<Page>("dashboard");

  const createReceipt = useCallback(async (data: Partial<Receipt>): Promise<boolean> => {
    try {
      return await createReceiptAction(data);
    } catch {
      return false;
    }
  }, []);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Layout
      currentUser={currentUser}
      area={area}
      page={page}
      isAdmin={isAdmin}
      onAreaChange={(a) => { setArea(a); setPage("dashboard"); }}
      onPageChange={setPage}
      onLogout={handleLogout}
    >
      {page === "dashboard" && (
        <Dashboard
          currentUser={currentUser}
          area={area}
          onNavigateToList={() => setPage("list")}
          onCreate={createReceipt}
        />
      )}
      {page === "list" && <ReceiptList currentUser={currentUser} area={area} />}
      {page === "month" && <MonthlyOverview area={area} />}
      {page === "stats" && <Statistics currentUser={currentUser} area={area} />}
    </Layout>
  );
}
