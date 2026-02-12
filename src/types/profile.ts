import { z } from 'zod';

export const ProfileSchema = z.object({
    provider: z.string().min(1),
    name: z.string().min(1),
});

export type Profile = z.infer<typeof ProfileSchema>;
