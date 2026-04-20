import { AuthConfirmContent } from "@/components/auth-confirm-content";

export default async function AuthConfirmPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ code?: string; next?: string }>;
}>) {
  const params = await searchParams;

  return <AuthConfirmContent code={params.code} nextPath={params.next ?? "/dashboard"} />;
}
