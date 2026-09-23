import { Banknote, ClipboardList, FlaskConical, ShieldCheck, Stethoscope } from "lucide-react";

export type StaffRole = "admin" | "doctor" | "lab" | "accountant" | "records";

export const ROLES = [
  { role: "records", label: "Records", to: "/records", icon: ClipboardList, desc: "Register patients and send them to a doctor." },
  { role: "doctor", label: "Doctor", to: "/doctor", icon: Stethoscope, desc: "See patients, request lab tests and write prescriptions." },
  { role: "lab", label: "Laboratory", to: "/lab", icon: FlaskConical, desc: "Receive test requests and enter results." },
  { role: "accountant", label: "Accountant", to: "/accounts", icon: Banknote, desc: "Bill patients and record payments." },
  { role: "admin", label: "Admin", to: "/admin", icon: ShieldCheck, desc: "Add staff and manage their roles." },
] as const;

export const naira = (n: number) => "₦" + Number(n || 0).toLocaleString("en-NG");
