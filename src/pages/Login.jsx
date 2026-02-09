import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getUserRole } from "../config/authRoles";
import logo from "../assets/twbp-logo.png";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const role = getUserRole(data.user.email);
    if (!role) {
      await supabase.auth.signOut();
      setError("You are not authorized to access this system");
      setLoading(false);
      return;
    }

    // ✅ Success animation before redirect
    setSuccess(true);
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300">
      <div className="w-[380px] bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl p-8 animate-fadeIn">

        {/* Logo */}
        <img src={logo} className="h-12 mx-auto mb-4" />

        <h2 className="text-2xl font-semibold text-center text-slate-800 mb-1">
          TWBP Reorder Portal
        </h2>
        <p className="text-sm text-slate-500 text-center mb-6">
          Secure access to inventory insights
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 text-sm text-red-600 text-center animate-shake">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 flex items-center justify-center gap-2 text-green-600 font-medium animate-pop">
            <span className="text-xl">✔</span> Login successful
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">

          {/* Email */}
          <input
            type="email"
            placeholder="Email address"
            autoComplete="username"
            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300
                       focus:outline-none focus:ring-2 focus:ring-indigo-400
                       transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* Password */}
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300
                         focus:outline-none focus:ring-2 focus:ring-indigo-400
                         transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* Eye icon */}
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-600"
            >
              {showPwd ? "🙈" : "👁️"}
            </button>
          </div>

          {/* Login button */}
          <button
            disabled={loading || success}
            className="w-full py-3 rounded-xl text-white font-medium
                       bg-gradient-to-r from-indigo-600 to-blue-600
                       hover:from-indigo-500 hover:to-blue-500
                       transition-all active:scale-[0.98]
                       disabled:opacity-60"
          >
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>

      {/* Animations */}
      <style>
        {`
          .animate-fadeIn {
            animation: fadeIn 0.6s ease-out;
          }
          .animate-pop {
            animation: pop 0.4s ease-out;
          }
          .animate-shake {
            animation: shake 0.3s;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pop {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes shake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            50% { transform: translateX(4px); }
            75% { transform: translateX(-4px); }
            100% { transform: translateX(0); }
          }
        `}
      </style>
    </div>
  );
}
