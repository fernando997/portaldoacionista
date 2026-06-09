import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MessageCircle, Send, Loader2, Plus, X, Lock, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';

type Ticket = {
  id: string;
  assunto: string;
  status: string;
  created_at: string;
  updated_at: string;
  ticket_number: number;
};

type Message = {
  id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  is_staff: boolean;
  created_at: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtFull(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ticketNum(n: number) {
  return `#${String(n).padStart(5, '0')}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SacPage() {
  const { user, currentShareholder } = useAuth();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newAssunto, setNewAssunto] = useState('');
  const [newMensagem, setNewMensagem] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadTickets(); }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    const ownerId = currentShareholder.user_id || user!.id;
    const { data, error } = await supabase
      .from('sac_tickets')
      .select('*')
      .eq('user_id', ownerId)
      .order('updated_at', { ascending: false });

    if (!error && data) setTickets(data as Ticket[]);
    setLoadingTickets(false);
  };

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setReply('');
    setLoadingMessages(true);

    const { data } = await supabase
      .from('sac_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });

    setMessages((data as Message[]) || []);
    setLoadingMessages(false);

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('ticket_id', ticket.id)
      .eq('user_id', currentShareholder.user_id || user!.id)
      .eq('read', false);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selectedTicket) return;
    setSendingReply(true);

    const { error } = await supabase.from('sac_messages').insert({
      ticket_id: selectedTicket.id,
      author_id: user!.id,
      content: reply.trim(),
      is_staff: false,
    });

    if (error) {
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' });
    } else {
      setReply('');
      const { data } = await supabase
        .from('sac_messages')
        .select('*')
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true });
      setMessages((data as Message[]) || []);
    }
    setSendingReply(false);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssunto.trim()) return;
    setCreatingTicket(true);

    const ownerId = currentShareholder.user_id || user!.id;
    const { data: ticket, error: ticketError } = await supabase
      .from('sac_tickets')
      .insert({ user_id: ownerId, assunto: newAssunto.trim() })
      .select()
      .single();

    if (ticketError || !ticket) {
      toast({ title: 'Erro ao criar ticket', variant: 'destructive' });
      setCreatingTicket(false);
      return;
    }

    const firstMsg = newMensagem.trim() || newAssunto.trim();
    await supabase.from('sac_messages').insert({
      ticket_id: ticket.id,
      author_id: user!.id,
      content: firstMsg,
      is_staff: false,
    });

    toast({ title: 'Ticket criado com sucesso!' });
    setNewAssunto('');
    setNewMensagem('');
    setShowNewForm(false);
    await loadTickets();
    setCreatingTicket(false);
  };

  const userInitials = currentShareholder?.name ? getInitials(currentShareholder.name) : '?';

  // Group messages by date for separators
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const d = fmtDate(msg.created_at);
    const last = groupedMessages[groupedMessages.length - 1];
    if (!last || last.date !== d) {
      groupedMessages.push({ date: d, msgs: [msg] });
    } else {
      last.msgs.push(msg);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Suporte (SAC)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Acompanhe seus tickets de atendimento</p>
        </div>
        <Button onClick={() => setShowNewForm(v => !v)} size="sm" className="gap-2">
          {showNewForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showNewForm ? 'Cancelar' : 'Novo ticket'}
        </Button>
      </div>

      {/* New ticket form */}
      {showNewForm && (
        <form onSubmit={handleCreateTicket} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Assunto <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={newAssunto}
              onChange={e => setNewAssunto(e.target.value)}
              placeholder="Ex: Dúvida sobre extrato de maio"
              required
              className="w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Mensagem inicial
            </label>
            <textarea
              value={newMensagem}
              onChange={e => setNewMensagem(e.target.value)}
              placeholder="Descreva sua dúvida ou solicitação em detalhes..."
              rows={4}
              className="w-full rounded-xl border bg-background px-3.5 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={creatingTicket || !newAssunto.trim()} size="sm" className="gap-2">
              {creatingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {creatingTicket ? 'Criando...' : 'Abrir ticket'}
            </Button>
          </div>
        </form>
      )}

      {/* Ticket list */}
      {loadingTickets ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <MessageCircle className="w-10 h-10 opacity-30" />
          <p className="text-sm">Você ainda não tem tickets. Clique em "Novo ticket" para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(ticket => {
            const isOpen = ticket.status === 'aberto';
            return (
              <button
                key={ticket.id}
                onClick={() => openTicket(ticket)}
                className={cn(
                  'w-full text-left rounded-xl border bg-card pl-0 pr-4 py-3.5 hover:bg-muted/40 hover:shadow-sm hover:translate-x-0.5 transition-all flex overflow-hidden',
                )}
              >
                {/* Left color border */}
                <div className={cn(
                  'w-1 shrink-0 rounded-l-xl mr-4',
                  isOpen ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      'font-mono text-[11px] font-bold shrink-0',
                      isOpen ? 'text-emerald-600' : 'text-muted-foreground',
                    )}>
                      {ticketNum(ticket.ticket_number)}
                    </span>
                    <p className="text-sm font-semibold text-foreground line-clamp-1 flex-1">
                      {ticket.assunto}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{fmtFull(ticket.created_at)}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[11px] shrink-0',
                        isOpen
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                          : 'bg-muted text-muted-foreground border-border',
                      )}
                    >
                      {isOpen ? 'Aberto' : 'Encerrado'}
                    </Badge>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Thread sheet */}
      <Sheet open={!!selectedTicket} onOpenChange={open => { if (!open) setSelectedTicket(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
          {selectedTicket && (
            <>
              {/* Sheet header */}
              <SheetHeader className="px-5 py-4 border-b shrink-0 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={cn(
                      'font-mono text-[11px] font-bold shrink-0',
                      selectedTicket.status === 'aberto' ? 'text-emerald-600' : 'text-muted-foreground',
                    )}>
                      {ticketNum(selectedTicket.ticket_number)}
                    </span>
                    <SheetTitle className="text-sm font-semibold leading-snug text-left line-clamp-2 flex-1">
                      {selectedTicket.assunto}
                    </SheetTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-[11px]',
                      selectedTicket.status === 'aberto'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        : 'bg-muted text-muted-foreground border-border',
                    )}
                  >
                    {selectedTicket.status === 'aberto' ? 'Aberto' : 'Encerrado'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  Aberto em {fmtFull(selectedTicket.created_at)}
                </p>
              </SheetHeader>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-muted/10">
                {loadingMessages ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem ainda.</p>
                ) : (
                  groupedMessages.map(group => (
                    <div key={group.date} className="space-y-3">
                      {/* Date separator */}
                      <div className="flex items-center gap-3 py-2">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] text-muted-foreground font-medium px-1 shrink-0">{group.date}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      {group.msgs.map(msg => {
                        const isOwn = msg.author_id === user?.id;
                        return (
                          <div key={msg.id} className={cn('flex items-end gap-2', isOwn ? 'justify-end' : 'justify-start')}>
                            {/* Staff avatar (left) */}
                            {!isOwn && (
                              <div className="w-7 h-7 rounded-full bg-[hsl(210,80%,52%)]/15 border border-[hsl(210,80%,52%)]/30 flex items-center justify-center shrink-0">
                                <Headphones className="w-3.5 h-3.5 text-[hsl(210,80%,52%)]" />
                              </div>
                            )}

                            <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start', 'max-w-[75%]')}>
                              <div className={cn(
                                'rounded-2xl px-3.5 py-2.5 text-sm',
                                isOwn
                                  ? 'bg-[hsl(135,55%,42%)]/20 text-foreground border border-[hsl(135,55%,42%)]/25 rounded-br-sm'
                                  : 'bg-[hsl(210,80%,52%)]/12 text-foreground border border-[hsl(210,80%,52%)]/20 rounded-bl-sm',
                              )}>
                                {!isOwn && (
                                  <p className="text-[10px] font-bold mb-0.5 uppercase tracking-wide text-[hsl(210,80%,52%)]">
                                    Equipe
                                  </p>
                                )}
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1 px-1">{fmtTime(msg.created_at)}</p>
                            </div>

                            {/* User avatar (right) */}
                            {isOwn && (
                              <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-[11px] font-bold text-emerald-700">
                                {userInitials}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input area or closed banner */}
              {selectedTicket.status === 'aberto' ? (
                <div className="border-t px-4 py-3.5 shrink-0 bg-background space-y-1">
                  <form onSubmit={handleReply} className="flex gap-2 items-end">
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      rows={2}
                      className="flex-1 rounded-xl border bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (reply.trim()) handleReply(e as any);
                        }
                      }}
                    />
                    <Button type="submit" size="icon" disabled={sendingReply || !reply.trim()} className="self-end shrink-0">
                      {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </form>
                  <p className="text-[10px] text-muted-foreground pl-1">Shift+Enter para nova linha</p>
                </div>
              ) : (
                <div className="border-t px-4 py-3.5 shrink-0 bg-muted/20">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="w-4 h-4 shrink-0" />
                    <p className="text-sm">Este ticket foi encerrado</p>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
