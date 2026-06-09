-- Add auto-incrementing ticket number to sac_tickets
ALTER TABLE public.sac_tickets
  ADD COLUMN ticket_number BIGINT GENERATED ALWAYS AS IDENTITY;

CREATE UNIQUE INDEX ON public.sac_tickets (ticket_number);
