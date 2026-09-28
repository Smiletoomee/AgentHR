'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export function LogoutButton() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        router.push('/login');
                        router.refresh();
                    },
                },
            });
        } catch (error) {
            console.error('Błąd podczas wylogowywania:', error);
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleLogout}
            disabled={isLoading}
            className="logout-button-element"
        >
            {isLoading ? 'Wylogowywanie...' : 'Wyloguj'}
        </button>
    );
}