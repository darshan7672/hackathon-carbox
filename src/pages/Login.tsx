import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  Factory,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Github,
  Chrome,
  ShieldCheck,
  Verified,
  Trees,
  User
} from "lucide-react";

import { supabase } from "../supabaseClient";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"farmer" | "industry">("industry");
  const [mode, setMode] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const roleParam = searchParams.get("role");
    const modeParam = searchParams.get("mode");

    if (roleParam === "farmer" || roleParam === "industry") {
      setRole(roleParam);
    }
    if (modeParam === "login" || modeParam === "register") {
      setMode(modeParam);
    }
  }, [searchParams]);


  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert("Invalid email or password");
        return;
      }

      // ✅ get user id
      if (!data.user) return;
      const userId = data.user.id;

      // ✅ fetch role from DB
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        alert("Error fetching user role");
        return;
      }

      // ✅ redirect based on role
      if (profile.role === "farmer") {
        navigate("/farmer");
      } else {
        navigate("/industry");
      }

    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      // ⚠️ IMPORTANT: user may be null if email confirmation is required
      const user = data.user;

      if (!user) {
        alert("Check your email to confirm account first!");
        return;
      }

      // 👉 INSERT INTO profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: user.id,
            role: role,
          },
        ]);

      if (profileError) {
        console.error(profileError);
        alert("Error saving role");
        return;
      }

      alert("Signup successful!");
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50/50 font-sans flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-900/10 overflow-hidden border border-slate-100">
        {/* Left Side: Form */}
        <div className="p-10 md:p-14">
          <div className="flex items-center gap-3 text-emerald-600 mb-10 group cursor-pointer" onClick={() => navigate("/")}>
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              <Leaf className="size-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">CarbonX</span>
          </div>

          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
              {mode === "login" ? "Welcome Back" : "Join CarbonX"}
            </h1>
            <p className="text-slate-500 mt-3 font-medium">
              {mode === "login" ? "Access your carbon trading portal" : "Start your journey to Net Zero"}
            </p>
          </div>

          {/* Role Toggle */}
          <div className="flex p-1.5 bg-slate-100/80 rounded-2xl mb-10 border border-slate-200/50">
            <button
              type="button"
              onClick={() => setRole("industry")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${role === "industry"
                  ? "bg-white text-emerald-600 shadow-md shadow-emerald-900/5"
                  : "text-slate-500 hover:text-slate-700"
                }`}
            >
              <Factory className="size-4" />
              Industry
            </button>
            <button
              type="button"
              onClick={() => setRole("farmer")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${role === "farmer"
                  ? "bg-white text-emerald-600 shadow-md shadow-emerald-900/5"
                  : "text-slate-500 hover:text-slate-700"
                }`}
            >
              <Leaf className="size-4" />
              Farmer
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <AnimatePresence>
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2.5 ml-1">Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium placeholder:text-slate-300"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2.5 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium placeholder:text-slate-300"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2.5 ml-1">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Password</label>
                {mode === "login" && (
                  <button type="button" className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors">Forgot Password?</button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-12 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-medium placeholder:text-slate-300"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            {mode === "login" && (
              <div className="flex items-center gap-3 py-1 ml-1">
                <input type="checkbox" id="remember" className="size-4 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer" />
                <label htmlFor="remember" className="text-sm text-slate-500 font-semibold cursor-pointer select-none">Remember me for 30 days</label>
              </div>
            )}

            <button
              type="submit"
              className="btn-emerald w-full !py-4.5 !rounded-2xl shadow-xl shadow-emerald-900/10"
            >
              {mode === "login" ? "Sign In to Dashboard" : "Create Your Account"}
            </button>
          </form>

          <div className="mt-10">
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <span className="relative px-6 bg-white text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Or continue with</span>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <button type="button" className="flex items-center justify-center gap-3 py-3.5 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all font-bold text-slate-600 text-sm active:scale-95">
                <Chrome className="size-5" />
                Google
              </button>
              <button type="button" className="flex items-center justify-center gap-3 py-3.5 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all font-bold text-slate-600 text-sm active:scale-95">
                <Github className="size-5" />
                GitHub
              </button>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-slate-400 font-medium">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-black text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {mode === "login" ? "Create Account" : "Sign In"}
            </button>
          </p>
        </div>

        {/* Right Side: Visual/Marketing */}
        <div className="hidden md:block relative bg-slate-900 p-16 overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/30 via-transparent to-transparent"></div>
            <Trees className="absolute -bottom-20 -right-20 size-[30rem] text-emerald-500/10" />
          </div>

          <div className="relative h-full flex flex-col justify-between z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-10">
                Institutional Carbon Market
              </div>
              <h2 className="text-5xl font-black text-white leading-[1.1] mb-8 tracking-tighter">
                Bridging the gap between <span className="text-emerald-400">Industry</span> and <span className="text-emerald-400">Nature</span>.
              </h2>
              <p className="text-slate-400 text-xl leading-relaxed font-medium">
                Join over 5,000 farmers and 200 industrial partners in the world's most transparent carbon credit ecosystem.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-5 group cursor-default">
                <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">
                  <ShieldCheck className="text-emerald-400 size-7" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Verified Integrity</h4>
                  <p className="text-slate-500 text-sm font-medium">Gold Standard & Verra certified projects only.</p>
                </div>
              </div>
              <div className="flex items-center gap-5 group cursor-default">
                <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">
                  <Verified className="text-emerald-400 size-7" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Real-time Settlement</h4>
                  <p className="text-slate-500 text-sm font-medium">Instant credit transfer via blockchain registry.</p>
                </div>
              </div>
            </div>

            <div className="pt-10 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">
              <span>© 2026 CarbonX</span>
              <div className="flex gap-6">
                <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
                <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
