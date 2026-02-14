"use client";

import dynamic from "next/dynamic";

export const DashboardTopbarDynamic = dynamic(
  () => import("./dashboard-topbar").then((m) => m.DashboardTopbar),
  { ssr: false }
);
