import React, { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { appStore } from "@/lib/store";
import { useMenus, useUpdateRolePermissionsMutation } from "@/hooks/use-auth-queries";
import type { MasterRole } from "@/types";

interface RolePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: MasterRole | null;
}

const rolePermissionSchema = z.object({
  selectedMenus: z.array(z.string()),
});

export const RolePermissionModal: React.FC<RolePermissionModalProps> = ({
  isOpen,
  onClose,
  role,
}) => {
  const { data: menus = [] } = useMenus();
  const updatePermissionsMutation = useUpdateRolePermissionsMutation();

  const form = useForm({
    defaultValues: {
      selectedMenus: (role?.accessibleMenus || []) as string[],
    },
    validators: {
      onSubmit: rolePermissionSchema,
    },
    onSubmit: async ({ value }) => {
      if (!role) return;
      try {
        await updatePermissionsMutation.mutateAsync({
          roleId: role.id,
          accessibleMenus: value.selectedMenus,
        });
        appStore.updateRole(role.id, value.selectedMenus);
        toast.success(`Hak akses menu untuk role ${role.name} berhasil diperbarui!`);
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Gagal memperbarui hak akses role.");
      }
    },
  });

  useEffect(() => {
    if (role) {
      form.reset({
        selectedMenus: role.accessibleMenus || [],
      });
    }
  }, [role]);

  if (!isOpen || !role) return null;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title fw-bold">
                <i className="bi bi-shield-lock me-2"></i>Pengaturan Hak Akses Role: {role.name}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body">
              <p className="small text-muted mb-3">
                Tentukan hierarki menu dan hak akses dinamis yang dapat dibuka oleh staf dengan
                peran <strong>{role.name}</strong>.
              </p>

              <form
                id="rolePermissionForm"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
              >
                <form.Field name="selectedMenus">
                  {(field) => (
                    <div className="table-responsive">
                      <table className="table table-bordered align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Nama Menu Terdaftar</th>
                            <th>URL Route</th>
                            <th className="text-center" style={{ width: "120px" }}>
                              Izin Akses
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {menus.map((m) => {
                            const isAllowed = field.state.value.includes(m.name);
                            return (
                              <tr key={m.id}>
                                <td>
                                  <i className={`bi ${m.icon} me-2 text-primary`}></i>
                                  <strong>{m.name}</strong>
                                </td>
                                <td>
                                  <code>{m.route}</code>
                                </td>
                                <td className="text-center">
                                  <div className="form-check form-switch d-inline-block">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      checked={isAllowed}
                                      onChange={() => {
                                        const current = field.state.value;
                                        if (current.includes(m.name)) {
                                          field.handleChange(current.filter((name) => name !== m.name));
                                        } else {
                                          field.handleChange([...current, m.name]);
                                        }
                                      }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </form.Field>
              </form>

              <div className="alert alert-light border small text-muted mb-0">
                <i className="bi bi-info-circle me-1 text-primary"></i>
                Setiap perubahan hak akses langsung disinkronkan ke API Gateway & RBAC middleware.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Tutup
              </button>
              <form.Subscribe
                selector={(state) => ({
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ isSubmitting }) => (
                  <button
                    type="submit"
                    form="rolePermissionForm"
                    disabled={isSubmitting || updatePermissionsMutation.isPending}
                    className="btn btn-primary"
                  >
                    {isSubmitting || updatePermissionsMutation.isPending
                      ? "Menyimpan..."
                      : "Simpan Hak Akses"}
                  </button>
                )}
              </form.Subscribe>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RolePermissionModal;
