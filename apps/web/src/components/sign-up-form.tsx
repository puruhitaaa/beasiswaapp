import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

export default function SignUpForm({
  onSwitchToSignIn,
}: {
  onSwitchToSignIn: () => void;
}) {
  const navigate = useNavigate({
    from: "/",
  });
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          name: value.name,
          password: value.password,
        },
        {
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
          onSuccess: () => {
            navigate({
              to: "/applicant",
            });
            toast.success("Sign up successful");
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        name: z.string().min(2, "Name must be at least 2 characters"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="container py-5" style={{ maxWidth: "28rem" }}>
      <div className="card shadow-sm">
        <div className="card-body p-4">
          <h1 className="card-title h3 fw-bold mb-4 text-center">
            Create Account
          </h1>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="d-flex flex-column gap-3"
          >
            <div>
              <form.Field name="name">
                {(field) => (
                  <div>
                    <label
                      htmlFor={field.name}
                      className="form-label small fw-medium"
                    >
                      Name
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                    />
                    {field.state.meta.errors.map((error) => (
                      <div
                        key={error?.message}
                        className="invalid-feedback d-block"
                      >
                        {error?.message}
                      </div>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>

            <div>
              <form.Field name="email">
                {(field) => (
                  <div>
                    <label
                      htmlFor={field.name}
                      className="form-label small fw-medium"
                    >
                      Email
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                    />
                    {field.state.meta.errors.map((error) => (
                      <div
                        key={error?.message}
                        className="invalid-feedback d-block"
                      >
                        {error?.message}
                      </div>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>

            <div>
              <form.Field name="password">
                {(field) => (
                  <div>
                    <label
                      htmlFor={field.name}
                      className="form-label small fw-medium"
                    >
                      Password
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className={`form-control ${field.state.meta.errors.length ? "is-invalid" : ""}`}
                    />
                    {field.state.meta.errors.map((error) => (
                      <div
                        key={error?.message}
                        className="invalid-feedback d-block"
                      >
                        {error?.message}
                      </div>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>

            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="btn btn-primary fw-medium mt-2 w-100 py-2"
                >
                  {isSubmitting ? "Submitting..." : "Sign Up"}
                </button>
              )}
            </form.Subscribe>
          </form>

          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="btn btn-link btn-sm text-decoration-none"
            >
              Already have an account? Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
