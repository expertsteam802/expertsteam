import { Route } from "@tanstack/react-router";
import { ChatRoom } from "@/components/ChatRoom";

export const aiRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/ai",
  component: () => (
    <section className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <ChatRoom />
    </section>
  ),
});
