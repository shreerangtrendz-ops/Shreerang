# 📝 Developer Notes & Observations

## Overview
This project involved upgrading a static admin template into a fully functional ERP system with complex integrations. The transition from local state to Supabase Real-time and external APIs was the primary challenge, which has been successfully navigated.

## What Went Well
*   **Modular Service Layer**: Abstracting API calls into `src/services` made testing and mocking significantly easier.
*   **Component Reuse**: Leveraging `shadcn/ui` components speed up UI development while maintaining consistency.
*   **Supabase Real-time**: The chat implementation was straightforward thanks to Supabase's subscription model.

## Challenges & Solutions
*   **Fabric Constants**: The initial "undefined" error was tricky. We solved it by creating a dedicated `fabricConstants.js` library with safe fallbacks.
*   **State Management**: Managing the complex state of a Sales Order (Header + N Items + N Designs) required careful effect management, which is now stable.

## Best Practices Used
*   **Error Boundaries**: Applied globally and on specific forms to prevent white-screen crashes.
*   **Environment Variables**: Strict separation of config and code.
*   **Type Safety**: While JS based, we implemented strict prop checks and null guards.

## Future Considerations
*   **Typing**: Moving to TypeScript in the future would provide even better stability for the complex data objects (Orders/Fabrics).
*   **Testing**: Adding Cypress E2E tests would be a good next step for the critical Order -> Payment flow.

## Maintenance
*   Regularly rotate API keys for WhatsApp and Bunny.net.
*   Monitor database size as Chat logs grow; implement archiving strategy for old messages.