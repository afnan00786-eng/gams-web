export type ModuleKey = 'STOCK' | 'TRIPS' | 'BOOKING' | 'HAWKER_LEDGER' | 'STAFF_ACCOUNTS';

export interface SectionDefinition {
    key: ModuleKey;
    name: string;
    description: string;
    icon: string;
    path: string;
    defaultRoles: string[];
    color: string;
}

export const SECTIONS: SectionDefinition[] = [
    {
        key: 'STOCK',
        name: 'Godown / Stock',
        description: 'Track filled & empty inventory, audit & cylinder loads',
        icon: 'Package',
        path: '/dashboard/stock',
        defaultRoles: ['MASTER', 'MANAGER', 'GODOWN'],
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    },
    {
        key: 'TRIPS',
        name: 'Trip Logistics',
        description: 'Dispatch truck/auto trips & cylinder settlements',
        icon: 'Truck',
        path: '/dashboard/trips',
        defaultRoles: ['MASTER', 'MANAGER', 'GODOWN', 'HAWKER'],
        color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
    },
    {
        key: 'BOOKING',
        name: 'Refill & Booking',
        description: 'Area refill bookings, urgent orders & direct delivery list',
        icon: 'ClipboardList',
        path: '/dashboard/refill-booking',
        defaultRoles: ['MASTER', 'MANAGER', 'HAWKER', 'OFFICE_STAFF'],
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    },
    {
        key: 'HAWKER_LEDGER',
        name: 'Hawker Ledger',
        description: 'Delivery boy empty cylinder balance & cash ledger',
        icon: 'Wallet',
        path: '/dashboard/hawkers-ledger',
        defaultRoles: ['MASTER', 'MANAGER', 'ACCOUNTANT'],
        color: 'text-purple-500 bg-purple-500/10 border-purple-500/20'
    },
    {
        key: 'STAFF_ACCOUNTS',
        name: 'Staff Accounts',
        description: 'Internal payroll, salary advances & staff ledger',
        icon: 'Users',
        path: '/dashboard/staff-accounts',
        defaultRoles: ['MASTER', 'MANAGER', 'ACCOUNTANT'],
        color: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    }
];

export function getDefaultSectionsForRole(role: string): ModuleKey[] {
    return SECTIONS.filter(s => s.defaultRoles.includes(role)).map(s => s.key);
}

export function parseAllowedSections(allowedSections?: string | string[] | null, role?: string): ModuleKey[] {
    if (role === 'MASTER') {
        return SECTIONS.map(s => s.key);
    }

    if (!allowedSections) {
        return role ? getDefaultSectionsForRole(role) : [];
    }

    if (Array.isArray(allowedSections)) {
        return allowedSections as ModuleKey[];
    }

    try {
        const parsed = JSON.parse(allowedSections);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed as ModuleKey[];
        }
    } catch {
        const split = allowedSections.split(',').map(s => s.trim() as ModuleKey).filter(Boolean);
        if (split.length > 0) return split;
    }

    return role ? getDefaultSectionsForRole(role) : [];
}

export function hasPermission(
    user: { role: string; allowedSections?: string | string[] | null } | null | undefined, 
    section: ModuleKey
): boolean {
    if (!user) return false;
    if (user.role === 'MASTER') return true;

    const allowed = parseAllowedSections(user.allowedSections, user.role);
    return allowed.includes(section);
}
