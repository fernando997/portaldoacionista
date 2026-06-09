import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Loader2, MessageCircle, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';

type Ticket = {
  id: string;
  user_id: string;
  assunto: string;
  status: string;
  created_at: string;
  updated_at: string;
  ticket_number: number;
  owner_name?: string;
  owner_email?: string;
  owner_pedido?: string;
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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function nameToHue(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

function AvatarInitials({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const hue = nameToHue(name);
  const initials = getInitials(name);
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[11px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div
      className={cn('rounded-full flex items-center justify-center shrink-0 font-bold border', sizeClass)}
      style={{
        backgroundColor: `hsl(${hue},55%,92%)`,
        borderColor: `hsl(${hue},55%,75%)`,
        color: `hsl(${hue},55%,35%)`,
      }}
    >
      {initials}
    </div>
  );
}

export default function AdminSacPage() {
  const { user, shareholders } = useAuth();
  const { toast } = useToast();

  // Raw ticket data (no owner info yet)
  const [rawTickets, setRawTickets] = useState<Omit<Ticket, 'owner_name' | 'owner_email' | 'owner_pedido'>[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch raw tickets once on mount
  useEffect(() => { loadTickets(); }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    const { data, error } = await supabase
      .from('sac_tickets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) setRawTickets(data as any);
    setLoadingTickets(false);
  };

  // Enrich tickets with owner info — recomputes whenever rawTickets OR shareholders changes
  // shareholders is populated async by AuthContext; this ensures names appear as soon as it's ready
  const tickets: Ticket[] = useMemo(() => {
    const map = Object.fromEntries(shareholders.map(s => [s.user_id, s]));
    return rawTickets.map(t => {
      const sh = map[t.user_id];
      return {
        ...t,
        owner_name: sh?.name || undefined,
        owner_email: sh?.email || undefined,
        owner_pedido: sh?.idPedido || undefined,
      };
    });
  }, [rawTickets, shareholders]);

  // Keep selectedTicket in sync with the enriched tickets array
  const selectedTicket = tickets.find(t => t.id === selectedTicketId) ?? null;

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicketId(ticket.id);
    setReply('');
    setLoadingMessages(true);

    const { data } = await supabase
      .from('sac_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });

    setMessages((data as Message[]) || []);
    setLoadingMessages(false);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selectedTicket) return;
    setSendingReply(true);

    const { error } = await supabase.from('sac_messages').insert({
      ticket_id: selectedTicket.id,
      author_id: user!.id,
      content: reply.trim(),
      is_staff: true,
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

      await supabase
        .from('sac_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);
    }
    setSendingReply(false);
  };

  const handleClose = async () => {
    if (!selectedTicket) return;
    setClosingTicket(true);

    const { error } = await supabase
      .from('sac_tickets')
      .update({ status: 'encerrado' })
      .eq('id', selectedTicket.id);

    if (error) {
      toast({ title: 'Erro ao encerrar ticket', variant: 'destructive' });
    } else {
      setRawTickets(prev => prev.map(t => t.id === selectedTicket!.id ? { ...t, status: 'encerrado' } : t));
      toast({ title: 'Ticket encerrado' });
    }
    setClosingTicket(false);
  };

  const open = tickets.filter(t => t.status === 'aberto');
  const closed = tickets.filter(t => t.status === 'encerrado');

  const mostRecent = tickets[0];

  // Group messages by date
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

  const TicketCard = ({ ticket }: { ticket: Ticket }) => {
    const name = ticket.owner_name || `uid:${ticket.user_id.slice(0, 8)}`;
    return (
      <button
        onClick={() => openTicket(ticket)}
        className="w-full text-left rounded-xl border bg-card px-4 py-3.5 hover:bg-muted/40 hover:shadow-sm transition-all flex items-center gap-3"
      >
        <AvatarInitials name={name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight line-clamp-1">{name}</p>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{ticket.assunto}</p>
        </div>
        <div className="shrink-0 text-right space-y-1">
          <div className="flex items-center justify-end gap-1.5">
            <span className="font-mono text-[11px] text-muted-foreground font-medium">
              {ticketNum(ticket.ticket_number)}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'text-[11px]',
                ticket.status === 'aberto'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border-border',
              )}
            >
              {ticket.status === 'aberto' ? 'Aberto' : 'Encerrado'}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">{timeAgo(ticket.updated_at)}</p>
        </div>
      </button>
    );
  };

  const EmptyState = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
      <MessageCircle className="w-10 h-10 opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-foreground">SAC</h1>
          {open.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 text-xs font-semibold border border-emerald-500/30">
              {open.length} em aberto
            </span>
          )}
          {mostRecent && (
            <span className="text-xs text-muted-foreground">
              Última atualização {timeAgo(mostRecent.updated_at)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">Tickets de atendimento dos acionistas</p>
      </div>

      {loadingTickets ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="aberto">
          <TabsList className="mb-4">
            <TabsTrigger value="aberto" className="gap-2">
              Em Aberto
              {open.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                  {open.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="encerrado" className="gap-2">
              Encerrados
              {closed.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-muted-foreground/40 text-white text-[10px] font-bold">
                  {closed.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="aberto" className="space-y-2">
            {open.length === 0
              ? <EmptyState label="Nenhum ticket em aberto." />
              : open.map(t => <TicketCard key={t.id} ticket={t} />)
            }
          </TabsContent>

          <TabsContent value="encerrado" className="space-y-2">
            {closed.length === 0
              ? <EmptyState label="Nenhum ticket encerrado." />
              : closed.map(t => <TicketCard key={t.id} ticket={t} />)
            }
          </TabsContent>
        </Tabs>
      )}

      {/* Thread sheet */}
      <Sheet open={!!selectedTicketId} onOpenChange={open => { if (!open) setSelectedTicketId(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
          {selectedTicket && (
            <>
              {/* Sheet header */}
              <SheetHeader className="px-5 py-4 border-b shrink-0 space-y-3">
                <div className="flex items-start gap-3">
                  <AvatarInitials name={selectedTicket.owner_name || selectedTicket.user_id.slice(0, 8)} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <SheetTitle className="text-sm font-bold text-left">
                        {selectedTicket.owner_name || `uid:${selectedTicket.user_id.slice(0, 8)}`}
                      </SheetTitle>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] text-muted-foreground font-medium">
                          {ticketNum(selectedTicket.ticket_number)}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[11px]',
                            selectedTicket.status === 'aberto'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              : 'bg-muted text-muted-foreground border-border',
                          )}
                        >
                          {selectedTicket.status === 'aberto' ? 'Aberto' : 'Encerrado'}
                        </Badge>
                      </div>
                    </div>
                    {(selectedTicket.owner_email || selectedTicket.owner_pedido) && (
                      <p className="text-xs text-muted-foreground text-left mt-0.5">
                        {[selectedTicket.owner_email, selectedTicket.owner_pedido && `Pedido: ${selectedTicket.owner_pedido}`]
                          .filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground text-left mt-0.5 line-clamp-1">{selectedTicket.assunto}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-left">Aberto em {fmtFull(selectedTicket.created_at)}</p>
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
                        const isStaff = msg.is_staff;
                        const ownerName = selectedTicket.owner_name || `uid:${selectedTicket.user_id.slice(0, 8)}`;
                        return (
                          <div key={msg.id} className={cn('flex items-end gap-2', isStaff ? 'justify-end' : 'justify-start')}>
                            {/* Acionista avatar (left) */}
                            {!isStaff && (
                              <AvatarInitials name={ownerName} size="sm" />
                            )}

                            <div className={cn('flex flex-col max-w-[75%]', isStaff ? 'items-end' : 'items-start')}>
                              <div className={cn(
                                'rounded-2xl px-3.5 py-2.5 text-sm',
                                isStaff
                                  ? 'bg-[hsl(210,80%,52%)]/18 text-foreground border border-[hsl(210,80%,52%)]/25 rounded-br-sm'
                                  : 'bg-muted text-foreground border border-border rounded-bl-sm',
                              )}>
                                {!isStaff && (
                                  <p className="text-[10px] font-bold mb-0.5 uppercase tracking-wide text-muted-foreground">
                                    {ownerName}
                                  </p>
                                )}
                                {isStaff && (
                                  <p className="text-[10px] font-bold mb-0.5 uppercase tracking-wide text-[hsl(210,80%,52%)]">
                                    Equipe
                                  </p>
                                )}
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1 px-1">{fmtTime(msg.created_at)}</p>
                            </div>

                            {/* Staff avatar (right) */}
                            {isStaff && (
                              <div className="w-7 h-7 rounded-full bg-[hsl(210,80%,52%)]/15 border border-[hsl(210,80%,52%)]/30 flex items-center justify-center shrink-0">
                                <Headphones className="w-3.5 h-3.5 text-[hsl(210,80%,52%)]" />
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

              {/* Reply area */}
              {selectedTicket.status === 'aberto' && (
                <div className="border-t px-4 py-3.5 shrink-0 bg-background space-y-2">
                  <form onSubmit={handleReply} className="flex gap-2 items-end">
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="Responder como Equipe Modo Corre..."
                      rows={2}
                      className="flex-1 rounded-xl border bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50"
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-destructive hover:border-destructive/50"
                    onClick={handleClose}
                    disabled={closingTicket}
                  >
                    {closingTicket && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Encerrar ticket
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
