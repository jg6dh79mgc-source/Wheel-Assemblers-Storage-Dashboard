import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-indigo-500/30">
          WA
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Wheel Assemblers</h1>
          <p className="text-xs uppercase tracking-widest text-indigo-400 mt-1 font-semibold">
            High-Bay Automated Shuttle Control
          </p>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Select an operating mode to launch. Mobile View is restricted for floor operators conducting daily FR-7.2-04 safety signoffs. TV View is for the central 65" plant monitor.
        </p>
        <div className="space-y-3 pt-2">
          <Link
            href="/mobile"
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm block transition shadow-lg shadow-indigo-600/30"
          >
            📱 Mobile Operator View (Daily Inspection & Unlock)
          </Link>
          <Link
            href="/tv"
            className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl font-bold text-sm block transition"
          >
            🖥️ 65" Warehouse TV Control Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
