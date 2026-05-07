import { z } from "zod";

export const Post = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  authorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Post = z.infer<typeof Post>;

export const CreatePostRequest = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
});
export type CreatePostRequest = z.infer<typeof CreatePostRequest>;
