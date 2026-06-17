import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, GraduationCap, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/30 transition-colors">
      
      {/* Navbar */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-xl tracking-tight text-slate-900 dark:text-white">
            <Image src="/istudylogo1.png" alt="iSTUDY Logo" width={32} height={32} className="rounded-lg object-contain" />
            iSTUDY<span className="text-indigo-600 dark:text-indigo-400">Mock</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link 
              href="/login" 
              className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 px-4 py-2 rounded-xl"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Panel
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-32 flex flex-col items-center text-center">
      
        
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-500 tracking-tight leading-tight max-w-4xl mb-6">
          Haqiqiy CEFR Imtihoni <br className="hidden md:block"/> Muhitini His Qiling
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-12 font-medium">
          Listening, Reading va Writing bo'limlaridan iborat professional mock testlarni topshiring va o'z darajangizni aniqlang.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link 
            href="/student-login"
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_0_60px_-15px_rgba(79,70,229,0.7)] active:scale-[0.98]"
          >
            <BookOpen className="w-5 h-5" />
            Testlarni Boshlash
            <ArrowRight className="w-5 h-5 ml-1" />
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-32 w-full text-left">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-blue-600 dark:text-blue-400 font-bold text-xl">🎧</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Premium Listening</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Yuqori sifatli audio player va qulay interfeys. Savollarga javob berish endi ancha oson va yoqimli.
            </p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xl">📖</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Split-Screen Reading</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Matnni bir tomonda o'qib, ikkinchi tomonda javoblarni belgilash imkonini beruvchi mukammal dizayn.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900/50 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-purple-600 dark:text-purple-400 font-bold text-xl">✍️</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Professional Writing</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              So'zlarni avtomatik sanaydigan oynalar va qulay kiritish maydonlari yordamida insho yozish.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
