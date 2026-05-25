"use client";

import { Mic, Send, ShieldAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { AnonymousPill } from "@/components/ui/AnonymousPill";
import { Button } from "@/components/ui/button";
import { ChatBubble } from "@/components/ui/ChatBubble";
import { Textarea } from "@/components/ui/textarea";
import { chatApi } from "@/lib/api";
import { useAuthStore, type Locale } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";

export default function ChatPage() {
  const t = useTranslations("chat");
  const locale = useLocale() as Locale;
  const user = useAuthStore((state) => state.user);
  const { messages, addMessage, isTyping, setTyping, sessionId, setSessionId, riskFlag, setRiskFlag } = useChatStore();
  const [content, setContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  async function send() {
    if (!content.trim()) return;
    const text = content.trim();
    setContent("");
    addMessage({ id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date().toISOString() });
    setTyping(true);
    try {
      const response = await chatApi.sendMessage({ session_id: sessionId ?? undefined, content: text, language: locale });
      setSessionId(response.data.data.session_id);
      setRiskFlag(Boolean(response.data.data.risk_flags?.length) || /hurt|suicide|die/i.test(text));
      addMessage({ id: crypto.randomUUID(), role: "assistant", content: response.data.data.reply, timestamp: new Date().toISOString() });
    } finally {
      setTyping(false);
    }
  }

  return (
    <main className="flex h-[calc(100vh-4rem)] flex-col bg-muted/40">
      <header className="border-b bg-background px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <AnonymousPill id={user?.anonymous_id ?? "CalmRiver42"} label={t("chattingAs")} />
          <select aria-label={t("language")} className="h-10 rounded-lg border bg-white px-2 dark:bg-card" defaultValue={locale}><option value="en">EN</option><option value="hi">HI</option><option value="kn">KN</option><option value="ta">TA</option><option value="mr">MR</option></select>
        </div>
      </header>
      {riskFlag ? <div className="bg-orange-100 px-4 py-3 text-sm font-semibold text-orange-950"><div className="mx-auto flex max-w-4xl items-center justify-between gap-3"><span className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" />{t("crisis")}</span><a className="rounded-lg bg-orange-600 px-3 py-2 text-white" href="tel:9152987821">{t("call")}</a></div></div> : null}
      <section className="calm-scrollbar mx-auto flex w-full max-w-4xl flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? <p className="mx-auto mt-16 max-w-sm text-center text-muted-foreground">{t("empty")}</p> : messages.map((message) => <ChatBubble key={message.id} role={message.role} content={message.content} />)}
        {isTyping ? <div className="flex gap-1 px-3" aria-label={t("typing")}><span className="h-2 w-2 animate-bounce rounded-full bg-accent" /><span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:120ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:240ms]" /></div> : null}
        <div ref={scrollRef} />
      </section>
      <footer className="border-t bg-background p-3">
        <div className="mx-auto flex max-w-4xl items-end gap-2">
          <Textarea rows={1} value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} aria-label={t("message")} placeholder={t("placeholder")} className="min-h-11 resize-none" />
          <Button variant="outline" size="icon" aria-label={t("voice")} asChild><a href={`/${locale}/chat/voice`}><Mic className="h-5 w-5" /></a></Button>
          <Button size="icon" aria-label={t("send")} onClick={send}><Send className="h-5 w-5" /></Button>
        </div>
      </footer>
    </main>
  );
}
