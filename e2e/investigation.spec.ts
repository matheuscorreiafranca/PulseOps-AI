import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar no ambiente' }).click();
  await expect(page.getByRole('heading', { name: 'Visão operacional' })).toBeVisible();
});

test('operator creates an incident through the UI', async ({ page }) => {
  await page.goto('/incidents');
  await page.getByRole('button', { name: 'Novo incidente' }).click();
  await page.getByLabel('Título').fill('Saturação sintética da fila operacional');
  await page.getByLabel('Descrição').fill('O backlog sintético excedeu o limite operacional durante dez minutos.');
  await page.getByRole('button', { name: 'Criar incidente' }).click();
  await expect(page.getByRole('heading', { name: 'Saturação sintética da fila operacional' })).toBeVisible();
  await expect(page.getByText('Incidente criado manualmente.')).toBeVisible();
});

test('operator investigates and approves remediation', async ({ page }) => {
  await page.goto('/incidents/INC-1042');
  await expect(page.getByRole('heading', { name: 'Latência elevada na API de pedidos' })).toBeVisible();
  await page.getByRole('button', { name: 'Investigar com IA' }).click();
  await expect(page.getByText('Conclusão estruturada')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Diagnóstico de alta latência')).toBeVisible();
  await page.getByRole('button', { name: 'Aprovar' }).click();
  await expect(page.getByText('mitigating')).toBeVisible();
  await expect(page.getByText('Remediação aprovada por decisão humana.')).toBeVisible();
});
