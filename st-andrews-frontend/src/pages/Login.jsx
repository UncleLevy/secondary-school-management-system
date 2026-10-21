import React, { useState } from 'react';
import { auth } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Login() {
    const [credentials, setCredentials] = useState({ username: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await auth.login(credentials.username, credentials.password);
        window.location.href = '/';
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <form onSubmit={handleSubmit} className="w-full max-w-sm p-8 space-y-4 shadow bg-card rounded-xl">
                <h1 className="text-2xl font-bold">St. Andrews High School SMS</h1>
                <Input placeholder="Username" onChange={e => setCredentials(p => ({ ...p, username: e.target.value }))} />
                <Input type="password" placeholder="Password" onChange={e => setCredentials(p => ({ ...p, password: e.target.value }))} />
                <Button type="submit" className="w-full">Sign In</Button>
            </form>
        </div>
    );
}