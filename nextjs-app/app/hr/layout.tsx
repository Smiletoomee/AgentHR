import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';

export default async function HRLayout({ children }: { children: ReactNode }) {
    // Pobieramy sesję bezpośrednio z modułu Better Auth po stronie serwera
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect('/login');
    }

    return (
        <div className="hr-layout-container">
            {/* Pasek nawigacji portalu HR */}
            <header className="hr-layout-header">
                <div className="hr-layout-brand-wrapper">
                    <span className="hr-layout-brand-title">Portal HR</span>
                </div>
                <div className="hr-layout-user-section">
                    <span className="hr-layout-user-info">Zalogowano jako: <strong>{session.user.name}</strong></span>
                    <form action="/api/logout" method="POST">
                        <LogoutButton />
                    </form>
                </div>
            </header>

            {/* Główny widok podstron HR */}
            <main className="hr-layout-main-content">
                {children}
            </main>
        </div>
    );
}