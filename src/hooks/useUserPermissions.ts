import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserPermissionRecord {
  module_name: string;
  can_view: boolean | null;
  can_create: boolean | null;
  can_edit: boolean | null;
  can_delete: boolean | null;
}

export interface UseUserPermissionsResult {
  permissions: UserPermissionRecord[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasPermission: (
    modules: string | string[] | RegExp,
    action?: "view" | "create" | "edit" | "delete",
  ) => boolean;
}

const normalizeModuleMatcher = (modules: string | string[] | RegExp) => {
  if (modules instanceof RegExp) {
    return modules;
  }
  if (Array.isArray(modules)) {
    return modules;
  }
  return [modules];
};

const checkAction = (
  record: UserPermissionRecord,
  action: "view" | "create" | "edit" | "delete" = "view",
) => {
  switch (action) {
    case "create":
      return Boolean(record.can_create);
    case "edit":
      return Boolean(record.can_edit);
    case "delete":
      return Boolean(record.can_delete);
    default:
      return Boolean(record.can_view);
  }
};

export const useUserPermissions = (): UseUserPermissionsResult => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["user-permissions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("module_name, can_view, can_create, can_edit, can_delete")
        .eq("user_id", user!.id);

      if (error) {
        throw error;
      }

      return (data || []) as UserPermissionRecord[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const hasPermission = useMemo(() => {
    return (
      modules: string | string[] | RegExp,
      action: "view" | "create" | "edit" | "delete" = "view",
    ) => {
      const matcher = normalizeModuleMatcher(modules);

      if (!query.data || query.data.length === 0) {
        return false;
      }

      if (matcher instanceof RegExp) {
        return query.data.some(
          (record) => matcher.test(record.module_name) && checkAction(record, action),
        );
      }

      return query.data.some((record) => {
        return matcher.some((module) => {
          if (record.module_name === module) {
            return checkAction(record, action);
          }

          if (module.includes("*")) {
            const escaped = module.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const wildcard = new RegExp(`^${escaped.replace(/\\\*/g, ".*")}$`, "i");
            return wildcard.test(record.module_name) && checkAction(record, action);
          }

          return (
            record.module_name.toLowerCase().includes(module.toLowerCase()) &&
            checkAction(record, action)
          );
        });
      });
    };
  }, [query.data]);

  return {
    permissions: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error) ?? null,
    hasPermission,
  };
};

