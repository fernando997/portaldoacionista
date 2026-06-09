import { useState } from 'react';
import { MessageCircleQuestion, X, Send, Loader2 } from 'lucide-react';
import { useAuth, INTERNAL_ROLES } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function SacButton() {
  const { currentShareholder, user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  // Hide for internal staff
  if (role && INTERNAL_ROLES.includes(role)) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !user) return;

    setLoading(true);
    try {
      const { data: ticket, error: ticketError } = await supabase
        .from('sac_tickets')
        .insert({ user_id: user.id, assunto: question.trim() })
        .select()
        .single();

      if (ticketError || !ticket) throw ticketError;

      const { error: msgError } = await supabase.from('sac_messages').insert({
        ticket_id: ticket.id,
        author_id: user.id,
        content: question.trim(),
        is_staff: false,
      });

      if (msgError) throw msgError;

      toast({ title: 'Ticket criado com sucesso!', description: 'Acompanhe a resposta na página de Suporte.' });
      setQuestion('');
      setOpen(false);
      navigate('/sac');
    } catch {
      toast({
        title: 'Erro ao criar ticket',
        description: 'Tente novamente ou entre em contato pelo e-mail suporte@modocorreinvest.com.br',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir SAC"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
        style={{ background: 'linear-gradient(135deg, hsl(135,55%,42%), hsl(135,65%,32%))' }}
      >
        <MessageCircleQuestion className="w-5 h-5 shrink-0" />
        <span className="text-sm font-semibold hidden sm:block">Suporte (SAC)</span>
      </button>

      {/* Overlay + Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-md bg-card rounded-2xl shadow-2xl border overflow-hidden"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ background: 'linear-gradient(135deg, hsl(135,55%,42%), hsl(135,65%,32%))' }}
            >
              <div className="flex items-center gap-2.5">
                <MessageCircleQuestion className="w-5 h-5 text-white" />
                <div>
                  <p className="text-white text-sm font-semibold leading-none">Suporte ao Cliente (SAC)</p>
                  <p className="text-white/70 text-xs mt-0.5">Envie sua dúvida para nossa equipe</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Client info (readonly) */}
              <div className="bg-muted/50 rounded-xl p-3.5 space-y-1.5 border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Cliente</span>
                  <span className="text-xs font-semibold text-foreground">{currentShareholder.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Locadora</span>
                  <span className="text-xs font-semibold text-foreground">{currentShareholder.group || '—'}</span>
                </div>
              </div>

              {/* Message field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Sua dúvida ou mensagem
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Descreva sua dúvida com o máximo de detalhes possível..."
                  rows={5}
                  required
                  className="w-full rounded-xl border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-green-600/40 transition-shadow"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 gap-3">
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Acompanhe a resposta no portal, em Suporte.
                </p>
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 shrink-0"
                  style={{ background: 'linear-gradient(135deg, hsl(135,55%,42%), hsl(135,65%,32%))' }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {loading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
