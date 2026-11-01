import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/utils';

export default function ForgotPassword() {
    const [step, setStep] = useState('email'); // email -> reset -> done
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const run = async (fn) => {
        setError(''); setBusy(true);
        try { await fn(); } catch (err) { setError(getErrorMessage(err, 'Something went wrong. Please try again.')); }
        setBusy(false);
    };

    const sendCode = (e) => {
        e.preventDefault();
        run(async () => { await auth.forgotPassword(email.trim()); setStep('reset'); });
    };

    const reset = (e) => {
        e.preventDefault();
        if (password !== confirm) { setError('The two passwords do not match.'); return; }
        run(async () => { await auth.resetPassword(email.trim(), code.trim(), password); setStep('done'); });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="w-full max-w-sm p-8 space-y-4 shadow bg-card rounded-xl">
                <h1 className="text-2xl font-bold">Reset password</h1>

                {step === 'email' && (
                    <form onSubmit={sendCode} className="space-y-4">
                        <p className="text-sm text-muted-foreground">Enter the email address on your account and we will send you a code.</p>
                        <Input type="email" placeholder="Email address" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
                        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                        <Button type="submit" className="w-full" disabled={busy || !email.trim()}>Send code</Button>
                    </form>
                )}

                {step === 'reset' && (
                    <form onSubmit={reset} className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            If an account uses <strong>{email}</strong>, a 6-digit code is on its way. Enter it with your new password.
                        </p>
                        <Input
                            placeholder="123456" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                            className="text-lg tracking-[0.4em] text-center"
                            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                        />
                        <Input type="password" placeholder="New password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
                        <Input type="password" placeholder="Confirm new password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
                        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                        <Button type="submit" className="w-full" disabled={busy || code.length !== 6 || !password}>Reset password</Button>
                        <button type="button" className="w-full text-sm text-muted-foreground hover:underline" onClick={() => { setStep('email'); setError(''); }}>
                            Use a different email or send a new code
                        </button>
                    </form>
                )}

                {step === 'done' && (
                    <div className="space-y-4">
                        <p className="text-sm text-emerald-700">Your password has been reset.</p>
                        <Button asChild className="w-full"><Link to="/login">Back to sign in</Link></Button>
                    </div>
                )}

                {step !== 'done' && (
                    <div className="text-center">
                        <Link to="/login" className="text-sm text-primary hover:underline">Back to sign in</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
