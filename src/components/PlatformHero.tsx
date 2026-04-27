import type { Platform } from '../types';

type Props = {
  platform: Platform | null;
};

export function PlatformHero({ platform }: Props) {
  if (!platform) return null;

  return (
    <div className="relative w-full pb-8 sm:pb-10 overflow-hidden">
      <div
        className="absolute top-0 right-0 w-[min(130vw,48rem)] sm:w-[min(120vw,56rem)] h-[min(55vh,28rem)] sm:h-[500px] max-h-[500px] bg-gradient-to-b from-cyan-900/10 via-transparent to-transparent blur-[120px] rounded-full pointer-events-none translate-x-[15%] -translate-y-[8%]"
        aria-hidden
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full flex flex-col items-center text-center gap-4 sm:gap-5 md:gap-6">
        <div className="relative group">
          <div className="absolute -inset-4 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition duration-1000" />
          <div className="relative w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 flex items-center justify-center mx-auto">
            <img
              src={platform.logo_url}
              alt={platform.name}
              className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(6,182,212,0.3)] transform group-hover:scale-105 transition duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/icon-72.png';
              }}
            />
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase max-w-full leading-tight">
          {platform.name}
        </h1>

        {platform.description?.trim() ? (
          <p className="text-base sm:text-lg text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed whitespace-pre-wrap">
            {platform.description.trim()}
          </p>
        ) : null}

        <div className="flex items-center gap-3 sm:gap-4 opacity-70 justify-center flex-wrap">
          <div className="h-px w-10 sm:w-12 bg-gradient-to-r from-transparent to-cyan-500 shrink-0" />
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.5em]">Premium Selection</span>
          <div className="h-px w-10 sm:w-12 bg-gradient-to-l from-transparent to-cyan-500 shrink-0" />
        </div>
      </div>
    </div>
  );
}
