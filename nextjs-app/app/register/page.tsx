'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export default function HRRegisterPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const { error: signUpError } = await authClient.signUp.email({
                email,
                password,
                name,
            });

            if (signUpError) {
                throw new Error(signUpError.message || 'Rejestracja nie powiodła się.');
            }

            router.push('/hr/dashboard');
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas rejestracji');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOAuthSignUp = async (provider: 'google' | 'github' | 'facebook' | 'linkedin') => {
        try {
            await authClient.signIn.social({
                provider,
                callbackURL: '/hr/dashboard',
            });
        } catch (err) {
            setError(`Błąd logowania przez ${provider}`);
        }
    };

    return (
        <div className="auth-page-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1 className="auth-title">Utwórz konto</h1>
                    <p className="auth-subtitle">Zarejestruj się w Portalu HR</p>
                </div>

                {error && (
                    <div className="auth-error-box">
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field-group">
                        <label className="auth-label">Imię i nazwisko</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Jan Kowalski"
                            className="auth-input"
                        />
                    </div>

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
                        className="auth-submit-button"
                    >
                        {isLoading ? 'Tworzenie konta...' : 'Zarejestruj się'}
                    </button>
                </form>

                <div className="auth-oauth-grid">
                    <button
                        onClick={() => handleOAuthSignUp('google')}
                        className="auth-oauth-button"
                    >
                        Google
                    </button>
                    <button
                        onClick={() => handleOAuthSignUp('github')}
                        className="auth-oauth-button"
                    >
                        GitHub
                    </button>
                    <button
                        onClick={() => handleOAuthSignUp('facebook')}
                        className="auth-oauth-button"
                    >
                        Facebook
                    </button>
                    <button
                        onClick={() => handleOAuthSignUp('linkedin')}
                        className="auth-oauth-button"
                    >
                        LinkedIn
                    </button>
                </div>

                <p className="auth-footer-text">
                    Masz już konto?{' '}
                    <Link href="/login" className="auth-link">
                        Zaloguj się
                    </Link>
                </p>
            </div>
        </div>
    );
}