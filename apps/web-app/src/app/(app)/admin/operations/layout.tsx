/**
 * Admin Operations layout — overrides the (app) AppShell wrapper.
 *
 * The admin dashboard needs full-width rendering without the app sidebar.
 * Next.js App Router allows a nested layout.tsx to replace the parent layout
 * for that subtree while still inheriting the root layout (html/body/theme).
 *
 * Result: the /admin/operations route renders its content directly without
 * the top nav or sidebar from AppShell.
 *
 * @iter 072
 */

export default function AdminOperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Full-width pass-through — no AppShell wrapper.
  // Returning children directly (not wrapped in a Fragment) avoids the need
  // for React in scope at test time under classic JSX runtime; semantically
  // identical to `return <>{children}</>` per Next.js layout contract.
  return children;
}
