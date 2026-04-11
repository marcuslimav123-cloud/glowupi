UPDATE barbearias
SET subscription_status = 'trial',
    plano_vencimento = NOW() + INTERVAL '7 days',
    updated_at = NOW()
WHERE id = 8
  AND subscription_status = 'pendente';
