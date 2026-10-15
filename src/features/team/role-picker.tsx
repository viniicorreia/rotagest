import type { MemberRole } from '@/api/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAccessControl } from './use-access-control';

interface RolePickerProps {
  role: MemberRole;
  onRoleChange: (role: MemberRole) => void;
  permissions: string[];
  onPermissionsChange: (permissions: string[]) => void;
  allowOwner: boolean;
}

/** Escolha de papel com descrição e, para gestor, permissões extras configuráveis. */
export function RolePicker({ role, onRoleChange, permissions, onPermissionsChange, allowOwner }: RolePickerProps) {
  const { data, isPending } = useAccessControl();
  if (isPending || !data) return <Skeleton className="h-64" />;

  const roles = data.roles.filter((r) => allowOwner || r.key !== 'OWNER');
  const managerBase = data.roles.find((r) => r.key === 'MANAGER')?.permissions ?? [];
  const extras = data.permissions.filter((p) => p.grantable && !managerBase.includes(p.key));

  return (
    <div className="space-y-4">
      <div className="space-y-2" role="radiogroup" aria-label="Papel">
        {roles.map((r) => (
          <label
            key={r.key}
            className={cn(
              'flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
              role === r.key ? 'border-primary bg-accent' : 'hover:bg-muted',
            )}
          >
            <input type="radio" name="role" className="mt-1 accent-[var(--primary)]" checked={role === r.key} onChange={() => onRoleChange(r.key)} />
            <span>
              <span className="block text-sm font-medium">{r.label}</span>
              <span className="block text-xs text-muted-foreground">{r.description}</span>
            </span>
          </label>
        ))}
      </div>
      {role === 'MANAGER' && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Permissões extras do gestor</legend>
          <div className="grid gap-1 sm:grid-cols-2">
            {extras.map((p) => (
              <label key={p.key} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--primary)]"
                  checked={permissions.includes(p.key)}
                  onChange={(e) => onPermissionsChange(e.target.checked ? [...permissions, p.key] : permissions.filter((x) => x !== p.key))}
                />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
