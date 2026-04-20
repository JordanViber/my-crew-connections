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
    <div className={`rounded-[1.35rem] px-4 py-4 ${getFeedbackClasses(tone)}`}>
      <p className="text-sm font-semibold uppercase tracking-[0.18em]">{title}</p>
      <p className="mt-2 text-sm leading-6">{body}</p>
    </div>
  );
}
