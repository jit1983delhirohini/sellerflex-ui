// src/components/LogoutButton.jsx
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
  <button
  onClick={handleLogout}
  className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-sm font-medium"
>
  Logout
</button>

  );
}
