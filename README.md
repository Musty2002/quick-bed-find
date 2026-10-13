# HospitalManagement System

Cloud based hospital management system for a single hospital site. Patients move through
five staff desks — Records → Doctor → Laboratory → Accountant — while an administrator
manages staff accounts and their roles.

This project was built by Nura Hamisu


## What it does

| Role | Desk | Handles |
| --- | --- | --- |
| Records | `/records` | Registers patients (auto hospital number like `HMS-70848D`) and sends them to a doctor with the complaint. |
| Doctor | `/doctor` | Works the waiting queue, writes diagnosis and notes, requests lab tests, prescribes, then completes the visit. |
| Laboratory | `/lab` | Sees requested tests, enters results, which appear back on the doctor's screen. |
| Accountant | `/accounts` | Bills the visit and records each payment as cash or transfer; shows totals collected and still owed. |
| Admin | `/admin` | Creates staff accounts, turns each person's roles on or off, and sees overall hospital figures. |

A person can hold more than one role, so a single login can open several desks.

## Patient journey

```text
RECORDS  →  DOCTOR  →  LABORATORY  →  ACCOUNTS
  registers   consults    tests          bills
              prescribes  reports        receipts
                    ↘ completes visit ↗

ADMIN manages staff accounts and role assignments across the whole system
```

## Tech stack

- **React 19 + TypeScript** on **TanStack Start v1** (file-based routing, SSR, server functions)
- **Lovable Cloud** (managed PostgreSQL, auth, row-level security)
- **Tailwind CSS v4** with blue-and-white clinical design tokens and motion utilities
- **Vite 7** build tool, **bun** for packages

Data lives in `patients`, `visits`, `lab_tests`, `prescriptions`, `charges`, `profiles` and
`staff_roles`. Staff can only see the desks their role allows; admin-only actions are checked
in server functions before any privileged call.

## Development

The app runs locally with Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Sign in at `/auth` to reach a desk. The `/` landing page lists the five desks and links to sign in.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/70e42e93-9393-4e96-925f-5ede51805c4a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.
