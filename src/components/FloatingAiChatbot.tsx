import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Loader2,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import type { AppLanguage, AppRoleMode } from '../types/cropshield';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

interface FloatingAiChatbotProps {
  role: AppRoleMode;
  lang: AppLanguage;
  contextSummary: string;
  mascotSpeech?: string;
}

const FarmerSproutMascotIcon: React.FC<{ className?: string }> = ({
  className = 'w-8 h-8',
}) => (
  <svg
    viewBox="0 0 48 48"
    className={className}
    fill="none"
    aria-hidden="true"
  >
    <circle cx="24" cy="28" r="14" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2.5" />
    <path
      d="M24 14 C24 8, 32 6, 35 10 C32 14, 26 15, 24 14 Z"
      fill="#4ADE80"
      stroke="#15803D"
      strokeWidth="2"
    />
    <path
      d="M24 14 C23 9, 16 7, 13 11 C16 14, 21 15, 24 14 Z"
      fill="#86EFAC"
      stroke="#15803D"
      strokeWidth="2"
    />
    <circle cx="19" cy="27" r="2.2" fill="#1E293B" />
    <circle cx="29" cy="27" r="2.2" fill="#1E293B" />
    <path
      d="M19.5 32 Q24 35.5 28.5 32"
      stroke="#1E293B"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <circle cx="15.5" cy="30.5" r="2" fill="#FB923C" opacity="0.55" />
    <circle cx="32.5" cy="30.5" r="2" fill="#FB923C" opacity="0.55" />
  </svg>
);

