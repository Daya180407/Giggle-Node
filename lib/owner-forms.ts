/** Shared shape of the owner/claim form results (client + server action). */
export type OwnerFormState = {
  ok: boolean;
  error?: string;
  message?: string;
  /** claim proof panel */
  code?: string;
  inbox?: string;
  domain?: string;
  aiName?: string;
};
