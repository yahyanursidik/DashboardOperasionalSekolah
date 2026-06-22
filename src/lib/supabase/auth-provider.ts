import type { AuthBindings } from "@refinedev/core";
import { supabaseClient } from "./client";

const getRedirectPath = () => {
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.startsWith("/teacher")) return "/teacher/login";
    if (path.startsWith("/portal")) return "/portal/login";
    if (path.startsWith("/ekskul-portal")) return "/ekskul-portal/login";
    if (path.startsWith("/cbt")) return "/cbt/login";
    if (path.startsWith("/spmb")) return "/spmb/login";
    if (path.startsWith("/bendahara")) return "/bendahara/login";
    if (path.startsWith("/admin-spmb")) return "/admin-spmb/login";
  }
  return "/login";
};

export const authProvider: AuthBindings = {
  login: async ({ email, password }: any) => {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: {
            name: "Login Gagal",
            message: "Email atau password salah. Silakan coba lagi.",
          },
        };
      }

      if (data?.session) {
        return {
          success: true,
          redirectTo: "/",
        };
      }

      return {
        success: false,
        error: {
          name: "Login Gagal",
          message: "Email atau password salah. Silakan coba lagi.",
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: "Kesalahan Sistem",
          message: error.message || "Terjadi kesalahan saat menghubungi server.",
        },
      };
    }
  },
  logout: async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        return {
          success: false,
          error: {
            name: "Logout Gagal",
            message: "Gagal keluar dari sesi. Silakan coba lagi.",
          },
        };
      }

      return {
        success: true,
        redirectTo: getRedirectPath(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: "Kesalahan Sistem",
          message: "Terjadi kesalahan saat logout.",
        },
      };
    }
  },
  check: async () => {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error) {
        return {
          authenticated: false,
          error: {
            message: "Gagal memverifikasi sesi.",
            name: "Sesi Tidak Valid",
          },
          logout: true,
          redirectTo: getRedirectPath(),
        };
      }

      if (!session) {
        return {
          authenticated: false,
          error: {
            message: "Sesi Anda telah berakhir atau tidak ditemukan.",
            name: "Sesi Berakhir",
          },
          logout: true,
          redirectTo: getRedirectPath(),
        };
      }

      return {
        authenticated: true,
      };
    } catch (error) {
      return {
        authenticated: false,
        error: {
          message: "Kesalahan saat memverifikasi sesi.",
          name: "Kesalahan Sistem",
        },
        logout: true,
        redirectTo: getRedirectPath(),
      };
    }
  },
  getPermissions: async () => {
    const { data: authData } = await supabaseClient.auth.getUser();
    if (!authData?.user) return null;

    try {
      const { data: userRoles, error } = await supabaseClient
        .from("user_roles")
        .select("unit_id, roles(name)")
        .eq("user_id", authData.user.id);
      
      console.log("DEBUG getPermissions userRoles:", userRoles, "error:", error);

      if (error) {
        console.error("DEBUG getPermissions error fetching roles:", error);
      }

      if (!userRoles) return [];

      return userRoles.map((ur: any) => ({
        role: ur.roles?.name,
        unit_id: ur.unit_id,
      }));
    } catch (e) {
      console.error("DEBUG getPermissions exception:", e);
      return [];
    }
  },
  getIdentity: async () => {
    const { data: authData } = await supabaseClient.auth.getUser();

    if (authData?.user) {
      try {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .single();

        const typedProfile = profile as any;
        return {
          ...authData.user,
          name: typedProfile?.full_name || authData.user.user_metadata?.full_name || authData.user.email,
          avatar: typedProfile?.avatar_url || authData.user.user_metadata?.avatar_url,
          profileData: typedProfile,
        };
      } catch {
        return {
          ...authData.user,
          name: authData.user.user_metadata?.full_name || authData.user.email,
          avatar: authData.user.user_metadata?.avatar_url,
        };
      }
    }

    return null;
  },
  onError: async (error: any) => {
    if (error?.status === 401 || error?.status === 403 || error?.code === "PGRST301") {
      return {
        logout: true,
        redirectTo: getRedirectPath(),
        error: new Error("Sesi Anda telah berakhir atau Anda tidak memiliki akses."),
      };
    }
    return {};
  },
};