export const FloatingAiChatbot: React.FC<FloatingAiChatbotProps> = ({
  role,
  lang,
  contextSummary,
  mascotSpeech,
}) => {
  const isTh = lang === 'th';
  const isBaac = role === 'baac';

  const [isOpen, setIsOpen] = useState(false);
  const [mascotBubbleOpen, setMascotBubbleOpen] = useState<boolean>(isBaac);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-init',
      role: 'model',
      text: isBaac
        ? isTh
          ? 'สวัสดีครับ ผมคือผู้ช่วย AI วิเคราะห์พอร์ต ธ.ก.ส. สามารถช่วยสรุปความเสี่ยง 7 วัน คัดกรองแปลงที่ควรปล่อยงวด/ชะลอวงเงิน และแนะนำเงื่อนไขประกันภัยแบบกระชับได้ครับ'
          : 'Hello! I am your BAAC Portfolio Copilot. Ask me for concise 7-day climate risk summaries, Tranche approvals, or credit hold guidance.'
        : isTh
          ? 'สวัสดีครับ ผมคือผู้ช่วย AI ของ CropShield ถามเรื่องความชื้นดิน การให้น้ำ-ใส่ปุ๋ย พยากรณ์ 7 วัน หรือการขอสินเชื่อหมุนเวียนได้เลยครับ'
          : 'Hello! I am your CropShield Farming Assistant. Ask me about soil moisture, watering advice, 7-day forecasts, or pre-approved credit.',
    },
  ]);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMascotBubbleOpen(isBaac);
    setMessages([
      {
        id: `welcome-${role}-${lang}`,
        role: 'model',
        text: isBaac
          ? isTh
            ? 'สวัสดีครับ ผมคือผู้ช่วย AI วิเคราะห์พอร์ต ธ.ก.ส. สามารถช่วยสรุปความเสี่ยง 7 วัน คัดกรองแปลงที่ควรปล่อยงวด/ชะลอวงเงิน และแนะนำเงื่อนไขประกันภัยแบบกระชับได้ครับ'
            : 'Hello! I am your BAAC Portfolio Copilot. Ask me for concise 7-day climate risk summaries, Tranche approvals, or credit hold guidance.'
          : isTh
            ? 'สวัสดีครับ ผมคือผู้ช่วย AI ของ CropShield ถามเรื่องความชื้นดิน การให้น้ำ-ใส่ปุ๋ย พยากรณ์ 7 วัน หรือการขอสินเชื่อหมุนเวียนได้เลยครับ'
            : 'Hello! I am your CropShield Farming Assistant. Ask me about soil moisture, watering advice, 7-day forecasts, or pre-approved credit.',
      },
    ]);
  }, [isBaac, isTh, lang, role]);

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages, isSending]);

  const quickPrompts = isBaac
    ? isTh
      ? [
          'สรุปความเสี่ยงพอร์ต 7 วันและยอดสินเชื่อเฝ้าระวังแบบกระชับ',
          'แนะนำรายที่ควรอนุมัติงวด (Tranche) และรายที่ควรชะลอตรวจวันนี้',
          'กลุ่มใดควรส่ง SMS เตือนภัยและทริกเกอร์ประกันภัยก่อน?',
        ]
      : [
          'Summarize 7-day portfolio risk and exposed loan volume concisely',
          'Which plots are ready for Tranche release vs hold review today?',
          'Who needs urgent SMS alerts or Parametric Shield triggers first?',
        ]
    : isTh
      ? [
          'สรุปสุขภาพแปลงวันนี้และแนวโน้ม 7 วันข้างหน้าให้เข้าใจง่าย',
          'ช่วงนี้ควรให้น้ำหรือดูแลแปลงอย่างไรดี?',
          'แปลงนี้ขอสินเชื่อหมุนเวียนหรือเปิดประกันภัยคุ้มไหม?',
        ]
      : [
          'Summarize my plot health and 7-day risk simply',
          'How should I irrigate or care for my crop this week?',
          'Am I eligible for pre-approved credit or weather shield?',
        ];

  const handleSendMessage = async (textOverride?: string) => {
    const query = (textOverride ?? inputText).trim();
    if (!query || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
    };

    const historyForApi = messages
      .filter((m) => !m.isError && !m.id.startsWith('welcome-'))
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    if (!textOverride) setInputText('');
    setIsSending(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          lang,
          message: query,
          history: historyForApi,
          contextSummary,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
      };

      if (!res.ok || !payload.reply) {
        throw new Error(
          payload.error ||
            (isTh
              ? 'ไม่สามารถติดต่อผู้ช่วย AI ได้ในขณะนี้'
              : 'Unable to reach AI assistant right now.')
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          text: payload.reply!,
        },
      ]);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : isTh
            ? 'เกิดข้อผิดพลาดในการเชื่อมต่อผู้ช่วย AI'
            : 'Failed to connect to AI assistant.';

      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: errorMessage,
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Slide-up Floating AI Chatbot Panel */}
      {isOpen && (
        <section
          data-testid="floating-ai-chatbot-panel"
          aria-label={
            isBaac
              ? isTh
                ? 'ผู้ช่วย AI วิเคราะห์พอร์ต ธ.ก.ส.'
                : 'BAAC Portfolio AI Assistant'
              : isTh
                ? 'ผู้ช่วย CropShield AI'
                : 'CropShield AI Assistant'
          }
          className="fixed bottom-[142px] right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[410px] max-h-[68vh] flex flex-col bg-white rounded-2xl border border-emerald-900/15 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 text-white px-4 py-3 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight truncate">
                  {isBaac
                    ? isTh
                      ? 'ผู้ช่วย AI พอร์ต ธ.ก.ส.'
                      : 'BAAC Portfolio AI Copilot'
                    : isTh
                      ? 'ผู้ช่วยเกษตรกร CropShield AI'
                      : 'CropShield Smart AI'}
                </div>
                <div className="text-[11px] text-emerald-100 truncate">
                  {isBaac
                    ? isTh
                      ? 'สรุปความเสี่ยงพอร์ต & คำแนะนำสินเชื่อ'
                      : 'Portfolio risk & lending guidance'
                    : isTh
                      ? 'ถามตอบเรื่องดิน น้ำ อากาศ และสินเชื่อ'
                      : 'Soil, irrigation, weather & credit Q&A'}
                </div>
              </div>
            </div>

            <button
              type="button"
              data-testid="floating-ai-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label={isTh ? 'ปิดหน้าต่างแชท AI' : 'Close AI chat'}
              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-xl text-white/90 hover:bg-white/15 transition-colors shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-emerald-50/70 border-b border-emerald-900/10 flex flex-wrap gap-1.5 shrink-0">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isSending}
                onClick={() => void handleSendMessage(prompt)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-900/15 text-xs font-semibold text-emerald-950 hover:bg-emerald-100/70 transition-colors text-left leading-snug disabled:opacity-50"
              >
                <Sparkles
                  className="w-3 h-3 text-emerald-700 shrink-0"
                  aria-hidden="true"
                />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 bg-[#F8FBF9]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  role={msg.isError ? 'alert' : undefined}
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-emerald-700 text-white rounded-br-sm'
                      : msg.isError
                        ? 'bg-red-50 border border-red-200 text-red-900 rounded-bl-sm flex items-start gap-2'
                        : 'bg-white border border-emerald-900/10 text-slate-800 shadow-2xs rounded-bl-sm'
                  }`}
                >
                  {msg.isError && (
                    <AlertCircle
                      className="w-4 h-4 text-red-600 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  )}
                  <span>{msg.text}</span>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-emerald-900/10 text-xs font-semibold text-emerald-800 shadow-2xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>
                    {isTh ? 'AI กำลังวิเคราะห์ข้อมูล...' : 'AI is analyzing...'}
                  </span>
                </div>
              </div>
            )}
            <div ref={scrollEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
            className="p-2.5 bg-white border-t border-emerald-900/10 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              data-testid="floating-ai-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isBaac
                  ? isTh
                    ? 'ถามสรุปความเสี่ยงหรือเกณฑ์ปล่อยกู้...'
                    : 'Ask about portfolio risk or credit...'
                  : isTh
                    ? 'พิมพ์คำถามเรื่องแปลงเกษตรหรือสินเชื่อ...'
                    : 'Ask about your farm or credit...'
              }
              className="flex-1 min-h-[44px] px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
            <button
              type="submit"
              data-testid="floating-ai-send-btn"
              disabled={!inputText.trim() || isSending}
              aria-label={isTh ? 'ส่งข้อความ' : 'Send message'}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white disabled:bg-slate-200 disabled:text-slate-400 transition-colors shrink-0"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </section>
      )}

      {/* Compact 1-Sentence Mascot Speech Bubble (Farmer on Tap, BAAC Officer Sleek Corner Pill) */}
      {mascotBubbleOpen && !isOpen && (
        <div
          data-testid={
            isBaac
              ? 'baac-officer-mascot-bubble'
              : 'farmer-mascot-speech-bubble'
          }
          role="status"
          className={
            isBaac
              ? 'cs-pop-in fixed bottom-[76px] right-[78px] sm:right-[84px] z-40 max-w-[230px] sm:max-w-[265px] bg-white/98 backdrop-blur-xs border-2 border-emerald-700 rounded-2xl rounded-br-sm px-2.5 py-1.5 shadow-lg flex items-start gap-1.5'
              : 'cs-pop-in fixed bottom-[140px] right-4 sm:right-6 z-40 max-w-[270px] sm:max-w-[300px] bg-white border-2 border-emerald-600 rounded-2xl p-3 sm:p-3.5 shadow-lg space-y-2'
          }
        >
          {isBaac ? (
            <>
              <button
                type="button"
                data-testid="baac-mascot-open-chat-btn"
                onClick={() => {
                  setMascotBubbleOpen(false);
                  setIsOpen(true);
                }}
                className="text-left text-[11px] sm:text-xs font-bold text-slate-900 leading-snug hover:text-emerald-800 transition-colors"
              >
                <Sparkles
                  className="w-3 h-3 text-emerald-700 inline mr-1 -mt-0.5"
                  aria-hidden="true"
                />
                {mascotSpeech ||
                  (isTh
                    ? 'มีแปลงเสี่ยงใน 7 วันนี้ แนะนำกด AI ร่าง SMS ล่วงหน้าครับ'
                    : 'Plots show 7-day risk—try AI Draft SMS to notify farmers early.')}
              </button>
              <button
                type="button"
                data-testid="baac-mascot-bubble-close"
                onClick={() => setMascotBubbleOpen(false)}
                aria-label={isTh ? 'ปิดคำแนะนำมาสคอต' : 'Close mascot message'}
                className="min-h-[24px] min-w-[24px] inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <p className="text-base sm:text-lg font-extrabold text-emerald-950 leading-snug">
                  “
                  {mascotSpeech ||
                    (isTh
                      ? 'วันนี้แปลงยังโอเคครับลุง/ป้า'
                      : 'Your plot looks good today!')}
                  ”
                </p>
                <button
                  type="button"
                  data-testid="farmer-mascot-bubble-close"
                  onClick={() => setMascotBubbleOpen(false)}
                  aria-label={isTh ? 'ปิดคำแนะนำมาสคอต' : 'Close mascot message'}
                  className="min-h-[28px] min-w-[28px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                data-testid="farmer-mascot-open-chat-btn"
                onClick={() => {
                  setMascotBubbleOpen(false);
                  setIsOpen(true);
                }}
                className="min-h-[34px] w-full inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                <span>{isTh ? 'ถามผู้ช่วยเพิ่มเติม' : 'Ask AI Assistant'}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Circular Floating Mascot (Farmer) / AI Robot (BAAC) Button at Bottom-Right */}
      <button
        type="button"
        data-testid="floating-ai-chatbot-btn"
        aria-expanded={isOpen || mascotBubbleOpen}
        aria-label={
          isBaac
            ? isTh
              ? 'เปิดผู้ช่วย AI วิเคราะห์พอร์ต ธ.ก.ส.'
              : 'Open BAAC AI Assistant'
            : isTh
              ? 'กดดูคำทักทายจากมาสคอต CropShield'
              : 'Tap CropShield Mascot'
        }
        title={
          isBaac
            ? isTh
              ? 'ผู้ช่วย AI ธ.ก.ส.'
              : 'BAAC AI Assistant'
            : isTh
              ? 'น้องต้นกล้า CropShield'
              : 'CropShield Mascot'
        }
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            setMascotBubbleOpen(false);
          } else if (isBaac && !mascotBubbleOpen) {
            setIsOpen(true);
          } else {
            setMascotBubbleOpen((v) => !v);
          }
        }}
        className={`fixed bottom-[76px] right-4 sm:right-6 z-40 w-13 h-13 sm:w-14 sm:h-14 rounded-full shadow-xl ring-4 ring-white/95 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-emerald-500 ${
          !isOpen ? 'cs-soft-float' : ''
        } ${
          isBaac
            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-amber-300'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6" aria-hidden="true" />
        ) : isBaac ? (
          <Bot className="w-7 h-7" aria-hidden="true" />
        ) : (
          <FarmerSproutMascotIcon className="w-10 h-10" />
        )}
      </button>
    </>
  );
};
