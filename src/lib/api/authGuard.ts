import { auth } from '@/auth';

export function shouldEnforceApiAuth() {
    if (process.env.NODE_ENV === 'production') {
        return true;
    }

    return process.env.LOCAL_API_AUTH === 'required';
}

export async function hasApiAuthUser() {
    if (!shouldEnforceApiAuth()) {
        return true;
    }

    const session = await auth();
    return !!session?.user;
}
