import { Sparkles, Target, Rocket, Zap } from "lucide-react";

const VisionHero = () => {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 md:p-12 text-white shadow-2xl">
      {/* Animated decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-orange-500/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-cyan-500/30 to-blue-500/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 animate-pulse" />
      <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
      
      {/* Floating icons */}
      <div className="absolute top-8 right-12 opacity-20 animate-bounce">
        <Rocket className="h-12 w-12" />
      </div>
      <div className="absolute bottom-12 right-24 opacity-20 animate-pulse">
        <Zap className="h-8 w-8" />
      </div>
      
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 mb-6 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
          <Sparkles className="h-5 w-5 text-yellow-300" />
          <span className="text-sm font-semibold uppercase tracking-wider text-yellow-100">
            Vision 2025
          </span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight bg-gradient-to-r from-white via-purple-100 to-pink-100 bg-clip-text text-transparent">
          BD AI Portal
        </h1>
        
        <p className="text-xl md:text-2xl font-medium text-purple-100 mb-10 max-w-2xl leading-relaxed">
          Orchestrating intelligent business development at <span className="text-yellow-300 font-bold">startup velocity</span>
        </p>
        
        <div className="flex items-start gap-5 bg-white/15 backdrop-blur-md rounded-2xl p-6 max-w-xl border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Target className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl mb-2 text-white">Strategic North Star</h3>
            <p className="text-purple-100 leading-relaxed">
              Grow qualified pipeline by <span className="text-emerald-300 font-semibold">30%</span>, shorten deal-cycle by <span className="text-cyan-300 font-semibold">20%</span>, and keep 
              audit-ready transparency for investors. Achieve with fewer keystrokes 
              and zero context-switching.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VisionHero;