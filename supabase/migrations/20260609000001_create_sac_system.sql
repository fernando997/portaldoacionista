-- SAC System: tickets, messages, notifications

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sac_tickets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assunto    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'encerrado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sac_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID NOT NULL REFERENCES public.sac_tickets(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  is_staff   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  ticket_id  UUID REFERENCES public.sac_tickets(id) ON DELETE CASCADE,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX ON public.sac_tickets (user_id);
CREATE INDEX ON public.sac_tickets (status);
CREATE INDEX ON public.sac_messages (ticket_id);
CREATE INDEX ON public.notifications (user_id, read);

-- ─── Triggers ────────────────────────────────────────────────────────────────

-- updated_at on sac_tickets
CREATE OR REPLACE FUNCTION public.set_sac_ticket_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sac_tickets_updated_at
  BEFORE UPDATE ON public.sac_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_sac_ticket_updated_at();

-- Notify ticket owner when staff posts a message
CREATE OR REPLACE FUNCTION public.notify_on_staff_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_owner UUID;
  v_assunto TEXT;
BEGIN
  IF NEW.is_staff = true THEN
    SELECT user_id, assunto INTO v_owner, v_assunto
      FROM public.sac_tickets WHERE id = NEW.ticket_id;

    IF v_owner IS NOT NULL AND v_owner <> NEW.author_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, ticket_id)
      VALUES (v_owner, 'sac_response', 'Nova resposta no seu ticket', v_assunto, NEW.ticket_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_staff_message
  AFTER INSERT ON public.sac_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_staff_message();

-- Notify ticket owner when ticket is closed by staff
CREATE OR REPLACE FUNCTION public.notify_on_ticket_closed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status <> 'encerrado' AND NEW.status = 'encerrado' THEN
    INSERT INTO public.notifications (user_id, type, title, body, ticket_id)
    VALUES (NEW.user_id, 'sac_closed', 'Seu ticket foi encerrado', NEW.assunto, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_ticket_closed
  AFTER UPDATE ON public.sac_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_ticket_closed();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.sac_tickets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sac_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an internal staff member?
CREATE OR REPLACE FUNCTION public.is_internal_user()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin', 'moderator', 'vendedor', 'sac', 'suporte')
  );
$$;

-- sac_tickets
CREATE POLICY "owner can see own tickets" ON public.sac_tickets
  FOR SELECT USING (user_id = auth.uid() OR public.is_internal_user());

CREATE POLICY "owner can create tickets" ON public.sac_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner or staff can update ticket" ON public.sac_tickets
  FOR UPDATE USING (user_id = auth.uid() OR public.is_internal_user());

-- sac_messages
CREATE POLICY "see messages of accessible tickets" ON public.sac_messages
  FOR SELECT USING (
    public.is_internal_user() OR
    EXISTS (SELECT 1 FROM public.sac_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );

CREATE POLICY "owner or staff can post messages" ON public.sac_messages
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND (
      public.is_internal_user() OR
      EXISTS (SELECT 1 FROM public.sac_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    )
  );

-- notifications
CREATE POLICY "user sees own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user updates own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());
