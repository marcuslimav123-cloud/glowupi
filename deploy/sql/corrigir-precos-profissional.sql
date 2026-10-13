-- Agendamentos ainda não pagos que foram gravados com o preço base do serviço,
-- embora o profissional tenha um valor personalizado para aquele serviço
-- (Profissionais → Serviços que atende → Valor personalizado).
-- Passa a valer o preço do profissional. Seguro de rodar várias vezes:
-- só mexe em linhas cujo valor ainda é exatamente o preço base.
UPDATE agendamentos a
SET valor = ps.preco_override,
    updated_at = now()
FROM profissional_servicos ps
JOIN servicos s ON s.id = ps.servico_id
WHERE ps.profissional_id = a.profissional_id
  AND ps.servico_id = a.servico_id
  AND ps.preco_override IS NOT NULL
  AND a.valor = s.preco
  AND a.valor <> ps.preco_override
  AND a.pago = false
  AND a.status IN ('confirmado', 'pendente_aprovacao');
