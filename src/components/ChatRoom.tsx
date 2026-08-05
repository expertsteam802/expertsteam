import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

/**
 * ChatRoom component – Instagram‑style chat UI.
 *   * Shows messages from the `chats` table filtered by the current user.
 *   * Sends user message to Gemini (placeholder) and stores AI reply.
 */
export const ChatRoom = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'ai'; content: string }>>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing messages for this user
  useEffect(() => {
    if (!user) return;
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('id, role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) toast.error('Failed to load chats');
      else setMessages(data as any);
    };
    fetchMessages();

    // Real‑time subscription
    const channel = supabase
      .channel('public:chats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, (payload) => {
        const newMsg = payload.new as any;
        if (newMsg.user_id === user.id) setMessages((prev) => [...prev, newMsg]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    const userMsg = { role: 'user' as const, content: input.trim() };
    setInput('');
    // Optimistically add user message
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), ...userMsg }]);
    // Store user message
    const { error: errUser } = await supabase.from('chats').insert({
      user_id: user.id,
      role: 'user',
      content: userMsg.content,
    });
    if (errUser) toast.error('Failed to save message');

    // Call Gemini (placeholder – replace with actual endpoint)
    let aiResponse = '…';
    try {
      const resp = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg.content, userId: user.id }),
      });
      const json = await resp.json();
      aiResponse = json.reply ?? 'Sorry, I could not generate a response.';
    } catch (e) {
      console.error(e);
      aiResponse = 'Error contacting AI service.';
    }
    // Store AI reply
    const { error: errAi } = await supabase.from('chats').insert({
      user_id: user.id,
      role: 'ai',
      content: aiResponse,
    });
    if (errAi) toast.error('Failed to save AI reply');
    // Append AI reply locally
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'ai', content: aiResponse }]);
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 bg-white/90 dark:bg-gray-800/90 rounded-xl shadow-lg backdrop-blur-md">
      <div className="flex-1 overflow-y-auto mb-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`p-3 rounded-lg max-w-xs ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded-md p-2"
          placeholder="Ask Chris AI…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Send
        </button>
      </div>
    </div>
  );
};
