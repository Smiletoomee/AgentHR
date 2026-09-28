'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export default function HRLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const { error: authError } = await authClient.signIn.email({
                email,
                password,
            });

            if (authError) {
                throw new Error(authError.message || 'Logowanie nie powiodło się.');
            }

            router.push('/hr/dashboard');
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Wystąpił błąd logowania');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOAuthSignIn = async (provider: 'google' | 'github' | 'facebook' | 'linkedin') => {
        try {
            await authClient.signIn.social({
                provider,
                callbackURL: '/hr/dashboard',
            });
        } catch (err) {
            setError(`Błąd autoryzacji przez ${provider}`);
        }
    };

    return (
        <div className="auth-page-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1 className="auth-title">Portal HR</h1>
                    <p className="auth-subtitle">Zaloguj się do swojego panelu rekruterskiego</p>
                </div>

                {error && (
                    <div className="auth-error-box">
                        Błąd : {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field-group">
                        <label className="auth-label">Adres E-mail</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="hr@company.com"
                            className="auth-input"
                        />
                    </div>

                    <div className="auth-field-group">
                        <label className="auth-label">Hasło</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="auth-input"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="auth-login-submit-button"
                    >
                        {isLoading ? (
                            <>
                                <span className="auth-spinner" />
                                Autoryzacja...
                            </>
                        ) : (
                            'Zaloguj się'
                        )}
                    </button>
                </form>

                {/* Sekcja logowania społecznościowego Better Auth OAuth */}
                <div className="auth-oauth-grid">
                    <button
                        onClick={() => handleOAuthSignIn('google')}
                        className="auth-oauth-button font-medium"
                    >
                        Google
                    </button>
                    <button
                        onClick={() => handleOAuthSignIn('github')}
                        className="auth-oauth-button font-medium"
                    >
                        GitHub
                    </button>
                    <button
                        onClick={() => handleOAuthSignIn('facebook')}
                        className="auth-oauth-button font-medium"
                    >
                        Facebook
                    </button>
                    <button
                        onClick={() => handleOAuthSignIn('linkedin')}
                        className="auth-oauth-button font-medium"
                    >
                        LinkedIn
                    </button>
                </div>

                <p className="auth-footer-text">
                    Nie masz jeszcze konta?{' '}
                    <Link href="/register" className="auth-link">
                        Zarejestruj się
                    </Link>
                </p>
            </div>
        </div>
    );
}