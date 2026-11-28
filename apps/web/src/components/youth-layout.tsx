import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import {
  Briefcase,
  ClipboardList,
  LogOut,
  Menu,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const links = [
  { to: '/perfil', label: 'Perfil', icon: UserRound },
  { to: '/vagas', label: 'Vagas', icon: Briefcase },
  { to: '/candidaturas', label: 'Minhas candidaturas', icon: ClipboardList },
];

export function YouthLayout({
  email,
  logout,
  loggingOut,
  notice,
}: {
  email: string;
  logout: () => void;
  loggingOut: boolean;
  notice: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="flex flex-col border-b bg-card md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-3 px-5 py-4 md:py-6">
          <Link
            to="/perfil"
            className="text-lg font-bold tracking-tight"
            onClick={() => setMenuOpen(false)}
          >
            conecta<span className="text-primary">jovem</span>
            <small className="ml-2 text-[10px] tracking-widest">ITAJAÍ</small>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="md:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu aria-hidden="true" /> Menu
          </Button>
        </div>
        <div
          id={menuId}
          className={cn(
            'flex flex-1 flex-col gap-5 px-4 pb-4',
            !menuOpen && 'hidden md:flex',
          )}
        >
          <nav aria-label="Painel do jovem" className="grid gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground',
                  )
                }
              >
                <Icon className="size-4" aria-hidden="true" /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto space-y-3 border-t pt-4">
            <p className="break-all px-3 text-sm text-muted-foreground">
              {email}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              disabled={loggingOut}
              onClick={logout}
            >
              <LogOut aria-hidden="true" /> {loggingOut ? 'Saindo…' : 'Sair'}
            </Button>
          </div>
        </div>
      </aside>
      <main className="mx-auto w-full min-w-0 max-w-5xl px-5 py-6 md:px-8 md:py-10">
        {notice}
        <Outlet />
      </main>
    </div>
  );
}
