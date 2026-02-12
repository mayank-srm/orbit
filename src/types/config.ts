import { z } from 'zod';

const ProviderConfigSchema = z.object({
    profiles: z.array(z.string()),
    current: z.string().optional(),
    metadata: z.record(z.string(), z.object({ email: z.string().optional() })).optional(),
});

export const OrbitConfigSchema = z.object({
    providers: z.record(z.string(), ProviderConfigSchema),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type OrbitConfig = z.infer<typeof OrbitConfigSchema>;
