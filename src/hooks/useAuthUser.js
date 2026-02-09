import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getUserRole } from "../config/authRoles";

export function useAuthUser() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data?.session?.user ?? null;

      setUser(sessionUser);
      setRole(sessionUser ? getUserRole(sessionUser.email) : null);
      setLoading(false);
    };

    getSession();
  }, []);

  return { user, role, loading };
}
