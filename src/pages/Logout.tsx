import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { LogOut } from "lucide-react";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const doLogout = async () => {
      // Small delay for UX so it feels like a real process
      await new Promise(resolve => setTimeout(resolve, 800));
      await supabase.auth.signOut();
      navigate("/login");
    };
    doLogout();
  }, [navigate]);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 flex flex-col items-center justify-center font-sans">
      <div className="bg-white p-10 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col items-center text-center max-w-sm border border-slate-100">
        <div className="bg-red-50 p-4 rounded-full mb-6">
          <LogOut className="w-10 h-10 text-red-500 animate-pulse" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Logging out...</h1>
        <p className="text-slate-500 font-medium">Please wait while we securely end your session.</p>
      </div>
    </div>
  );
}
