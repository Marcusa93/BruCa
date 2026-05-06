"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { FloatingChat } from "@/components/assistant/floating-chat";

export function AppShell({
  userEmail,
  children,
}: {
  userEmail?: string;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar
        userEmail={userEmail}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1400px] animate-fade-up">{children}</div>
        </main>
      </div>
      <FloatingChat />
    </div>
  );
}
