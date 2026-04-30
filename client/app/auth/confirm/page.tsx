import { AuthConfirmContent } from "@/components/auth-confirm-content";

export default async function AuthConfirmPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ code?: string; next?: string; token_hash?: string; type?: string; error_description?: string }>;
}>) {
  const params = await searchParams;

  return (
    <AuthConfirmContent
      code={params.code}
      tokenHash={params.token_hash}
      type={params.type}
      errorDescription={params.error_description}
      nextPath={params.next ?? "/dashboard"}
    />
  );
}
