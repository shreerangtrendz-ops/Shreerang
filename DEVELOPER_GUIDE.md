# 👨‍💻 Developer Guide

## Project Structure
*   `src/components/admin`: Admin-specific UI components.
*   `src/components/ui`: Reusable UI elements (shadcn/ui).
*   `src/services`: External API integration logic.
*   `src/pages`: Route entry points.
*   `src/lib`: Utilities and constants.

## Coding Standards
*   **Functional Components**: Use React functional components with Hooks.
*   **Tailwind CSS**: Use utility classes for styling.
*   **Services**: Keep API logic out of UI components; use Service files.
*   **Imports**: Use absolute imports `@/` where possible.

## Adding a New Service
1.  Create `src/services/MyNewService.js`.
2.  Define methods (e.g., `fetchData`, `sendData`).
3.  Add environment variables to `.env` and `src/services/MyNewService.js`.
4.  Import and use in components.

## Testing
*   Manual testing required for UI.
*   Check console for prop type warnings.