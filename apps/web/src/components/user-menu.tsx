import { Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="placeholder-glow">
        <span
          className="placeholder rounded"
          style={{ display: "inline-block", height: "2rem", width: "5rem" }}
        />
      </div>
    );
  }

  if (!session) {
    return (
      <Link to="/login" className="btn btn-outline-primary btn-sm">
        Sign In
      </Link>
    );
  }

  return (
    <div className="d-flex align-items-center gap-3">
      <span className="small fw-semibold">{session.user.name}</span>
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
        className="btn btn-danger btn-sm"
      >
        Sign Out
      </button>
    </div>
  );
}
