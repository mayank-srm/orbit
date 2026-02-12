import keytar from 'keytar';

const SERVICE_NAME = 'appuo-orbit';

const getKey = (provider: string, profile: string): string => {
    return `${provider}:${profile}`;
};

export const storeToken = async (
    provider: string,
    profile: string,
    token: string,
): Promise<void> => {
    await keytar.setPassword(SERVICE_NAME, getKey(provider, profile), token);
};

export const getToken = async (
    provider: string,
    profile: string,
): Promise<string | null> => {
    return keytar.getPassword(SERVICE_NAME, getKey(provider, profile));
};

export const deleteToken = async (
    provider: string,
    profile: string,
): Promise<boolean> => {
    return keytar.deletePassword(SERVICE_NAME, getKey(provider, profile));
};
