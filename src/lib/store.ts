import { useSyncExternalStore } from "react";

export type Hospital = {
  id: string;
  name: string;
  city: string;
  icuTotal: number;
  icuFree: number;
  ventilators: number;
  distanceKm: number;
};

export type Request = {
  id: string;
  patient: string;
  condition: string;
  hospitalId: string;
  severity: "Critical" | "Serious" | "Stable";
  status: "Pending" | "Approved" | "Declined";
  createdAt: string;
};

type State = { hospitals: Hospital[]; requests: Request[] };

let state: State = {
  hospitals: [
    { id: "h1", name: "St. Mary Critical Care", city: "Abuja", icuTotal: 20, icuFree: 4, ventilators: 3, distanceKm: 2.4 },
    { id: "h2", name: "Northgate General", city: "Abuja", icuTotal: 32, icuFree: 0, ventilators: 0, distanceKm: 5.1 },
    { id: "h3", name: "Riverside Emergency", city: "Kaduna", icuTotal: 14, icuFree: 7, ventilators: 5, distanceKm: 9.8 },
    { id: "h4", name: "Unity Teaching Hospital", city: "Lagos", icuTotal: 40, icuFree: 2, ventilators: 1, distanceKm: 14.2 },
  ],
  requests: [
    { id: "r1", patient: "A. Musa", condition: "Cardiac arrest", hospitalId: "h1", severity: "Critical", status: "Pending", createdAt: "10:02" },
    { id: "r2", patient: "J. Okoro", condition: "Severe trauma", hospitalId: "h3", severity: "Serious", status: "Approved", createdAt: "09:41" },
  ],
};

const listeners = new Set<() => void>();
function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}

export function useStore() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export function addRequest(r: Omit<Request, "id" | "status" | "createdAt">) {
  state.requests = [
    {
      ...r,
      id: `r${Date.now()}`,
      status: "Pending",
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
    ...state.requests,
  ];
  emit();
}

export function setRequestStatus(id: string, status: Request["status"]) {
  const req = state.requests.find((r) => r.id === id);
  if (!req || req.status !== "Pending") return;
  req.status = status;
  if (status === "Approved") {
    const h = state.hospitals.find((x) => x.id === req.hospitalId);
    if (h && h.icuFree > 0) h.icuFree -= 1;
  }
  state.requests = [...state.requests];
  state.hospitals = [...state.hospitals];
  emit();
}

export function adjustBeds(hospitalId: string, delta: number) {
  const h = state.hospitals.find((x) => x.id === hospitalId);
  if (!h) return;
  h.icuFree = Math.max(0, Math.min(h.icuTotal, h.icuFree + delta));
  state.hospitals = [...state.hospitals];
  emit();
}
