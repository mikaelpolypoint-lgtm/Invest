import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-8">
                            <span className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#F6A60A]"></span>
                                InvestReport
                            </span>
                            <div className="flex space-x-4">
                                <Link
                                    to="/"
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/')
                                        ? 'bg-slate-100 text-slate-900'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                >
                                    <LayoutDashboard size={18} />
                                    <span>Dashboard</span>
                                </Link>
                                <Link
                                    to="/planning"
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/planning')
                                        ? 'bg-slate-100 text-slate-900'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                >
                                    <Map size={18} />
                                    <span>Initiative Planning</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="flex-1 py-8">
                {children}
            </main>
        </div>
    );
}
