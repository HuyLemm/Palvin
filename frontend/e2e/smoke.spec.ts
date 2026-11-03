import { expect, test, type Page } from '@playwright/test'

// Smoke test: log in with a TEST account and walk the main screens.
// Safety: every write to Supabase (anything but GET/HEAD/OPTIONS) is answered locally
// and never sent, so this can run against the real project without changing data.
const USER = process.env.PALVIN_E2E_USER
const PASS = process.env.PALVIN_E2E_PASS

async function blockWrites(page: Page) {
  const blocked: string[] = []
  await page.route('**/rest/v1/**', route => {
    const req = route.request()
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method()) || req.url().includes('/rpc/email_for_username')) return route.continue()
    blocked.push(`${req.method()} ${req.url().split('/rest/v1/')[1]}`)
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('**/storage/v1/**', route => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) return route.continue()
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  return blocked
}

async function login(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /log in/i }).first().click()
  await page.getByPlaceholder('Your username').fill(USER!)
  await page.getByPlaceholder('Password').fill(PASS!)
  await page.getByRole('button', { name: /^log in$/i }).click()
  await expect(page.locator('nav[aria-label="Main"]')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[role=status][aria-label=Loading]')).toHaveCount(0, { timeout: 30_000 })
}

const tab = (page: Page, name: string) => page.locator('nav[aria-label="Main"]').getByRole('button', { name: new RegExp('^' + name) })
const title = (page: Page) => page.locator('header h1')

test.describe('logged out', () => {
  test('login screen renders and focus never leaks into the hidden app shell', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /log in/i }).first()).toBeVisible()
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      const inShell = await page.evaluate(() => !!document.activeElement?.closest('nav, header, main'))
      expect(inShell).toBe(false)
    }
  })
})

test.describe('logged in (test account)', () => {
  test.skip(!USER || !PASS, 'set PALVIN_E2E_USER / PALVIN_E2E_PASS to run')

  test('main tabs, device Back, and no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    const blocked = await blockWrites(page)
    await login(page)

    await tab(page, 'Money').click()
    await expect(title(page)).toHaveText(/Money/)
    await tab(page, 'Us').click()
    await expect(title(page)).toHaveText(/^Us/)

    // a sub-screen is closed by the device Back button, not by leaving the app
    await page.getByRole('button', { name: /To Do List/ }).first().click()
    await expect(page.getByRole('button', { name: /Back/ }).first()).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('searchbox', { name: 'Search features' })).toBeVisible()

    // Back from a tab returns to the previous tab
    await page.goBack()
    await expect(title(page)).toHaveText(/Money/)

    expect(errors).toEqual([])
    // the app writes a little in the background (last-active); nothing the test did should
    expect(blocked.filter(b => /expenses|events|posts|memories|love_notes/.test(b))).toEqual([])
  })

  test('Us quick search filters the feature list', async ({ page }) => {
    await blockWrites(page)
    await login(page)
    await tab(page, 'Us').click()
    const box = page.getByRole('searchbox', { name: 'Search features' })
    await box.fill('playlist')
    await expect(page.getByRole('button', { name: /Our Playlist/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /To Do List/ })).toHaveCount(0)
    await box.fill('zzzzzz')
    await expect(page.getByText(/No feature matches/)).toBeVisible()
  })

  test('expenses CSV export downloads a file with the expected header', async ({ page }) => {
    await blockWrites(page)
    await login(page)
    await page.getByRole('button', { name: 'Settings', exact: true }).click() // header avatar
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Export expenses/ }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^palvin-expenses-\d{4}-\d{2}-\d{2}\.csv$/)
    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const c of stream) chunks.push(c as Buffer)
    expect(Buffer.concat(chunks).toString('utf8')).toContain('date,type,title,category,paidBy,amount,note')
  })

  test('deleting a notification offers Undo and does not delete until the window ends', async ({ page }) => {
    const blocked = await blockWrites(page)
    await login(page)
    await page.getByRole('button', { name: /^Notifications/ }).click()
    const del = page.getByRole('button', { name: 'Delete' })
    await del.first().waitFor({ timeout: 8000 }).catch(() => {})
    test.skip((await del.count()) === 0, 'account has no notifications')
    await del.first().focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Notification deleted')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await page.waitForTimeout(5500)
    expect(blocked.filter(b => b.startsWith('DELETE notifications'))).toEqual([])
  })
})
