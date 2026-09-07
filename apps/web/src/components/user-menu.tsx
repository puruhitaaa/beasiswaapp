import { Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <div className="bg-muted h-9 w-24 animate-pulse rounded-md" />;
  }

  if (!session) {
    return (
      <Link
        to="/login"
        className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium">{session.user.name}</span>
      <button
        type="button"
        onClick={() => {
          authClient.signOut({
            fetchOptions: {
              onSuccess: () => {
                navigate({
                  to: "/",
                });
              },
            },
          });
        }}
        className="bg-destructive text-destructive-foreground inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
      >
        Sign Out
      </button>
    </div>
  );
}
