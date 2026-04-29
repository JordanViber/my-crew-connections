import { getFeedbackClasses, type FeedbackTone } from "@/lib/feedback";

export function FeedbackBanner({
  title,
  body,
  tone = "success",
}: Readonly<{
  title: string;
  body: string;
  tone?: FeedbackTone;
}>) {
  return (
    <div className={`rounded-lg px-3.5 py-3 ${getFeedbackClasses(tone)}`}>
      <p className="text-sm font-semibold uppercase tracking-[0.18em]">{title}</p>
      <p className="mt-1.5 text-sm leading-6">{body}</p>
    </div>
  );
}
