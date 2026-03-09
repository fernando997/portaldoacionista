export const mockFleet = [
  { placa: 'ABC-1D23', modelo: 'Honda CG 160', ano: 2023, status: 'Ativa' as const, receitaMedia: 1850, contratoAtivo: true },
  { placa: 'DEF-4G56', modelo: 'Yamaha Factor 150', ano: 2022, status: 'Ativa' as const, receitaMedia: 1720, contratoAtivo: true },
  { placa: 'GHI-7H89', modelo: 'Honda Pop 110i', ano: 2023, status: 'Ativa' as const, receitaMedia: 1450, contratoAtivo: true },
  { placa: 'JKL-0I12', modelo: 'Honda CG 160', ano: 2021, status: 'Manutenção' as const, receitaMedia: 0, contratoAtivo: true },
  { placa: 'MNO-3J45', modelo: 'Yamaha Crosser 150', ano: 2023, status: 'Ativa' as const, receitaMedia: 1980, contratoAtivo: true },
  { placa: 'PQR-6K78', modelo: 'Honda Bros 160', ano: 2022, status: 'Inadimplente' as const, receitaMedia: 0, contratoAtivo: false },
  { placa: 'STU-9L01', modelo: 'Yamaha Factor 150', ano: 2023, status: 'Ativa' as const, receitaMedia: 1680, contratoAtivo: true },
  { placa: 'VWX-2M34', modelo: 'Honda CG 160', ano: 2022, status: 'Reserva' as const, receitaMedia: 0, contratoAtivo: false },
];

export const mockDocuments = [
  { id: 1, nome: 'Pré Contrato', tipo: 'Contrato', data: '2024-04-10' },
  { id: 2, nome: 'Contrato', tipo: 'Contrato', data: '2024-05-15' },
  { id: 3, nome: 'CNPJ', tipo: 'Documento', data: '2024-01-15' },
  { id: 4, nome: 'Certificado Digital', tipo: 'Certificação', data: '2023-11-10' },
  { id: 5, nome: 'CNH', tipo: 'Documento', data: '2024-03-01' },
  { id: 6, nome: 'Procuração', tipo: 'Legal', data: '2024-02-20' },
];

export const mockPayments = [
  { data: '2024-12-05', valor: 4250, status: 'Pago' as const },
  { data: '2024-11-05', valor: 3980, status: 'Pago' as const },
  { data: '2024-10-05', valor: 4120, status: 'Pago' as const },
  { data: '2024-09-05', valor: 3750, status: 'Pago' as const },
  { data: '2024-08-05', valor: 4500, status: 'Pago' as const },
  { data: '2024-07-05', valor: 3200, status: 'Pago' as const },
  { data: '2025-01-05', valor: 4100, status: 'Previsto' as const },
  { data: '2025-02-05', valor: 4100, status: 'Previsto' as const },
  { data: '2025-03-05', valor: 4100, status: 'Retido' as const },
];

export const mockReports = [
  { id: 1, nome: 'Relatório Mensal — Dezembro 2024', tipo: 'Mensal' },
  { id: 2, nome: 'Relatório Mensal — Novembro 2024', tipo: 'Mensal' },
  { id: 3, nome: 'Relatório Trimestral — Q4 2024', tipo: 'Trimestral' },
  { id: 4, nome: 'Relatório Anual — 2024', tipo: 'Anual' },
  { id: 5, nome: 'KPIs da Frota — Dezembro 2024', tipo: 'KPI Frota' },
  { id: 6, nome: 'KPIs do Grupo — Q4 2024', tipo: 'KPI Grupo' },
];

export const mockChartData = [
  { mes: 'Jul', valor: 3200 },
  { mes: 'Ago', valor: 4500 },
  { mes: 'Set', valor: 3750 },
  { mes: 'Out', valor: 4120 },
  { mes: 'Nov', valor: 3980 },
  { mes: 'Dez', valor: 4250 },
  { mes: 'Jan*', valor: 4100 },
  { mes: 'Fev*', valor: 4100 },
];

export const mockInstallments = [
  { parcela: 1, vencimento: '2025-01-10', descricao: 'Parcela 1/6 - Taxa de Adesão', valor: 1500, status: 'Pago' as const, linkPagamento: 'https://www.asaas.com/i/abc123001' },
  { parcela: 2, vencimento: '2025-02-10', descricao: 'Parcela 2/6 - Taxa de Adesão', valor: 1500, status: 'Pago' as const, linkPagamento: 'https://www.asaas.com/i/abc123002' },
  { parcela: 3, vencimento: '2025-03-10', descricao: 'Parcela 3/6 - Taxa de Adesão', valor: 1500, status: 'Vencida' as const, linkPagamento: 'https://www.asaas.com/i/abc123003' },
  { parcela: 4, vencimento: '2025-04-10', descricao: 'Parcela 4/6 - Taxa de Adesão', valor: 1500, status: 'Pendente' as const, linkPagamento: 'https://www.asaas.com/i/abc123004' },
  { parcela: 5, vencimento: '2025-05-10', descricao: 'Parcela 5/6 - Taxa de Adesão', valor: 1500, status: 'Pendente' as const, linkPagamento: 'https://www.asaas.com/i/abc123005' },
  { parcela: 6, vencimento: '2025-06-10', descricao: 'Parcela 6/6 - Taxa de Adesão', valor: 1500, status: 'Pendente' as const, linkPagamento: 'https://www.asaas.com/i/abc123006' },
];
