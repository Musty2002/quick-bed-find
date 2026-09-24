# HospitalManagement System UI 2.0

## Goal
Apply the selected Clinical Precision 2.0 direction across the existing hospital system without changing its workflows or data.

## Changes
- Rename all visible branding and page titles to **HospitalManagement System**.
- Replace the current teal styling with a crisp blue-and-white clinical palette and dark-blue navigation.
- Create a responsive signed-in shell with desktop sidebar navigation and a compact mobile header/menu.
- Restyle the home, sign-in, Admin, Records, Doctor, Laboratory, and Accounts screens for clearer hierarchy and faster scanning.
- Standardize cards, forms, status labels, lists, tables, buttons, focus states, and empty states.
- Add restrained motion for page entry, staggered content, navigation, cards, and menus, while respecting reduced-motion settings.
- Preserve all current permissions, patient flow, staff roles, billing behavior, and backend logic.

## Validation
- Check desktop and mobile layouts for overflow, overlaps, and readable controls.
- Verify sign-in and authenticated navigation still work.
- Confirm the preview builds without errors.

## Technical details
- Extend the existing semantic design tokens in the global stylesheet; components will not use hardcoded colors.
- Use lightweight CSS motion rather than adding a new animation dependency.
- Keep TanStack routes and existing shared controls intact.
