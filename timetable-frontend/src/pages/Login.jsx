import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/utils';

export default function Login() {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [challenge, setChallenge] = useState(null); // { token, hint } once a code was emailed
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const run = async (fn) => {
        setError(''); setNotice(''); setBusy(true);
        try { await fn(); } catch (err) { setError(getErrorMessage(err, 'Something went wrong. Please try again.')); }
        setBusy(false);
    };

    const handlePassword = (e) => {
        e.preventDefault();
        run(async () => {
            let data;
            try {
                data = await auth.login(credentials.username, credentials.password);
            } catch (err) {
                if (err?.response?.status === 401) throw { response: { data: { detail: 'Wrong username or password.' } } };
                throw err;
            }
            if (data.otp_required) {
                setChallenge({ token: data.challenge, channels: data.channels || [] });
                setCooldown(60);
            } else {
                window.location.href = '/';
            }
        });
    };

    const handleCode = (e) => {
        e.preventDefault();
        run(async () => {
            await auth.verifyLogin(challenge.token, code.trim());
            window.location.href = '/';
        });
    };

    const resend = () => run(async () => {
        const data = await auth.resendLoginCode(challenge.token);
        if (data.channels) setChallenge(c => ({ ...c, channels: data.channels }));
        setNotice('A new code has been sent.');
        setCooldown(60);
    });

    const back = () => { setChallenge(null); setCode(''); setError(''); setNotice(''); };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            {!challenge ? (
                <form onSubmit={handlePassword} className="w-full max-w-sm p-8 space-y-4 shadow bg-card rounded-xl">
                    <h1 className="text-2xl font-bold">Secondary School Timetable</h1>
                    <Input placeholder="Username" autoComplete="username" onChange={e => setCredentials(p => ({ ...p, username: e.target.value }))} />
                    <Input type="password" placeholder="Password" autoComplete="current-password" onChange={e => setCredentials(p => ({ ...p, password: e.target.value }))} />
                    {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                    <Button type="submit" className="w-full" disabled={busy}>Sign In</Button>
                    <div className="text-center">
                        <Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleCode} className="w-full max-w-sm p-8 space-y-4 shadow bg-card rounded-xl">
                    <h1 className="text-2xl font-bold">Enter your code</h1>
                    <p className="text-sm text-muted-foreground">
                        We sent a 6-digit code {challenge.channels.map((c, i) => (
                            <React.Fragment key={c.channel}>
                                {i > 0 && ' and '}
                                {c.channel === 'sms' ? 'by SMS to ' : 'by email to '}<strong>{c.hint}</strong>
                            </React.Fragment>
                        ))}. Enter it to finish signing in.
                    </p>
                    <Input
                        placeholder="123456" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                        className="text-lg tracking-[0.4em] text-center" autoFocus
                        value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    />
                    {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                    {notice && <p className="text-sm text-emerald-700">{notice}</p>}
                    <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>Verify</Button>
                    <div className="flex justify-between text-sm">
                        <button type="button" className="text-muted-foreground hover:underline" onClick={back}>Back</button>
                        <button type="button" className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                            disabled={busy || cooldown > 0} onClick={resend}>
                            {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
