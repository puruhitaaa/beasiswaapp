import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();

  return (
    <div className="container py-4">
      <h1 className="h3 mb-3">Dashboard</h1>
      <p className="lead">Welcome {session.data?.user.name}</p>
    </div>
  );
}
