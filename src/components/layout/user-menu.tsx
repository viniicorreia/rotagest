import { LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Avatar } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';

export function UserMenu() {
  const { me, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  if (!me) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Menu do usuário">
        <Avatar name={me.user.name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-foreground">
          <p className="truncate text-sm font-medium">{me.user.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{me.user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {me.user.platformRole === 'SUPER_ADMIN' && (
          <DropdownMenuItem onSelect={() => navigate('/platform')}>
            <ShieldCheck /> Painel da plataforma
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={toggle}>
          {theme === 'dark' ? <Sun /> : <Moon />} Tema {theme === 'dark' ? 'claro' : 'escuro'}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={async () => {
            await logout();
            navigate('/login');
          }}
        >
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
