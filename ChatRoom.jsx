import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  ArrowLeft,
  Send,
  Loader2,
  Image as ImageIcon,
  Check,
  CheckCheck,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const STATUS_LABELS = {
  Draft: "Draft",
  Open: "Open",
  "Application Pending": "Application pending",
  Assigned: "Assigned",
  "In Progress": "In progress",
  Completed: "Completed",
  Cancelled: "Cancelled",
};

export default function ChatRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [job, setJob] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const userIdRef = useRef(null);
  const jobIdRef = useRef(null);
  const lastTypingRef = useRef(0);

  useEffect(() => {
    if (!user?.id) return;
    userIdRef.current = user.id;
    let alive = true;
    setForbidden(false);
    setJob(null);
    setConversation(null);
    setMessages([]);
    setLoading(true);
    base44.entities.Conversation.get(id)
      .then(async (conv) => {
        if (!alive) return;
        setConversation(conv);
        // Security: only participants can open this conversation.
        if (conv.homeowner_id !== user.id && conv.worker_id !== user.id) {
          setForbidden(true);
          setLoading(false);
          return;
        }
        const [msgs, jobData] = await Promise.all([
          base44.entities.Message.filter({ conversation_id: id }, "created_date", 200),
          conv.job_id
            ? base44.entities.Job.get(conv.job_id).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (!alive) return;
        if (jobData) {
          setJob(jobData);
          jobIdRef.current = jobData.id;
        }
        setMessages(msgs);
        markRead(msgs, user.id);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id !== id) return;
      if (event.type === "create") {
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.data.id)) return prev;
          const next = [...prev, event.data].sort(
            (a, b) => new Date(a.created_date) - new Date(b.created_date)
          );
          return next;
        });
        if (event.data.sender_id !== userIdRef.current) {
          base44.entities.Message.update(event.data.id, { read: true }).catch(() => {});
          setMessages((prev) =>
            prev.map((m) => (m.id === event.data.id ? { ...m, read: true } : m))
          );
        }
      } else if (event.type === "update") {
        setMessages((prev) =>
          prev.map((m) => (m.id === event.data.id ? { ...m, ...event.data } : m))
        );
      }
    });

    const unsubConv = base44.entities.Conversation.subscribe((event) => {
      if (event.data?.id === id && event.type === "update") {
        setConversation((prev) => ({ ...(prev || {}), ...event.data }));
      }
    });

    const unsubJob = base44.entities.Job.subscribe((event) => {
      if (event.type === "update" && event.data?.id === jobIdRef.current) {
        setJob((prev) => ({ ...(prev || {}), ...event.data }));
      }
    });

    return () => {
      alive = false;
      unsubscribe();
      unsubConv();
      unsubJob();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const markRead = async (msgs, uid) => {
    const unreadIds = msgs.filter((m) => m.sender_id !== uid && !m.read).map((m) => m.id);
    if (unreadIds.length === 0) return;
    try {
      await base44.entities.Message.bulkUpdate(
        unreadIds.map((mid) => ({ id: mid, read: true }))
      );
      setMessages((prev) =>
        prev.map((m) => (unreadIds.includes(m.id) ? { ...m, read: true } : m))
      );
    } catch {}
  };

  const notifyOther = async () => {
    if (!conversation || !conversation.job_id) return;
    const isWorkerSender = conversation.worker_id === userIdRef.current;
    const recipientId = isWorkerSender ? conversation.homeowner_id : conversation.worker_id;
    if (!recipientId || recipientId === userIdRef.current) return;
    const senderName = isWorkerSender ? conversation.worker_name : conversation.homeowner_name;
    try {
      const existing = await base44.entities.Notification.filter({
        user_id: recipientId,
        type: "message",
        read: false,
        job_id: conversation.job_id,
      });
      if (existing.length === 0) {
        await base44.entities.Notification.create({
          user_id: recipientId,
          type: "message",
          title: "New message",
          body: `${senderName || "Someone"} sent you a message about ${
            conversation.job_title || "your job"
          }.`,
          job_id: conversation.job_id,
          job_title: conversation.job_title,
          conversation_id: id,
          read: false,
        });
      }
    } catch {}
  };

  const sendTyping = (clear = false) => {
    if (!conversation) return;
    base44.entities.Conversation
      .update(id, clear ? { typing_by: "" } : { typing_by: userIdRef.current, typing_at: new Date().toISOString() })
      .catch(() => {});
  };

  const onTextChange = (val) => {
    setText(val);
    if (!val) {
      sendTyping(true);
      return;
    }
    if (Date.now() - lastTypingRef.current > 2500) {
      lastTypingRef.current = Date.now();
      sendTyping(false);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const msgText = text.trim();
    setText("");
    sendTyping(true);
    try {
      const recipientId = conversation.homeowner_id === user.id ? conversation.worker_id : conversation.homeowner_id;
      await base44.entities.Message.create({
        conversation_id: id,
        sender_id: user.id,
        recipient_id: recipientId,
        text: msgText,
        read: false,
      });
      await base44.entities.Conversation.update(id, {
        last_message: msgText,
        last_message_date: new Date().toISOString(),
        typing_by: "",
      });
      await notifyOther();
    } catch (err) {
      setText(msgText);
      toast({
        title: "Message failed to send",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const recipientId = conversation.homeowner_id === user.id ? conversation.worker_id : conversation.homeowner_id;
      await base44.entities.Message.create({
        conversation_id: id,
        sender_id: user.id,
        recipient_id: recipientId,
        text: "",
        image_url: file_url,
        read: false,
      });
      await base44.entities.Conversation.update(id, {
        last_message: "📷 Photo",
        last_message_date: new Date().toISOString(),
        typing_by: "",
      });
      await notifyOther();
    } catch (err) {
      toast({
        title: "Could not send photo",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (forbidden || !conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-6 text-center">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mb-3" />
        <h2 className="font-semibold">Conversation not available</h2>
        <p className="text-sm text-muted-foreground mt-1">
          You don't have access to this conversation.
        </p>
        <Link
          to="/chat"
          className="mt-5 px-5 h-11 rounded-full bg-primary text-primary-foreground font-medium flex items-center"
        >
          Back to messages
        </Link>
      </div>
    );
  }

  const otherName =
    conversation.homeowner_id === user.id ? conversation.worker_name : conversation.homeowner_name;
  const otherTyping =
    conversation.typing_by &&
    conversation.typing_by !== user.id &&
    Date.now() - new Date(conversation.typing_at).getTime() < 5000;
  const jobStatus = job ? STATUS_LABELS[job.status] || job.status : null;

  const fmtTime = (d) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-background">
      <div className="px-4 pt-12 pb-3 border-b border-border flex items-center gap-3 bg-background sticky top-0 z-10">
        <button onClick={() => navigate("/chat")} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-brand-blue-light flex items-center justify-center font-semibold text-primary">
          {otherName?.[0] || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight truncate">{otherName || "Unknown"}</p>
          <p className="text-xs text-muted-foreground truncate">{conversation.job_title}</p>
          {jobStatus && (
            <p className="text-[11px] font-medium text-primary mt-0.5">
              Job Status: {jobStatus}
            </p>
          )}
        </div>
        {conversation.job_id && (
          <Link
            to={`/job/${conversation.job_id}`}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground"
            title="Open job"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            Say hello to start the conversation.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                {!mine && (
                  <span className="text-[11px] font-medium text-muted-foreground px-1 mb-0.5">
                    {(otherName || "").split(" ")[0]}
                  </span>
                )}
                {m.image_url && (
                  <img
                    src={m.image_url}
                    alt="attachment"
                    className={`max-w-[220px] max-h-[240px] rounded-2xl object-cover mb-1 ${
                      mine ? "rounded-br-md" : "rounded-bl-md"
                    }`}
                  />
                )}
                {m.text && (
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {m.text}
                  </div>
                )}
                <div className={`flex items-center gap-1 mt-0.5 px-1 ${mine ? "flex-row-reverse" : ""}`}>
                  <span className="text-[10px] text-muted-foreground">{fmtTime(m.created_date)}</span>
                  {mine &&
                    m.text &&
                    (m.read ? (
                      <CheckCheck className="w-3 h-3 text-accent" />
                    ) : (
                      <Check className="w-3 h-3 text-muted-foreground" />
                    ))}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {otherTyping && (
        <div className="px-5 pb-1">
          <span className="text-xs text-muted-foreground italic">
            {otherName?.split(" ")[0]} is typing…
          </span>
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="px-4 py-3 border-t border-border bg-background safe-bottom flex items-center gap-2"
      >
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-11 h-11 rounded-full bg-muted text-foreground flex items-center justify-center flex-shrink-0"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
        </button>
        <input
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Message…"
          className="flex-1 h-11 rounded-full bg-muted px-4 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={(!text.trim() && !uploading) || sending}
          className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
