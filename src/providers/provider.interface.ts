export interface Provider {
    name: string;
    getEnvVar(): string;
    getCliName(): string;
    validateToken(token: string): boolean;
    getStoredToken?(): Promise<string | null>;
    getUserEmail?(token: string): Promise<string | undefined>;
    login?(): Promise<boolean>;
    getAuthConfigPath?(): string | null;
    captureAuth?(profile: string): Promise<void>;
    restoreAuth?(profile: string): Promise<boolean>;
    seedAuthFromToken?(token: string): Promise<boolean>;
    validateActiveAuth?(): Promise<boolean>;
    removeAuthSnapshot?(profile: string): Promise<void>;
}

const providers = new Map<string, Provider>();

export const registerProvider = (provider: Provider): void => {
    providers.set(provider.name.toLowerCase(), provider);
};

export const getProvider = (name: string): Provider => {
    const provider = providers.get(name.toLowerCase());

    if (!provider) {
        const available = Array.from(providers.keys()).join(', ');
        throw new Error(
            `Unknown provider "${name}". Available providers: ${available || 'none'}`,
        );
    }

    return provider;
};

export const getAllProviders = (): Provider[] => {
    return Array.from(providers.values());
};
