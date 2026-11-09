import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const outputDirectory = resolve('docs/images');
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });

try {
  await page.goto('http://localhost:5173/login');
  await page.getByRole('button', { name: 'Entrar no ambiente' }).click();
  await page.getByRole('heading', { name: 'Visão operacional' }).waitFor();
  await page.waitForTimeout(750);
  await page.screenshot({ path: resolve(outputDirectory, 'dashboard.png') });

  await page.goto('http://localhost:5173/incidents');
  await page.getByRole('heading', { name: 'Incidentes' }).waitFor();
  await page.getByLabel('Abrir INC-1042').waitFor();
  await page.screenshot({ path: resolve(outputDirectory, 'incidents.png') });

  await page.goto('http://localhost:5173/incidents/INC-1042');
  await page.getByRole('button', { name: 'Investigar com IA' }).click();
  await page.getByText('Conclusão estruturada').waitFor({ timeout: 15_000 });
  const copilot = page.locator('section.card').filter({ has: page.getByRole('heading', { name: 'Copiloto de investigação' }) });
  await page.locator('header').evaluate((element) => {
    element.style.display = 'none';
  });
  await copilot.screenshot({ path: resolve(outputDirectory, 'ai-investigation.png') });
} finally {
  await browser.close();
}

console.log(`README screenshots written to ${outputDirectory}`);
