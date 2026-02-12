import { z } from 'zod';

const nameSchema = z
    .string()
    .min(1, 'Name cannot be empty')
    .max(64, 'Name is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Name must be alphanumeric (hyphens and underscores allowed)');

export const validateProviderName = (name: string): string => {
    return nameSchema.parse(name);
};

export const validateProfileName = (name: string): string => {
    return nameSchema.parse(name);
};
