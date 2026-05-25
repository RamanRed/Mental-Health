import { cn } from "@/lib/utils";

export function ChatBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm", isUser ? "rounded-br-sm bg-primary text-white" : "rounded-bl-sm border-l-4 border-accent bg-white text-foreground dark:bg-card")}>
        {content}
      </div>
    </div>
  );
}
