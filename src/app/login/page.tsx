"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await authClient.signIn.email({ email, password });

    if (authError) {
      setError("E-Mail oder Passwort falsch.");
      setLoading(false);
      return;
    }

    const redirectTo = searchParams.get("redirectTo") ?? "/";
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-base)",
      padding: 20,
    }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        opacity: 0.5,
      }} />

      <div style={{ position: "relative", maxWidth: 380, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64,
            background: "var(--accent)",
            borderRadius: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: 28,
            color: "#0D0F14",
            margin: "0 auto 20px",
            boxShadow: "var(--shadow-accent)",
          }}>B</div>
          <h1 style={{
            fontFamily: "var(--font-heading)",
            fontSize: "2rem",
            fontWeight: 800,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}>BelegBot</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Bitte anmelden</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)",
          padding: "28px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          <div className="form-group">
            <label className="form-label">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{
              padding: "10px 14px",
              background: "rgba(220, 80, 80, 0.1)",
              border: "1px solid rgba(220, 80, 80, 0.3)",
              borderRadius: "var(--r-md)",
              color: "#e05c5c",
              fontSize: "0.85rem",
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "Anmelden…" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
